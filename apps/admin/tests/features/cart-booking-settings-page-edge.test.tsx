import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const defaultSettings = {
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

async function renderEdgeCase(formOverride: Partial<typeof defaultSettings>) {
  const toastError = vi.fn();

  cleanup();
  vi.resetModules();
  vi.doMock("react", async () => {
    const actual = await vi.importActual<typeof import("react")>("react");
    return {
      ...actual,
      useState: (initial: unknown) => {
        if (typeof initial === "object" && initial && "maxCartItems" in (initial as Record<string, unknown>)) {
          return [{ ...defaultSettings, ...formOverride }, vi.fn()];
        }
        return actual.useState(initial);
      },
    };
  });
  vi.doMock("@tanstack/react-query", () => ({
    useQuery: () => ({ data: defaultSettings, isLoading: false, isError: false, refetch: vi.fn() }),
    useMutation: () => ({ isPending: false, mutate: vi.fn() }),
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  }));
  vi.doMock("@/components/admin", () => ({
    DataState: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  }));
  vi.doMock("react-hot-toast", () => ({
    default: { success: vi.fn(), error: toastError },
  }));
  vi.doMock("@/utils/apiError", () => ({
    extractApiError: vi.fn(),
  }));
  vi.doMock("@/features/cart-booking-settings/api/cartBookingSettingsApi", () => ({
    getAdminCartBookingSettings: vi.fn(),
    updateAdminCartBookingSettings: vi.fn(),
  }));

  const { default: CartBookingSettingsPage } = await import("@/features/cart-booking-settings/pages/CartBookingSettingsPage");
  render(<CartBookingSettingsPage />);
  return { toastError };
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock("react");
  vi.doUnmock("@tanstack/react-query");
  vi.doUnmock("@/components/admin");
  vi.doUnmock("react-hot-toast");
  vi.doUnmock("@/utils/apiError");
  vi.doUnmock("@/features/cart-booking-settings/api/cartBookingSettingsApi");
});

describe("CartBookingSettingsPage edge validations", () => {
  it("shows validation errors for invalid limits and durations", async () => {
    const user = userEvent.setup();

    const maxCart = await renderEdgeCase({ maxCartItems: 0 });
    await user.click(screen.getByRole("button", { name: "Save Settings" }));
    expect(maxCart.toastError).toHaveBeenCalledWith("Maximum cart items must be at least 1");

    const minQty = await renderEdgeCase({ minServiceQuantity: 0 });
    await user.click(screen.getByRole("button", { name: "Save Settings" }));
    expect(minQty.toastError).toHaveBeenCalledWith("Minimum service quantity must be at least 1");

    const duration = await renderEdgeCase({ minCleaningDurationHours: 0 });
    await user.click(screen.getByRole("button", { name: "Save Settings" }));
    expect(duration.toastError).toHaveBeenCalledWith("Minimum cleaning duration cannot be less than 0.5 hour");
  });

  it("shows validation errors for invalid upper bounds and booking modes", async () => {
    const user = userEvent.setup();

    const maxService = await renderEdgeCase({ minServiceQuantity: 3, maxServiceQuantity: 2 });
    await user.click(screen.getByRole("button", { name: "Save Settings" }));
    expect(maxService.toastError).toHaveBeenCalledWith("Maximum service quantity must be greater than minimum");

    const maxCook = await renderEdgeCase({ minServiceQuantity: 3, maxCookQuantity: 2 });
    await user.click(screen.getByRole("button", { name: "Save Settings" }));
    expect(maxCook.toastError).toHaveBeenCalledWith("Maximum cook quantity must be greater than minimum");

    const maxOther = await renderEdgeCase({ minServiceQuantity: 3, maxOtherServiceQuantity: 2 });
    await user.click(screen.getByRole("button", { name: "Save Settings" }));
    expect(maxOther.toastError).toHaveBeenCalledWith("Maximum other service quantity must be greater than minimum");

    const bookingModes = await renderEdgeCase({
      instantBookingEnabled: false,
      scheduledBookingEnabled: false,
      subscriptionBookingEnabled: false,
    });
    await user.click(screen.getByRole("button", { name: "Save Settings" }));
    expect(bookingModes.toastError).toHaveBeenCalledWith("At least one booking mode must be enabled");
  });

  it("shows validation errors for booking windows and slot guards", async () => {
    const user = userEvent.setup();

    const maxDuration = await renderEdgeCase({ minCleaningDurationHours: 2, maxCleaningDurationHours: 1 });
    await user.click(screen.getByRole("button", { name: "Save Settings" }));
    expect(maxDuration.toastError).toHaveBeenCalledWith("Maximum cleaning duration must be greater than minimum");

    const instantWindow = await renderEdgeCase({ instantBookingWindowMinutes: 0 });
    await user.click(screen.getByRole("button", { name: "Save Settings" }));
    expect(instantWindow.toastError).toHaveBeenCalledWith("Instant booking window must be at least 1 minute");

    const scheduledWindow = await renderEdgeCase({ scheduledBookingWindowDays: 0 });
    await user.click(screen.getByRole("button", { name: "Save Settings" }));
    expect(scheduledWindow.toastError).toHaveBeenCalledWith("Scheduled booking window must be at least 1 day");

    const slotInterval = await renderEdgeCase({ slotIntervalMinutes: 0 });
    await user.click(screen.getByRole("button", { name: "Save Settings" }));
    expect(slotInterval.toastError).toHaveBeenCalledWith("Slot interval must be at least 1 minute");

    const maxBookings = await renderEdgeCase({ maxBookingsPerSlot: 0 });
    await user.click(screen.getByRole("button", { name: "Save Settings" }));
    expect(maxBookings.toastError).toHaveBeenCalledWith("Max bookings per slot must be at least 1");
  });
});
