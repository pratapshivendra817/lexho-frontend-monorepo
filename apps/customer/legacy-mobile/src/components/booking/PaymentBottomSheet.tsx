import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { PaymentCard } from "./PaymentCard";
import { COLORS } from '../../theme/colors';

const methods = [
  { key: "UPI", hint: "GPay, PhonePe, Paytm" },
  { key: "CARD", hint: "Credit / Debit cards" },
  { key: "COD", hint: "Pay after service" },
];

export function PaymentBottomSheet({
  visible,
  selected,
  onSelect,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.sheet}>
        <Text style={styles.title}>Choose Payment Method</Text>
        <View style={styles.list}>
          {methods.map((row) => (
            <PaymentCard key={row.key} method={row.key} hint={row.hint} selected={selected === row.key} onPress={() => onSelect(row.key)} />
          ))}
        </View>
        <Pressable style={styles.cta} onPress={onConfirm}>
          <Text style={styles.ctaText}>Continue</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.34)" },
  sheet: { backgroundColor: COLORS.offWhite, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, gap: 12 },
  title: { color: COLORS.slate900, fontSize: 17, fontWeight: "900" },
  list: { gap: 8 },
  cta: { borderRadius: 12, backgroundColor: COLORS.primary, alignItems: "center", paddingVertical: 12, marginTop: 4 },
  ctaText: { color: COLORS.white, fontSize: 14, fontWeight: "900" },
});






