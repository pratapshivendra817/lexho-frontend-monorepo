import { api } from "@/api/axios";

import { defaultCartBookingSettings, type AdminCartBookingSettings } from "../types";

const endpoints = ["/api/admin/cart-config", "/api/admin/booking-settings"];

function toNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") return ["true", "1", "yes", "active", "enabled"].includes(value.trim().toLowerCase());
  return fallback;
}

function unwrap(data: unknown) {
  if (data && typeof data === "object" && "data" in data) {
    return (data as { data?: unknown }).data ?? data;
  }
  return data;
}

export function normalizeCartBookingSettings(data: unknown): AdminCartBookingSettings {
  const row = unwrap(data) as Record<string, unknown> | null;
  const source = row && typeof row === "object" ? row : {};
  return {
    maxCartItems: toNumber(source.maxCartItems ?? source.MAX_CART_ITEMS, defaultCartBookingSettings.maxCartItems),
    minServiceQuantity: toNumber(source.minServiceQuantity ?? source.MIN_SERVICE_QUANTITY, defaultCartBookingSettings.minServiceQuantity),
    maxServiceQuantity: toNumber(source.maxServiceQuantity ?? source.MAX_SERVICE_QUANTITY, defaultCartBookingSettings.maxServiceQuantity),
    maxCookQuantity: toNumber(source.maxCookQuantity ?? source.MAX_COOK_QUANTITY, defaultCartBookingSettings.maxCookQuantity),
    maxOtherServiceQuantity: toNumber(source.maxOtherServiceQuantity ?? source.MAX_OTHER_SERVICE_QUANTITY, defaultCartBookingSettings.maxOtherServiceQuantity),
    minCleaningDurationHours: toNumber(source.minCleaningDurationHours ?? source.MIN_CLEANING_DURATION, defaultCartBookingSettings.minCleaningDurationHours),
    maxCleaningDurationHours: toNumber(source.maxCleaningDurationHours ?? source.MAX_CLEANING_DURATION, defaultCartBookingSettings.maxCleaningDurationHours),
    instantBookingWindowMinutes: toNumber(source.instantBookingWindowMinutes ?? source.INSTANT_BOOKING_WINDOW_MINUTES, defaultCartBookingSettings.instantBookingWindowMinutes),
    scheduledBookingWindowDays: toNumber(source.scheduledBookingWindowDays ?? source.SCHEDULED_BOOKING_WINDOW_DAYS, defaultCartBookingSettings.scheduledBookingWindowDays),
    slotIntervalMinutes: toNumber(source.slotIntervalMinutes ?? source.SLOT_INTERVAL_MINUTES, defaultCartBookingSettings.slotIntervalMinutes),
    instantBookingEnabled: toBoolean(source.instantBookingEnabled, defaultCartBookingSettings.instantBookingEnabled),
    scheduledBookingEnabled: toBoolean(source.scheduledBookingEnabled, defaultCartBookingSettings.scheduledBookingEnabled),
    subscriptionBookingEnabled: toBoolean(source.subscriptionBookingEnabled, defaultCartBookingSettings.subscriptionBookingEnabled),
    requireSlotRecheck: toBoolean(source.requireSlotRecheck, defaultCartBookingSettings.requireSlotRecheck),
    rejectFullSlots: toBoolean(source.rejectFullSlots, defaultCartBookingSettings.rejectFullSlots),
    maxBookingsPerSlot: toNumber(source.maxBookingsPerSlot, defaultCartBookingSettings.maxBookingsPerSlot),
    subscriptionCheckoutEnabled: toBoolean(source.subscriptionCheckoutEnabled, defaultCartBookingSettings.subscriptionCheckoutEnabled),
    subscriptionPaymentRequired: toBoolean(source.subscriptionPaymentRequired, defaultCartBookingSettings.subscriptionPaymentRequired),
    subscriptionAutoRenewEnabled: toBoolean(source.subscriptionAutoRenewEnabled, defaultCartBookingSettings.subscriptionAutoRenewEnabled),
  };
}

export async function getAdminCartBookingSettings() {
  for (const endpoint of endpoints) {
    try {
      const { data } = await api.get(endpoint);
      return normalizeCartBookingSettings(data);
    } catch {
      // Try the next known backend shape.
    }
  }
  return defaultCartBookingSettings;
}

export async function updateAdminCartBookingSettings(payload: AdminCartBookingSettings) {
  let lastError: unknown = null;
  for (const endpoint of endpoints) {
    try {
      const { data } = await api.put(endpoint, payload);
      return normalizeCartBookingSettings(data);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}
