import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { bookingTheme } from "./bookingTheme";

export function BookingStageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: bookingTheme.colors.pageBg, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 18, gap: 14 },
  header: { gap: 8 },
  title: { color: bookingTheme.colors.title, fontSize: 26, fontWeight: "900", letterSpacing: 0.2 },
  subtitle: { color: bookingTheme.colors.subtitle, fontSize: 14, fontWeight: "600", lineHeight: 21 },
  body: { gap: 13 },
});
