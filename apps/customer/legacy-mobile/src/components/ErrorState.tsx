import { StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";

type Props = {
  message?: string;
  onRetry?: () => void;
};

export function ErrorState({ message = "Something went wrong", onRetry }: Props) {
  return (
    <View style={styles.container}>
      <Text variant="titleMedium">Unable to load data</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Button mode="contained" onPress={onRetry}>
          Retry
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
  message: {
    textAlign: "center",
    opacity: 0.75,
  },
});



