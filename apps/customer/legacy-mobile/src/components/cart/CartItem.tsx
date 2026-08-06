import { Pressable, StyleSheet, Text, View } from "react-native";


import { COLORS } from '../../theme/colors';

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
    borderColor: COLORS.borderSoft,
    backgroundColor: COLORS.white,
    padding: 12,
    gap: 8,
    marginBottom: 10,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontSize: 15, fontWeight: "800", color: COLORS.slate900, flex: 1, marginRight: 8 },
  remove: { color: COLORS.danger, fontWeight: "700", fontSize: 12 },
  price: { color: COLORS.slate700, fontWeight: "700" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.offWhite,
  },
  stepText: { fontSize: 16, fontWeight: "800", color: COLORS.primary },
  qty: { minWidth: 18, textAlign: "center", fontWeight: "800", color: COLORS.slate900 },
  total: { color: COLORS.teal700, fontWeight: "800", fontSize: 13 },
});






