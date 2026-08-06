import AsyncStorage from "@react-native-async-storage/async-storage";
import type { TriggerSOSRequest } from "../types";

const QUEUE_KEY = "@lexho/partner/sos-queue";
const CONTACTS_KEY = "@lexho/partner/emergency-contacts";

export async function getQueuedSOSRequests(): Promise<TriggerSOSRequest[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const rows = raw ? JSON.parse(raw) : [];
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

export async function queueSOSRequest(payload: TriggerSOSRequest) {
  const rows = await getQueuedSOSRequests();
  rows.push(payload);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(rows.slice(-20)));
}

export async function removeQueuedSOSRequests(count: number) {
  const rows = await getQueuedSOSRequests();
  const remaining = rows.slice(Math.max(0, count));
  if (remaining.length) await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  else await AsyncStorage.removeItem(QUEUE_KEY);
}

export async function getCachedEmergencyContacts() {
  try {
    const raw = await AsyncStorage.getItem(CONTACTS_KEY);
    const rows = raw ? JSON.parse(raw) : [];
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

export async function cacheEmergencyContact(contact: Record<string, unknown>) {
  const rows = await getCachedEmergencyContacts();
  const id = String(contact.id ?? `${Date.now()}`);
  const next = [{ ...contact, id }, ...rows.filter((row: any) => String(row.id) !== id)].slice(0, 5);
  await AsyncStorage.setItem(CONTACTS_KEY, JSON.stringify(next));
  return next;
}
