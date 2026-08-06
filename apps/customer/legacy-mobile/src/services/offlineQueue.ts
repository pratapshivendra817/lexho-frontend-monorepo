import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../api/client";

export type OfflineQueueActionType = "booking:create" | "booking:cancel" | "booking:reschedule" | "profile:update";

export type OfflineQueueItem = {
  id: string;
  type: OfflineQueueActionType;
  endpoint: string;
  method: "post" | "put" | "patch";
  payload: Record<string, unknown>;
  createdAt: number;
};

const STORAGE_KEY = "@lexho/customer/offline-queue";
let nextOfflineQueueId = 0;

async function loadItems() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as OfflineQueueItem[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveItems(items: OfflineQueueItem[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

async function replay(item: OfflineQueueItem) {
  await api.request({
    url: item.endpoint,
    method: item.method,
    data: item.payload,
  });
}

export const offlineQueue = {
  async getItems() {
    return loadItems();
  },

  async enqueue(input: Omit<OfflineQueueItem, "id" | "createdAt">) {
    nextOfflineQueueId += 1;
    const nextItem: OfflineQueueItem = {
      ...input,
      id: `${input.type}-${Date.now()}-${nextOfflineQueueId}`,
      createdAt: Date.now(),
    };
    const items = await loadItems();
    items.push(nextItem);
    await saveItems(items);
    return nextItem;
  },

  async flush() {
    const pending = await loadItems();
    if (!pending.length) return [];
    const failed: OfflineQueueItem[] = [];
    for (const item of pending) {
      try {
        await replay(item);
      } catch {
        failed.push(item);
      }
    }
    await saveItems(failed);
    return failed;
  },
};
