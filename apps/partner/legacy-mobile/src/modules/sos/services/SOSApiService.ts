import NetInfo from "@react-native-community/netinfo";
import API from "../../../services/api";
import type { EmergencyContact, EmergencyContactInput, SOSIncident, TriggerSOSRequest } from "../types";
import { cacheEmergencyContact, getCachedEmergencyContacts, getQueuedSOSRequests, queueSOSRequest, removeQueuedSOSRequests } from "./SOSQueueService";

export async function triggerSOS(payload: TriggerSOSRequest) {
  const network = await NetInfo.fetch();
  if (!network.isConnected || network.isInternetReachable === false) {
    await queueSOSRequest(payload);
    return { queued: true, incident: null };
  }
  try {
    const { data } = await API.post("/api/v1/emergency/sos", payload);
    return { queued: false, incident: (data?.data ?? data) as SOSIncident };
  } catch (error: any) {
    if (!error?.response) {
      await queueSOSRequest(payload);
      return { queued: true, incident: null };
    }
    throw error;
  }
}

export async function flushSOSQueue() {
  const rows = await getQueuedSOSRequests();
  let sent = 0;
  for (const row of rows) {
    try {
      await API.post("/api/v1/emergency/sos", row);
      sent += 1;
    } catch {
      break;
    }
  }
  if (sent) await removeQueuedSOSRequests(sent);
  return sent;
}

export async function getSOSHistory(): Promise<SOSIncident[]> {
  const { data } = await API.get("/api/v1/emergency/history");
  const rows = data?.data?.content ?? data?.data ?? data?.content ?? data;
  return Array.isArray(rows) ? rows.map(mapIncident) : [];
}

export async function addEmergencyContact(payload: EmergencyContactInput): Promise<EmergencyContact> {
  const { data } = await API.post("/api/v1/emergency/contact", payload);
  const contact = mapContact(data?.data ?? data ?? payload);
  await cacheEmergencyContact(contact);
  return contact;
}

export async function getEmergencyContacts(): Promise<EmergencyContact[]> {
  const rows = await getCachedEmergencyContacts();
  return rows.map(mapContact);
}

function mapIncident(row: any): SOSIncident {
  return {
    eventId: String(row?.eventId ?? row?.id ?? ""),
    status: String(row?.status ?? "TRIGGERED").toUpperCase(),
    latitude: Number(row?.latitude ?? row?.location?.latitude ?? 0),
    longitude: Number(row?.longitude ?? row?.location?.longitude ?? 0),
    accuracyMeters: row?.accuracyMeters ?? row?.accuracy ?? null,
    address: row?.address ? String(row.address) : undefined,
    message: row?.message ? String(row.message) : undefined,
    createdAt: row?.createdAt ? String(row.createdAt) : undefined,
    acknowledgedAt: row?.acknowledgedAt ? String(row.acknowledgedAt) : undefined,
    resolvedAt: row?.resolvedAt ? String(row.resolvedAt) : undefined,
  };
}

function mapContact(row: any): EmergencyContact {
  return {
    id: String(row?.id ?? row?.contactId ?? Date.now()),
    name: String(row?.name ?? ""),
    phoneNumber: String(row?.phoneNumber ?? row?.phone ?? ""),
    relationship: row?.relationship ? String(row.relationship) : undefined,
    email: row?.email ? String(row.email) : undefined,
    primaryContact: Boolean(row?.primaryContact ?? row?.primary),
  };
}
