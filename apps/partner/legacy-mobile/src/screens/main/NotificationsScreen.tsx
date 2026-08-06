import React from "react";
import { FlatList, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useAppDispatch, useAppSelector } from "../../hooks/useRedux";
import { markNotificationReadLocal, setNotifications } from "../../redux/slices/notificationSlice";
import { fetchNotifications, fetchUnreadNotificationCount, markNotificationRead, markWarningNotificationRead } from "../../services/notificationsService";
import { COLORS } from "../../constants/colors";
import type { PartnerNotification } from "../../types/notification";

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const items = useAppSelector((s) => s.notifications.items);
  const unreadCount = useAppSelector((s) => s.notifications.unreadCount);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = React.useState<number | null>(null);
  const [serverUnreadCount, setServerUnreadCount] = React.useState(0);

  const loadNotifications = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [rows, unread] = await Promise.all([
        fetchNotifications(),
        fetchUnreadNotificationCount(),
      ]);
      dispatch(setNotifications(rows));
      setServerUnreadCount(unread);
      setLastSyncAt(Date.now());
    } catch (e: any) {
      setError(String(e?.message ?? "Unable to fetch notifications"));
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useFocusEffect(
    React.useCallback(() => {
      loadNotifications().catch(() => null);
    }, [loadNotifications]),
  );

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

  const onOpenNotification = React.useCallback(async (item: PartnerNotification) => {
    if (!item.read) {
      if (item.source === "warning" && item.warningId) {
        await markWarningNotificationRead(item.warningId);
      } else {
        await markNotificationRead(item.id).catch(() => null);
        setServerUnreadCount((current) => Math.max(0, current - 1));
      }
      dispatch(markNotificationReadLocal(item.id));
    }

    if (item.source === "warning" || item.redirectType === "WARNING" || item.redirectType === "WARNINGS") {
      navigation.navigate("WarningCenter");
    }
  }, [dispatch, navigation]);

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
        <Text style={styles.unreadChip}>{`Unread: ${Math.max(unreadCount, serverUnreadCount)}`}</Text>
        {__DEV__ ? (
          <Text style={styles.debugChip}>
            {`Last: ${lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString() : "-"}`}
          </Text>
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadNotifications().catch(() => null)}>
            <Text style={styles.retryText}>Retry API</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <FlatList
        testID="notifications-list"
        data={items}
        keyExtractor={(item) => item.id}
        style={{ flex: 1, backgroundColor: COLORS.background }}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListEmptyComponent={<Text style={styles.empty}>No notifications</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, !item.read && styles.cardUnread]}
            activeOpacity={0.92}
            onPress={() => onOpenNotification(item)}
            accessibilityRole="button"
            accessibilityLabel={item.source === "warning" ? "Open warning notification" : "Open notification"}
          >
            <View style={styles.cardHeader}>
              <View style={styles.titleRow}>
                {!item.read ? <View style={styles.unreadDot} /> : null}
                <Text style={styles.title}>{item.title}</Text>
              </View>
              <TouchableOpacity
                style={styles.shareIconButton}
                onPress={() => onShareNotification(item)}
                accessibilityRole="button"
                accessibilityLabel="Share notification"
              >
                <MaterialCommunityIcons name="share-variant-outline" size={18} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.body}>{item.message}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.time}>{item.createdAt ?? "-"}</Text>
              {__DEV__ ? <Text style={styles.idChip}>{`ID: ${item.id}`}</Text> : null}
            </View>
          </TouchableOpacity>
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
  syncChipOk: { backgroundColor: COLORS.surfaceElevated, color: COLORS.accent },
  syncChipLoading: { backgroundColor: COLORS.surfaceSoft, color: COLORS.textSecondary },
  syncChipError: { backgroundColor: "#FEE2E2", color: "#991B1B" },
  unreadChip: {
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: COLORS.surfaceElevated,
    color: COLORS.accent,
  },
  debugChip: {
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: COLORS.surfaceSoft,
    color: COLORS.accent,
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
  cardUnread: { borderColor: COLORS.secondary, backgroundColor: COLORS.surfaceElevated },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  title: { color: COLORS.textPrimary, fontWeight: "700" },
  body: { color: COLORS.textSecondary },
  metaRow: { marginTop: 4, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  time: { color: COLORS.textMuted, fontSize: 11 },
  idChip: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: "700",
    backgroundColor: COLORS.surfaceSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: "hidden",
  },
  shareIconButton: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.danger,
  },
  empty: { color: COLORS.textSecondary, textAlign: "center", marginTop: 40 },
});
