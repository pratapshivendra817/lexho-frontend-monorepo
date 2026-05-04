import { View, StyleSheet } from "react-native";
import { IconButton, Text } from "react-native-paper";

type Props = {
  quantity: number;
  onChange: (next: number) => void;
  min?: number;
};

export function QuantityStepper({ quantity, onChange, min = 1 }: Props) {
  return (
    <View style={styles.container}>
      <IconButton icon="minus" size={16} onPress={() => onChange(Math.max(min, quantity - 1))} />
      <Text variant="titleMedium">{quantity}</Text>
      <IconButton icon="plus" size={16} onPress={() => onChange(quantity + 1)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
  },
});

