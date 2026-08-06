import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import type {
  ActiveRoute,
  NavigationEvent,
  NavigationInstruction,
  NavigationLifecycleState,
  NavigationRouteStatus,
} from "../types";

type NavigationState = {
  activeRoute: ActiveRoute | null;
  eta: number | null;
  distance: number | null;
  routeStatus: NavigationRouteStatus;
  navigationState: NavigationLifecycleState;
  trafficDelaySeconds: number;
  nextInstruction: NavigationInstruction | null;
  lastError: string | null;
  lastDeviationAt: number | null;
  events: NavigationEvent[];
};

const initialState: NavigationState = {
  activeRoute: null,
  eta: null,
  distance: null,
  routeStatus: "idle",
  navigationState: "idle",
  trafficDelaySeconds: 0,
  nextInstruction: null,
  lastError: null,
  lastDeviationAt: null,
  events: [],
};

const navigationSlice = createSlice({
  name: "partnerNavigation",
  initialState,
  reducers: {
    setRouteStatus(state, action: PayloadAction<NavigationRouteStatus>) {
      state.routeStatus = action.payload;
    },
    setNavigationState(state, action: PayloadAction<NavigationLifecycleState>) {
      state.navigationState = action.payload;
    },
    setActiveRoute(state, action: PayloadAction<ActiveRoute | null>) {
      state.activeRoute = action.payload;
      state.eta = action.payload?.etaSeconds ?? null;
      state.distance = action.payload?.distanceMeters ?? null;
      state.trafficDelaySeconds = action.payload?.trafficDelaySeconds ?? 0;
      state.nextInstruction = action.payload?.instructions?.[0] ?? null;
      state.lastError = null;
    },
    setNextInstruction(state, action: PayloadAction<NavigationInstruction | null>) {
      state.nextInstruction = action.payload;
    },
    setNavigationError(state, action: PayloadAction<string | null>) {
      state.lastError = action.payload;
      if (action.payload) {
        state.routeStatus = "failed";
      }
    },
    markDeviation(state, action: PayloadAction<number>) {
      state.lastDeviationAt = action.payload;
    },
    pushNavigationEvent(state, action: PayloadAction<NavigationEvent>) {
      state.events = [action.payload, ...state.events].slice(0, 25);
    },
    resetNavigationState() {
      return initialState;
    },
  },
});

export const navigationActions = navigationSlice.actions;
export default navigationSlice.reducer;
