import { Alert, FlatList, Share, StyleSheet, TouchableOpacity, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getNotifications, sendTestNotification } from "../../api/notificationApi";
import { useAppSelector } from "../../redux/hooks";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";

export function NotificationsScreen() {
  const authUserId = Number(useAppSelector((s) => s.auth.user?.id ?? 0));
  const notifications = useQuery<any>({
    queryKey: ["notifications"],
    queryFn: () => getNotifications({ userId: authUserId, page: 0, size: 50 }),
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
  });
  const testPushMutation = useMutation({
    mutationFn: async () =>
      sendTestNotification({
        userId: authUserId,
        title: "Test Notification",
        message: "Push working from backend",
        data: { redirectType: "NOTIFICATIONS", bookingId: "BKG123" },
      }),
    onSuccess: async () => {
      Alert.alert("Sent", "Test notification request sent.");
      await notifications.refetch();
    },
    onError: (e: any) => {
      Alert.alert("Failed", String(e?.message ?? "Unable to send test notification."));
    },
  });
  const data = notifications.data?.data ?? notifications.data ?? [];

  const onShareNotification = async (item: any) => {
    const title = String(item?.title ?? item?.subject ?? "Notification");
    const messageText = String(item?.message ?? item?.body ?? item?.description ?? "").trim();
    const message = [`Important Notification`, `Title: ${title}`, messageText ? `Message: ${messageText}` : ""]
      .filter(Boolean)
      .join("\n");
    await Share.share({ title, message });
  };

  return (
    <View style={styles.root}>
      <View style={styles.titleRow}>
        <Text variant="headlineSmall">Notifications</Text>
      </View>
      <View style={styles.row}>
        <Button mode="outlined" onPress={() => notifications.refetch()}>
          Refresh
        </Button>
        <Button
          mode="contained"
          onPress={() => testPushMutation.mutate()}
          loading={testPushMutation.isPending}
          disabled={testPushMutation.isPending || !Number.isFinite(authUserId) || authUserId <= 0}
        >
          Send Test Push
        </Button>
      </View>
      <FlatList
        data={data}
        keyExtractor={(item, idx) => String(item?.id ?? idx)}
        renderItem={({ item }) => {
          const title = String(item?.title ?? item?.subject ?? "Notification");
          const message = String(item?.message ?? item?.body ?? item?.description ?? "").trim();
          return (
            <View style={styles.itemWrap}>
              <Text style={styles.itemTitle}>{title}</Text>
              {message ? <Text style={styles.itemMessage}>{message}</Text> : null}
              <TouchableOpacity style={styles.shareBtn} onPress={() => void onShareNotification(item)}>
                <MaterialCommunityIcon name="share-variant-outline" size={15} color="#0F172A" />
                <Text style={styles.shareText}>Share</Text>
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={<Text>No notifications</Text>}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, gap: 10 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  row: { flexDirection: "row", gap: 8 },
  itemWrap: { paddingVertical: 10, gap: 4 },
  itemTitle: { fontSize: 18, fontWeight: "700" },
  itemMessage: { fontSize: 14, opacity: 0.85 },
  shareBtn: {
    marginTop: 4,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: "#F8FAFC",
  },
  shareText: { color: "#0F172A", fontSize: 12, fontWeight: "700" },
});
