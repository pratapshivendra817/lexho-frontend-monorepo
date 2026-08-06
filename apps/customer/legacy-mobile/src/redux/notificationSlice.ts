import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type NotificationPayload = {
  id?: string;
  type?: string;
  bookingId?: string;
  source?: "foreground" | "background" | "terminated";
  title?: string;
};

type NotificationState = {
  lastReceived: NotificationPayload | null;
  lastOpened: NotificationPayload | null;
  unreadHintCount: number;
};

const initialState: NotificationState = {
  lastReceived: null,
  lastOpened: null,
  unreadHintCount: 0,
};

const notificationSlice = createSlice({
  name: "notification",
  initialState,
  reducers: {
    notificationReceived(state, action: PayloadAction<NotificationPayload>) {
      state.lastReceived = action.payload;
      state.unreadHintCount += 1;
    },
    notificationOpened(state, action: PayloadAction<NotificationPayload>) {
      state.lastOpened = action.payload;
      state.unreadHintCount = Math.max(0, state.unreadHintCount - 1);
    },
    clearNotificationHints(state) {
      state.unreadHintCount = 0;
    },
  },
});

export const { notificationReceived, notificationOpened, clearNotificationHints } = notificationSlice.actions;
export default notificationSlice.reducer;
