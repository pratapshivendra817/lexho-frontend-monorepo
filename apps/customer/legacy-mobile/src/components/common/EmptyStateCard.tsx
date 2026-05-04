import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

export function EmptyStateCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.box}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { padding: 16, borderRadius: 16, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0" },
  title: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  subtitle: { marginTop: 4, color: "#64748B" },
});
