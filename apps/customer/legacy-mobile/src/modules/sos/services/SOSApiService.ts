import NetInfo from "@react-native-community/netinfo";
import { api } from "../../../api/client";
import type { EmergencyContact, SOSEvent } from "../types";
import { getQueuedSOSEvents, queueSOSEvent, removeQueuedSOSEvents } from "./SOSQueueService";

const BASE = "/api/v1/customer";
export async function sendSOSEvent(event: SOSEvent) {
  const network = await NetInfo.fetch();
  if (!network.isConnected || network.isInternetReachable === false) { await queueSOSEvent(event); return { queued: true }; }
  try { await api.post(`${BASE}/sos`, event); return { queued: false }; } catch (error: any) { if (!error?.response) { await queueSOSEvent(event); return { queued: true }; } throw error; }
}
export async function flushSOSQueue() { const rows = await getQueuedSOSEvents(); let sent = 0; for (const row of rows) { try { await api.post(`${BASE}/sos`, row); sent += 1; } catch { break; } } if (sent) await removeQueuedSOSEvents(sent); return sent; }
export async function getEmergencyContacts(): Promise<EmergencyContact[]> { const { data } = await api.get(`${BASE}/emergency-contacts`); const rows = data?.data ?? data; return Array.isArray(rows) ? rows.map((row: any) => ({ id: String(row.id), name: String(row.name), phone: String(row.phone), relationship: row.relationship ? String(row.relationship) : undefined, primary: Boolean(row.primary) })) : []; }
export async function createEmergencyContact(contact: Omit<EmergencyContact, "id">) { const { data } = await api.post(`${BASE}/emergency-contacts`, contact); return data?.data ?? data; }
export async function deleteEmergencyContact(id: string) { await api.delete(`${BASE}/emergency-contacts/${encodeURIComponent(id)}`); }
