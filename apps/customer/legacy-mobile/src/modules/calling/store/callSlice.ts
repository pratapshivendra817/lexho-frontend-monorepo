import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { CallSession, CallStatus } from "../types";

type State = { current: CallSession | null; muted: boolean; speaker: boolean; error: string | null; durationSeconds: number };
const initialState: State = { current: null, muted: false, speaker: false, error: null, durationSeconds: 0 };

const slice = createSlice({
  name: "calling",
  initialState,
  reducers: {
    setCall: (state, action: PayloadAction<CallSession | null>) => { state.current = action.payload; state.error = null; state.durationSeconds = 0; },
    setStatus: (state, action: PayloadAction<CallStatus>) => { if (state.current) state.current.status = action.payload; },
    setConnected: state => { if (state.current) { state.current.status = "connected"; state.current.connectedAt ??= Date.now(); } },
    endCall: (state, action: PayloadAction<{ status?: CallStatus; reason?: string } | undefined>) => {
      if (state.current) { state.current.status = action.payload?.status ?? "ended"; state.current.endReason = action.payload?.reason; state.current.endedAt = Date.now(); }
    },
    setMuted: (state, action: PayloadAction<boolean>) => { state.muted = action.payload; },
    setSpeaker: (state, action: PayloadAction<boolean>) => { state.speaker = action.payload; },
    setError: (state, action: PayloadAction<string>) => { state.error = action.payload; if (state.current) state.current.status = "failed"; },
    tick: state => { if (state.current?.status === "connected") state.durationSeconds += 1; },
    resetCall: () => initialState,
  },
});
export const callActions = slice.actions;
export default slice.reducer;
