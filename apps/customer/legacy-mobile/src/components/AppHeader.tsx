import { View, StyleSheet } from "react-native";
import { IconButton, Text } from "react-native-paper";
import { palette, radii, shadows, spacing } from "../constants/theme";

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightActionIcon?: string;
  onRightActionPress?: () => void;
};

export function AppHeader({ title, subtitle, onBack, rightActionIcon, onRightActionPress }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {onBack ? <IconButton icon="arrow-left" iconColor={palette.primaryDark} onPress={onBack} /> : null}
        <View>
          <Text variant="titleLarge" style={styles.title}>{title}</Text>
          {subtitle ? <Text variant="bodySmall" style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>

      {rightActionIcon ? <IconButton icon={rightActionIcon} iconColor={palette.primaryDark} onPress={onRightActionPress} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: radii.lg,
    backgroundColor: palette.surfaceAlt,
    ...shadows.sm,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  title: { color: palette.primaryDark, fontWeight: "800" },
  subtitle: { color: palette.muted },
});



