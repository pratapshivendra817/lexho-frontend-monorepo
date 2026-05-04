import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import LinearGradient from "react-native-linear-gradient";

export function PromoBanner({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <LinearGradient colors={["#0EA5E9", "#2563EB"]} style={styles.banner}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: 18, padding: 16, marginBottom: 12 },
  title: { color: "#fff", fontSize: 20, fontWeight: "800" },
  subtitle: { color: "#E2E8F0", marginTop: 6 },
});
