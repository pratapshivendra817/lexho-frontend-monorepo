import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { PartnerNotification } from "../../types/notification";

type NotificationState = {
  items: PartnerNotification[];
  unreadCount: number;
};

const initialState: NotificationState = {
  items: [],
  unreadCount: 0,
};

const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    setNotifications: (state, action: PayloadAction<PartnerNotification[]>) => {
      state.items = action.payload;
      state.unreadCount = action.payload.filter((item) => !item.read).length;
    },
    upsertNotification: (state, action: PayloadAction<PartnerNotification>) => {
      const next = action.payload;
      const index = state.items.findIndex((item) => String(item.id) === String(next.id));
      if (index >= 0) {
        state.items[index] = { ...state.items[index], ...next };
      } else {
        state.items.unshift(next);
      }
      state.unreadCount = state.items.filter((item) => !item.read).length;
    },
    markNotificationReadLocal: (state, action: PayloadAction<string>) => {
      const targetId = String(action.payload);
      state.items = state.items.map((item) => (
        String(item.id) === targetId ? { ...item, read: true } : item
      ));
      state.unreadCount = state.items.filter((item) => !item.read).length;
    },
    markAllRead: (state) => {
      state.items = state.items.map((item) => ({ ...item, read: true }));
      state.unreadCount = 0;
    },
  },
});

export const { setNotifications, upsertNotification, markNotificationReadLocal, markAllRead } = notificationSlice.actions;
export default notificationSlice.reducer;
