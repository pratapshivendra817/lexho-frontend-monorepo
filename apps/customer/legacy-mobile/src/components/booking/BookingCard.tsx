import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { BookingStatus } from "../../types/bookingLifecycle";
import { StatusBadge } from "./StatusBadge";


import { COLORS } from '../../theme/colors';

type Props = {
  title: string;
  subtitle: string;
  amount: string;
  status: BookingStatus | string;
  onPress?: () => void;
};

export function BookingCard({ title, subtitle, amount, status, onPress }: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.row}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.amount}>{amount}</Text>
      </View>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <StatusBadge status={status} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.borderSoft, backgroundColor: COLORS.white, gap: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  title: { color: COLORS.slate900, fontWeight: "800", fontSize: 15, flex: 1 },
  subtitle: { color: COLORS.slate500, fontSize: 13, fontWeight: "600" },
  amount: { color: COLORS.slate900, fontSize: 15, fontWeight: "900" },
});





