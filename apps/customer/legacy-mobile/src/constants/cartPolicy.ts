export type CartPolicy = {
  maxCartItems: number;
  minServiceQuantity: number;
  maxServiceQuantity: number;
  maxCookQuantity: number;
  maxOtherServiceQuantity: number;
  minCleaningDurationHours: number;
  maxCleaningDurationHours: number;
  instantBookingWindowMinutes: number;
  scheduledBookingWindowDays: number;
  slotIntervalMinutes: number;
};

export const DEFAULT_CART_POLICY: CartPolicy = {
  maxCartItems: 10,
  minServiceQuantity: 1,
  maxServiceQuantity: 5,
  maxCookQuantity: 5,
  maxOtherServiceQuantity: 10,
  minCleaningDurationHours: 0.5,
  maxCleaningDurationHours: 8,
  instantBookingWindowMinutes: 30,
  scheduledBookingWindowDays: 4,
  slotIntervalMinutes: 15,
};

function toPositiveNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function normalizeCartPolicy(input: any): CartPolicy {
  const row = input?.data && typeof input.data === "object" ? input.data : input;
  return {
    maxCartItems: toPositiveNumber(row?.maxCartItems ?? row?.MAX_CART_ITEMS, DEFAULT_CART_POLICY.maxCartItems),
    minServiceQuantity: toPositiveNumber(row?.minServiceQuantity ?? row?.MIN_SERVICE_QUANTITY, DEFAULT_CART_POLICY.minServiceQuantity),
    maxServiceQuantity: toPositiveNumber(row?.maxServiceQuantity ?? row?.MAX_SERVICE_QUANTITY, DEFAULT_CART_POLICY.maxServiceQuantity),
    maxCookQuantity: toPositiveNumber(row?.maxCookQuantity ?? row?.MAX_COOK_QUANTITY, row?.maxServiceQuantity ?? DEFAULT_CART_POLICY.maxCookQuantity),
    maxOtherServiceQuantity: toPositiveNumber(row?.maxOtherServiceQuantity ?? row?.MAX_OTHER_SERVICE_QUANTITY, DEFAULT_CART_POLICY.maxOtherServiceQuantity),
    minCleaningDurationHours: toPositiveNumber(row?.minCleaningDurationHours ?? row?.MIN_CLEANING_DURATION, DEFAULT_CART_POLICY.minCleaningDurationHours),
    maxCleaningDurationHours: toPositiveNumber(row?.maxCleaningDurationHours ?? row?.MAX_CLEANING_DURATION, DEFAULT_CART_POLICY.maxCleaningDurationHours),
    instantBookingWindowMinutes: toPositiveNumber(row?.instantBookingWindowMinutes ?? row?.INSTANT_BOOKING_WINDOW_MINUTES, DEFAULT_CART_POLICY.instantBookingWindowMinutes),
    scheduledBookingWindowDays: toPositiveNumber(row?.scheduledBookingWindowDays ?? row?.SCHEDULED_BOOKING_WINDOW_DAYS, DEFAULT_CART_POLICY.scheduledBookingWindowDays),
    slotIntervalMinutes: toPositiveNumber(row?.slotIntervalMinutes ?? row?.SLOT_INTERVAL_MINUTES, DEFAULT_CART_POLICY.slotIntervalMinutes),
  };
}
