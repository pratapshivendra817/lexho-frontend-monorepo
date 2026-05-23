import { useMutation } from "@tanstack/react-query";
import { Alert, Share, StyleSheet, TouchableOpacity, View } from "react-native";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { Button, Text, TextInput } from "react-native-paper";
import { useMemo, useState } from "react";
import { getPaymentStatus, refundPayment } from "../../api/paymentExtrasApi";
import { unlockCartAfterPayment } from "../../redux/cartSlice";
import { useAppDispatch } from "../../redux/hooks";

type PaymentRoute = { params?: { bookingId?: string } };

export function PaymentStatusScreen({ route, navigation }: { route: PaymentRoute; navigation: any }) {
  const dispatch = useAppDispatch();
  const routeBookingId = String(route?.params?.bookingId ?? "").trim();
  const [bookingId, setBookingId] = useState(routeBookingId);
  const [result, setResult] = useState<unknown>(null);
  const [refundAmount, setRefundAmount] = useState("100");
  const [lastStatus, setLastStatus] = useState("");
  const canRun = useMemo(() => bookingId.trim().length > 0, [bookingId]);
  const canRetry = useMemo(() => ["FAILED", "PAYMENT_FAILED", "CANCELLED", "EXPIRED"].includes(lastStatus), [lastStatus]);

  const statusMutation = useMutation({
    mutationFn: () => getPaymentStatus(bookingId),
    onSuccess: (d: any) => {
      setResult(d);
      const root = d?.data && typeof d?.data === "object" ? d.data : d;
      const status = String(root?.status ?? root?.paymentStatus ?? root?.state ?? "").toUpperCase();
      setLastStatus(status);
      const successStatuses = new Set(["PAID", "SUCCESS", "COMPLETED"]);
      const failedStatuses = new Set(["FAILED", "PAYMENT_FAILED", "CANCELLED", "EXPIRED"]);

      if (successStatuses.has(status)) {
        dispatch(unlockCartAfterPayment());
        return;
      }

      if (failedStatuses.has(status)) {
        Alert.alert(
          "Payment incomplete",
          "Payment successful nahi hua. Cart items safe rakhe gaye hain, aap retry kar sakte ho.",
        );
      }
    },
  });

  const refundMutation = useMutation({
    mutationFn: () => refundPayment({ bookingId, amount: Number(refundAmount || 0) }),
    onSuccess: () => Alert.alert("Refund requested", "Refund request submitted successfully."),
  });

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
          <MaterialCommunityIcon name="share-variant-outline" size={18} color="#0F172A" />
        </TouchableOpacity>
      </View>
      <TextInput mode="outlined" label="Booking ID" value={bookingId} onChangeText={setBookingId} />
      <TextInput mode="outlined" label="Refund Amount" keyboardType="numeric" value={refundAmount} onChangeText={setRefundAmount} />

      <View style={styles.row}>
        <Button mode="contained" onPress={() => statusMutation.mutate()} loading={statusMutation.isPending} disabled={!canRun}>
          Check Status
        </Button>
        <Button mode="outlined" onPress={() => refundMutation.mutate()} loading={refundMutation.isPending} disabled={!canRun}>
          Request Refund
        </Button>
      </View>
      {canRetry ? (
        <Button
          mode="contained-tonal"
          onPress={() => navigation.navigate("Payment", { bookingId: bookingId.trim() })}
          disabled={!canRun}
        >
          Retry Payment
        </Button>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.metaTitle}>Latest Payment Response</Text>
        {lastStatus ? <Text style={styles.status}>Status: {lastStatus}</Text> : null}
        <Text style={styles.meta}>{JSON.stringify(result ?? {}, null, 2)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, gap: 12, backgroundColor: "#F8FAFC" },
  title: { color: "#0F172A", fontSize: 20, fontWeight: "800" },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  shareBtn: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
  },
  row: { flexDirection: "row", gap: 10 },
  card: { borderRadius: 14, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#FFFFFF", padding: 12, gap: 8 },
  metaTitle: { color: "#334155", fontSize: 13, fontWeight: "700" },
  status: { color: "#0F172A", fontSize: 13, fontWeight: "800" },
  meta: { color: "#0F172A", fontSize: 12 },
});
