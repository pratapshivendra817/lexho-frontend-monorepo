import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { palette, spacing } from "../../constants/theme";

type Props = { title: string; subtitle?: string; rightSlot?: React.ReactNode };

export function SectionHeader({ title, subtitle, rightSlot }: Props) {
  return (
    <View style={styles.row}>
      <View>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {rightSlot}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  title: { fontSize: 18, fontWeight: "800", color: palette.text },
  subtitle: { color: palette.muted },
});


