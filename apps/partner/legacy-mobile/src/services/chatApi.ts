import API, { getReadableApiError } from "./api";
import type { ChatMessage, ChatPage, ChatThread } from "../types/chat";

const asArray = (payload: any): any[] => {
  const root = payload?.data?.data ?? payload?.data ?? payload ?? {};
  if (Array.isArray(root?.content)) return root.content;
  if (Array.isArray(root?.items)) return root.items;
  if (Array.isArray(root?.messages)) return root.messages;
  if (Array.isArray(root?.chats)) return root.chats;
  return Array.isArray(root) ? root : [];
};

const pageMeta = (payload: any, page: number, size: number, count: number) => {
  const root = payload?.data?.data ?? payload?.data ?? payload ?? {};
  const last = root?.last;
  const totalPages = Number(root?.totalPages);
  return {
    page: Number.isFinite(Number(root?.number)) ? Number(root.number) : page,
    hasMore: typeof last === "boolean" ? !last : Number.isFinite(totalPages) ? page + 1 < totalPages : count >= size,
  };
};

export const normalizeChatMessage = (row: any, orderId: number): ChatMessage => ({
  id: String(row?.id ?? row?.messageId ?? row?.clientId ?? ""),
  clientId: row?.clientId != null ? String(row.clientId) : undefined,
  orderId: Number(row?.orderId ?? row?.bookingId ?? orderId),
  senderId: row?.senderId != null ? String(row.senderId) : undefined,
  senderType: String(row?.senderType ?? row?.senderRole ?? "CUSTOMER").toUpperCase() as ChatMessage["senderType"],
  text: String(row?.text ?? row?.message ?? row?.body ?? ""),
  createdAt: String(row?.createdAt ?? row?.timestamp ?? new Date().toISOString()),
  status: String(row?.status ?? (row?.readAt ? "read" : "sent")).toLowerCase() as ChatMessage["status"],
  readAt: row?.readAt != null ? String(row.readAt) : undefined,
});

const normalizeThread = (row: any): ChatThread => {
  const orderId = Number(row?.orderId ?? row?.bookingId ?? row?.id);
  const lastRow = row?.lastMessage ?? row?.latestMessage;
  return {
    orderId,
    customerName: String(row?.customerName ?? row?.customer?.name ?? `Order #${orderId}`),
    serviceName: row?.serviceName ?? row?.service?.name,
    lastMessage: lastRow ? normalizeChatMessage(lastRow, orderId) : undefined,
    unreadCount: Number(row?.unreadCount ?? 0) || 0,
    updatedAt: row?.updatedAt ?? lastRow?.createdAt,
  };
};

export async function getChatThreads(page = 0, size = 20): Promise<ChatPage<ChatThread>> {
  try {
    const { data } = await API.get("/api/v1/partner/chats", { params: { page, size } });
    const rows = asArray(data);
    return { items: rows.map(normalizeThread), ...pageMeta(data, page, size, rows.length) };
  } catch (error) {
    throw new Error(getReadableApiError(error, "Unable to load chats"));
  }
}

export async function getOrderMessages(orderId: number, page = 0, size = 30): Promise<ChatPage<ChatMessage>> {
  try {
    const { data } = await API.get(`/api/v1/partner/orders/${orderId}/chat/messages`, { params: { page, size } });
    const rows = asArray(data).map(row => normalizeChatMessage(row, orderId));
    rows.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    return { items: rows, ...pageMeta(data, page, size, rows.length) };
  } catch (error) {
    throw new Error(getReadableApiError(error, "Unable to load messages"));
  }
}

export async function sendOrderMessage(orderId: number, text: string, clientId: string): Promise<ChatMessage> {
  try {
    const { data } = await API.post(`/api/v1/partner/orders/${orderId}/chat/messages`, { text, clientId });
    return normalizeChatMessage(data?.data ?? data, orderId);
  } catch (error) {
    throw new Error(getReadableApiError(error, "Message could not be sent"));
  }
}

export async function markOrderMessagesRead(orderId: number, messageIds: string[]) {
  if (!messageIds.length) return;
  await API.patch(`/api/v1/partner/orders/${orderId}/chat/read`, { messageIds });
}

