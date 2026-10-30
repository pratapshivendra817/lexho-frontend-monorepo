import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { bookingTheme } from "./bookingTheme";
import { COLORS } from "../../theme/colors";
import { radii, spacing } from "../../constants/theme";

export function BookingStageShell({
  title,
  subtitle,
  children,
  fullWidth = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <View style={[styles.root, fullWidth && styles.fullWidth]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullWidth: { paddingHorizontal: 0 },
  root: { flex: 1, backgroundColor: bookingTheme.colors.pageBg, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 18, gap: 14 },
  header: {
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(217,164,65,0.35)",
    borderRadius: radii.lg,
    backgroundColor: COLORS.navy,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.md,
  },
  title: { color: bookingTheme.colors.title, fontSize: 26, fontWeight: "900", letterSpacing: 0.2 },
  subtitle: { color: bookingTheme.colors.subtitle, fontSize: 14, fontWeight: "600", lineHeight: 21 },
  body: { gap: 13 },
});




