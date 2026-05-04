import { Pressable, StyleSheet, Text, View } from "react-native";

type CartSummaryProps = {
  grandTotal: number;
  canCheckout: boolean;
  onCheckout: () => void;
};

export function CartSummary({ grandTotal, canCheckout, onCheckout }: CartSummaryProps) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.label}>Grand Total</Text>
        <Text style={styles.amount}>Rs {Number(grandTotal).toFixed(2)}</Text>
      </View>
      <Pressable onPress={onCheckout} disabled={!canCheckout} style={[styles.btn, !canCheckout && styles.btnDisabled]}>
        <Text style={styles.btnText}>Ready for Booking</Text>
      </Pressable>
      {!canCheckout ? <Text style={styles.helper}>Select address and schedule to continue.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DCE7F3",
    backgroundColor: "#FFFFFF",
    padding: 12,
    gap: 8,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { color: "#334155", fontWeight: "700" },
  amount: { color: "#0F766E", fontSize: 18, fontWeight: "900" },
  btn: {
    borderRadius: 12,
    backgroundColor: "#0EA5E9",
    paddingVertical: 11,
    alignItems: "center",
  },
  btnDisabled: { backgroundColor: "#94A3B8" },
  btnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
  helper: { fontSize: 11, color: "#64748B" },
});
