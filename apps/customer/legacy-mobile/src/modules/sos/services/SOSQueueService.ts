import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SOSEvent } from "../types";

const KEY = "@lexho/customer/sos-queue";
export async function getQueuedSOSEvents(): Promise<SOSEvent[]> { try { const raw = await AsyncStorage.getItem(KEY); const rows = raw ? JSON.parse(raw) : []; return Array.isArray(rows) ? rows : []; } catch { return []; } }
export async function queueSOSEvent(event: SOSEvent) { const rows = await getQueuedSOSEvents(); const deduped = rows.filter(row => !(row.eventId === event.eventId && row.eventType === event.eventType && row.location.capturedAt === event.location.capturedAt)); deduped.push(event); await AsyncStorage.setItem(KEY, JSON.stringify(deduped.slice(-100))); }
export async function removeQueuedSOSEvents(count: number) { const rows = await getQueuedSOSEvents(); const remaining = rows.slice(Math.max(0, count)); if (remaining.length) await AsyncStorage.setItem(KEY, JSON.stringify(remaining)); else await AsyncStorage.removeItem(KEY); }
