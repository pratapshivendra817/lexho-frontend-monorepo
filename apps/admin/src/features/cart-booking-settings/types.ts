export type AdminCartBookingSettings = {
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
  instantBookingEnabled: boolean;
  scheduledBookingEnabled: boolean;
  subscriptionBookingEnabled: boolean;
  requireSlotRecheck: boolean;
  rejectFullSlots: boolean;
  maxBookingsPerSlot: number;
  subscriptionCheckoutEnabled: boolean;
  subscriptionPaymentRequired: boolean;
  subscriptionAutoRenewEnabled: boolean;
};

export const defaultCartBookingSettings: AdminCartBookingSettings = {
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
  instantBookingEnabled: true,
  scheduledBookingEnabled: true,
  subscriptionBookingEnabled: true,
  requireSlotRecheck: true,
  rejectFullSlots: true,
  maxBookingsPerSlot: 1,
  subscriptionCheckoutEnabled: true,
  subscriptionPaymentRequired: true,
  subscriptionAutoRenewEnabled: false,
};
