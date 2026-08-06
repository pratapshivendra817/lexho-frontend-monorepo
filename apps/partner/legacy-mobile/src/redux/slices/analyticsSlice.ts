import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type AnalyticsState = {
  totalOrdersReceived: number;
  totalOrdersAccepted: number;
  totalOrdersRejected: number;
  acceptanceRate: number;
  lastScreenName: string | null;
};

const initialState: AnalyticsState = {
  totalOrdersReceived: 0,
  totalOrdersAccepted: 0,
  totalOrdersRejected: 0,
  acceptanceRate: 0,
  lastScreenName: null,
};

function calculateAcceptanceRate(state: AnalyticsState) {
  state.acceptanceRate =
    state.totalOrdersReceived > 0
      ? Number(((state.totalOrdersAccepted / state.totalOrdersReceived) * 100).toFixed(2))
      : 0;
}

const analyticsSlice = createSlice({
  name: "analytics",
  initialState,
  reducers: {
    incrementOrdersReceived(state, action: PayloadAction<number | undefined>) {
      state.totalOrdersReceived += action.payload ?? 1;
      calculateAcceptanceRate(state);
    },
    incrementOrdersAccepted(state, action: PayloadAction<number | undefined>) {
      state.totalOrdersAccepted += action.payload ?? 1;
      calculateAcceptanceRate(state);
    },
    incrementOrdersRejected(state, action: PayloadAction<number | undefined>) {
      state.totalOrdersRejected += action.payload ?? 1;
      calculateAcceptanceRate(state);
    },
    setLastTrackedScreen(state, action: PayloadAction<string | null>) {
      state.lastScreenName = action.payload;
    },
    resetAnalyticsState() {
      return initialState;
    },
  },
});

export const analyticsActions = analyticsSlice.actions;
export default analyticsSlice.reducer;

