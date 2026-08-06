import { useMutation } from "@tanstack/react-query";
import { Alert, Share, StyleSheet, TouchableOpacity, View } from "react-native";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { Button, Text, TextInput } from "react-native-paper";
import { useEffect, useMemo, useState } from "react";
import { refundPayment, retryPayment } from "../../api/paymentExtrasApi";
import { getApiErrorCode } from "../../api/client";
import { getBookingDetails } from "../../api/bookingExtrasApi";
import { unlockCartAfterPayment } from "../../redux/cartSlice";
import { useAppDispatch } from "../../redux/hooks";
import { captureFrontendError } from "../../services/monitoring";
import {
  trackPaymentFailed,
  trackPaymentSuccess,
  trackRefundCompleted,
  trackRefundRequested,
} from "../../services/customerAnalyticsEvents";
import { clearPendingPaymentBookingId } from "../../utils/storage";
import { COLORS } from '../../theme/colors';

type PaymentRoute = { params?: { bookingId?: string } };


export function PaymentStatusScreen({ route, navigation }: { route: PaymentRoute; navigation: any }) {
  const dispatch = useAppDispatch();
  const routeBookingId = String(route?.params?.bookingId ?? "").trim();
  const [bookingId, setBookingId] = useState(routeBookingId);
  const [result, setResult] = useState<unknown>(null);
  const [refundAmount, setRefundAmount] = useState("100");
  const [lastStatus, setLastStatus] = useState("");
  const [lastCode, setLastCode] = useState("");
  const [retryAllowed, setRetryAllowed] = useState(false);
  const [tapDisabledUntil, setTapDisabledUntil] = useState(0);
  const canRun = useMemo(() => bookingId.trim().length > 0, [bookingId]);
  const isPaymentFailed = useMemo(() => {
    switch (lastCode) {
      case "FAILED":
      case "EXPIRED":
      case "PAYMENT_FAILED":
      case "PAYMENT_EXPIRED":
        return true;
      default:
        return false;
    }
  }, [lastCode]);

  const refundMutation = useMutation({
    mutationFn: () => refundPayment({ bookingId, amount: Number(refundAmount || 0) }),
    onMutate: () => {
      void trackRefundRequested({
        booking_id: bookingId,
        amount: Number(refundAmount || 0),
        source: "payment_status",
      });
    },
    onSuccess: () => {
      void trackRefundCompleted({
        booking_id: bookingId,
        amount: Number(refundAmount || 0),
        source: "payment_status",
      });
      Alert.alert("Refund requested", "Refund request submitted successfully.");
    },
  });
  const recoverMutation = useMutation({
    mutationFn: () => getBookingDetails(bookingId),
    onSuccess: (booking: any) => {
      const status = String(booking?.paymentStatus ?? "").toUpperCase();
      setResult(booking);
      setLastStatus(status);
      setLastCode(status);
      setRetryAllowed(booking?.retryPaymentAllowed === true);
      if (status === "SUCCESS") {
        void trackPaymentSuccess({
          booking_id: bookingId,
          source: "payment_status_recovery",
        });
        dispatch(unlockCartAfterPayment());
        void clearPendingPaymentBookingId();
        return;
      }
      if ((status === "FAILED" || status === "EXPIRED") && booking?.retryPaymentAllowed === true) {
        void trackPaymentFailed({
          booking_id: bookingId,
          source: "payment_status_recovery",
          status,
        });
        Alert.alert("Payment Failed", "Payment successful nahi hua. Retry payment available hai.");
      }
    },
    onError: (error: any) => {
      const code = getApiErrorCode(error);
      if (code === "RATE_LIMIT_EXCEEDED") setTapDisabledUntil(Date.now() + 15000);
      captureFrontendError(error, {
        screenName: "PaymentStatusScreen",
        userAction: "recover_payment_status",
        apiEndpoint: `/api/bookings/details/${bookingId}`,
        errorCode: code || "BOOKING_DETAILS_FAILED",
      });
    },
  });
  const retryMutation = useMutation({
    mutationFn: () => retryPayment(bookingId.trim()),
    onSuccess: (payload: any) => {
      const root = payload?.data && typeof payload.data === "object" ? payload.data : payload;
      navigation.navigate("Payment", { bookingId: String(root?.bookingId ?? bookingId).trim() });
    },
    onError: (error: any) => {
      const code = getApiErrorCode(error);
      if (code === "RATE_LIMIT_EXCEEDED") setTapDisabledUntil(Date.now() + 15000);
      captureFrontendError(error, {
        screenName: "PaymentStatusScreen",
        userAction: "retry_payment",
        apiEndpoint: "/api/payments/retry",
        errorCode: code || "PAYMENT_RETRY_FAILED",
      });
    },
  });

  useEffect(() => {
    if (!routeBookingId) return;
    recoverMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeBookingId]);

  const onSharePayment = async () => {
    const message = [
      "Payment Status",
      `Booking ID: ${bookingId || "-"}`,
      `Status: ${lastStatus || "UNKNOWN"}`,
      `Amount: INR ${refundAmount || "-"}`,
    ].join("\n");
    await Share.share({ title: "Payment Receipt", message });
  };

  return (
    <View style={styles.root}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Payment Status</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={() => void onSharePayment()}>
          <MaterialCommunityIcon name="share-variant-outline" size={18} color={COLORS.slate900} />
        </TouchableOpacity>
      </View>
      <TextInput mode="outlined" label="Booking ID" value={bookingId} onChangeText={setBookingId} />
      <TextInput mode="outlined" label="Refund Amount" keyboardType="numeric" value={refundAmount} onChangeText={setRefundAmount} />

      <View style={styles.row}>
        <Button mode="contained" onPress={() => recoverMutation.mutate()} loading={recoverMutation.isPending} disabled={!canRun || Date.now() < tapDisabledUntil}>
          Check Status
        </Button>
        <Button mode="outlined" onPress={() => refundMutation.mutate()} loading={refundMutation.isPending} disabled={!canRun}>
          Request Refund
        </Button>
      </View>
      {Date.now() < tapDisabledUntil ? <Text style={styles.rateLimit}>Too many requests. Please try again later.</Text> : null}
      {isPaymentFailed ? (
        <View style={styles.failedCard}>
          <Text style={styles.failedTitle}>Payment Failed</Text>
          <Text style={styles.failedText}>Please retry payment to confirm your booking.</Text>
        </View>
      ) : null}

      {isPaymentFailed ? (
        <Button
          mode="contained-tonal"
          onPress={() => retryMutation.mutate()}
          loading={retryMutation.isPending}
          disabled={!canRun || !retryAllowed || Date.now() < tapDisabledUntil}
        >
          Retry Payment
        </Button>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.metaTitle}>Latest Payment Response</Text>
        {lastStatus ? <Text style={styles.status}>Status: {lastStatus}</Text> : null}
        {lastCode ? <Text style={styles.status}>Code: {lastCode}</Text> : null}
        <Text style={styles.meta}>{JSON.stringify(result ?? {}, null, 2)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, gap: 12, backgroundColor: COLORS.offWhite },
  title: { color: COLORS.slate900, fontSize: 20, fontWeight: "800" },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  shareBtn: {
    borderWidth: 1,
    borderColor: COLORS.slate300,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
  },
  row: { flexDirection: "row", gap: 10 },
  card: { borderRadius: 14, borderWidth: 1, borderColor: COLORS.borderSoft, backgroundColor: COLORS.white, padding: 12, gap: 8 },
  failedCard: { borderRadius: 14, borderWidth: 1, borderColor: COLORS.error, backgroundColor: COLORS.offWhite, padding: 12, gap: 4 },
  failedTitle: { color: COLORS.error, fontSize: 16, fontWeight: "900" },
  failedText: { color: COLORS.slate700, fontSize: 13, fontWeight: "700" },
  rateLimit: { color: COLORS.error, fontSize: 13, fontWeight: "800" },
  metaTitle: { color: COLORS.slate700, fontSize: 13, fontWeight: "700" },
  status: { color: COLORS.slate900, fontSize: 13, fontWeight: "800" },
  meta: { color: COLORS.slate900, fontSize: 12 },
});






