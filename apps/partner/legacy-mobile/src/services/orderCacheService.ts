import AsyncStorage from "@react-native-async-storage/async-storage";

import type { PartnerOrder } from "../types/order";

const ORDER_LIST_CACHE_KEY = "partner_orders_cache";
const ORDER_DETAILS_PREFIX = "partner_order_details_";
const STALE_AFTER_MS = 5 * 60 * 1000;

type CacheEnvelope<T> = {
  updatedAt: number;
  data: T;
};

async function saveEnvelope<T>(key: string, data: T) {
  const envelope: CacheEnvelope<T> = { updatedAt: Date.now(), data };
  await AsyncStorage.setItem(key, JSON.stringify(envelope));
}

async function readEnvelope<T>(key: string): Promise<CacheEnvelope<T> | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CacheEnvelope<T>;
  } catch {
    return null;
  }
}

export async function cacheOrderList(key: "newOrders" | "history", orders: PartnerOrder[]) {
  await saveEnvelope(`${ORDER_LIST_CACHE_KEY}:${key}`, orders);
}

export async function getCachedOrderList(key: "newOrders" | "history") {
  return readEnvelope<PartnerOrder[]>(`${ORDER_LIST_CACHE_KEY}:${key}`);
}

export async function cacheOrderDetails(order: PartnerOrder) {
  await saveEnvelope(`${ORDER_DETAILS_PREFIX}${order.id}`, order);
}

export async function getCachedOrderDetails(orderId: number) {
  return readEnvelope<PartnerOrder>(`${ORDER_DETAILS_PREFIX}${orderId}`);
}

export function isCacheStale(updatedAt: number) {
  return Date.now() - updatedAt > STALE_AFTER_MS;
}

