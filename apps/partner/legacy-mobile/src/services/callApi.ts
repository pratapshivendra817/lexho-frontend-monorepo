import AsyncStorage from "@react-native-async-storage/async-storage";
import API, { getReadableApiError } from "./api";
import type { CallPushPayload, CallSession } from "../types/call";

const PENDING_CALL_KEY = "partner_pending_incoming_call";

const toCall = (row: any, direction: CallSession["direction"]): CallSession => ({
  callId: String(row?.callId ?? row?.id ?? ""),
  orderId: Number(row?.orderId ?? row?.bookingId),
  customerName: String(row?.customerName ?? row?.customer?.name ?? "Customer"),
  customerId: row?.customerId != null ? String(row.customerId) : undefined,
  direction,
  status: String(row?.status ?? "ringing").toLowerCase() as CallSession["status"],
  startedAt: row?.startedAt ?? row?.createdAt,
});

export async function createPartnerCall(orderId: number): Promise<CallSession> {
  try {
    const { data } = await API.post(`/api/v1/partner/orders/${orderId}/calls`);
    return toCall(data?.data ?? data, "outgoing");
  } catch (error) {
    throw new Error(getReadableApiError(error, "Unable to start call"));
  }
}

export async function acceptPartnerCall(callId: string) {
  await API.post(`/api/v1/partner/calls/${encodeURIComponent(callId)}/accept`);
}

export async function rejectPartnerCall(callId: string, reason = "DECLINED") {
  await API.post(`/api/v1/partner/calls/${encodeURIComponent(callId)}/reject`, { reason });
}

export async function endPartnerCall(callId: string, reason = "HANGUP") {
  await API.post(`/api/v1/partner/calls/${encodeURIComponent(callId)}/end`, { reason });
}

export async function markPartnerCallMissed(callId: string) {
  await API.post(`/api/v1/partner/calls/${encodeURIComponent(callId)}/missed`);
}

export async function savePendingIncomingCall(payload: CallPushPayload) {
  await AsyncStorage.setItem(PENDING_CALL_KEY, JSON.stringify(payload));
}

export async function consumePendingIncomingCall(): Promise<CallPushPayload | null> {
  const raw = await AsyncStorage.getItem(PENDING_CALL_KEY);
  await AsyncStorage.removeItem(PENDING_CALL_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CallPushPayload;
  } catch {
    return null;
  }
}

export function parseCallPush(payload: any): CallPushPayload | null {
  const data = payload?.data ?? payload ?? {};
  const type = String(data.type ?? data.notificationType ?? data.redirectType ?? "").toUpperCase();
  if (!["INCOMING_CALL", "CALL_MISSED", "CALL_CANCELLED"].includes(type)) return null;
  const callId = String(data.callId ?? data.id ?? "").trim();
  const orderId = Number(data.orderId ?? data.bookingId);
  if (!callId || !Number.isFinite(orderId) || orderId <= 0) return null;
  return {
    type: type as CallPushPayload["type"],
    callId,
    orderId,
    customerName: String(data.customerName ?? data.callerName ?? "Customer"),
    customerId: data.customerId != null ? String(data.customerId) : undefined,
    expiresAt: data.expiresAt != null ? String(data.expiresAt) : undefined,
  };
}

