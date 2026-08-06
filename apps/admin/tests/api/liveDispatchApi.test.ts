import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getMock: vi.fn(),
  patchMock: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  api: {
    get: mocks.getMock,
    patch: mocks.patchMock,
  },
}));

import {
  fetchBookingLiveTracking,
  fetchBookingNavigation,
  updateBookingPartnerLocation,
} from "@/api/admin";

describe("live dispatch admin api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps booking navigation payload from booking-management endpoint", async () => {
    mocks.getMock.mockResolvedValueOnce({
      data: {
        data: {
          bookingId: 77,
          status: "PARTNER_ASSIGNED",
          etaMinutes: 14,
          distanceMeters: 3200,
          routePolyline: JSON.stringify([
            [77.2, 28.6],
            [77.21, 28.61],
          ]),
          partnerLocation: { latitude: 28.6, longitude: 77.2 },
          customerLocation: { latitude: 28.61, longitude: 77.21 },
        },
      },
    });

    const result = await fetchBookingNavigation("77");

    expect(mocks.getMock).toHaveBeenCalledWith("/api/v1/admin/booking-management/77/navigation");
    expect(result).toMatchObject({
      bookingId: "77",
      etaMinutes: 14,
      distanceMeters: 3200,
      routeCoordinates: [
        { latitude: 28.6, longitude: 77.2 },
        { latitude: 28.61, longitude: 77.21 },
      ],
    });
  });

  it("falls back to legacy tracking endpoint paths when booking-management endpoints are unavailable", async () => {
    mocks.getMock
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({
        data: {
          data: {
            bookingId: 22,
            status: "PARTNER_REACHED",
            paymentStatus: "PAID",
            partnerId: 9,
            partnerLocation: { latitude: 28.5, longitude: 77.3, source: "GPS" },
            events: [
              {
                id: 1,
                bookingId: 22,
                eventType: "ETA_UPDATED",
                eventPayload: "{}",
                createdAt: "2026-06-15T12:00:00Z",
              },
            ],
          },
        },
      });

    const result = await fetchBookingLiveTracking("22");

    expect(mocks.getMock).toHaveBeenNthCalledWith(1, "/api/v1/admin/booking-management/22/tracking/live");
    expect(mocks.getMock).toHaveBeenNthCalledWith(2, "/api/v1/admin/bookings/22/tracking/live");
    expect(result).toMatchObject({
      bookingId: "22",
      partnerId: "9",
      partnerLocation: { latitude: 28.5, longitude: 77.3, source: "GPS" },
    });
  });

  it("falls back to legacy patch endpoint for partner location override", async () => {
    mocks.patchMock
      .mockRejectedValueOnce({ response: { status: 405 } })
      .mockResolvedValueOnce({});

    await updateBookingPartnerLocation("55", { latitude: 28.7, longitude: 77.4, pincode: "110001" });

    expect(mocks.patchMock).toHaveBeenNthCalledWith(
      1,
      "/api/v1/admin/booking-management/55/tracking/partner-location",
      { latitude: 28.7, longitude: 77.4, pincode: "110001" },
    );
    expect(mocks.patchMock).toHaveBeenNthCalledWith(
      2,
      "/api/v1/admin/bookings/55/tracking/partner-location",
      { latitude: 28.7, longitude: 77.4, pincode: "110001" },
    );
  });
});
