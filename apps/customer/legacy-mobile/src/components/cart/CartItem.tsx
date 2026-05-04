import { Pressable, StyleSheet, Text, View } from "react-native";

type CartItemProps = {
  item: {
    itemId: number;
    name: string;
    quantity: number;
    price: number;
    totalPrice: number;
  };
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
};

export function CartItem({ item, onIncrease, onDecrease, onRemove }: CartItemProps) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.name}>{item.name}</Text>
        <Pressable onPress={onRemove}>
          <Text style={styles.remove}>Remove</Text>
        </Pressable>
      </View>
      <View style={styles.row}>
        <Text style={styles.price}>Rs {Number(item.price).toFixed(2)}</Text>
        <View style={styles.stepper}>
          <Pressable onPress={onDecrease} style={styles.stepBtn}>
            <Text style={styles.stepText}>-</Text>
          </Pressable>
          <Text style={styles.qty}>{item.quantity}</Text>
          <Pressable onPress={onIncrease} style={styles.stepBtn}>
            <Text style={styles.stepText}>+</Text>
          </Pressable>
        </View>
      </View>
      <Text style={styles.total}>Total: Rs {Number(item.totalPrice).toFixed(2)}</Text>
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
    marginBottom: 10,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontSize: 15, fontWeight: "800", color: "#0F172A", flex: 1, marginRight: 8 },
  remove: { color: "#DC2626", fontWeight: "700", fontSize: 12 },
  price: { color: "#334155", fontWeight: "700" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#BFD6EE",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F7FF",
  },
  stepText: { fontSize: 16, fontWeight: "800", color: "#0A2E66" },
  qty: { minWidth: 18, textAlign: "center", fontWeight: "800", color: "#0F172A" },
  total: { color: "#0F766E", fontWeight: "800", fontSize: 13 },
});
