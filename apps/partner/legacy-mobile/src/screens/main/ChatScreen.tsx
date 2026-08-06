import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { COLORS } from "../../constants/colors";
import { useAppDispatch, useAppSelector } from "../../hooks/useRedux";
import { clearThreadUnread, fetchMessages, readOrderMessages, sendChatMessage } from "../../redux/slices/chatSlice";
import { chatSocket } from "../../services/chatSocket";
import type { ChatMessage } from "../../types/chat";

export default function ChatScreen({ route, navigation }: any) {
  const orderId = Number(route?.params?.orderId);
  const customerName = String(route?.params?.customerName ?? `Order #${orderId}`);
  const dispatch = useAppDispatch();
  const bucket = useAppSelector(state => state.chat.messagesByOrder[String(orderId)]);
  const customerTyping = useAppSelector(state => Boolean(state.chat.typingByOrder[String(orderId)]));
  const connected = useAppSelector(state => state.chat.connected);
  const [text, setText] = useState("");
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messages = useMemo(() => bucket?.items ?? [], [bucket?.items]);
  const invertedMessages = useMemo(() => [...messages].reverse(), [messages]);

  useEffect(() => {
    navigation.setOptions?.({ title: customerName, headerShown: true, headerStyle: { backgroundColor: COLORS.surface }, headerTintColor: COLORS.textPrimary });
    dispatch(fetchMessages({ orderId, page: 0 }));
    dispatch(clearThreadUnread(orderId));
    const unsubscribe = chatSocket.subscribe(orderId);
    return () => {
      unsubscribe();
      if (typingTimer.current) clearTimeout(typingTimer.current);
      chatSocket.sendTyping(orderId, false);
    };
  }, [customerName, dispatch, navigation, orderId]);

  useEffect(() => {
    const unreadIds = messages.filter(message => message.senderType === "CUSTOMER" && message.status !== "read").map(message => message.id).filter(Boolean);
    if (!unreadIds.length) return;
    dispatch(readOrderMessages({ orderId, messageIds: unreadIds }));
    chatSocket.sendReadReceipt(orderId, unreadIds);
  }, [dispatch, messages, orderId]);

  const onTextChange = (value: string) => {
    setText(value);
    chatSocket.sendTyping(orderId, value.trim().length > 0);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => chatSocket.sendTyping(orderId, false), 1200);
  };

  const send = useCallback(() => {
    const value = text.trim();
    if (!value) return;
    setText("");
    chatSocket.sendTyping(orderId, false);
    dispatch(sendChatMessage({ orderId, text: value }));
    requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }));
  }, [dispatch, orderId, text]);

  const loadOlder = () => {
    if (bucket?.hasMore && !bucket.loadingMore && !bucket.loading) dispatch(fetchMessages({ orderId, page: bucket.page + 1 }));
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <View style={styles.statusBar}>
        <View style={[styles.dot, connected ? styles.online : styles.offline]} />
        <Text style={styles.statusText}>{customerTyping ? `${customerName} is typing...` : connected ? "Live" : "Reconnecting..."}</Text>
      </View>

      {bucket?.error ? (
        <TouchableOpacity style={styles.errorCard} onPress={() => dispatch(fetchMessages({ orderId, page: 0 }))}>
          <Text style={styles.errorText}>{bucket.error} Tap to retry.</Text>
        </TouchableOpacity>
      ) : null}

      <FlatList
        ref={listRef}
        inverted
        data={invertedMessages}
        keyExtractor={item => item.id || item.clientId || item.createdAt}
        contentContainerStyle={styles.messages}
        onEndReached={loadOlder}
        onEndReachedThreshold={0.3}
        onContentSizeChange={() => {
          if ((bucket?.page ?? 0) === 0) listRef.current?.scrollToOffset({ offset: 0, animated: true });
        }}
        ListFooterComponent={bucket?.loadingMore ? <ActivityIndicator color={COLORS.secondary} /> : null}
        ListEmptyComponent={bucket?.loading ? <ActivityIndicator color={COLORS.secondary} /> : <Text style={styles.empty}>Start the conversation for this order.</Text>}
        renderItem={({ item }) => <MessageBubble message={item} onRetry={() => dispatch(sendChatMessage({ orderId, text: item.text, clientId: item.clientId ?? item.id }))} />}
      />

      <View style={styles.composer}>
        <TextInput
          value={text}
          onChangeText={onTextChange}
          placeholder="Message customer"
          placeholderTextColor={COLORS.textMuted}
          style={styles.input}
          multiline
          maxLength={2000}
          accessibilityLabel="Message customer"
        />
        <TouchableOpacity style={[styles.sendButton, !text.trim() && styles.sendDisabled]} disabled={!text.trim()} onPress={send} accessibilityLabel="Send message">
          <MaterialCommunityIcons name="send" color={COLORS.background} size={20} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function MessageBubble({ message, onRetry }: { message: ChatMessage; onRetry: () => void }) {
  const mine = message.senderType === "PARTNER";
  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <View style={[styles.messageRow, mine ? styles.mineRow : styles.theirRow]}>
      <TouchableOpacity disabled={message.status !== "failed"} onPress={onRetry} style={[styles.bubble, mine ? styles.mineBubble : styles.theirBubble, message.status === "failed" && styles.failedBubble]}>
        <Text style={[styles.messageText, mine && styles.mineText]}>{message.text}</Text>
        <View style={styles.messageMeta}>
          <Text style={[styles.messageTime, mine && styles.mineMeta]}>{time}</Text>
          {mine ? <Text style={[styles.messageStatus, message.status === "failed" && styles.failedText]}>{message.status === "failed" ? "Failed • tap to retry" : message.status}</Text> : null}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  statusBar: { minHeight: 30, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.borderSoft },
  dot: { width: 7, height: 7, borderRadius: 4 },
  online: { backgroundColor: COLORS.success },
  offline: { backgroundColor: COLORS.danger },
  statusText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: "700" },
  messages: { padding: 14, gap: 8, flexGrow: 1, justifyContent: "flex-start" },
  empty: { color: COLORS.textSecondary, textAlign: "center", padding: 30, transform: [{ scaleY: -1 }] },
  messageRow: { width: "100%", flexDirection: "row" },
  mineRow: { justifyContent: "flex-end" },
  theirRow: { justifyContent: "flex-start" },
  bubble: { maxWidth: "82%", paddingHorizontal: 12, paddingVertical: 9, borderRadius: 16, borderWidth: 1 },
  mineBubble: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary, borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: COLORS.surface, borderColor: COLORS.borderSoft, borderBottomLeftRadius: 4 },
  failedBubble: { borderColor: COLORS.danger },
  messageText: { color: COLORS.textPrimary, fontSize: 15, lineHeight: 20 },
  mineText: { color: COLORS.background },
  messageMeta: { marginTop: 4, flexDirection: "row", justifyContent: "flex-end", gap: 7 },
  messageTime: { color: COLORS.textMuted, fontSize: 9 },
  mineMeta: { color: "rgba(2,10,30,0.7)" },
  messageStatus: { color: "rgba(2,10,30,0.75)", fontSize: 9, textTransform: "capitalize" },
  failedText: { color: COLORS.danger, fontWeight: "800" },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 10, padding: 10, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.borderSoft },
  input: { flex: 1, maxHeight: 110, minHeight: 44, color: COLORS.textPrimary, backgroundColor: COLORS.surfaceSoft, borderWidth: 1, borderColor: COLORS.borderSoft, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 10 },
  sendButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.secondary },
  sendDisabled: { opacity: 0.45 },
  errorCard: { margin: 10, padding: 9, borderWidth: 1, borderColor: COLORS.danger, borderRadius: 10, backgroundColor: COLORS.surface },
  errorText: { color: COLORS.danger, fontSize: 12, textAlign: "center" },
});
