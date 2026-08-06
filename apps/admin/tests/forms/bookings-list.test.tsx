import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import BookingsPage from "@/features/bookings/pages/BookingsPage";
import { renderWithProviders } from "../utils/renderWithProviders";

const mocks = vi.hoisted(() => ({
  useBookingsQuery: vi.fn(),
  useBookingStatsQuery: vi.fn(),
  useBookingMutations: vi.fn(),
  exportBookingsToCsv: vi.fn(),
  cancelMutate: vi.fn(),
  deleteMutate: vi.fn(),
  listRefetch: vi.fn(),
  statsRefetch: vi.fn(),
}));

vi.mock("@/features/bookings/hooks/useBookings", () => ({
  useBookingsQuery: mocks.useBookingsQuery,
  useBookingStatsQuery: mocks.useBookingStatsQuery,
  useBookingMutations: mocks.useBookingMutations,
}));

vi.mock("@/features/bookings/utils/exportBookingsToCsv", () => ({
  exportBookingsToCsv: mocks.exportBookingsToCsv,
}));

describe("BookingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const rows = [
      {
        id: "bk-1",
        customerName: "Rahul",
        service: "Home Cook",
        serviceType: "COOK",
        providerName: "Sanjay",
        bookingDate: "2026-04-28",
        amount: 799,
        status: "PENDING",
      },
    ];

    mocks.useBookingsQuery.mockReturnValue({
      data: {
        content: rows,
        totalElements: 1,
        totalPages: 1,
        pageNumber: 0,
      },
      isLoading: false,
      isError: false,
      refetch: mocks.listRefetch,
      isFetching: false,
    });

    mocks.useBookingStatsQuery.mockReturnValue({
      data: { pending: 1, confirmed: 0, completed: 0, cancelled: 0 },
      isLoading: false,
      isError: false,
      refetch: mocks.statsRefetch,
    });

    mocks.useBookingMutations.mockReturnValue({
      cancelBookingMutation: { mutate: mocks.cancelMutate },
      deleteBookingMutation: { mutate: mocks.deleteMutate },
    });
  });

  it("parses URL query params and exports current rows", async () => {
    const user = userEvent.setup();

    renderWithProviders(<BookingsPage />, {
      route: "/bookings?status=PENDING&serviceType=COOK&page=1&sortBy=bookingDate&sortDir=asc&search=Rahul",
    });

    expect(mocks.useBookingsQuery).toHaveBeenCalledWith({
      page: 1,
      size: 10,
      sortBy: "bookingDate",
      sortDir: "asc",
      status: "PENDING",
      serviceType: "COOK",
      search: "Rahul",
      startDate: undefined,
      endDate: undefined,
    });

    await user.click(screen.getByRole("button", { name: /Export CSV/i }));

    expect(mocks.exportBookingsToCsv).toHaveBeenCalledWith([
      expect.objectContaining({ id: "bk-1", customerName: "Rahul" }),
    ]);
  });

  it("supports reset on list filters", async () => {
    const user = userEvent.setup();

    renderWithProviders(<BookingsPage />, {
      route: "/bookings?page=3&status=CONFIRMED&serviceType=CLEANING&sortBy=amount&sortDir=asc&search=abc&startDate=2026-04-01&endDate=2026-04-30",
    });

    await user.click(screen.getByRole("button", { name: /Reset/i }));
    expect(mocks.useBookingsQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: 0,
        size: 10,
        sortBy: "createdAt",
        sortDir: "desc",
      }),
    );
  });
});
