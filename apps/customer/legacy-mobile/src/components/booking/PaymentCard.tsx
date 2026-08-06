import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";


import { COLORS } from '../../theme/colors';

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
        <MaterialCommunityIcon name="credit-card-outline" size={22} color={COLORS.slate900} />
        <View>
          <Text style={styles.title}>{method}</Text>
          <Text style={styles.hint}>{hint}</Text>
        </View>
      </View>
      <MaterialCommunityIcon name={selected ? "radiobox-marked" : "radiobox-blank"} size={22} color={selected ? COLORS.green600 : COLORS.slate500} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardActive: { borderColor: COLORS.green600, backgroundColor: COLORS.offWhite },
  left: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { color: COLORS.slate900, fontSize: 15, fontWeight: "800" },
  hint: { color: COLORS.slate500, fontSize: 12, fontWeight: "600" },
});







