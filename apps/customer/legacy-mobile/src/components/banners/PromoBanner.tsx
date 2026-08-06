import { StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import LinearGradient from "react-native-linear-gradient";
import { COLORS } from '../../theme/colors';

export function PromoBanner({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <LinearGradient colors={[COLORS.primary, COLORS.blue600]} style={styles.banner}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: 18, padding: 16, marginBottom: 12 },
  title: { color: COLORS.white, fontSize: 20, fontWeight: "800" },
  subtitle: { color: COLORS.borderSoft, marginTop: 6 },
});






