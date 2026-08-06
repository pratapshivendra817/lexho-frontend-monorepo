import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type OfflineState = {
  isOffline: boolean;
  queuedActions: number;
  lastServerError: string | null;
};

const initialState: OfflineState = {
  isOffline: false,
  queuedActions: 0,
  lastServerError: null,
};

const offlineSlice = createSlice({
  name: "offline",
  initialState,
  reducers: {
    setOfflineStatus(state, action: PayloadAction<boolean>) {
      state.isOffline = action.payload;
    },
    setQueuedActions(state, action: PayloadAction<number>) {
      state.queuedActions = action.payload;
    },
    setLastServerError(state, action: PayloadAction<string | null>) {
      state.lastServerError = action.payload;
    },
  },
});

export const offlineActions = offlineSlice.actions;
export default offlineSlice.reducer;

