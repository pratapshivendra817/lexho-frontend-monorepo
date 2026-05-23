import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Text } from "react-native-paper";
import { getPaymentOptions, initiatePayment } from "../../api/paymentApi";
import { useAppSelector } from "../../redux/hooks";
import { openRazorpayCheckout } from "../../services/paymentService";

type PaymentRoute = {
  params?: {
    bookingId?: string;
    cartId?: number | null;
    amount?: number;
    currency?: string;
    postPaymentRoute?: "ScheduledBookingStatus" | "InstantBookingStatus" | "PaymentStatus" | "BookingPaymentConfirm";
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

const MODE_ICONS: Record<string, string> = {
  UPI: "qrcode-scan",
  CARD: "credit-card-outline",
  WALLET: "wallet-outline",
  COD: "cash",
};

export function PaymentScreen({ route, navigation }: { route: PaymentRoute; navigation: any }) {
  const cartState = useAppSelector((s) => s.cart);
  const authUser = useAppSelector((s) => s.auth.user);
  const cartId = route?.params?.cartId ?? cartState.cartId ?? null;
  const payableAmount = Number(route?.params?.amount ?? cartState.toPay ?? 0);
  const currency = String(route?.params?.currency ?? cartState.currency ?? "INR");
  const bookingId = route?.params?.bookingId;
  const postPaymentRoute = route?.params?.postPaymentRoute;
  const [selectedMode, setSelectedMode] = useState<string>("");
  const [actionError, setActionError] = useState<string | null>(null);

  const optionsQuery = useQuery({
    queryKey: ["payment-options", bookingId ?? "cart", cartId ?? "na", payableAmount],
    queryFn: () => getPaymentOptions({ bookingId, cartId, amount: payableAmount }),
  });

  const options = optionsQuery.data?.options ?? [];
  const grouped = useMemo(() => {
    const upi = options.filter((row) => row.mode === "UPI");
    const others = options.filter((row) => row.mode !== "UPI");
    return { upi, others };
  }, [options]);

  const payMutation = useMutation({
    mutationFn: async (mode: string) => {
      const res = await initiatePayment({
        mode: mode as any,
        bookingId,
        amount: payableAmount,
      });
      return res;
    },
    onSuccess: async (res: any) => {
      const root = res?.data && typeof res?.data === "object" ? res.data : res;
      const razorpayOptions = root?.razorpayOptions ?? root?.checkoutOptions ?? null;
      if (razorpayOptions && typeof razorpayOptions === "object") {
        const checkoutResult = await openRazorpayCheckout({
          amount: Number(razorpayOptions?.amount ?? payableAmount),
          currency: String(razorpayOptions?.currency ?? currency) as "INR",
          name: String(razorpayOptions?.name ?? "Lexho"),
          description: String(razorpayOptions?.description ?? "Service payment"),
          prefill: {
            contact: String(authUser?.mobile ?? "").trim() || undefined,
            email: String(authUser?.email ?? "").trim() || undefined,
          },
          theme: { color: String(razorpayOptions?.theme?.color ?? "#16A34A") },
        });
        if (!checkoutResult.success) {
          setActionError(checkoutResult.error ?? "Payment cancelled");
          return;
        }
      }
      if (postPaymentRoute === "ScheduledBookingStatus") {
        navigation.replace("ScheduledBookingStatus", { bookingId });
        return;
      }
      if (postPaymentRoute === "InstantBookingStatus") {
        navigation.replace("InstantBookingStatus", { bookingId });
        return;
      }
      if (postPaymentRoute === "BookingPaymentConfirm") {
        navigation.replace("BookingPaymentConfirm", { bookingId });
        return;
      }
      navigation.navigate("PaymentStatus", { bookingId });
    },
    onError: (error: any) => {
      setActionError(String(error?.message ?? "Payment initiation failed"));
    },
  });

  const canProceed = selectedMode.length > 0 && !payMutation.isPending;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Payment Options</Text>
        <Text style={styles.subTitle}>To Pay: {formatCurrency(payableAmount, currency)}</Text>

        <Text style={styles.sectionTitle}>UPI</Text>
        <View style={styles.card}>
          {optionsQuery.isLoading ? <Text style={styles.meta}>Loading payment methods...</Text> : null}
          {!optionsQuery.isLoading && grouped.upi.length === 0 ? <Text style={styles.meta}>UPI method not available</Text> : null}
          {grouped.upi.map((option) => {
            const selected = selectedMode === option.mode;
            return (
              <Pressable key={option.id} style={styles.optionRow} onPress={() => setSelectedMode(option.mode)}>
                <View style={styles.optionLeft}>
                  <MaterialCommunityIcon name={MODE_ICONS[option.mode] ?? "cash-multiple"} size={22} color="#111827" />
                  <View style={styles.optionTextWrap}>
                    <Text style={styles.optionLabel}>{option.label}</Text>
                    {option.description ? <Text style={styles.optionDesc}>{option.description}</Text> : null}
                  </View>
                </View>
                <MaterialCommunityIcon name={selected ? "radiobox-marked" : "radiobox-blank"} size={24} color={selected ? "#16A34A" : "#6B7280"} />
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Other Methods</Text>
        <View style={styles.card}>
          {!optionsQuery.isLoading && grouped.others.length === 0 ? <Text style={styles.meta}>No additional methods available</Text> : null}
          {grouped.others.map((option) => {
            const selected = selectedMode === option.mode;
            return (
              <Pressable key={option.id} style={styles.optionRow} onPress={() => setSelectedMode(option.mode)}>
                <View style={styles.optionLeft}>
                  <MaterialCommunityIcon name={MODE_ICONS[option.mode] ?? "cash-multiple"} size={22} color="#111827" />
                  <View style={styles.optionTextWrap}>
                    <Text style={styles.optionLabel}>{option.label}</Text>
                    {option.description ? <Text style={styles.optionDesc}>{option.description}</Text> : null}
                  </View>
                </View>
                <MaterialCommunityIcon name={selected ? "radiobox-marked" : "radiobox-blank"} size={24} color={selected ? "#16A34A" : "#6B7280"} />
              </Pressable>
            );
          })}
        </View>

        {optionsQuery.isError ? <Text style={styles.error}>{optionsQuery.error instanceof Error ? optionsQuery.error.message : "Unable to load payment options"}</Text> : null}
        {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.ctaBtn, !canProceed && styles.ctaBtnDisabled]}
          disabled={!canProceed}
          onPress={() => {
            setActionError(null);
            payMutation.mutate(selectedMode);
          }}
        >
          <Text style={styles.ctaText}>{payMutation.isPending ? "Processing..." : "Proceed to pay"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#EEF0F6" },
  content: { padding: 16, paddingBottom: 120, gap: 12 },
  title: { color: "#111827", fontSize: 24, fontWeight: "900" },
  subTitle: { color: "#6B7280", fontSize: 18, fontWeight: "700", marginTop: -4 },
  sectionTitle: { color: "#111827", fontSize: 18, fontWeight: "900", marginTop: 4 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    gap: 8,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  optionLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  optionTextWrap: { flex: 1 },
  optionLabel: { color: "#111827", fontSize: 18, fontWeight: "800" },
  optionDesc: { color: "#6B7280", fontSize: 14, fontWeight: "600", marginTop: 2 },
  meta: { color: "#6B7280", fontSize: 14, fontWeight: "600" },
  error: { color: "#B91C1C", fontWeight: "700", fontSize: 14 },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  ctaBtn: {
    backgroundColor: "#16A34A",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  ctaBtnDisabled: { backgroundColor: "#A3A3A3" },
  ctaText: { color: "#FFFFFF", fontSize: 18, fontWeight: "900" },
});
