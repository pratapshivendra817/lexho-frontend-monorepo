export type CallStatus = "idle" | "calling" | "ringing" | "connected" | "reconnecting" | "ended" | "missed" | "busy" | "failed";
export type CallDirection = "incoming" | "outgoing";
export type CallRole = "CUSTOMER" | "PARTNER";

export type CallParticipant = { id: string; name: string; role: CallRole };
export type CallSession = {
  callId: string;
  bookingId: number;
  direction: CallDirection;
  participant: CallParticipant;
  status: CallStatus;
  startedAt: number;
  connectedAt?: number;
  endedAt?: number;
  endReason?: string;
};

export type CallEventMap = {
  "call:initiate": { bookingId: number; recipientId?: string };
  "call:incoming": { callId: string; bookingId: number; caller: CallParticipant };
  "call:ringing": { callId: string };
  "call:accept": { callId: string };
  "call:reject": { callId: string; reason?: string };
  "call:busy": { callId: string };
  "call:end": { callId: string; reason?: string };
  "call:timeout": { callId: string };
  "call:offer": { callId: string; sdp: string };
  "call:answer": { callId: string; sdp: string };
  "call:ice-candidate": { callId: string; candidate: Record<string, unknown> };
};

export type WebRTCEvent =
  | { type: "connected" }
  | { type: "reconnecting" }
  | { type: "failed"; error: Error };
