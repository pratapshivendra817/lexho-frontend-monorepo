import React from "react";
import { FlatList, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAppDispatch, useAppSelector } from "../../hooks/useRedux";
import { markAllRead, setNotifications } from "../../redux/slices/notificationSlice";
import { getPartnerNotifications } from "../../services/partnerService";
import { COLORS } from "../../constants/colors";

export default function NotificationsScreen() {
  const dispatch = useAppDispatch();
  const items = useAppSelector((s) => s.notifications.items);
  const unreadCount = useAppSelector((s) => s.notifications.unreadCount);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = React.useState<number | null>(null);

  const loadNotifications = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const rows = await getPartnerNotifications({ page: 0, size: 20 });
      dispatch(setNotifications(rows));
      setLastSyncAt(Date.now());
    } catch (e: any) {
      setError(String(e?.message ?? "Unable to fetch notifications"));
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useFocusEffect(
    React.useCallback(() => {
      void loadNotifications();
    }, [loadNotifications]),
  );

  React.useEffect(() => {
    dispatch(markAllRead());
  }, [dispatch]);

  const onShareNotification = async (item: { id: string; title: string; message: string; createdAt?: string }) => {
    const message = [
      "Partner Notification",
      `Title: ${item.title ?? "Notification"}`,
      `Message: ${item.message ?? "-"}`,
      `Time: ${item.createdAt ?? "-"}`,
      `ID: ${item.id}`,
    ].join("\n");
    await Share.share({ title: item.title ?? "Notification", message });
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={styles.headerBar}>
        <Text
          style={[
            styles.syncChip,
            error ? styles.syncChipError : loading ? styles.syncChipLoading : styles.syncChipOk,
          ]}
        >
          {error ? "Sync failed" : loading ? "Syncing..." : "Synced"}
        </Text>
        <Text style={styles.unreadChip}>{`Unread: ${unreadCount}`}</Text>
        {__DEV__ ? (
          <Text style={styles.debugChip}>
            {`Last: ${lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString() : "-"}`}
          </Text>
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => void loadNotifications()}>
            <Text style={styles.retryText}>Retry API</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        style={{ flex: 1, backgroundColor: COLORS.background }}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListEmptyComponent={<Text style={styles.empty}>No notifications</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.message}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.time}>{item.createdAt ?? "-"}</Text>
              {__DEV__ ? <Text style={styles.idChip}>{`ID: ${item.id}`}</Text> : null}
            </View>
            <TouchableOpacity style={styles.shareBtn} onPress={() => void onShareNotification(item)}>
              <Text style={styles.shareText}>Share</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },
  syncChip: {
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: "hidden",
  },
  syncChipOk: { backgroundColor: "#DCFCE7", color: "#166534" },
  syncChipLoading: { backgroundColor: "#E2E8F0", color: "#334155" },
  syncChipError: { backgroundColor: "#FEE2E2", color: "#991B1B" },
  unreadChip: {
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#DBEAFE",
    color: "#1E3A8A",
  },
  debugChip: {
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#CCFBF1",
    color: "#0F766E",
  },
  errorCard: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.danger,
    backgroundColor: "rgba(220,53,69,0.08)",
    padding: 10,
    gap: 8,
  },
  errorText: { color: COLORS.danger, fontSize: 12 },
  retryBtn: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.surfaceElevated },
  retryText: { color: COLORS.textPrimary, fontWeight: "700", fontSize: 12 },
  card: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 12, gap: 4 },
  title: { color: COLORS.textPrimary, fontWeight: "700" },
  body: { color: COLORS.textSecondary },
  metaRow: { marginTop: 4, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  time: { color: COLORS.textMuted, fontSize: 11 },
  idChip: {
    color: "#0F766E",
    fontSize: 10,
    fontWeight: "700",
    backgroundColor: "#CCFBF1",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: "hidden",
  },
  shareBtn: {
    marginTop: 6,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: COLORS.surfaceSoft,
  },
  shareText: { color: COLORS.textPrimary, fontWeight: "700", fontSize: 12 },
  empty: { color: COLORS.textSecondary, textAlign: "center", marginTop: 40 },
});
