import AsyncStorage from "@react-native-async-storage/async-storage";

import { SHIFT_STORAGE_KEYS, SHIFT_TRACKING } from "./constants";
import { sendPartnerLocationApi } from "./shiftApi";
import type { LocationPayload } from "./types";

async function getQueue(): Promise<LocationPayload[]> {
  const raw = await AsyncStorage.getItem(SHIFT_STORAGE_KEYS.locationQueue);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as LocationPayload[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveQueue(queue: LocationPayload[]) {
  await AsyncStorage.setItem(SHIFT_STORAGE_KEYS.locationQueue, JSON.stringify(queue));
}

export async function enqueueLocation(payload: LocationPayload) {
  const queue = await getQueue();
  const next = [...queue, payload].slice(-SHIFT_TRACKING.maxQueueSize);
  await saveQueue(next);
}

export async function flushLocationQueue() {
  const queue = await getQueue();
  if (!queue.length) return;

  const failed: LocationPayload[] = [];
  for (const item of queue) {
    try {
      await sendPartnerLocationApi(item);
    } catch {
      failed.push(item);
    }
  }
  await saveQueue(failed);
}
