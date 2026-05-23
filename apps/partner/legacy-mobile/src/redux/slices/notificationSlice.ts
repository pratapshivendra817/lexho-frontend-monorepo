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
    markAllRead: (state) => {
      state.items = state.items.map((item) => ({ ...item, read: true }));
      state.unreadCount = 0;
    },
  },
});

export const { setNotifications, markAllRead } = notificationSlice.actions;
export default notificationSlice.reducer;
