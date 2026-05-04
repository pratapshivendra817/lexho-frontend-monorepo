import { StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";

type Props = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, description, actionLabel, onAction }: Props) {
  return (
    <View style={styles.container}>
      <Text variant="titleMedium">{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onAction ? (
        <Button mode="contained" onPress={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: "center",
    gap: 10,
  },
  description: {
    textAlign: "center",
    opacity: 0.75,
  },
});

