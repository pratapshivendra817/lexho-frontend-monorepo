import AsyncStorage from "@react-native-async-storage/async-storage";

import { isNetworkOnline, subscribeNetworkStatus } from "./networkService";

const OFFLINE_QUEUE_KEY = "partner_offline_queue_v1";

export type OfflineQueueActionType = "accept_order" | "reject_order" | "update_location";

export type OfflineQueueItem = {
  id: string;
  type: OfflineQueueActionType;
  createdAt: number;
  payload: Record<string, unknown>;
};

type OfflineHandler = (payload: Record<string, unknown>) => Promise<void>;

const handlers = new Map<OfflineQueueActionType, OfflineHandler>();

async function readQueue() {
  const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
  if (!raw) return [] as OfflineQueueItem[];
  try {
    const parsed = JSON.parse(raw) as OfflineQueueItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(items: OfflineQueueItem[]) {
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(items.slice(-100)));
}

let nextOfflineQueueId = 0;

export async function enqueueOfflineAction(type: OfflineQueueActionType, payload: Record<string, unknown>) {
  const queue = await readQueue();
  nextOfflineQueueId += 1;
  queue.push({
    id: `${type}-${Date.now()}-${nextOfflineQueueId}`,
    type,
    payload,
    createdAt: Date.now(),
  });
  await writeQueue(queue);
  return queue.length;
}

export async function getOfflineQueueSize() {
  const queue = await readQueue();
  return queue.length;
}

export function registerOfflineHandler(type: OfflineQueueActionType, handler: OfflineHandler) {
  handlers.set(type, handler);
}

export async function flushOfflineQueue() {
  const online = await isNetworkOnline();
  if (!online) return 0;
  const queue = await readQueue();
  if (!queue.length) return 0;
  const failed: OfflineQueueItem[] = [];
  let processed = 0;
  for (const item of queue) {
    const handler = handlers.get(item.type);
    if (!handler) {
      failed.push(item);
      continue;
    }
    try {
      await handler(item.payload);
      processed += 1;
    } catch {
      failed.push(item);
    }
  }
  await writeQueue(failed);
  return processed;
}

export function startOfflineQueueAutoRetry(onStatus?: (size: number) => void) {
  void getOfflineQueueSize().then((size) => onStatus?.(size));
  return subscribeNetworkStatus((isOnline) => {
    if (!isOnline) return;
    void flushOfflineQueue().then(async () => {
      onStatus?.(await getOfflineQueueSize());
    });
  });
}
