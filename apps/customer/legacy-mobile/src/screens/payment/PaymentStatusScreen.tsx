import { useMutation } from "@tanstack/react-query";
import { StyleSheet, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { useState } from "react";
import { getPaymentStatus, refundPayment } from "../../api/paymentExtrasApi";

export function PaymentStatusScreen() {
  const [bookingId, setBookingId] = useState("");
  const [result, setResult] = useState<any>(null);
  const statusMutation = useMutation({ mutationFn: () => getPaymentStatus(bookingId), onSuccess: (d) => setResult(d) });
  const refundMutation = useMutation({ mutationFn: () => refundPayment({ bookingId, amount: 100 }) });
  const canRun = bookingId.trim().length > 0;

  return <View style={styles.root}><Text variant="headlineSmall">Payment Status</Text><TextInput mode="outlined" label="Booking ID" value={bookingId} onChangeText={setBookingId} /><Button mode="contained" onPress={() => statusMutation.mutate()} loading={statusMutation.isPending} disabled={!canRun}>Check Status</Button><Button mode="outlined" onPress={() => refundMutation.mutate()} loading={refundMutation.isPending} disabled={!canRun}>Refund</Button><Text>{JSON.stringify(result ?? {}, null, 2)}</Text></View>;
}

const styles = StyleSheet.create({ root: { flex: 1, padding: 16, gap: 10 } });
