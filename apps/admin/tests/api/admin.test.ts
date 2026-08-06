import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
  normalizeCoordinate: vi.fn(),
  parseRouteCoordinates: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  api: {
    get: mocks.get,
    post: mocks.post,
    patch: mocks.patch,
    put: mocks.put,
    delete: mocks.del,
  },
}));

vi.mock("@/features/live-dispatch/utils", () => ({
  normalizeCoordinate: mocks.normalizeCoordinate,
  parseRouteCoordinates: mocks.parseRouteCoordinates,
}));

import {
  createNotification,
  createSupportFaqCategory,
  createSupportFaqItem,
  deleteReview,
  deleteSupportFaqCategory,
  deleteSupportFaqItem,
  fetchActivityLogs,
  fetchBanners,
  fetchBookingById,
  fetchBookingLiveTracking,
  fetchBookingNavigation,
  fetchBookings,
  fetchDashboardRevenue,
  fetchDashboardServiceDistribution,
  fetchDashboardStats,
  fetchNotifications,
  fetchPartnerById,
  fetchPartners,
  fetchPaymentReconciliation,
  fetchPayouts,
  fetchReviews,
  fetchServices,
  fetchSupportFaqCategories,
  fetchSupportFaqItems,
  fetchSupportTicketById,
  fetchSupportTickets,
  fetchSupportTicketsWithFilters,
  fetchUserById,
  fetchUsers,
  flagReview,
  replySupportTicket,
  toggleUserStatus,
  updateBookingPartnerLocation,
  updatePartnerVerification,
  updatePaymentStatus,
  updateSupportFaqCategory,
  updateSupportFaqItem,
  updateSupportTicketStatus,
  upsertBookingPayout,
} from "@/api/admin";

describe("admin api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.normalizeCoordinate.mockImplementation((latitude, longitude) => {
      if (latitude == null || longitude == null) return null;
      return { latitude: Number(latitude), longitude: Number(longitude) };
    });
    mocks.parseRouteCoordinates.mockImplementation((value) => [`parsed:${String(value)}`]);
  });

  it("maps dashboard cards, revenue, and service distribution payloads with fallbacks", async () => {
    mocks.get
      .mockResolvedValueOnce({
        data: {
          result: {
            totalUsers: "12345",
            totalBookings: 80,
            totalCompletedRevenue: "98765.4",
            totalPartners: "bad",
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          items: [
            { month: "Jan", amount: "101", bookings: "4" },
            { name: 2, revenue: "oops", bookings: null },
            { label: {}, value: 9, bookings: 1 },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          distribution: [
            { name: "Cleaning", value: "11" },
            { value: "bad" },
          ],
        },
      })
      .mockResolvedValueOnce({ data: null });

    await expect(fetchDashboardStats()).resolves.toEqual([
      { title: "Total Users", value: "12,345", growth: "Live" },
      { title: "Total Bookings", value: "80", growth: "Live" },
      { title: "Revenue", value: "INR 98,765.4", growth: "Live" },
      { title: "Active Partners", value: "0", growth: "Live" },
    ]);
    await expect(fetchDashboardRevenue()).resolves.toEqual([
      { name: "Jan", revenue: 101, bookings: 4 },
      { name: "2", revenue: 0, bookings: 0 },
      { name: "N/A", revenue: 9, bookings: 1 },
    ]);
    await expect(fetchDashboardServiceDistribution()).resolves.toEqual([
      { name: "Cleaning", value: 11 },
      { name: "Other", value: 0 },
    ]);
    await expect(fetchDashboardStats()).resolves.toEqual([]);
  });

  it("maps users and support-ticket list totals through nested and fallback payloads", async () => {
    mocks.get
      .mockResolvedValueOnce({
        data: {
          content: [{ id: "u1", name: "Rahul" }],
          totalElements: 6,
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: [{ id: "u2", name: "Priya" }],
          total: 4,
        },
      })
      .mockResolvedValueOnce({
        data: {
          results: [{ id: "t1", subject: "Issue" }],
        },
      });

    await expect(fetchUsers({ page: 1, limit: 10, role: "ADMIN", search: "rah" })).resolves.toEqual({
      users: [{ id: "u1", name: "Rahul" }],
      total: 6,
    });
    expect(mocks.get).toHaveBeenNthCalledWith(1, "/api/admin/users", {
      params: { page: 1, limit: 10, role: "ADMIN", search: "rah" },
    });

    await expect(fetchUsers({ page: 2, limit: 5 })).resolves.toEqual({
      users: [{ id: "u2", name: "Priya" }],
      total: 4,
    });
    await expect(
      fetchSupportTicketsWithFilters({ page: 1, limit: 20, search: "issue", status: "", categoryId: "9", priority: "" }),
    ).resolves.toEqual({
      tickets: [{ id: "t1", subject: "Issue" }],
      total: 1,
    });
  });

  it("loads detail records and nullable object payloads", async () => {
    mocks.get
      .mockResolvedValueOnce({ data: { user: { id: "u1", name: "User One" } } })
      .mockResolvedValueOnce({ data: { item: { id: "bk1", status: "CONFIRMED" } } })
      .mockResolvedValueOnce({ data: { partner: { id: "p1", name: "Partner One" } } })
      .mockResolvedValueOnce({ data: { result: { id: "ticket-1", status: "OPEN" } } })
      .mockResolvedValueOnce({ data: { data: { bookingId: 7, amount: 1200, paymentStatus: "PENDING" } } })
      .mockResolvedValueOnce({ data: null });

    await expect(fetchUserById("u1")).resolves.toEqual({ id: "u1", name: "User One" });
    await expect(fetchBookingById("bk1")).resolves.toEqual({ id: "bk1", status: "CONFIRMED" });
    await expect(fetchPartnerById("p1")).resolves.toEqual({ id: "p1", name: "Partner One" });
    await expect(fetchSupportTicketById("ticket-1")).resolves.toEqual({ id: "ticket-1", status: "OPEN" });
    await expect(fetchPaymentReconciliation(7)).resolves.toEqual({
      bookingId: 7,
      amount: 1200,
      paymentStatus: "PENDING",
    });
    await expect(fetchUserById("missing")).resolves.toBeNull();
  });

  it("maps simple collection endpoints and empty payload fallbacks", async () => {
    mocks.get
      .mockResolvedValueOnce({ data: { services: [{ id: "s1" }] } })
      .mockResolvedValueOnce({ data: { banners: [{ id: "b1" }] } })
      .mockResolvedValueOnce({ data: { reviews: [{ id: "r1" }] } })
      .mockResolvedValueOnce({ data: { notifications: [{ id: "n1" }] } })
      .mockResolvedValueOnce({ data: { payouts: [{ id: "pay1" }] } })
      .mockResolvedValueOnce({ data: { logs: [{ id: "log1" }] } })
      .mockResolvedValueOnce({ data: { tickets: [{ id: "st1" }] } })
      .mockResolvedValueOnce({ data: { content: [{ id: "faq-cat" }] } })
      .mockResolvedValueOnce({ data: { items: [{ id: "faq-item" }] } })
      .mockResolvedValueOnce({ data: undefined });

    await expect(fetchServices()).resolves.toEqual([{ id: "s1" }]);
    await expect(fetchBanners()).resolves.toEqual([{ id: "b1" }]);
    await expect(fetchReviews({ rating: 5, service: "Cook" })).resolves.toEqual([{ id: "r1" }]);
    await expect(fetchNotifications({ search: "promo", type: "INFO" })).resolves.toEqual([{ id: "n1" }]);
    await expect(fetchPayouts()).resolves.toEqual([{ id: "pay1" }]);
    await expect(fetchActivityLogs()).resolves.toEqual([{ id: "log1" }]);
    await expect(fetchSupportTickets()).resolves.toEqual([{ id: "st1" }]);
    await expect(fetchSupportFaqCategories()).resolves.toEqual([{ id: "faq-cat" }]);
    await expect(fetchSupportFaqItems("cat-1")).resolves.toEqual([{ id: "faq-item" }]);
    await expect(fetchPartners()).resolves.toEqual([]);
  });

  it("covers root-object and no-match fallback parsing branches", async () => {
    mocks.get
      .mockResolvedValueOnce({ data: [{ id: "direct-array" }] })
      .mockResolvedValueOnce({ data: { items: [{ id: "u3" }] } })
      .mockResolvedValueOnce({ data: { bookingId: 99, amount: 55, paymentStatus: "DONE" } })
      .mockResolvedValueOnce({
        data: {
          result: {
            bookingId: "route-only",
            route: "fallback-route-polyline",
            navigationStatus: "",
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          result: {
            bookingId: "nav-nested",
            navigation: { routePolyline: "nested-route-line" },
          },
        },
      })
      .mockResolvedValueOnce({ data: { unexpected: true } });

    await expect(fetchServices()).resolves.toEqual([{ id: "direct-array" }]);
    await expect(fetchUsers({ page: 3, limit: 1 })).resolves.toEqual({
      users: [{ id: "u3" }],
      total: 1,
    });
    await expect(fetchPaymentReconciliation(99)).resolves.toEqual({
      bookingId: 99,
      amount: 55,
      paymentStatus: "DONE",
    });
    await expect(fetchBookingNavigation("route-only")).resolves.toEqual(
      expect.objectContaining({
        bookingId: "route-only",
        status: "UNKNOWN",
        routeCoordinates: ["parsed:fallback-route-polyline"],
      }),
    );
    await expect(fetchBookingNavigation("nav-nested")).resolves.toEqual(
      expect.objectContaining({
        routeCoordinates: ["parsed:nested-route-line"],
      }),
    );
    await expect(fetchServices()).resolves.toEqual([]);
  });

  it("forwards query params for collection endpoints", async () => {
    mocks.get
      .mockResolvedValueOnce({ data: { bookings: [] } })
      .mockResolvedValueOnce({ data: { partners: [] } });

    await fetchBookings({ page: 1, limit: 25, status: "PENDING", search: "cook" });
    await fetchPartners({ status: "APPROVED", search: "raj" });

    expect(mocks.get).toHaveBeenNthCalledWith(1, "/api/admin/bookings", {
      params: { page: 1, limit: 25, status: "PENDING", search: "cook" },
    });
    expect(mocks.get).toHaveBeenNthCalledWith(2, "/api/admin/partners", {
      params: { status: "APPROVED", search: "raj" },
    });
  });

  it("hits every admin mutation endpoint with the expected payloads", async () => {
    mocks.post.mockResolvedValue({});
    mocks.patch.mockResolvedValue({});
    mocks.put.mockResolvedValue({});
    mocks.del.mockResolvedValue({});

    await toggleUserStatus("u9");
    await updatePartnerVerification({ id: "p9", status: "VERIFIED", reason: "approved" as any });
    await deleteReview("r9");
    await flagReview("r9");
    await createNotification({
      userId: 12,
      title: "Hello",
      message: "World",
      type: "INFO" as any,
      referenceId: 44,
    });
    await updatePaymentStatus(33, "PAID", "settled");
    await upsertBookingPayout(33, { providerId: 9, amount: 400, status: "PENDING" });
    await updateSupportTicketStatus(5, "RESOLVED" as any);
    await replySupportTicket(5, "Done");
    await createSupportFaqCategory({ id: "faq-cat", label: "Bookings", active: true });
    await updateSupportFaqCategory("faq-cat", { id: "faq-cat", label: "Updated", displayOrder: 2 });
    await deleteSupportFaqCategory("faq-cat");
    await createSupportFaqItem("faq-cat", { id: "faq-1", question: "Q", answer: "A" });
    await updateSupportFaqItem("faq-cat", "faq-1", { id: "faq-1", question: "QQ", answer: "AA" });
    await deleteSupportFaqItem("faq-cat", "faq-1");

    expect(mocks.post).toHaveBeenCalledWith("/api/admin/users/u9/toggle");
    expect(mocks.patch).toHaveBeenCalledWith("/api/admin/partners/p9/verification", {
      status: "VERIFIED",
      reason: "approved",
    });
    expect(mocks.del).toHaveBeenCalledWith("/api/admin/reviews/r9");
    expect(mocks.post).toHaveBeenCalledWith("/api/admin/reviews/r9/flag");
    expect(mocks.post).toHaveBeenCalledWith("/api/admin/notifications", {
      userId: 12,
      title: "Hello",
      message: "World",
      type: "INFO",
      referenceId: 44,
    });
    expect(mocks.patch).toHaveBeenCalledWith("/api/v1/admin/booking-management/33/payment/status", {
      paymentStatus: "PAID",
      reason: "settled",
    });
    expect(mocks.put).toHaveBeenCalledWith("/api/v1/admin/booking-management/33/payment/payout", {
      providerId: 9,
      amount: 400,
      status: "PENDING",
    });
    expect(mocks.patch).toHaveBeenCalledWith("/api/v1/admin/support/tickets/5/status", { status: "RESOLVED" });
    expect(mocks.post).toHaveBeenCalledWith("/api/v1/admin/support/tickets/5/reply", { message: "Done" });
    expect(mocks.post).toHaveBeenCalledWith("/api/admin/support/faq-categories", {
      id: "faq-cat",
      label: "Bookings",
      active: true,
    });
    expect(mocks.put).toHaveBeenCalledWith("/api/admin/support/faq-categories/faq-cat", {
      id: "faq-cat",
      label: "Updated",
      displayOrder: 2,
    });
    expect(mocks.del).toHaveBeenCalledWith("/api/admin/support/faq-categories/faq-cat");
    expect(mocks.post).toHaveBeenCalledWith("/api/admin/support/faq-categories/faq-cat/faqs", {
      id: "faq-1",
      question: "Q",
      answer: "A",
    });
    expect(mocks.put).toHaveBeenCalledWith("/api/admin/support/faq-categories/faq-cat/faqs/faq-1", {
      id: "faq-1",
      question: "QQ",
      answer: "AA",
    });
    expect(mocks.del).toHaveBeenCalledWith("/api/admin/support/faq-categories/faq-cat/faqs/faq-1");
  });

  it("normalizes booking navigation through primary and fallback endpoints", async () => {
    mocks.get
      .mockResolvedValueOnce({
        data: {
          data: {
            bookingId: 77,
            navigationStatus: "ON_THE_WAY",
            eta: "15",
            distanceLabel: "3 km",
            polyline: "abc123",
            partnerLocation: { latitude: "28.61", longitude: "77.20" },
            customerLatitude: "28.62",
            customerLongitude: "77.21",
            lastUpdatedAt: "2026-07-15T10:00:00Z",
          },
        },
      })
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({
        data: {
          result: {
            bookingId: "fallback",
            status: "ARRIVED",
            durationMinutes: 8,
            remainingDistanceMeters: 1200,
            routeCoordinates: [[1, 2]],
            partnerLatitude: "10",
            partnerLongitude: "20",
            customerLocation: { latitude: 30, longitude: 40 },
          },
        },
      })
      .mockRejectedValueOnce({ response: { status: 500, data: { message: "nav broke" } } })
      .mockResolvedValueOnce({ data: null });

    await expect(fetchBookingNavigation(77)).resolves.toEqual({
      bookingId: "77",
      status: "ON_THE_WAY",
      etaMinutes: 15,
      distanceMeters: null,
      distanceText: "3 km",
      routePolyline: "abc123",
      routeCoordinates: ["parsed:abc123"],
      partnerLocation: { latitude: 28.61, longitude: 77.2 },
      customerLocation: { latitude: 28.62, longitude: 77.21 },
      updatedAt: "2026-07-15T10:00:00Z",
    });
    await expect(fetchBookingNavigation("fallback")).resolves.toEqual({
      bookingId: "fallback",
      status: "ARRIVED",
      etaMinutes: 8,
      distanceMeters: 1200,
      distanceText: undefined,
      routePolyline: undefined,
      routeCoordinates: ["parsed:1,2"],
      partnerLocation: { latitude: 10, longitude: 20 },
      customerLocation: { latitude: 30, longitude: 40 },
      updatedAt: undefined,
    });
    await expect(fetchBookingNavigation("explode")).rejects.toEqual({
      response: { status: 500, data: { message: "nav broke" } },
    });
    await expect(fetchBookingNavigation("none")).resolves.toBeNull();
  });

  it("normalizes live tracking through primary and fallback endpoints", async () => {
    mocks.get
      .mockResolvedValueOnce({
        data: {
          item: {
            bookingId: 88,
            status: "ACTIVE",
            paymentStatus: "PAID",
            scheduledAt: "2026-07-15T12:00:00Z",
            partnerLocation: {
              partnerId: "p88",
              latitude: "18.5",
              longitude: "73.8",
              pincode: 411001,
              source: "GPS",
              updatedAt: "2026-07-15T12:05:00Z",
            },
            events: [
              { id: 1, bookingId: 88, eventType: "STARTED", eventPayload: { a: 1 }, createdAt: "now" },
            ],
          },
        },
      })
      .mockRejectedValueOnce({ response: { status: 405 } })
      .mockResolvedValueOnce({ data: { result: { bookingId: "fallback-live", status: "DONE", events: [] } } })
      .mockRejectedValueOnce({ response: { status: 500, data: { message: "tracking broke" } } })
      .mockResolvedValueOnce({ data: null });

    await expect(fetchBookingLiveTracking(88)).resolves.toEqual({
      bookingId: "88",
      status: "ACTIVE",
      paymentStatus: "PAID",
      scheduledAt: "2026-07-15T12:00:00Z",
      partnerId: "p88",
      partnerLocation: {
        latitude: 18.5,
        longitude: 73.8,
        pincode: "411001",
        source: "GPS",
        updatedAt: "2026-07-15T12:05:00Z",
      },
      events: [
        {
          id: "1",
          bookingId: "88",
          eventType: "STARTED",
          eventPayload: "",
          createdAt: "now",
        },
      ],
    });
    await expect(fetchBookingLiveTracking("fallback-live")).resolves.toEqual({
      bookingId: "fallback-live",
      status: "DONE",
      paymentStatus: undefined,
      scheduledAt: undefined,
      partnerId: null,
      partnerLocation: null,
      events: [],
    });
    await expect(fetchBookingLiveTracking("boom")).rejects.toEqual({
      response: { status: 500, data: { message: "tracking broke" } },
    });
    await expect(fetchBookingLiveTracking("missing")).resolves.toBeNull();
  });

  it("updates booking partner location with fallback and rethrows unexpected errors", async () => {
    const payload = { latitude: 22.7, longitude: 75.9, pincode: "452001" };

    mocks.patch
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce({ response: { status: 500, data: { message: "patch broke" } } });

    await expect(updateBookingPartnerLocation(91, payload)).resolves.toBeUndefined();
    await expect(updateBookingPartnerLocation(92, payload)).resolves.toBeUndefined();
    await expect(updateBookingPartnerLocation(93, payload)).rejects.toEqual({
      response: { status: 500, data: { message: "patch broke" } },
    });

    expect(mocks.patch).toHaveBeenNthCalledWith(
      1,
      "/api/v1/admin/booking-management/91/tracking/partner-location",
      payload,
    );
    expect(mocks.patch).toHaveBeenNthCalledWith(
      2,
      "/api/v1/admin/booking-management/92/tracking/partner-location",
      payload,
    );
    expect(mocks.patch).toHaveBeenNthCalledWith(
      3,
      "/api/v1/admin/bookings/92/tracking/partner-location",
      payload,
    );
  });

  it("propagates request failures for representative read and write endpoints", async () => {
    const timeoutError = Object.assign(new Error("timeout"), { code: "ECONNABORTED" });
    const cancelError = Object.assign(new Error("canceled"), { code: "ERR_CANCELED" });
    const badRequest = { response: { status: 400, data: { message: "bad request" } } };
    const unauthorized = { response: { status: 401, data: { message: "unauthorized" } } };
    const forbidden = { response: { status: 403, data: { message: "forbidden" } } };
    const notFound = { response: { status: 404, data: { message: "missing" } } };
    const conflict = { response: { status: 409, data: { message: "conflict" } } };
    const validation = { response: { status: 422, data: { message: "validation" } } };
    const limited = { response: { status: 429, data: { message: "slow down" } } };
    const server = { response: { status: 500, data: { message: "server" } } };
    const network = { message: "Network Error" };

    mocks.get
      .mockRejectedValueOnce(timeoutError)
      .mockRejectedValueOnce(cancelError)
      .mockRejectedValueOnce(badRequest)
      .mockRejectedValueOnce(unauthorized)
      .mockRejectedValueOnce(forbidden)
      .mockRejectedValueOnce(notFound)
      .mockRejectedValueOnce(limited)
      .mockRejectedValueOnce(network);
    mocks.post
      .mockRejectedValueOnce(conflict)
      .mockRejectedValueOnce(validation);
    mocks.patch.mockRejectedValueOnce(server);

    await expect(fetchServices()).rejects.toBe(timeoutError);
    await expect(fetchBookings()).rejects.toBe(cancelError);
    await expect(fetchUsers({ page: 1, limit: 10 })).rejects.toEqual(badRequest);
    await expect(fetchUserById("u1")).rejects.toEqual(unauthorized);
    await expect(fetchPartnerById("p1")).rejects.toEqual(forbidden);
    await expect(fetchSupportTicketById("t1")).rejects.toEqual(notFound);
    await expect(fetchPayouts()).rejects.toEqual(limited);
    await expect(fetchNotifications()).rejects.toEqual(network);
    await expect(createNotification({ userId: 0, title: "", message: "", type: "INFO" as any })).rejects.toEqual(conflict);
    await expect(replySupportTicket("1", "")).rejects.toEqual(validation);
    await expect(updateSupportTicketStatus("1", "OPEN" as any)).rejects.toEqual(server);
  });
});
