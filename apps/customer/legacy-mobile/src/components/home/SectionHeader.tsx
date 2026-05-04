import { memo } from "react";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
};

function SectionHeaderComponent({ title, subtitle, rightSlot }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {rightSlot}
    </View>
  );
}

export const SectionHeader = memo(SectionHeaderComponent);

const styles = StyleSheet.create({
  row: {
    marginHorizontal: 16,
    marginTop: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  content: {
    flexShrink: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: 0.1,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#64748B",
  },
});
