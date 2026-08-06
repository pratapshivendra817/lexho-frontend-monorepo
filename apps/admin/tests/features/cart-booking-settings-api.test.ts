import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  api: {
    get: mocks.get,
    put: mocks.put,
  },
}));

describe("cart booking settings api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes mixed payload shapes and fallbacks", async () => {
    const { normalizeCartBookingSettings } = await import("@/features/cart-booking-settings/api/cartBookingSettingsApi");
    const { defaultCartBookingSettings } = await import("@/features/cart-booking-settings");

    expect(
      normalizeCartBookingSettings({
        data: {
          MAX_CART_ITEMS: "12",
          MIN_SERVICE_QUANTITY: "2",
          maxServiceQuantity: "bad",
          MAX_COOK_QUANTITY: 7,
          MAX_OTHER_SERVICE_QUANTITY: "11",
          MIN_CLEANING_DURATION: "1.5",
          MAX_CLEANING_DURATION: 6,
          INSTANT_BOOKING_WINDOW_MINUTES: "45",
          SCHEDULED_BOOKING_WINDOW_DAYS: "9",
          SLOT_INTERVAL_MINUTES: "30",
          instantBookingEnabled: "true",
          scheduledBookingEnabled: false,
          subscriptionBookingEnabled: "enabled",
          requireSlotRecheck: "no",
          rejectFullSlots: 1,
          maxBookingsPerSlot: "3",
          subscriptionCheckoutEnabled: "false",
          subscriptionPaymentRequired: true,
          subscriptionAutoRenewEnabled: "1",
        },
      }),
    ).toEqual({
      maxCartItems: 12,
      minServiceQuantity: 2,
      maxServiceQuantity: defaultCartBookingSettings.maxServiceQuantity,
      maxCookQuantity: 7,
      maxOtherServiceQuantity: 11,
      minCleaningDurationHours: 1.5,
      maxCleaningDurationHours: 6,
      instantBookingWindowMinutes: 45,
      scheduledBookingWindowDays: 9,
      slotIntervalMinutes: 30,
      instantBookingEnabled: true,
      scheduledBookingEnabled: false,
      subscriptionBookingEnabled: true,
      requireSlotRecheck: false,
      rejectFullSlots: true,
      maxBookingsPerSlot: 3,
      subscriptionCheckoutEnabled: false,
      subscriptionPaymentRequired: true,
      subscriptionAutoRenewEnabled: true,
    });

    expect(normalizeCartBookingSettings(undefined)).toEqual(defaultCartBookingSettings);
  });

  it("tries known read endpoints before falling back to defaults", async () => {
    mocks.get.mockRejectedValueOnce(new Error("primary down")).mockResolvedValueOnce({
      data: { data: { maxCartItems: 6, minServiceQuantity: 2 } },
    });

    const { getAdminCartBookingSettings } = await import("@/features/cart-booking-settings/api/cartBookingSettingsApi");

    await expect(getAdminCartBookingSettings()).resolves.toMatchObject({
      maxCartItems: 6,
      minServiceQuantity: 2,
    });
    expect(mocks.get).toHaveBeenNthCalledWith(1, "/api/admin/cart-config");
    expect(mocks.get).toHaveBeenNthCalledWith(2, "/api/admin/booking-settings");

    mocks.get.mockReset();
    mocks.get.mockRejectedValueOnce(new Error("a")).mockRejectedValueOnce(new Error("b"));
    await expect(getAdminCartBookingSettings()).resolves.toMatchObject({
      maxCartItems: 10,
      subscriptionAutoRenewEnabled: false,
    });
  });

  it("tries write endpoints in order and rethrows the last error", async () => {
    const payload = {
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

    mocks.put.mockRejectedValueOnce(new Error("first failed")).mockResolvedValueOnce({
      data: { data: { maxCartItems: 25, subscriptionAutoRenewEnabled: true } },
    });

    const { updateAdminCartBookingSettings } = await import("@/features/cart-booking-settings/api/cartBookingSettingsApi");

    await expect(updateAdminCartBookingSettings(payload)).resolves.toMatchObject({
      maxCartItems: 25,
      subscriptionAutoRenewEnabled: true,
    });
    expect(mocks.put).toHaveBeenNthCalledWith(1, "/api/admin/cart-config", payload);
    expect(mocks.put).toHaveBeenNthCalledWith(2, "/api/admin/booking-settings", payload);

    const lastError = new Error("last failed");
    mocks.put.mockReset();
    mocks.put.mockRejectedValueOnce(new Error("first")).mockRejectedValueOnce(lastError);
    await expect(updateAdminCartBookingSettings(payload)).rejects.toBe(lastError);
  });
});
