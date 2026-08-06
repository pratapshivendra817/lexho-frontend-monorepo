export type ChatDeliveryStatus = "sending" | "sent" | "delivered" | "read" | "failed";

export type ChatMessage = {
  id: string;
  clientId?: string;
  orderId: number;
  senderId?: string;
  senderType: "PARTNER" | "CUSTOMER" | "SYSTEM";
  text: string;
  createdAt: string;
  status: ChatDeliveryStatus;
  readAt?: string;
};

export type ChatThread = {
  orderId: number;
  customerName: string;
  serviceName?: string;
  lastMessage?: ChatMessage;
  unreadCount: number;
  updatedAt?: string;
};

export type ChatPage<T> = {
  items: T[];
  page: number;
  hasMore: boolean;
};

export type ChatSocketEvent =
  | { type: "MESSAGE"; orderId: number; message: ChatMessage }
  | { type: "TYPING"; orderId: number; senderType: "CUSTOMER" | "PARTNER"; typing: boolean }
  | { type: "READ"; orderId: number; messageIds?: string[]; readAt?: string }
  | { type: "DELIVERED"; orderId: number; messageIds: string[] };

