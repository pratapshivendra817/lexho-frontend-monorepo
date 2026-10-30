import React, { useCallback } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { COLORS } from "../../constants/colors";
import { useAppDispatch, useAppSelector } from "../../hooks/useRedux";
import { fetchChatThreads } from "../../redux/slices/chatSlice";
import type { ChatThread } from "../../types/chat";

const CHAT_LIST_COPY = {
  title: "Order Chats",
  subtitle: "Customer conversations linked to assigned orders",
  tapToRetry: "Tap to retry",
  noConversations: "No order conversations yet.",
  openConversation: "Open conversation",
  order: "Order",
} as const;

export default function ChatListScreen({ navigation }: any) {
  const dispatch = useAppDispatch();
  const { threads, threadsPage, threadsHasMore, threadsLoading, threadsError, connected } = useAppSelector(state => state.chat);
  const showInitialLoader = threadsLoading && threads.length === 0 && !threadsError;

  const refresh = useCallback(() => {
    dispatch(fetchChatThreads(0));
  }, [dispatch]);

  useFocusEffect(useCallback(() => {
    refresh();
  }, [refresh]));

  const loadMore = () => {
    if (!threadsLoading && threadsHasMore) dispatch(fetchChatThreads(threadsPage + 1));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{CHAT_LIST_COPY.title}</Text>
          <Text style={styles.subtitle}>{CHAT_LIST_COPY.subtitle}</Text>
        </View>
        <View style={[styles.connectionDot, connected ? styles.online : styles.offline]} />
      </View>

      {threadsError ? (
        <TouchableOpacity style={styles.errorCard} onPress={refresh} accessibilityRole="button">
          <Text style={styles.errorText}>{threadsError}</Text>
          <Text style={styles.retryText}>{CHAT_LIST_COPY.tapToRetry}</Text>
        </TouchableOpacity>
      ) : null}

      <FlatList
        testID="chat-list"
        data={threads}
        keyExtractor={item => String(item.orderId)}
        contentContainerStyle={threads.length ? styles.list : styles.emptyList}
        refreshControl={<RefreshControl refreshing={threadsLoading && threadsPage === 0} onRefresh={refresh} tintColor={COLORS.secondary} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={showInitialLoader ? <ActivityIndicator color={COLORS.secondary} /> : <Text style={styles.emptyText}>{CHAT_LIST_COPY.noConversations}</Text>}
        ListFooterComponent={threadsLoading && threads.length ? <ActivityIndicator color={COLORS.secondary} /> : null}
        renderItem={({ item }) => (
          <ChatRow
            item={item}
            onPress={() => navigation.navigate("Chat", { orderId: item.orderId, customerName: item.customerName })}
          />
        )}
      />
    </View>
  );
}

function ChatRow({ item, onPress }: { item: ChatThread; onPress: () => void }) {
  const preview = item.lastMessage?.text || item.serviceName || CHAT_LIST_COPY.openConversation;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} accessibilityRole="button">
      <View style={styles.avatar}><Text style={styles.avatarText}>{item.customerName.slice(0, 1).toUpperCase()}</Text></View>
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.customerName} numberOfLines={1}>{item.customerName}</Text>
          <Text style={styles.time}>{formatTime(item.updatedAt)}</Text>
        </View>
        <Text style={styles.orderLabel}>{`${CHAT_LIST_COPY.order} #${item.orderId}${item.serviceName ? ` - ${item.serviceName}` : ""}`}</Text>
        <Text style={[styles.preview, item.unreadCount > 0 && styles.previewUnread]} numberOfLines={1}>{preview}</Text>
      </View>
      {item.unreadCount > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{Math.min(item.unreadCount, 99)}</Text></View> : null}
    </TouchableOpacity>
  );
}

function formatTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: COLORS.borderSoft },
  title: { color: COLORS.textPrimary, fontSize: 24, fontWeight: "800" },
  subtitle: { color: COLORS.textSecondary, fontSize: 12, marginTop: 3 },
  connectionDot: { width: 10, height: 10, borderRadius: 5 },
  online: { backgroundColor: COLORS.success },
  offline: { backgroundColor: COLORS.danger },
  list: { padding: 14, gap: 10 },
  emptyList: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyText: { color: COLORS.textSecondary, textAlign: "center" },
  errorCard: { margin: 14, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.danger, backgroundColor: COLORS.surface },
  errorText: { color: COLORS.danger, fontWeight: "700" },
  retryText: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.borderSoft, borderRadius: 16, padding: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border },
  avatarText: { color: COLORS.secondary, fontWeight: "800", fontSize: 18 },
  cardBody: { flex: 1, gap: 2 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  customerName: { flex: 1, color: COLORS.textPrimary, fontWeight: "800", fontSize: 15 },
  time: { color: COLORS.textMuted, fontSize: 10 },
  orderLabel: { color: COLORS.accent, fontSize: 11, fontWeight: "700" },
  preview: { color: COLORS.textSecondary, fontSize: 13 },
  previewUnread: { color: COLORS.textPrimary, fontWeight: "700" },
  badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.secondary },
  badgeText: { color: COLORS.background, fontSize: 11, fontWeight: "900" },
});
