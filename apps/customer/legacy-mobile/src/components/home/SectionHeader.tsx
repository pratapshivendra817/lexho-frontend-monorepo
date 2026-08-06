import { memo } from "react";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";


import { COLORS } from '../../theme/colors';
import { spacing } from "../../constants/theme";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
  subtitleColor?: string;
  titleColor?: string;
};

function SectionHeaderComponent({ title, subtitle, rightSlot, subtitleColor, titleColor }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.content}>
        <Text style={[styles.title, titleColor ? { color: titleColor } : null]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, subtitleColor ? { color: subtitleColor } : null]}>{subtitle}</Text> : null}
      </View>
      {rightSlot}
    </View>
  );
}

export const SectionHeader = memo(SectionHeaderComponent);

const styles = StyleSheet.create({
  row: {
    marginHorizontal: spacing.sm + 2,
    marginTop: spacing.xl + 2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  content: {
    flexShrink: 1,
    paddingRight: spacing.sm,
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    color: COLORS.slate900,
    letterSpacing: 0.1,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.slate500,
  },
});





