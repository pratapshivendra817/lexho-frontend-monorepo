import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type AnalyticsEventEntry = {
  name: string;
  params?: Record<string, unknown>;
  trackedAt: number;
};

type AnalyticsState = {
  lastEvent: AnalyticsEventEntry | null;
  screenName: string | null;
  eventCount: number;
};

const initialState: AnalyticsState = {
  lastEvent: null,
  screenName: null,
  eventCount: 0,
};

const analyticsSlice = createSlice({
  name: "analytics",
  initialState,
  reducers: {
    analyticsEventTracked(state, action: PayloadAction<{ name: string; params?: Record<string, unknown> }>) {
      state.lastEvent = {
        ...action.payload,
        trackedAt: Date.now(),
      };
      state.eventCount += 1;
    },
    analyticsScreenTracked(state, action: PayloadAction<string>) {
      state.screenName = action.payload;
    },
    resetAnalyticsState() {
      return initialState;
    },
  },
});

export const { analyticsEventTracked, analyticsScreenTracked, resetAnalyticsState } = analyticsSlice.actions;
export default analyticsSlice.reducer;
