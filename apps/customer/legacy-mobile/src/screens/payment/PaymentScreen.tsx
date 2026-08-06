// @refresh reset
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { useMutation } from "@tanstack/react-query";
import { Text } from "react-native-paper";
import {
  createPaymentOrder,
  reportPaymentFailure,
  verifyPayment,
  type CreatePaymentOrderResponse,
} from "../../api/paymentApi";
import { useAppSelector } from "../../redux/hooks";
import { openRazorpayCheckout } from "../../services/paymentService";
import { palette } from "../../constants/theme";
import { COLORS } from "../../theme/colors";
import { trackPaymentFailed, trackPaymentInitiated, trackPaymentSuccess } from "../../services/customerAnalyticsEvents";
import { getApiErrorCode } from "../../api/client";
import { captureFrontendError } from "../../services/monitoring";
import { clearPendingPaymentBookingId, savePendingPaymentBookingId } from "../../utils/storage";

type PaymentRoute = {
  params?: {
    bookingId?: string;
    cartId?: number | null;
    amount?: number;
    currency?: string;
    bookingMode?: "INSTANT" | "SCHEDULED" | "SUBSCRIPTION";
    postPaymentRoute?: "ScheduledBookingStatus" | "InstantBookingStatus" | "PaymentStatus" | "BookingPaymentConfirm" | "SubscriptionConfirmed";
  };
};

function formatCurrency(value: number, currency = "INR") {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  } catch {
    return `${currency} ${Number(value || 0).toFixed(2)}`;
  }
}

function buildIdempotencyKey(bookingId: string) {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `booking-${bookingId}-${globalThis.crypto.randomUUID()}`;
  }
  return `booking-${bookingId}-${Date.now()}`;
}

function toDisplayAmount(order: CreatePaymentOrderResponse | null) {
  if (!order) return null;
  return formatCurrency(Number(order.amountInPaise || 0) / 100, order.currency || "INR");
}

export function PaymentScreen({ route, navigation }: { route: PaymentRoute; navigation: any }) {
  const cartState = useAppSelector((s) => s.cart);
  const authUser = useAppSelector((s) => s.auth.user);
  const cartId = route?.params?.cartId ?? cartState.cartId ?? null;
  const bookingId = String(route?.params?.bookingId ?? "").trim();
  const postPaymentRoute = route?.params?.postPaymentRoute;
  const [actionError, setActionError] = useState<string | null>(null);
  const [lastOrder, setLastOrder] = useState<CreatePaymentOrderResponse | null>(null);
  const [tapDisabledUntil, setTapDisabledUntil] = useState(0);
  const failureTrackedRef = useRef(false);
  const autoStartedRef = useRef(false);
  const routeAmount = Number(route?.params?.amount ?? 0);
  const routeCurrency = String(route?.params?.currency ?? "INR");

  const trackPaymentFailureOnce = (params: Record<string, any>, error?: unknown) => {
    if (failureTrackedRef.current) return;
    failureTrackedRef.current = true;
    void trackPaymentFailed(params, error);
  };

  const navigateAfterPayment = () => {
    if (postPaymentRoute === "ScheduledBookingStatus") {
      navigation.replace("ScheduledBookingStatus", { bookingId });
      return;
    }
    if (postPaymentRoute === "InstantBookingStatus") {
      navigation.replace("InstantBookingStatus", { bookingId });
      return;
    }
    if (postPaymentRoute === "BookingPaymentConfirm") {
      navigation.replace("BookingPaymentConfirm", { bookingId, bookingMode: route?.params?.bookingMode });
      return;
    }
    if (postPaymentRoute === "SubscriptionConfirmed") {
      navigation.replace("SubscriptionConfirmed", { bookingId, subscriptionId: bookingId });
      return;
    }
    navigation.navigate("PaymentStatus", { bookingId });
  };

  const payMutation = useMutation({
    retry: false,
    mutationFn: async ({ idempotencyKey }: { idempotencyKey: string }) => {
      if (!bookingId) throw new Error("Booking id missing.");
      await savePendingPaymentBookingId(bookingId);
      const order = await createPaymentOrder({ bookingId }, idempotencyKey);
      setLastOrder(order);
      void trackPaymentInitiated({
        booking_id: bookingId,
        cart_id: cartId ?? undefined,
        razorpay_order_id: order.razorpayOrderId,
        amount: Number(order.amountInPaise || 0) / 100,
        currency: order.currency || "INR",
        source: "payment_screen",
      });
      const checkoutResult = await openRazorpayCheckout({
        key: order.keyId,
        order_id: order.razorpayOrderId,
        amount: Number(order.amountInPaise),
        currency: String(order.currency || "INR") as "INR",
        name: "Lexho",
        description: "Service payment",
        prefill: {
          contact: String(authUser?.mobile ?? "").trim() || undefined,
          email: String(authUser?.email ?? "").trim() || undefined,
        },
        theme: { color: COLORS.primary },
      });
      if (!checkoutResult.success) {
        const failurePayload = {
          bookingId,
          razorpayOrderId: checkoutResult.failure?.orderId ?? order.razorpayOrderId,
          razorpayPaymentId: checkoutResult.failure?.paymentId,
          errorCode: checkoutResult.failure?.code,
          errorDescription: checkoutResult.failure?.description ?? checkoutResult.error,
          errorReason: checkoutResult.failure?.reason,
          raw: checkoutResult.failure?.raw,
        };
        try {
          await reportPaymentFailure(failurePayload);
        } catch {
        }
        const paymentError = new Error(checkoutResult.error ?? "Payment cancelled");
        trackPaymentFailureOnce({
          booking_id: bookingId,
          razorpay_order_id: failurePayload.razorpayOrderId,
          razorpay_payment_id: failurePayload.razorpayPaymentId,
          error_code: failurePayload.errorCode,
          error_reason: failurePayload.errorReason,
          amount: Number(order.amountInPaise || 0) / 100,
          currency: order.currency || "INR",
          source: "razorpay_checkout",
        }, paymentError);
        throw paymentError;
      }
      if (!checkoutResult.orderId || !checkoutResult.paymentId || !checkoutResult.signature) {
        const incompleteError = new Error("Payment response incomplete. Please retry payment.");
        trackPaymentFailureOnce({
          booking_id: bookingId,
          razorpay_order_id: order.razorpayOrderId,
          amount: Number(order.amountInPaise || 0) / 100,
          currency: order.currency || "INR",
          source: "razorpay_incomplete_response",
        }, incompleteError);
        throw incompleteError;
      }
      const verification = await verifyPayment({
        razorpayOrderId: checkoutResult.orderId,
        razorpayPaymentId: checkoutResult.paymentId,
        razorpaySignature: checkoutResult.signature,
      });
      void trackPaymentSuccess({
        booking_id: bookingId,
        razorpay_order_id: checkoutResult.orderId,
        razorpay_payment_id: checkoutResult.paymentId,
        amount: Number(order.amountInPaise || 0) / 100,
        currency: order.currency || "INR",
        source: "payment_screen",
      });
      await clearPendingPaymentBookingId();
      return verification;
    },
    onSuccess: async () => {
      navigateAfterPayment();
    },
    onError: (error: any) => {
      const errorCode = getApiErrorCode(error);
      if (errorCode === "RATE_LIMIT_EXCEEDED") {
        setTapDisabledUntil(Date.now() + 15000);
      }
      captureFrontendError(error, {
        screenName: "PaymentScreen",
        userAction: "payment_submit",
        apiEndpoint: "/api/payments/create-order|/api/payments/verify",
        errorCode: errorCode || "PAYMENT_FAILED",
      });
      trackPaymentFailureOnce({
        booking_id: bookingId,
        cart_id: cartId ?? undefined,
        razorpay_order_id: lastOrder?.razorpayOrderId,
        amount: lastOrder ? Number(lastOrder.amountInPaise || 0) / 100 : route?.params?.amount,
        currency: lastOrder?.currency ?? route?.params?.currency ?? "INR",
        source: "payment_screen_error",
      }, error);
      setActionError(errorCode === "RATE_LIMIT_EXCEEDED" ? "Too many requests. Please try again later." : String(error?.message ?? "Payment failed"));
    },
  });

  const canProceed = bookingId.length > 0 && !payMutation.isPending && Date.now() >= tapDisabledUntil;
  const displayedAmount = toDisplayAmount(lastOrder) ?? (routeAmount > 0 ? formatCurrency(routeAmount, routeCurrency) : null);
  const buttonLabel = actionError ? "Retry Payment" : "Proceed to pay";
  const startPayment = () => {
    if (!canProceed) return;
    setActionError(null);
    failureTrackedRef.current = false;
    payMutation.mutate({ idempotencyKey: buildIdempotencyKey(bookingId) });
  };
  const skipPaymentForTesting = () => {
    if (!__DEV__ || !bookingId) return;
    setActionError(null);
    navigateAfterPayment();
  };

  useEffect(() => {
    if (autoStartedRef.current) return;
    if (!bookingId || actionError || payMutation.isPending || Date.now() < tapDisabledUntil) return;
    autoStartedRef.current = true;
    startPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, tapDisabledUntil]);

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <View style={styles.loadingCard}>
          {payMutation.isPending ? (
            <ActivityIndicator size="large" color={COLORS.primary} />
          ) : (
            <MaterialCommunityIcon name="shield-check-outline" size={38} color={COLORS.gold} />
          )}
          <Text style={styles.title}>{payMutation.isPending ? "Opening Razorpay" : "Secure Payment"}</Text>
          <Text style={styles.subTitle}>
            {displayedAmount ? `Amount: ${displayedAmount}` : "Payment options will open in Razorpay."}
          </Text>
        </View>

        {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
        {__DEV__ && actionError && bookingId ? (
          <Pressable style={styles.devBypassBtn} onPress={skipPaymentForTesting} accessibilityRole="button">
            <Text style={styles.devBypassText}>Skip Payment for Testing</Text>
          </Pressable>
        ) : null}
        {!bookingId ? <Text style={styles.error}>Booking id missing. Please create booking again.</Text> : null}
      </View>

      {actionError || !payMutation.isPending ? (
        <View style={styles.footer}>
        <Pressable
          style={[styles.ctaBtn, !canProceed && styles.ctaBtnDisabled]}
          disabled={!canProceed}
          onPress={startPayment}
        >
          <Text style={styles.ctaText}>{payMutation.isPending ? "Processing..." : buttonLabel}</Text>
        </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.offWhite },
  content: { flex: 1, padding: 18, paddingBottom: 120, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingCard: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gray,
    padding: 22,
    width: "100%",
  },
  title: { color: COLORS.navy, fontSize: 22, fontWeight: "900", textAlign: "center" },
  subTitle: { color: COLORS.charcoal, fontSize: 14, fontWeight: "700", textAlign: "center", lineHeight: 20 },
  error: { color: COLORS.red700, fontWeight: "700", fontSize: 14, textAlign: "center" },
  devBypassBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gold,
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  devBypassText: { color: COLORS.navy, fontSize: 13, fontWeight: "900", textAlign: "center" },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray,
  },
  ctaBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  ctaBtnDisabled: { backgroundColor: palette.iconSoft },
  ctaText: { color: COLORS.white, fontSize: 18, fontWeight: "900" },
});
