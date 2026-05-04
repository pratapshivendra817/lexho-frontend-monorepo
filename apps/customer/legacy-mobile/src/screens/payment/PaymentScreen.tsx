import { StyleSheet, View } from "react-native";
import { Button, Card, Text } from "react-native-paper";
import { useMutation } from "@tanstack/react-query";
import LinearGradient from "react-native-linear-gradient";
import { initiatePayment } from "../../api/paymentApi";
import { SkeletonList } from "../../components/common/SkeletonList";
import type { PaymentMode } from "../../types/contracts";

export function PaymentScreen() {
  const payment = useMutation({ mutationFn: (mode: PaymentMode) => initiatePayment({ mode }) });
  return (
    <View style={styles.root}>
      <LinearGradient colors={["#7C3AED", "#2563EB"]} style={styles.hero}>
        <Text style={styles.heroTitle}>Secure Payments</Text>
        <Text style={styles.heroSub}>UPI, Card, Wallet, COD with instant status updates.</Text>
      </LinearGradient>

      <Text variant="headlineSmall">Choose Payment Method</Text>
      <Card style={styles.card}><Card.Content><Button mode="contained" onPress={() => payment.mutate("UPI")} loading={payment.isPending}>Pay via UPI</Button></Card.Content></Card>
      <Card style={styles.card}><Card.Content><Button mode="contained-tonal" onPress={() => payment.mutate("CARD")} disabled={payment.isPending}>Pay via Card</Button></Card.Content></Card>
      <Card style={styles.card}><Card.Content><Button mode="contained-tonal" onPress={() => payment.mutate("WALLET")} disabled={payment.isPending}>Pay via Wallet</Button></Card.Content></Card>
      <Card style={styles.card}><Card.Content><Button mode="outlined" onPress={() => payment.mutate("COD")} disabled={payment.isPending}>Cash on Delivery</Button></Card.Content></Card>

      {payment.isPending ? <SkeletonList rows={2} /> : null}
      {payment.isSuccess ? <Text style={styles.success}>Payment initiated successfully.</Text> : null}
      {payment.isError ? <Text style={styles.error}>{payment.error instanceof Error ? payment.error.message : "Payment failed"}</Text> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, gap: 10 },
  hero: { borderRadius: 18, padding: 14 },
  heroTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "900" },
  heroSub: { color: "#EDE9FE", marginTop: 4 },
  card: { borderRadius: 14 },
  success: { color: "#16A34A", fontWeight: "700" },
  error: { color: "#DC2626", fontWeight: "700" },
});
