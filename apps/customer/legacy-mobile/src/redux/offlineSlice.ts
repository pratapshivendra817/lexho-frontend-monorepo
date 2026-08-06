import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type OfflineQueueEntry = {
  id: string;
  type: string;
  createdAt: number;
};

type OfflineState = {
  isOffline: boolean;
  serverUnavailable: boolean;
  lastChangeAt: number | null;
  queue: OfflineQueueEntry[];
};

const initialState: OfflineState = {
  isOffline: false,
  serverUnavailable: false,
  lastChangeAt: null,
  queue: [],
};

const offlineSlice = createSlice({
  name: "offline",
  initialState,
  reducers: {
    offlineStatusChanged(state, action: PayloadAction<{ isOffline: boolean; serverUnavailable?: boolean }>) {
      state.isOffline = action.payload.isOffline;
      state.serverUnavailable = Boolean(action.payload.serverUnavailable);
      state.lastChangeAt = Date.now();
    },
    offlineQueueSynced(state, action: PayloadAction<OfflineQueueEntry[]>) {
      state.queue = action.payload;
    },
  },
});

export const { offlineStatusChanged, offlineQueueSynced } = offlineSlice.actions;
export default offlineSlice.reducer;
