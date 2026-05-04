import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import EditBookingPage from "@/features/bookings/pages/EditBookingPage";
import { renderWithProviders } from "../utils/renderWithProviders";

const mocks = vi.hoisted(() => ({
  useBookingDetailsQuery: vi.fn(),
  useBookingMutations: vi.fn(),
  updateMutate: vi.fn(),
}));

vi.mock("@/features/bookings/hooks/useBookings", () => ({
  useBookingDetailsQuery: mocks.useBookingDetailsQuery,
  useBookingMutations: mocks.useBookingMutations,
}));

describe("EditBookingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.useBookingDetailsQuery.mockReturnValue({
      data: {
        id: "bk-12",
        status: "CONFIRMED",
        service: "Cleaning",
        serviceType: "CLEANING",
        bookingDate: "2026-04-30",
        bookingTime: "10:30",
        notes: "Old note",
        customer: { name: "Aman" },
        provider: { id: "12", name: "Ravi" },
        payment: { amount: 799 },
        timeline: [],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    mocks.useBookingMutations.mockReturnValue({
      updateBookingMutation: {
        mutate: mocks.updateMutate,
        isPending: false,
      },
    });
  });

  it("submits updated booking payload", async () => {
    const user = userEvent.setup();

    renderWithProviders(<EditBookingPage />, {
      route: "/bookings/edit/bk-12",
      path: "/bookings/edit/:id",
    });

    await user.clear(screen.getByLabelText("Booking Date"));
    await user.type(screen.getByLabelText("Booking Date"), "2026-05-01");
    await user.clear(screen.getByLabelText("Booking Time"));
    await user.type(screen.getByLabelText("Booking Time"), "11:45");
    await user.clear(screen.getByLabelText("Provider ID"));
    await user.type(screen.getByLabelText("Provider ID"), "15");
    await user.clear(screen.getByLabelText("Amount"));
    await user.type(screen.getByLabelText("Amount"), "999");
    await user.clear(screen.getByLabelText("Notes"));
    await user.type(screen.getByLabelText("Notes"), "Rescheduled by admin");

    await user.click(screen.getByRole("button", { name: /Save changes/i }));

    await waitFor(() => {
      expect(mocks.updateMutate).toHaveBeenCalledWith(
        {
          id: "bk-12",
          payload: {
            bookingDate: "2026-05-01",
            bookingTime: "11:45",
            providerId: 15,
            amount: 999,
            notes: "Rescheduled by admin",
          },
        },
        expect.any(Object),
      );
    });
  });
});
