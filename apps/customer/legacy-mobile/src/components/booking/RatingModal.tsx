import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

export function RatingModal({
  visible,
  value,
  onChange,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  value: number;
  onChange: (v: number) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Rate Partner</Text>
          <View style={styles.row}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => onChange(n)}>
                <MaterialCommunityIcon name={n <= value ? "star" : "star-outline"} size={30} color={n <= value ? "#F59E0B" : "#94A3B8"} />
              </Pressable>
            ))}
          </View>
          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.ghostBtn}>
              <Text style={styles.ghostText}>Later</Text>
            </Pressable>
            <Pressable onPress={onSubmit} style={styles.primaryBtn}>
              <Text style={styles.primaryText}>Submit</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.52)", justifyContent: "center", padding: 16 },
  card: { borderRadius: 18, backgroundColor: "#FFFFFF", padding: 16, gap: 14 },
  title: { color: "#0F172A", fontSize: 18, fontWeight: "800", textAlign: "center" },
  row: { flexDirection: "row", justifyContent: "center", gap: 6 },
  actions: { flexDirection: "row", gap: 10 },
  ghostBtn: { flex: 1, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 12, paddingVertical: 11, alignItems: "center" },
  ghostText: { color: "#1E293B", fontWeight: "700" },
  primaryBtn: { flex: 1, borderRadius: 12, backgroundColor: "#0EA5E9", paddingVertical: 11, alignItems: "center" },
  primaryText: { color: "#FFFFFF", fontWeight: "800" },
});
