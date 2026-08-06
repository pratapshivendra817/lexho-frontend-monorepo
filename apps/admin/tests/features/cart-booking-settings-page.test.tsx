import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
  invalidateQueries: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  extractApiError: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
  useMutation: mocks.useMutation,
  useQueryClient: mocks.useQueryClient,
}));

vi.mock("@/components/admin", () => ({
  DataState: ({
    isLoading,
    isError,
    loadingText,
    errorText,
    onRetry,
    children,
  }: {
    isLoading: boolean;
    isError: boolean;
    loadingText: string;
    errorText: string;
    onRetry: () => void;
    children: React.ReactNode;
  }) => {
    if (isLoading) return <div>{loadingText}</div>;
    if (isError) return <button onClick={onRetry}>{errorText}</button>;
    return <div>{children}</div>;
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

vi.mock("@/utils/apiError", () => ({
  extractApiError: mocks.extractApiError,
}));

vi.mock("@/features/cart-booking-settings/api/cartBookingSettingsApi", () => ({
  getAdminCartBookingSettings: vi.fn(),
  updateAdminCartBookingSettings: vi.fn(),
}));

import CartBookingSettingsPage from "@/features/cart-booking-settings/pages/CartBookingSettingsPage";

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

describe("CartBookingSettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useQueryClient.mockReturnValue({ invalidateQueries: mocks.invalidateQueries });
    mocks.extractApiError.mockReturnValue("mapped error");
    mocks.useQuery.mockReturnValue({
      data: defaultSettings,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    mocks.useMutation.mockImplementation(({ mutationFn, onSuccess, onError }) => ({
      isPending: false,
      mutate: async (payload: unknown) => {
        try {
          await mutationFn(payload);
        } catch (error) {
          onError?.(error);
        }
      },
    }));
  });

  it("renders settings and saves valid edits", async () => {
    const user = userEvent.setup();
    const nextSettings = { ...defaultSettings, maxCartItems: 12 };
    mocks.useMutation.mockImplementation(({ onSuccess }) => ({
      isPending: false,
      mutate: async () => {
        await onSuccess?.(nextSettings);
      },
    }));

    render(<CartBookingSettingsPage />);

    expect(screen.getByText("Cart & Booking Settings")).toBeInTheDocument();
    const maxCartInput = screen.getByLabelText("Max cart items");
    await user.clear(maxCartInput);
    await user.type(maxCartInput, "12");
    await user.click(screen.getByRole("button", { name: "Save Settings" }));

    expect(mocks.toastSuccess).toHaveBeenCalledWith("Cart & booking settings updated");
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["admin-cart-booking-settings"] });

    await user.click(screen.getByRole("button", { name: "Production Defaults" }));
    expect(screen.getByLabelText("Max cart items")).toHaveValue(10);
  });

  it("covers loading, retry, and mutation error states", async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    mocks.useQuery.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch,
    });

    const { rerender, unmount } = render(<CartBookingSettingsPage />);
    expect(screen.getByText("Loading cart & booking settings...")).toBeInTheDocument();

    mocks.useQuery.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    });
    rerender(<CartBookingSettingsPage />);
    await user.click(screen.getByRole("button", { name: "Failed to load cart & booking settings" }));
    expect(refetch).toHaveBeenCalled();

    unmount();
    mocks.useQuery.mockReturnValue({
      data: defaultSettings,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    mocks.useMutation.mockImplementation(({ onError }) => ({
      isPending: false,
      mutate: () => onError?.({ response: { status: 500 } }),
    }));
    render(<CartBookingSettingsPage />);
    await user.click(screen.getByRole("button", { name: "Save Settings" }));
    expect(mocks.extractApiError).toHaveBeenCalledWith({ response: { status: 500 } }, "Unable to update cart & booking settings");
    expect(mocks.toastError).toHaveBeenCalledWith("mapped error");
  });
});
