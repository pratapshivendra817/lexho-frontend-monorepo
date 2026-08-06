import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { getChatThreads, getOrderMessages, markOrderMessagesRead, sendOrderMessage } from "../../services/chatApi";
import type { ChatMessage, ChatThread } from "../../types/chat";

type OrderMessageState = {
  items: ChatMessage[];
  page: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
};

type ChatState = {
  threads: ChatThread[];
  threadsPage: number;
  threadsHasMore: boolean;
  threadsLoading: boolean;
  threadsError: string | null;
  messagesByOrder: Record<string, OrderMessageState>;
  typingByOrder: Record<string, boolean>;
  connected: boolean;
};

const emptyMessages = (): OrderMessageState => ({
  items: [], page: 0, hasMore: true, loading: false, loadingMore: false, error: null,
});

const initialState: ChatState = {
  threads: [],
  threadsPage: 0,
  threadsHasMore: true,
  threadsLoading: false,
  threadsError: null,
  messagesByOrder: {},
  typingByOrder: {},
  connected: false,
};

const uniqueMessages = (items: ChatMessage[]) => {
  const byId = new Map<string, ChatMessage>();
  items.forEach(item => byId.set(item.id || item.clientId || `${item.orderId}-${item.createdAt}`, item));
  return Array.from(byId.values()).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
};

let nextChatClientId = 0;

const makeClientId = () => {
  nextChatClientId += 1;
  return `partner-${Date.now()}-${nextChatClientId}`;
};

export const fetchChatThreads = createAsyncThunk("chat/fetchThreads", async (page: number = 0) => getChatThreads(page));

export const fetchMessages = createAsyncThunk(
  "chat/fetchMessages",
  async ({ orderId, page = 0 }: { orderId: number; page?: number }) => ({ orderId, ...(await getOrderMessages(orderId, page)) }),
);

export const sendChatMessage = createAsyncThunk(
  "chat/sendMessage",
  async ({ orderId, text, clientId }: { orderId: number; text: string; clientId?: string }, { dispatch, rejectWithValue }) => {
    const nextClientId = clientId ?? makeClientId();
    dispatch(chatSlice.actions.addOptimisticMessage({
      id: nextClientId,
      clientId: nextClientId,
      orderId,
      senderType: "PARTNER",
      text,
      createdAt: new Date().toISOString(),
      status: "sending",
    }));
    try {
      const message = await sendOrderMessage(orderId, text, nextClientId);
      return { ...message, clientId: message.clientId ?? nextClientId };
    } catch (error: any) {
      dispatch(chatSlice.actions.markMessageFailed({ orderId, clientId: nextClientId }));
      return rejectWithValue(String(error?.message ?? "Message could not be sent"));
    }
  },
);

export const readOrderMessages = createAsyncThunk(
  "chat/readMessages",
  async ({ orderId, messageIds }: { orderId: number; messageIds: string[] }) => {
    await markOrderMessagesRead(orderId, messageIds);
    return { orderId, messageIds, readAt: new Date().toISOString() };
  },
);

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setChatConnected: (state, action: PayloadAction<boolean>) => { state.connected = action.payload; },
    setCustomerTyping: (state, action: PayloadAction<{ orderId: number; typing: boolean }>) => {
      state.typingByOrder[String(action.payload.orderId)] = action.payload.typing;
    },
    receiveMessage: (state, action: PayloadAction<ChatMessage>) => {
      const message = action.payload;
      const key = String(message.orderId);
      const bucket = state.messagesByOrder[key] ?? emptyMessages();
      const reconciled = message.clientId
        ? bucket.items.filter(item => item.clientId !== message.clientId && item.id !== message.clientId)
        : bucket.items;
      bucket.items = uniqueMessages([...reconciled, message]);
      state.messagesByOrder[key] = bucket;
      const thread = state.threads.find(item => item.orderId === message.orderId);
      if (thread) {
        thread.lastMessage = message;
        thread.updatedAt = message.createdAt;
        if (message.senderType === "CUSTOMER") thread.unreadCount += 1;
      } else {
        state.threads.unshift({
          orderId: message.orderId,
          customerName: `Order #${message.orderId}`,
          lastMessage: message,
          unreadCount: message.senderType === "CUSTOMER" ? 1 : 0,
          updatedAt: message.createdAt,
        });
      }
    },
    addOptimisticMessage: (state, action: PayloadAction<ChatMessage>) => {
      const key = String(action.payload.orderId);
      const bucket = state.messagesByOrder[key] ?? emptyMessages();
      bucket.items = uniqueMessages([...bucket.items, action.payload]);
      state.messagesByOrder[key] = bucket;
    },
    markMessageFailed: (state, action: PayloadAction<{ orderId: number; clientId: string }>) => {
      const message = state.messagesByOrder[String(action.payload.orderId)]?.items.find(
        item => item.clientId === action.payload.clientId || item.id === action.payload.clientId,
      );
      if (message) message.status = "failed";
    },
    applyReceipt: (state, action: PayloadAction<{ orderId: number; messageIds: string[]; status: "delivered" | "read"; readAt?: string }>) => {
      const ids = new Set(action.payload.messageIds);
      state.messagesByOrder[String(action.payload.orderId)]?.items.forEach(message => {
        if (ids.has(message.id) || (message.clientId && ids.has(message.clientId))) {
          message.status = action.payload.status;
          if (action.payload.status === "read") message.readAt = action.payload.readAt;
        }
      });
    },
    clearThreadUnread: (state, action: PayloadAction<number>) => {
      const thread = state.threads.find(item => item.orderId === action.payload);
      if (thread) thread.unreadCount = 0;
    },
    clearChatState: () => initialState,
  },
  extraReducers: builder => {
    builder
      .addCase(fetchChatThreads.pending, (state, action) => {
        state.threadsLoading = true;
        state.threadsError = null;
      })
      .addCase(fetchChatThreads.fulfilled, (state, action) => {
        state.threadsLoading = false;
        state.threadsPage = action.payload.page;
        state.threadsHasMore = action.payload.hasMore;
        state.threads = action.payload.page === 0
          ? action.payload.items
          : [...state.threads, ...action.payload.items.filter(next => !state.threads.some(item => item.orderId === next.orderId))];
      })
      .addCase(fetchChatThreads.rejected, (state, action) => {
        state.threadsLoading = false;
        state.threadsError = action.error.message ?? "Unable to load chats";
      })
      .addCase(fetchMessages.pending, (state, action) => {
        const key = String(action.meta.arg.orderId);
        const bucket = state.messagesByOrder[key] ?? emptyMessages();
        if ((action.meta.arg.page ?? 0) === 0) bucket.loading = true;
        else bucket.loadingMore = true;
        bucket.error = null;
        state.messagesByOrder[key] = bucket;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        const key = String(action.payload.orderId);
        const bucket = state.messagesByOrder[key] ?? emptyMessages();
        bucket.loading = false;
        bucket.loadingMore = false;
        bucket.page = action.payload.page;
        bucket.hasMore = action.payload.hasMore;
        bucket.items = uniqueMessages(action.payload.page === 0 ? action.payload.items : [...action.payload.items, ...bucket.items]);
        state.messagesByOrder[key] = bucket;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        const key = String(action.meta.arg.orderId);
        const bucket = state.messagesByOrder[key] ?? emptyMessages();
        bucket.loading = false;
        bucket.loadingMore = false;
        bucket.error = action.error.message ?? "Unable to load messages";
        state.messagesByOrder[key] = bucket;
      })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        const message = action.payload;
        const bucket = state.messagesByOrder[String(message.orderId)] ?? emptyMessages();
        bucket.items = bucket.items.filter(item => item.clientId !== message.clientId && item.id !== message.clientId);
        bucket.items = uniqueMessages([...bucket.items, message]);
        state.messagesByOrder[String(message.orderId)] = bucket;
      })
      .addCase(readOrderMessages.fulfilled, (state, action) => {
        const ids = new Set(action.payload.messageIds);
        state.messagesByOrder[String(action.payload.orderId)]?.items.forEach(message => {
          if (ids.has(message.id)) {
            message.status = "read";
            message.readAt = action.payload.readAt;
          }
        });
        const thread = state.threads.find(item => item.orderId === action.payload.orderId);
        if (thread) thread.unreadCount = 0;
      });
  },
});

export const {
  setChatConnected,
  setCustomerTyping,
  receiveMessage,
  addOptimisticMessage,
  markMessageFailed,
  applyReceipt,
  clearThreadUnread,
  clearChatState,
} = chatSlice.actions;

export const selectTotalChatUnread = (state: { chat: ChatState }) =>
  state.chat.threads.reduce((total, thread) => total + thread.unreadCount, 0);

export default chatSlice.reducer;
