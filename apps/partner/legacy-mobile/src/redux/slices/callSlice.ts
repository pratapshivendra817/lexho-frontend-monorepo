import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import InCallManager from "react-native-incall-manager";
import { acceptPartnerCall, createPartnerCall, endPartnerCall, markPartnerCallMissed, rejectPartnerCall } from "../../services/callApi";
import { callSignaling } from "../../services/callSignaling";
import { webrtcCallService } from "../../services/webrtcCallService";
import type { CallPushPayload, CallSession, CallSignal } from "../../types/call";

type CallState = {
  current: CallSession | null;
  offerSdp: string | null;
  muted: boolean;
  speaker: boolean;
  loading: boolean;
  error: string | null;
  missedCalls: CallSession[];
};

const initialState: CallState = {
  current: null,
  offerSdp: null,
  muted: false,
  speaker: false,
  loading: false,
  error: null,
  missedCalls: [],
};

export const startOutgoingCall = createAsyncThunk("call/startOutgoing", async (orderId: number) => {
  const call = await createPartnerCall(orderId);
  await callSignaling.connect();
  await webrtcCallService.startOutgoing(call.callId, orderId);
  return { ...call, direction: "outgoing" as const, status: "ringing" as const, startedAt: new Date().toISOString() };
});

export const acceptIncomingCall = createAsyncThunk(
  "call/acceptIncoming",
  async (_: void, { getState, rejectWithValue }) => {
    const state = getState() as { calls: CallState };
    const call = state.calls.current;
    if (!call || !state.calls.offerSdp) return rejectWithValue("Call offer is not available yet");
    await acceptPartnerCall(call.callId);
    await callSignaling.connect();
    await webrtcCallService.acceptIncoming(call.callId, state.calls.offerSdp);
    InCallManager.stopRingtone();
    return { connectedAt: new Date().toISOString() };
  },
);

export const rejectIncomingCall = createAsyncThunk("call/rejectIncoming", async (reason: string = "DECLINED", { getState }) => {
  const call = (getState() as { calls: CallState }).calls.current;
  if (call) await rejectPartnerCall(call.callId, reason);
  webrtcCallService.end();
  return reason;
});

export const hangUpCall = createAsyncThunk("call/hangUp", async (reason: string = "HANGUP", { getState }) => {
  const call = (getState() as { calls: CallState }).calls.current;
  if (call) await endPartnerCall(call.callId, reason).catch(() => undefined);
  if (call) {
    try { callSignaling.send({ type: "ENDED", callId: call.callId, reason }); } catch { /* socket may already be closed */ }
  }
  webrtcCallService.end();
  return reason;
});

export const timeoutIncomingCall = createAsyncThunk("call/timeout", async (_: void, { getState }) => {
  const call = (getState() as { calls: CallState }).calls.current;
  if (call) await markPartnerCallMissed(call.callId).catch(() => undefined);
  webrtcCallService.end();
  return undefined;
});

export const presentIncomingCall = createAsyncThunk("call/presentIncoming", async (payload: CallPushPayload, { dispatch }) => {
  InCallManager.startRingtone("_DEFAULT_", [0, 1000, 500], "default", 30);
  dispatch(callSlice.actions.receiveIncomingCall(payload));
});

export const setCallMuted = createAsyncThunk("call/setMuted", async (muted: boolean, { dispatch }) => {
  webrtcCallService.setMuted(muted);
  dispatch(callSlice.actions.setMuted(muted));
});

export const setCallSpeaker = createAsyncThunk("call/setSpeaker", async (speaker: boolean, { dispatch }) => {
  webrtcCallService.setSpeaker(speaker);
  dispatch(callSlice.actions.setSpeaker(speaker));
});

const callSlice = createSlice({
  name: "calls",
  initialState,
  reducers: {
    receiveIncomingCall: (state, action: PayloadAction<CallPushPayload>) => {
      state.current = {
        callId: action.payload.callId,
        orderId: action.payload.orderId,
        customerName: action.payload.customerName,
        customerId: action.payload.customerId,
        direction: "incoming",
        status: "ringing",
        startedAt: new Date().toISOString(),
        expiresAt: action.payload.expiresAt,
      };
      state.offerSdp = null;
      state.error = null;
    },
    receiveCallSignal: (state, action: PayloadAction<CallSignal>) => {
      const signal = action.payload;
      if (signal.type === "OFFER") {
        state.offerSdp = signal.sdp;
        if (!state.current) {
          state.current = {
            callId: signal.callId,
            orderId: signal.orderId,
            customerName: signal.customerName ?? "Customer",
            customerId: signal.customerId,
            direction: "incoming",
            status: "ringing",
            startedAt: new Date().toISOString(),
          };
        }
      }
      if (!state.current || signal.callId !== state.current.callId) return;
      if (signal.type === "RINGING") state.current.status = "ringing";
      if (signal.type === "ACCEPTED" || signal.type === "ANSWER") {
        state.current.status = "active";
        state.current.connectedAt = state.current.connectedAt ?? new Date().toISOString();
      }
      if (signal.type === "REJECTED") {
        state.current.status = "ended";
        state.current.endReason = signal.reason ?? "REJECTED";
        state.current.endedAt = new Date().toISOString();
      }
      if (signal.type === "ENDED") {
        state.current.status = "ended";
        state.current.endReason = signal.reason ?? "REMOTE_HANGUP";
        state.current.endedAt = new Date().toISOString();
      }
    },
    setMuted: (state, action: PayloadAction<boolean>) => { state.muted = action.payload; },
    setSpeaker: (state, action: PayloadAction<boolean>) => { state.speaker = action.payload; },
    recordMissedCall: (state, action: PayloadAction<CallPushPayload>) => {
      state.missedCalls.unshift({
        callId: action.payload.callId,
        orderId: action.payload.orderId,
        customerName: action.payload.customerName,
        customerId: action.payload.customerId,
        direction: "incoming",
        status: "missed",
        endedAt: new Date().toISOString(),
        endReason: "MISSED",
      });
    },
    clearCurrentCall: state => {
      state.current = null;
      state.offerSdp = null;
      state.muted = false;
      state.speaker = false;
      state.loading = false;
      state.error = null;
    },
    clearCallState: () => initialState,
  },
  extraReducers: builder => {
    builder
      .addCase(startOutgoingCall.pending, state => { state.loading = true; state.error = null; })
      .addCase(startOutgoingCall.fulfilled, (state, action) => { state.loading = false; state.current = action.payload; })
      .addCase(startOutgoingCall.rejected, (state, action) => { state.loading = false; state.error = action.error.message ?? "Unable to start call"; })
      .addCase(acceptIncomingCall.pending, state => { state.loading = true; state.error = null; if (state.current) state.current.status = "connecting"; })
      .addCase(acceptIncomingCall.fulfilled, (state, action) => { state.loading = false; if (state.current) { state.current.status = "active"; state.current.connectedAt = action.payload.connectedAt; } })
      .addCase(acceptIncomingCall.rejected, (state, action) => { state.loading = false; state.error = String(action.payload ?? action.error.message ?? "Unable to accept call"); if (state.current) state.current.status = "ringing"; })
      .addCase(rejectIncomingCall.fulfilled, (state, action) => { if (state.current) { state.current.status = "ended"; state.current.endReason = action.payload; state.current.endedAt = new Date().toISOString(); } })
      .addCase(hangUpCall.fulfilled, (state, action) => { if (state.current) { state.current.status = "ended"; state.current.endReason = action.payload; state.current.endedAt = new Date().toISOString(); } })
      .addCase(timeoutIncomingCall.fulfilled, state => {
        if (!state.current) return;
        state.current.status = "missed";
        state.current.endReason = "MISSED";
        state.current.endedAt = new Date().toISOString();
        state.missedCalls.unshift(state.current);
      });
  },
});

export const { receiveIncomingCall, receiveCallSignal, setMuted, setSpeaker, recordMissedCall, clearCurrentCall, clearCallState } = callSlice.actions;
export default callSlice.reducer;
