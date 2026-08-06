import { StyleSheet, View } from "react-native";
import { Button, Card, Text } from "react-native-paper";

import type { ServiceItem } from "../types/api";
import { formatCurrency } from "../utils/format";

type Props = {
  service: ServiceItem;
  onPress?: () => void;
  onAdd?: () => void;
};

export function ServiceCard({ service, onPress, onAdd }: Props) {
  return (
    <Card style={styles.card} onPress={onPress}>
      <Card.Content style={styles.content}>
        <View style={styles.info}>
          <Text variant="titleMedium">{service.name}</Text>
          {service.description ? (
            <Text variant="bodySmall" numberOfLines={2}>
              {service.description}
            </Text>
          ) : null}
          <Text variant="titleSmall">{formatCurrency(service.price)}</Text>
        </View>
        {onAdd ? (
          <Button mode="contained-tonal" onPress={onAdd}>
            Add
          </Button>
        ) : null}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
  },
  content: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  info: {
    flex: 1,
    gap: 5,
    paddingRight: 12,
  },
});



