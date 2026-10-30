import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { PartnerDashboardStats } from "../../types/partner";

type PartnerState = {
  stats: PartnerDashboardStats | null;
  online: boolean;
  loading: boolean;
  lastKnownLocation: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    timestamp: number;
    label?: string | null;
    pincode?: string | null;
    provider?: string | null;
    confidence?: "HIGH" | "MEDIUM" | "LOW";
    boundaryVerifying?: boolean;
    trustedAt?: number;
  } | null;
};

const initialState: PartnerState = {
  stats: null,
  online: false,
  loading: false,
  lastKnownLocation: null,
};

const partnerSlice = createSlice({
  name: "partner",
  initialState,
  reducers: {
    setPartnerStats: (state, action: PayloadAction<PartnerDashboardStats | null>) => {
      state.stats = action.payload;
    },
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.online = action.payload;
    },
    setPartnerLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setLastKnownLocation: (
      state,
      action: PayloadAction<{
        latitude: number;
        longitude: number;
        accuracy?: number | null;
        timestamp: number;
        label?: string | null;
        pincode?: string | null;
        provider?: string | null;
        confidence?: "HIGH" | "MEDIUM" | "LOW";
        boundaryVerifying?: boolean;
        trustedAt?: number;
      } | null>,
    ) => {
      state.lastKnownLocation = action.payload;
    },
  },
});

export const { setPartnerStats, setOnlineStatus, setPartnerLoading, setLastKnownLocation } = partnerSlice.actions;
export default partnerSlice.reducer;
