import { describe, expect, it, vi, beforeEach } from "vitest";

const apiMocks = vi.hoisted(() => ({
  getBookingStats: vi.fn(),
  getBookings: vi.fn(),
  getBookingById: vi.fn(),
  updateBooking: vi.fn(),
  cancelBooking: vi.fn(),
  softDeleteBooking: vi.fn(),
  manualDispatchOrder: vi.fn(),
  updateOrderLifecycle: vi.fn(),
}));

const reactQueryMocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
  queryClient: {
    invalidateQueries: vi.fn(),
    cancelQueries: vi.fn(),
    getQueriesData: vi.fn(),
    setQueryData: vi.fn(),
  },
}));

vi.mock("@/features/bookings/api/bookingsApi", () => apiMocks);
vi.mock("@tanstack/react-query", () => ({
  useQuery: reactQueryMocks.useQuery,
  useMutation: reactQueryMocks.useMutation,
  useQueryClient: reactQueryMocks.useQueryClient,
}));

import {
  bookingQueryKeys,
  useBookingDetailsQuery,
  useBookingMutations,
  useBookingsQuery,
  useBookingStatsQuery,
} from "@/features/bookings/hooks/useBookings";

describe("bookings hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reactQueryMocks.useQueryClient.mockReturnValue(reactQueryMocks.queryClient);
    reactQueryMocks.useQuery.mockImplementation((config) => config);
    reactQueryMocks.useMutation.mockImplementation((config) => config);
  });

  it("builds stats, list and details queries", () => {
    const listParams = {
      page: 1,
      size: 10,
      sortBy: "createdAt",
      sortDir: "desc" as const,
      status: "PENDING" as const,
      serviceType: "COOK" as const,
      search: "rahul",
      startDate: "2026-01-01",
      endDate: "2026-01-31",
    };

    const statsQuery = useBookingStatsQuery();
    const listQuery = useBookingsQuery(listParams);
    const detailsQuery = useBookingDetailsQuery(undefined);

    expect(bookingQueryKeys.stats).toEqual(["admin-bookings-stats"]);
    expect(bookingQueryKeys.list(listParams)).toEqual(["admin-bookings-list", listParams]);
    expect(bookingQueryKeys.details("42")).toEqual(["admin-booking-details", "42"]);

    expect(statsQuery.queryFn).toBe(apiMocks.getBookingStats);
    expect(listQuery.queryFn()).toBe(apiMocks.getBookings(listParams));
    expect(listQuery.placeholderData({ rows: [] })).toEqual({ rows: [] });
    expect(detailsQuery.enabled).toBe(false);
    expect(detailsQuery.queryKey).toEqual(["admin-booking-details", ""]);
    expect(detailsQuery.queryFn()).toBe(apiMocks.getBookingById(""));
  });

  it("applies optimistic cancel and delete updates with rollback and invalidation", async () => {
    const mutations = useBookingMutations();
    const previousList = {
      content: [
        { id: "bk-1", status: "PENDING", customerName: "", service: "", serviceType: "OTHER", partnerName: "", bookingDate: "", amount: 0 },
        { id: "bk-2", status: "CONFIRMED", customerName: "", service: "", serviceType: "OTHER", partnerName: "", bookingDate: "", amount: 0 },
      ],
      totalElements: 2,
      totalPages: 1,
      pageNumber: 0,
    };

    reactQueryMocks.queryClient.getQueriesData
      .mockReturnValueOnce([[["admin-bookings-list", { page: 0 }], previousList]])
      .mockReturnValueOnce([[["admin-bookings-list", { page: 0 }], previousList]]);

    const cancelContext = await mutations.cancelBookingMutation.onMutate?.("bk-1");
    expect(reactQueryMocks.queryClient.cancelQueries).toHaveBeenCalledWith({ queryKey: ["admin-bookings-list"] });
    expect(reactQueryMocks.queryClient.setQueryData).toHaveBeenCalledWith(
      ["admin-bookings-list", { page: 0 }],
      expect.objectContaining({
        content: [
          expect.objectContaining({ id: "bk-1", status: "CANCELLED" }),
          expect.objectContaining({ id: "bk-2", status: "CONFIRMED" }),
        ],
      }),
    );
    mutations.cancelBookingMutation.onError?.(new Error("cancel failed"), "bk-1", cancelContext);
    expect(reactQueryMocks.queryClient.setQueryData).toHaveBeenCalledWith(["admin-bookings-list", { page: 0 }], previousList);
    await mutations.cancelBookingMutation.onSuccess?.(undefined, "bk-1", cancelContext);
    expect(reactQueryMocks.queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["admin-booking-details", "bk-1"] });
    expect(reactQueryMocks.queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["admin-bookings-stats"] });

    const deleteContext = await mutations.deleteBookingMutation.onMutate?.("bk-2");
    expect(reactQueryMocks.queryClient.setQueryData).toHaveBeenCalledWith(
      ["admin-bookings-list", { page: 0 }],
      expect.objectContaining({
        content: [expect.objectContaining({ id: "bk-1" })],
        totalElements: 1,
      }),
    );
    mutations.deleteBookingMutation.onError?.(new Error("delete failed"), "bk-2", deleteContext);
    expect(reactQueryMocks.queryClient.setQueryData).toHaveBeenCalledWith(["admin-bookings-list", { page: 0 }], previousList);
    await mutations.deleteBookingMutation.onSuccess?.(undefined, "bk-2", deleteContext);
    expect(reactQueryMocks.queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["admin-bookings-stats"] });
  });

  it("invalidates details and list queries for update, manual dispatch and lifecycle mutations", async () => {
    const mutations = useBookingMutations();

    expect(
      mutations.updateBookingMutation.mutationFn({
        id: "bk-9",
        payload: { bookingDate: "", bookingTime: "", partnerId: 0, amount: 0, notes: "" },
      }),
    ).toBe(apiMocks.updateBooking("bk-9", { bookingDate: "", bookingTime: "", partnerId: 0, amount: 0, notes: "" }));
    await mutations.updateBookingMutation.onSuccess?.(undefined, { id: "bk-9", payload: { bookingDate: "", bookingTime: "", partnerId: 0, amount: 0, notes: "" } });
    expect(reactQueryMocks.queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["admin-bookings-list"] });
    expect(reactQueryMocks.queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["admin-booking-details", "bk-9"] });

    await mutations.manualDispatchMutation.onSuccess?.(undefined, "bk-10", undefined);
    expect(reactQueryMocks.queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["admin-booking-details", "bk-10"] });

    await mutations.updateLifecycleMutation.onSuccess?.(undefined, { orderId: "bk-11", lifecycle: "PARTNER_ACCEPTED" }, undefined);
    expect(reactQueryMocks.queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["admin-booking-details", "bk-11"] });
    expect(mutations.manualDispatchMutation.mutationFn("bk-10")).toBe(apiMocks.manualDispatchOrder("bk-10"));
    expect(mutations.updateLifecycleMutation.mutationFn({ orderId: "bk-11", lifecycle: "PARTNER_ACCEPTED" })).toBe(
      apiMocks.updateOrderLifecycle("bk-11", "PARTNER_ACCEPTED"),
    );
  });

  it("preserves previous list state when optimistic helpers receive no cache or no matching booking", async () => {
    const mutations = useBookingMutations();
    const noMatchList = {
      content: [
        { id: "bk-2", status: "CONFIRMED", customerName: "", service: "", serviceType: "OTHER", partnerName: "", bookingDate: "", amount: 0 },
      ],
      totalElements: 1,
      totalPages: 1,
      pageNumber: 0,
    };

    reactQueryMocks.queryClient.getQueriesData
      .mockReturnValueOnce([[["admin-bookings-list", { page: 0 }], undefined]])
      .mockReturnValueOnce([[["admin-bookings-list", { page: 0 }], undefined]])
      .mockReturnValueOnce([[["admin-bookings-list", { page: 1 }], noMatchList]]);

    await mutations.cancelBookingMutation.onMutate?.("missing");
    expect(reactQueryMocks.queryClient.setQueryData).toHaveBeenCalledWith(["admin-bookings-list", { page: 0 }], undefined);

    await mutations.deleteBookingMutation.onMutate?.("missing");
    expect(reactQueryMocks.queryClient.setQueryData).toHaveBeenCalledWith(["admin-bookings-list", { page: 0 }], undefined);

    await mutations.deleteBookingMutation.onMutate?.("missing-again");
    expect(reactQueryMocks.queryClient.setQueryData).toHaveBeenCalledWith(["admin-bookings-list", { page: 1 }], noMatchList);
  });
});
