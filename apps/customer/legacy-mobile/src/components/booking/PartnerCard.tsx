import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

export function PartnerCard({ name, eta, rating }: { name: string; eta: string; rating: number }) {
  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <MaterialCommunityIcon name="account" size={24} color="#0F172A" />
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.meta}>ETA {eta}</Text>
      </View>
      <View style={styles.rate}>
        <MaterialCommunityIcon name="star" size={14} color="#F59E0B" />
        <Text style={styles.rateText}>{rating.toFixed(1)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#FFFFFF", padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#ECFEFF", alignItems: "center", justifyContent: "center" },
  info: { flex: 1, gap: 2 },
  name: { color: "#0F172A", fontSize: 14, fontWeight: "800" },
  meta: { color: "#64748B", fontSize: 12, fontWeight: "600" },
  rate: { flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 999, backgroundColor: "#FFFBEB", paddingHorizontal: 8, paddingVertical: 4 },
  rateText: { color: "#92400E", fontWeight: "800", fontSize: 12 },
});
