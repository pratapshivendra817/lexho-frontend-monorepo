import { View, StyleSheet } from "react-native";
import { IconButton, Text } from "react-native-paper";

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
        {onBack ? <IconButton icon="arrow-left" onPress={onBack} /> : null}
        <View>
          <Text variant="titleLarge">{title}</Text>
          {subtitle ? <Text variant="bodySmall">{subtitle}</Text> : null}
        </View>
      </View>

      {rightActionIcon ? <IconButton icon={rightActionIcon} onPress={onRightActionPress} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});

