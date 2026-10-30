import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getMock: vi.fn(),
  putMock: vi.fn(),
  deleteMock: vi.fn(),
  postMock: vi.fn(),
  patchMock: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  api: {
    get: mocks.getMock,
    put: mocks.putMock,
    delete: mocks.deleteMock,
    post: mocks.postMock,
    patch: mocks.patchMock,
  },
}));

import {
  cancelBooking,
  getBookingById,
  getBookings,
  getBookingStats,
  manualDispatchOrder,
  softDeleteBooking,
  updateOrderLifecycle,
  updateBooking,
} from "@/features/bookings/api/bookingsApi";

describe("bookingsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps booking stats response", async () => {
    mocks.getMock.mockResolvedValue({
      data: {
        data: {
          pending: 124,
          confirmed: 386,
          completed: 2844,
          cancelled: 300,
        },
      },
    });

    const stats = await getBookingStats();

    expect(mocks.getMock).toHaveBeenCalledWith("/api/admin/bookings/stats");
    expect(stats).toEqual({
      pending: 124,
      confirmed: 386,
      completed: 2844,
      cancelled: 300,
    });
  });

  it("maps bookings list response and forwards query params", async () => {
    mocks.getMock.mockResolvedValue({
      data: {
        content: [
          {
            id: "bk-1",
            customerName: "Rahul",
            serviceName: "Home Cook",
            serviceType: "COOK",
            partnerName: "Sanjay",
            bookingDate: "2026-04-28",
            amount: "799",
            status: "PENDING",
          },
        ],
        totalElements: 100,
        totalPages: 10,
        pageNumber: 0,
      },
    });

    const response = await getBookings({
      page: 0,
      size: 10,
      sortBy: "createdAt",
      sortDir: "desc",
      status: "PENDING",
      serviceType: "COOK",
      search: "Rahul",
      startDate: "2026-04-01",
      endDate: "2026-04-30",
    });

    expect(mocks.getMock).toHaveBeenCalledWith("/api/admin/bookings", {
      params: {
        page: 0,
        size: 10,
        sortBy: "createdAt",
        sortDir: "desc",
        status: "PENDING",
        serviceType: "COOK",
        search: "Rahul",
        startDate: "2026-04-01",
        endDate: "2026-04-30",
      },
    });

    expect(response).toEqual({
      content: [
        {
          id: "bk-1",
          customerName: "Rahul",
          service: "Home Cook",
          serviceType: "COOK",
          partnerName: "Sanjay",
          bookingDate: "2026-04-28",
          amount: 799,
          status: "PENDING",
          createdAt: "",
        },
      ],
      totalElements: 100,
      totalPages: 10,
      pageNumber: 0,
    });
  });

  it("hits booking detail and mutation endpoints", async () => {
    mocks.getMock.mockResolvedValue({
      data: {
        data: {
          id: "bk-77",
          status: "CONFIRMED",
          serviceName: "Cleaning",
          serviceType: "CLEANING",
          bookingDate: "2026-04-29",
          bookingTime: "10:30:00",
          amount: 999,
          customer: { name: "Aman" },
          partner: { id: 12, name: "Ravi" },
          payment: { amount: 999, method: "UPI" },
          timeline: [{ label: "Created", at: "2026-04-27" }],
        },
      },
    });
    mocks.putMock.mockResolvedValue({});
    mocks.deleteMock.mockResolvedValue({});

    const details = await getBookingById("bk-77");
    await updateBooking("bk-77", {
      bookingDate: "2026-04-30",
      bookingTime: "11:00:00",
      partnerId: 14,
      amount: 1099,
      notes: "Rescheduled",
    });
    await cancelBooking("bk-77");
    await softDeleteBooking("bk-77");

    expect(mocks.getMock).toHaveBeenCalledWith("/api/admin/bookings/bk-77");
    expect(details?.id).toBe("bk-77");
    expect(details?.partner.id).toBe("12");
    expect(mocks.putMock).toHaveBeenCalledWith("/api/admin/bookings/bk-77", {
      bookingDate: "2026-04-30",
      bookingTime: "11:00:00",
      partnerId: 14,
      amount: 1099,
      notes: "Rescheduled",
    });
    expect(mocks.putMock).toHaveBeenCalledWith("/api/admin/bookings/bk-77/cancel");
    expect(mocks.deleteMock).toHaveBeenCalledWith("/api/admin/bookings/bk-77");
  });

  it("returns null for empty detail payload and hits dispatch lifecycle endpoints", async () => {
    mocks.getMock.mockResolvedValueOnce({ data: null });
    mocks.getMock.mockResolvedValueOnce({
      data: {
        items: [
          {
            bookingId: "legacy-1",
            customer: { name: "A" },
            serviceName: "Svc",
            service: { type: "weird", name: "Svc" },
            partner: { name: "P" },
            date: "2026-06-01",
            totalAmount: "99",
            status: "other",
          },
        ],
        totalPages: "3",
      },
    });
    mocks.postMock.mockResolvedValue({});
    mocks.patchMock.mockResolvedValue({});

    const details = await getBookingById("missing-booking");
    const list = await getBookings({
      page: 2,
      size: 10,
      sortBy: "createdAt",
      sortDir: "desc",
      status: "",
      serviceType: "",
      search: "",
      startDate: "",
      endDate: "",
    });
    await manualDispatchOrder("order-99");
    await updateOrderLifecycle("order-99", "ARRIVED");

    expect(details).toBeNull();
    expect(list).toEqual({
      content: [
        {
          id: "legacy-1",
          customerName: "A",
          service: "Svc",
          serviceType: "OTHER",
          partnerName: "P",
          bookingDate: "2026-06-01",
          amount: 99,
          status: "PENDING",
          createdAt: "",
        },
      ],
      totalElements: 1,
      totalPages: 3,
      pageNumber: 2,
    });
    expect(mocks.postMock).toHaveBeenCalledWith("/api/admin/dispatch/orders/order-99");
    expect(mocks.patchMock).toHaveBeenCalledWith("/api/admin/dispatch/orders/order-99/lifecycle", {
      status: "ARRIVED",
    });
  });
});


