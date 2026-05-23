import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

type Props = {
  method: string;
  hint: string;
  selected?: boolean;
  onPress?: () => void;
};

export function PaymentCard({ method, hint, selected, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={[styles.card, selected && styles.cardActive]}>
      <View style={styles.left}>
        <MaterialCommunityIcon name="credit-card-outline" size={22} color="#0F172A" />
        <View>
          <Text style={styles.title}>{method}</Text>
          <Text style={styles.hint}>{hint}</Text>
        </View>
      </View>
      <MaterialCommunityIcon name={selected ? "radiobox-marked" : "radiobox-blank"} size={22} color={selected ? "#16A34A" : "#6B7280"} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardActive: { borderColor: "#16A34A", backgroundColor: "#ECFDF5" },
  left: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { color: "#0F172A", fontSize: 15, fontWeight: "800" },
  hint: { color: "#64748B", fontSize: 12, fontWeight: "600" },
});
