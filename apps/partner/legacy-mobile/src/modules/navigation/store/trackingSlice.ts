import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import type { TrackingLocation } from "../types";

type TrackingState = {
  currentLocation: TrackingLocation | null;
  trackingEnabled: boolean;
  lastUpdatedAt: number | null;
  accuracyValid: boolean;
  offlineQueueSize: number;
};

const initialState: TrackingState = {
  currentLocation: null,
  trackingEnabled: false,
  lastUpdatedAt: null,
  accuracyValid: false,
  offlineQueueSize: 0,
};

const trackingSlice = createSlice({
  name: "partnerTracking",
  initialState,
  reducers: {
    setCurrentLocation(state, action: PayloadAction<TrackingLocation | null>) {
      state.currentLocation = action.payload;
      state.lastUpdatedAt = action.payload?.timestamp ?? state.lastUpdatedAt;
      state.accuracyValid =
        typeof action.payload?.accuracy !== "number" ||
        action.payload.accuracy == null ||
        action.payload.accuracy <= 100;
    },
    setTrackingEnabled(state, action: PayloadAction<boolean>) {
      state.trackingEnabled = action.payload;
    },
    setOfflineQueueSize(state, action: PayloadAction<number>) {
      state.offlineQueueSize = Math.max(0, Math.trunc(action.payload));
    },
    resetTrackingState() {
      return initialState;
    },
  },
});

export const trackingActions = trackingSlice.actions;
export default trackingSlice.reducer;
