import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type TrackingCoordinate = {
  latitude: number;
  longitude: number;
};

type TrackingState = {
  activeBookingId: string | null;
  partnerLocation: TrackingCoordinate | null;
  customerLocation: TrackingCoordinate | null;
  route: TrackingCoordinate[];
  etaMinutes: number | null;
  lastUpdatedAt: string | null;
  isLive: boolean;
};

const initialState: TrackingState = {
  activeBookingId: null,
  partnerLocation: null,
  customerLocation: null,
  route: [],
  etaMinutes: null,
  lastUpdatedAt: null,
  isLive: false,
};

const trackingSlice = createSlice({
  name: "tracking",
  initialState,
  reducers: {
    trackingStarted(state, action: PayloadAction<{ bookingId: string }>) {
      state.activeBookingId = action.payload.bookingId;
      state.isLive = true;
    },
    trackingUpdated(
      state,
      action: PayloadAction<{
        partnerLocation?: TrackingCoordinate | null;
        customerLocation?: TrackingCoordinate | null;
        route?: TrackingCoordinate[];
        etaMinutes?: number | null;
        lastUpdatedAt?: string | null;
      }>,
    ) {
      if (action.payload.partnerLocation !== undefined) {
        state.partnerLocation = action.payload.partnerLocation;
      }
      if (action.payload.customerLocation !== undefined) {
        state.customerLocation = action.payload.customerLocation;
      }
      if (action.payload.route) {
        state.route = action.payload.route;
      }
      if (action.payload.etaMinutes !== undefined) {
        state.etaMinutes = action.payload.etaMinutes;
      }
      if (action.payload.lastUpdatedAt !== undefined) {
        state.lastUpdatedAt = action.payload.lastUpdatedAt;
      }
      state.isLive = true;
    },
    trackingStopped() {
      return initialState;
    },
  },
});

export const { trackingStarted, trackingUpdated, trackingStopped } = trackingSlice.actions;
export default trackingSlice.reducer;
