import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useBookingDetailsQuery: vi.fn(),
  useBookingMutations: vi.fn(),
  updateMutate: vi.fn(),
  navigate: vi.fn(),
  refetch: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  params: { id: undefined as string | undefined },
}));

vi.mock("@/features/bookings/hooks/useBookings", () => ({
  useBookingDetailsQuery: mocks.useBookingDetailsQuery,
  useBookingMutations: mocks.useBookingMutations,
}));

vi.mock("@/utils/apiError", () => ({
  extractApiError: (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? `${fallback}: ${error.message}` : fallback,
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
    useParams: () => mocks.params,
  };
});

import EditBookingPage from "@/features/bookings/pages/EditBookingPage";
import { renderWithProviders } from "../utils/renderWithProviders";

describe("EditBookingPage edges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.params = { id: undefined };
    mocks.useBookingDetailsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: mocks.refetch,
    });
    mocks.useBookingMutations.mockReturnValue({
      updateBookingMutation: {
        mutate: mocks.updateMutate,
        isPending: false,
      },
    });
  });

  it("handles loading, error and empty states with retry", async () => {
    const user = userEvent.setup();
    mocks.useBookingDetailsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: mocks.refetch,
    });

    const { rerender } = renderWithProviders(<EditBookingPage />);
    expect(screen.getByText("Loading booking for edit...")).toBeInTheDocument();

    mocks.useBookingDetailsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mocks.refetch,
    });
    rerender(<EditBookingPage />);
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(mocks.refetch).toHaveBeenCalled();

    mocks.useBookingDetailsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: mocks.refetch,
    });
    rerender(<EditBookingPage />);
    expect(screen.getByText("Booking not found")).toBeInTheDocument();
  });

  it("returns early without id and supports close navigation fallback", async () => {
    const user = userEvent.setup();
    mocks.useBookingDetailsQuery.mockReturnValue({
      data: {
        id: "bk-1",
        bookingDate: "2026-05-01",
        bookingTime: "11:00",
        partner: { id: "2" },
        payment: { amount: 500 },
        notes: "hello",
      },
      isLoading: false,
      isError: false,
      refetch: mocks.refetch,
    });

    renderWithProviders(<EditBookingPage />);
    await user.click(screen.getByRole("button", { name: /Save changes/i }));
    expect(mocks.updateMutate).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /close/i }));
    expect(mocks.navigate).toHaveBeenCalledWith("/bookings", { replace: true });
  });

  it("shows update success and error feedback", async () => {
    const user = userEvent.setup();
    mocks.params = { id: "bk-2" };
    mocks.useBookingDetailsQuery.mockReturnValue({
      data: {
        id: "bk-2",
        bookingDate: "2026-05-01",
        bookingTime: "11:00",
        partner: { id: "2" },
        payment: { amount: 500 },
        notes: "hello",
      },
      isLoading: false,
      isError: false,
      refetch: mocks.refetch,
    });

    renderWithProviders(<EditBookingPage />);
    await user.click(screen.getByRole("button", { name: /Save changes/i }));
    await waitFor(() => {
      expect(mocks.updateMutate).toHaveBeenCalled();
    });
    const options = mocks.updateMutate.mock.calls[0][1];
    options.onSuccess();
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Booking updated");
    expect(mocks.navigate).toHaveBeenCalledWith("/bookings/bk-2", { replace: true });
    options.onError(new Error("update failed"));
    expect(mocks.toastError).toHaveBeenCalledWith("Unable to update booking: update failed");
  });
});
