import { useCallback, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../../hooks/useRedux";
import { callActions } from "../store/callSlice";
import { webRTCService } from "../services/WebRTCService";
import { socketCallService } from "../services/SocketCallService";
import { CallService } from "../services/CallService";
import { useAudioPermissions } from "./useAudioPermissions";
import { trackCallEvent } from "../services/CallAnalyticsService";

export function useWebRTCCall() {
  const dispatch = useAppDispatch();
  const call = useAppSelector(state => state.calling.current);
  const muted = useAppSelector(state => state.calling.muted);
  const speaker = useAppSelector(state => state.calling.speaker);
  const { request } = useAudioPermissions();

  useEffect(() => webRTCService.setEventListener(event => {
    if (event.type === "connected") dispatch(callActions.setConnected());
    if (event.type === "reconnecting") dispatch(callActions.setStatus("reconnecting"));
    if (event.type === "failed") dispatch(callActions.setError(event.error.message));
  }), [dispatch]);

  const start = useCallback(async (bookingId: number, participantName = "Customer") => {
    if (!(await request())) throw new Error("Microphone permission denied");
    await socketCallService.connect();
    const response = await CallService.initiate(bookingId);
    const callId = String(response?.callId ?? response?.id ?? "");
    if (!callId) throw new Error("Backend did not return a callId");
    dispatch(callActions.setCall({ callId, bookingId, direction: "outgoing", participant: { id: String(response?.customerId ?? ""), name: response?.customerName ?? participantName, role: "CUSTOMER" }, status: "calling", startedAt: Date.now() }));
    socketCallService.emit("call:initiate", { bookingId, recipientId: response?.customerId != null ? String(response.customerId) : undefined });
    await webRTCService.createOffer(callId);
    void trackCallEvent("call_started", { call_id: callId, booking_id: bookingId });
  }, [dispatch, request]);

  const accept = useCallback(async () => {
    if (!call || !(await request())) throw new Error("Microphone permission denied");
    await CallService.accept(call.callId);
    socketCallService.emit("call:accept", { callId: call.callId });
    const offer = (globalThis as any).__lexhoPendingCallOffer;
    if (!offer || offer.callId !== call.callId) throw new Error("Call offer has not arrived yet");
    await webRTCService.acceptOffer(call.callId, offer.sdp);
    void trackCallEvent("call_answered", { call_id: call.callId, booking_id: call.bookingId });
  }, [call, request]);

  const reject = useCallback(async () => {
    if (!call) return;
    await CallService.reject(call.callId).catch(() => undefined);
    socketCallService.emit("call:reject", { callId: call.callId, reason: "DECLINED" });
    dispatch(callActions.endCall({ reason: "REJECTED" }));
    webRTCService.close();
    void trackCallEvent("call_rejected", { call_id: call.callId, booking_id: call.bookingId });
  }, [call, dispatch]);

  const end = useCallback(async () => {
    if (!call) return;
    await CallService.end(call.callId).catch(() => undefined);
    try { socketCallService.emit("call:end", { callId: call.callId, reason: "HANGUP" }); } catch { /* REST remains authoritative */ }
    dispatch(callActions.endCall({ reason: "HANGUP" }));
    webRTCService.close();
    const duration = call.connectedAt ? Math.max(0, Math.round((Date.now() - call.connectedAt) / 1000)) : 0;
    void trackCallEvent("call_ended", { call_id: call.callId, booking_id: call.bookingId });
    void trackCallEvent("call_duration", { call_id: call.callId, duration_seconds: duration });
  }, [call, dispatch]);

  const toggleMute = useCallback(() => { webRTCService.setMuted(!muted); dispatch(callActions.setMuted(!muted)); }, [dispatch, muted]);
  const toggleSpeaker = useCallback(() => { webRTCService.setSpeakerEnabled(!speaker); dispatch(callActions.setSpeaker(!speaker)); }, [dispatch, speaker]);
  return { call, muted, speaker, start, accept, reject, end, toggleMute, toggleSpeaker };
}
