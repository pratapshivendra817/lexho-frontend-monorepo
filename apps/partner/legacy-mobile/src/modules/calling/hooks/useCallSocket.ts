import { useEffect } from "react";
import { useAppDispatch } from "../../../hooks/useRedux";
import { callActions } from "../store/callSlice";
import { socketCallService } from "../services/SocketCallService";
import { webRTCService } from "../services/WebRTCService";
import type { CallParticipant } from "../types";
import { trackCallEvent } from "../services/CallAnalyticsService";

export function useCallSocket(enabled: boolean, onIncoming?: (payload: { callId: string; bookingId: number; caller: CallParticipant }) => void) {
  const dispatch = useAppDispatch();
  useEffect(() => {
    if (!enabled) return;
    const cleanups = [
      socketCallService.on("call:incoming", payload => {
        dispatch(callActions.setCall({ callId: payload.callId, bookingId: payload.bookingId, direction: "incoming", participant: payload.caller, status: "ringing", startedAt: Date.now() }));
        onIncoming?.(payload);
      }),
      socketCallService.on("call:ringing", () => dispatch(callActions.setStatus("ringing"))),
      socketCallService.on("call:accept", () => dispatch(callActions.setStatus("calling"))),
      socketCallService.on("call:answer", payload => void webRTCService.applyAnswer(payload.callId, payload.sdp)),
      socketCallService.on("call:offer", payload => { (globalThis as any).__lexhoPendingCallOffer = payload; }),
      socketCallService.on("call:ice-candidate", payload => void webRTCService.addIceCandidate(payload.callId, payload.candidate)),
      socketCallService.on("call:reject", payload => { dispatch(callActions.endCall({ reason: payload.reason ?? "REJECTED" })); webRTCService.close(); }),
      socketCallService.on("call:busy", () => { dispatch(callActions.endCall({ status: "busy", reason: "BUSY" })); webRTCService.close(); }),
      socketCallService.on("call:timeout", payload => { dispatch(callActions.endCall({ status: "missed", reason: "TIMEOUT" })); void trackCallEvent("call_missed", { call_id: payload.callId }); webRTCService.close(); }),
      socketCallService.on("call:end", payload => { dispatch(callActions.endCall({ reason: payload.reason ?? "REMOTE_HANGUP" })); webRTCService.close(); }),
    ];
    socketCallService.connect().catch(error => dispatch(callActions.setError(error.message)));
    return () => cleanups.forEach(cleanup => cleanup());
  }, [dispatch, enabled, onIncoming]);
}
