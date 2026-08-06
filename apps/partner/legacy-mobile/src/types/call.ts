export type CallDirection = "incoming" | "outgoing";
export type CallStatus = "idle" | "ringing" | "connecting" | "active" | "ended" | "missed" | "failed";

export type CallSession = {
  callId: string;
  orderId: number;
  customerName: string;
  customerId?: string;
  direction: CallDirection;
  status: CallStatus;
  startedAt?: string;
  connectedAt?: string;
  endedAt?: string;
  endReason?: string;
  expiresAt?: string;
};

export type CallPushPayload = {
  type: "INCOMING_CALL" | "CALL_MISSED" | "CALL_CANCELLED";
  callId: string;
  orderId: number;
  customerName: string;
  customerId?: string;
  expiresAt?: string;
};

export type CallSignal =
  | { type: "OFFER"; callId: string; orderId: number; sdp: string; customerName?: string; customerId?: string }
  | { type: "ANSWER"; callId: string; sdp: string }
  | { type: "ICE_CANDIDATE"; callId: string; candidate: Record<string, unknown> }
  | { type: "RINGING"; callId: string }
  | { type: "ACCEPTED"; callId: string }
  | { type: "REJECTED"; callId: string; reason?: string }
  | { type: "ENDED"; callId: string; reason?: string };
