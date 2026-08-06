import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { COLORS } from '../../theme/colors';

export function PartnerCard({ name, eta, rating }: { name: string; eta: string; rating: number }) {
  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <MaterialCommunityIcon name="account" size={24} color={COLORS.slate900} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.meta}>ETA {eta}</Text>
      </View>
      <View style={styles.rate}>
        <MaterialCommunityIcon name="star" size={14} color={COLORS.warning} />
        <Text style={styles.rateText}>{rating.toFixed(1)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, borderColor: COLORS.borderSoft, backgroundColor: COLORS.white, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.offWhite, alignItems: "center", justifyContent: "center" },
  info: { flex: 1, gap: 2 },
  name: { color: COLORS.slate900, fontSize: 14, fontWeight: "800" },
  meta: { color: COLORS.slate500, fontSize: 12, fontWeight: "600" },
  rate: { flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 999, backgroundColor: COLORS.offWhite, paddingHorizontal: 8, paddingVertical: 4 },
  rateText: { color: COLORS.warning, fontWeight: "800", fontSize: 12 },
});






