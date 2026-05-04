import { FlatList, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";
import { getNotifications } from "../../api/notificationApi";

export function NotificationsScreen() {
  const notifications = useQuery<any>({ queryKey: ["notifications"], queryFn: () => getNotifications() });
  const data = notifications.data?.data ?? notifications.data ?? [];
  return (
    <View style={styles.root}>
      <Text variant="headlineSmall">Notifications</Text>
      <Button mode="outlined" onPress={() => notifications.refetch()}>Refresh</Button>
      <FlatList data={data} keyExtractor={(item, idx) => String(item?.id ?? idx)} renderItem={({ item }) => <Text style={styles.item}>{item?.title ?? "Notification"}</Text>} ListEmptyComponent={<Text>No notifications</Text>} />
    </View>
  );
}
const styles = StyleSheet.create({ root: { flex: 1, padding: 16, gap: 10 }, item: { paddingVertical: 8 } });
