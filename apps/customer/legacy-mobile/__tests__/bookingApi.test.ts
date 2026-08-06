const mockGet = jest.fn();
const mockPost = jest.fn();
const mockParseApiError = jest.fn(
  (_error: unknown, fallback: string) => fallback,
);

jest.mock("../src/api/client", () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
  parseApiError: (error: unknown, fallback: string) =>
    mockParseApiError(error, fallback),
}));

import {
  createBooking,
  getBookingsHistory,
  getBookingsHistoryPage,
} from "../src/api/bookingApi";

describe("bookingApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParseApiError.mockImplementation(
      (_error: unknown, fallback: string) => fallback,
    );
  });

  describe("getBookingsHistoryPage", () => {
    it("maps a complete booking response and nested lifecycle fields", async () => {
      mockGet.mockResolvedValue({
        data: {
          data: {
            items: [
              {
                bookingId: 101,
                bookingStatus: "confirmed",
                service: { name: "Home Cleaning" },
                bookingTime: "2026-06-12T10:00:00Z",
                bookingType: "scheduled",
                dispatchStatus: "assigned",
                slaStartTime: "2026-06-12T11:00:00Z",
                slaMinutes: "30",
                reasonCode: "NONE",
                message: "Partner assigned",
                etaMinutes: "15",
                partner: { name: "Alex", phone: "9999999999" },
                subscription: {
                  id: 44,
                  subscriptionServiceType: "COOK",
                  frequencyDays: ["MON", "WED"],
                  frequencyLabel: "Twice weekly",
                  startDate: "2026-06-01",
                  endDate: "2026-07-01",
                  visits: "8",
                  remainingVisits: "6",
                  timeSlot: "10:00",
                  nextServiceDate: "2026-06-14",
                  nextVisitDate: "2026-06-14",
                  canPause: true,
                  canResume: false,
                },
                paymentStatus: "SUCCESS",
                map: { enabled: true },
                startedAt: "2026-06-12T11:05:00Z",
                expectedCompletionTime: "2026-06-12T12:00:00Z",
                workStatus: "IN_PROGRESS",
                retryPaymentAllowed: false,
                arrivedAt: "2026-06-12T10:55:00Z",
                meta: {
                  trackingScreen: "SERVICE_STARTED",
                  trackingStatus: "ARRIVED",
                  showMap: true,
                  canCancel: false,
                  canReschedule: true,
                  canCallPartner: true,
                  canTrackPartner: true,
                  canRaiseIssue: true,
                  trackingRefreshSeconds: "20",
                },
                timeline: [
                  {
                    code: "CONFIRMED",
                    title: "Confirmed",
                    state: "DONE",
                    completed: true,
                    createdAt: "2026-06-12T10:00:00Z",
                  },
                  { code: "EMPTY", title: "" },
                ],
              },
            ],
            hasMore: true,
          },
        },
      });

      await expect(
        getBookingsHistoryPage({ page: 2, size: 20 }),
      ).resolves.toEqual({
        items: [
          expect.objectContaining({
            id: "101",
            status: "CONFIRMED",
            serviceName: "Home Cleaning",
            bookingType: "SCHEDULED",
            assignmentStatus: "ASSIGNED",
            slaMinutes: 30,
            etaMinutes: 15,
            partnerName: "Alex",
            subscriptionId: "44",
            frequencyDays: ["MON", "WED"],
            visits: 8,
            remainingVisits: 6,
            trackingStatus: "ARRIVED",
            serviceStartedAt: "2026-06-12T11:05:00Z",
            estimatedCompletionTime: "2026-06-12T12:00:00Z",
            progressStatus: "IN_PROGRESS",
            retryPaymentAllowed: false,
            arrivalTime: "2026-06-12T10:55:00Z",
            meta: expect.objectContaining({
              trackingScreen: "SERVICE_STARTED",
              showMap: true,
              canCancel: false,
              canReschedule: true,
              canPause: true,
              canResume: false,
              trackingRefreshSeconds: 20,
            }),
            statusHistory: [
              {
                key: "CONFIRMED",
                label: "Confirmed",
                status: "DONE",
                completed: true,
                timestamp: "2026-06-12T10:00:00Z",
              },
            ],
          }),
        ],
        instantBookings: undefined,
        scheduledBookings: undefined,
        subscriptions: undefined,
        hasMore: true,
        page: 2,
        size: 20,
      });
      expect(mockGet).toHaveBeenCalledWith("/api/bookings/history", {
        params: { page: 2, size: 20 },
      });
    });

    it.each([
      [{ items: [{ id: "item" }], last: false }, "item", true],
      [{ content: [{ id: "content" }], last: true }, "content", false],
      [[{ id: "array" }], "array", false],
      [{ data: [{ id: "nested-array" }] }, "nested-array", false],
      [{ invalid: true }, undefined, false],
    ])(
      "supports history row containers %#",
      async (response, expectedId, expectedHasMore) => {
        mockGet.mockResolvedValue({ data: response });
        const result = await getBookingsHistoryPage({ size: 10 });
        expect(result.items[0]?.id).toBe(expectedId);
        expect(result.hasMore).toBe(expectedHasMore);
      },
    );

    it("maps split instant, scheduled and subscription buckets", async () => {
      mockGet.mockResolvedValue({
        data: {
          instantBookings: {
            items: [{ id: "i1", status: "searching" }],
            hasMore: false,
          },
          scheduledBookings: [{ id: "s1", categoryName: "Salon" }],
          subscriptions: {
            items: [
              {
                id: "sub1",
                frequencyDays: ["TUE"],
                visitCount: "4",
                remainingVisits: "2",
              },
            ],
            hasMore: true,
          },
        },
      });

      const result = await getBookingsHistoryPage();
      expect(result.instantBookings).toEqual([
        expect.objectContaining({ id: "i1", status: "SEARCHING" }),
      ]);
      expect(result.scheduledBookings).toEqual([
        expect.objectContaining({ id: "s1", serviceName: "Salon" }),
      ]);
      expect(result.subscriptions).toEqual([
        expect.objectContaining({
          id: "sub1",
          frequencyDays: ["TUE"],
          visits: 4,
          remainingVisits: 2,
        }),
      ]);
      expect(result.hasMore).toBe(true);
    });

    it("normalizes page and size boundaries and infers hasMore from row count", async () => {
      mockGet.mockResolvedValue({
        data: {
          items: Array.from({ length: 12 }, (_, index) => ({ id: index + 1 })),
        },
      });
      const result = await getBookingsHistoryPage({
        page: -5,
        size: 0,
      });
      expect(result.page).toBe(0);
      expect(result.size).toBe(1);
      expect(result.hasMore).toBe(true);
      expect(mockGet).toHaveBeenCalledWith("/api/bookings/history", {
        params: { page: 0, size: 1 },
      });
    });

    it("maps defensive null, undefined and alternate booking fields", async () => {
      mockGet.mockResolvedValue({
        data: {
          content: [
            null,
            {
              id: "",
              status: "",
              serviceName: "Direct service",
              assignmentStatus: "pending",
              promisedStartTime: "soon",
              unavailableReason: "busy",
              partnerName: "Direct partner",
              partnerPhone: "111",
              subscriptionId: "",
              subscriptionServiceType: "DIRECT",
              frequencyDays: ["FRI"],
              frequency: "Weekly",
              startDate: "start",
              endDate: "end",
              visits: "3",
              remainingVisits: "1",
              timeSlot: "09:00",
              nextServiceDate: "next",
              nextVisitDate: "visit",
              trackingStatus: "TRACKING",
              serviceStartedAt: "started",
              estimatedCompletionTime: "ending",
              progressStatus: "WORKING",
              canPause: false,
              canResume: true,
              partnerArrivedAt: "arrived",
              statusHistory: [
                {
                  status: "NEW",
                  name: "Created",
                  active: true,
                  time: "now",
                },
              ],
            },
          ],
        },
      });

      const result = await getBookingsHistoryPage();
      expect(result.items[0]).toEqual(
        expect.objectContaining({
          id: "",
          status: undefined,
          assignmentStatus: undefined,
          statusHistory: [],
        }),
      );
      expect(result.items[1]).toEqual(
        expect.objectContaining({
          serviceName: "Direct service",
          assignmentStatus: "PENDING",
          subscriptionId: undefined,
          frequencyLabel: "Weekly",
          visits: 3,
          remainingVisits: 1,
          meta: expect.objectContaining({
            canPause: false,
            canResume: true,
            arrivalTime: "arrived",
          }),
          statusHistory: [
            expect.objectContaining({
              key: "NEW",
              label: "Created",
              active: true,
              timestamp: "now",
            }),
          ],
        }),
      );
    });

    it.each([
      [{ response: { status: 400 } }, "Bad request"],
      [{ response: { status: 500 } }, "Server unavailable"],
      [{ code: "ERR_NETWORK" }, "Network failure"],
      [{ code: "ECONNABORTED" }, "Request timeout"],
    ])("normalizes history errors %#", async (error, message) => {
      mockGet.mockRejectedValue(error);
      mockParseApiError.mockReturnValue(message);
      await expect(getBookingsHistoryPage()).rejects.toThrow(message);
    });
  });

  describe("getBookingsHistory", () => {
    it("returns the first 100 mapped booking items", async () => {
      mockGet.mockResolvedValue({
        data: { items: [{ bookingId: "B1", bookingStatus: "completed" }] },
      });
      await expect(getBookingsHistory()).resolves.toEqual([
        expect.objectContaining({ id: "B1", status: "COMPLETED" }),
      ]);
      expect(mockGet).toHaveBeenCalledWith("/api/bookings/history", {
        params: { page: 0, size: 100 },
      });
    });
  });

  describe("createBooking", () => {
    it("creates a scheduled booking with normalized coordinates and values", async () => {
      mockPost.mockResolvedValue({
        data: {
          data: {
            bookingId: "B1",
            bookingStatus: "confirmed",
            service: { name: "Cleaning" },
          },
        },
      });

      await expect(
        createBooking({
          serviceId: "7",
          addressId: "8",
          latitude: 22.7,
          longitude: 75.8,
          date: " 2026-06-13 ",
          slot: " 10:00 ",
          note: " Ring bell ",
        }),
      ).resolves.toEqual(
        expect.objectContaining({
          id: "B1",
          status: "CONFIRMED",
          serviceName: "Cleaning",
        }),
      );
      expect(mockPost).toHaveBeenCalledWith("/api/v1/bookings/create", {
        serviceId: 7,
        addressId: 8,
        latitude: 22.7,
        longitude: 75.8,
        coordinates: { lat: 22.7, lng: 75.8 },
        bookingType: "SCHEDULED",
        date: "2026-06-13",
        slot: "10:00",
        note: "Ring bell",
      });
    });

    it.each([
      [undefined, undefined],
      [0, 75.8],
      [22.7, 0],
      [Number.NaN, 75.8],
      [22.7, Number.POSITIVE_INFINITY],
    ])(
      "creates an instant booking without invalid coordinates %#",
      async (latitude, longitude) => {
        mockPost.mockResolvedValue({ data: null });
        const result = await createBooking({
          serviceId: undefined as any,
          addressId: undefined as any,
          latitude: latitude as any,
          longitude: longitude as any,
          date: "date-only",
          slot: "",
          note: " ",
        });
        expect(result).toEqual(
          expect.objectContaining({
            id: "",
            status: undefined,
            statusHistory: [],
          }),
        );
        expect(mockPost).toHaveBeenCalledWith(
          "/api/v1/bookings/create",
          expect.objectContaining({
            serviceId: 0,
            addressId: 0,
            latitude: undefined,
            longitude: undefined,
            coordinates: undefined,
            bookingType: "INSTANT",
            date: "date-only",
            slot: undefined,
            note: undefined,
          }),
        );
        mockPost.mockClear();
      },
    );

    it.each([404, 405])(
      "falls back to the legacy create endpoint on HTTP %s",
      async (status) => {
        mockPost
          .mockRejectedValueOnce({ response: { status } })
          .mockResolvedValueOnce({
            data: { id: "legacy", status: "pending" },
          });
        await expect(
          createBooking({
            serviceId: "1",
            addressId: "2",
            date: "",
            slot: "",
          }),
        ).resolves.toEqual(
          expect.objectContaining({ id: "legacy", status: "PENDING" }),
        );
        expect(mockPost).toHaveBeenNthCalledWith(
          2,
          "/api/bookings/create",
          expect.objectContaining({
            bookingType: "INSTANT",
            date: "",
            slot: "",
          }),
        );
      },
    );

    it.each([
      [{ response: { status: 400, data: { message: "Invalid", reasonCode: "BAD" } } }, "Invalid booking"],
      [{ response: { status: 500, data: { message: "Down" } } }, "Server failure"],
      [{ code: "ERR_NETWORK", message: "Network Error" }, "Network failure"],
      [{ code: "ECONNABORTED", message: "timeout" }, "Timeout failure"],
    ])("does not retry non-legacy create errors %#", async (error, readable) => {
      mockPost.mockRejectedValue(error);
      mockParseApiError.mockReturnValue(readable);
      await expect(
        createBooking({ serviceId: "1", addressId: "2" }),
      ).rejects.toThrow(readable);
      expect(mockPost).toHaveBeenCalledTimes(1);
    });

    it("propagates a failed legacy fallback with mapped backend context", async () => {
      mockPost
        .mockRejectedValueOnce({ response: { status: 404 } })
        .mockRejectedValueOnce({
          response: {
            status: 422,
            data: {
              message: "Address coordinates are required",
              reasonCode: "INVALID_COORDINATES",
            },
          },
        });
      mockParseApiError.mockReturnValue("Booking failed");

      await expect(
        createBooking({ serviceId: "1", addressId: "2" }),
      ).rejects.toThrow("Booking failed");
      expect(mockPost).toHaveBeenCalledTimes(2);
    });
  });
});
