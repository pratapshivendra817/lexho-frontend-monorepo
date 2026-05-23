import { StyleSheet, TouchableOpacity, View } from "react-native";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { Text } from "react-native-paper";

type Props = {
  label?: string;
  addressLine?: string;
  selected?: boolean;
  onPress?: () => void;
  onDelete?: () => void;
};

export function AddressCard({ label, addressLine, selected, onPress, onDelete }: Props) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[styles.card, selected && styles.selected]}>
      <View style={styles.content}>
        <View style={styles.left}>
          <Text style={styles.label}>{label || "OTHER"}</Text>
          <Text style={styles.address}>{addressLine || "Address not available"}</Text>
        </View>
        <View style={styles.actions}>
          {selected ? <MaterialCommunityIcon name="check-circle" color="#059669" size={20} /> : null}
          <TouchableOpacity onPress={onDelete} hitSlop={8}>
            <MaterialCommunityIcon name="delete-outline" color="#ef4444" size={20} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  selected: { borderColor: "#059669", backgroundColor: "#ecfdf5" },
  content: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  left: { flex: 1, gap: 6 },
  label: { fontWeight: "700", color: "#0f172a" },
  address: { color: "#475569" },
  actions: { flexDirection: "row", alignItems: "center", gap: 10 },
});
