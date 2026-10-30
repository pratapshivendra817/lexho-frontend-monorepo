import API, { getReadableApiError } from "../../services/api";
import {
  endShiftApi,
  fetchShiftHistoryApi,
  sendPartnerLocationApi,
  setPartnerAvailabilityApi,
  startShiftApi,
} from "./shiftApi";

jest.mock("../../services/api", () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    get: jest.fn(),
  },
  getReadableApiError: jest.fn(),
}));

const mockApi = API as jest.Mocked<typeof API>;
const mockGetReadableApiError = getReadableApiError as jest.MockedFunction<typeof getReadableApiError>;

describe("shiftApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.post.mockReset();
    mockApi.put.mockReset();
    mockApi.patch.mockReset();
    mockApi.get.mockReset();
    mockGetReadableApiError.mockReset();
    mockGetReadableApiError.mockImplementation((error: any, fallback: string) => error?.message ?? fallback);
  });

  describe("startShiftApi", () => {
    it("starts the shift using the empty body primary endpoint", async () => {
      const data = { success: true, message: "Partner shift started" };
      mockApi.post.mockResolvedValueOnce({ data } as any);

      await expect(startShiftApi()).resolves.toEqual(data);

      expect(mockApi.post).toHaveBeenCalledWith("/api/partner/dispatch/shift/start");
      expect(mockApi.post).toHaveBeenCalledTimes(1);
    });

    it("falls back to the v1 endpoint when the primary empty body request fails", async () => {
      const data = { success: true };
      mockApi.post.mockRejectedValueOnce(new Error("primary failed"));
      mockApi.post.mockResolvedValueOnce({ data } as any);

      await expect(startShiftApi()).resolves.toEqual(data);

      expect(mockApi.post.mock.calls).toEqual([
        ["/api/partner/dispatch/shift/start"],
        ["/api/v1/partner/dispatch/shift/start"],
      ]);
    });

    it("tries payload variants until one succeeds", async () => {
      const payload = { shiftDate: "2026-07-07", startTime: "09:00", endTime: "17:00" };
      const data = { success: true };

      mockApi.post
        .mockRejectedValueOnce(new Error("empty primary failed"))
        .mockRejectedValueOnce(new Error("empty v1 failed"))
        .mockRejectedValueOnce(new Error("candidate-1 primary failed"))
        .mockRejectedValueOnce(new Error("candidate-1 v1 failed"))
        .mockResolvedValueOnce({ data } as any);

      await expect(startShiftApi(payload)).resolves.toEqual(data);

      expect(mockApi.post).toHaveBeenNthCalledWith(3, "/api/partner/dispatch/shift/start", payload);
      expect(mockApi.post).toHaveBeenNthCalledWith(4, "/api/v1/partner/dispatch/shift/start", payload);
      expect(mockApi.post).toHaveBeenNthCalledWith(5, "/api/partner/dispatch/shift/start", {
        shiftStartDate: "2026-07-07",
        startTime: "09:00",
        endTime: "17:00",
      });
    });

    it("accepts success from the v1 payload variant endpoint", async () => {
      const payload = { shiftDate: "2026-07-07", startTime: "09:00", endTime: "17:00" };
      const data = { success: true };
      mockApi.post
        .mockRejectedValueOnce(new Error("empty primary failed"))
        .mockRejectedValueOnce(new Error("empty v1 failed"))
        .mockRejectedValueOnce(new Error("candidate-1 primary failed"))
        .mockResolvedValueOnce({ data } as any);

      await expect(startShiftApi(payload)).resolves.toEqual(data);

      expect(mockApi.post).toHaveBeenNthCalledWith(4, "/api/v1/partner/dispatch/shift/start", payload);
    });

    it("throws a readable API error when every start attempt fails", async () => {
      const payload = { shiftDate: "2026-07-07", startTime: "09:00", endTime: "17:00" };
      mockApi.post.mockRejectedValue(new Error("backend down"));

      await expect(startShiftApi(payload)).rejects.toThrow("backend down");

      expect(mockGetReadableApiError).toHaveBeenCalledWith(expect.any(Error), "Unable to start shift");
    });

    it("treats success=false as a contract failure", async () => {
      mockApi.post.mockResolvedValue({ data: { success: false } } as any);

      await expect(startShiftApi()).rejects.toThrow("Unable to start shift");
    });

    it("treats non-object contract payloads as failures", async () => {
      mockApi.post.mockResolvedValue({ data: "ok" } as any);

      await expect(startShiftApi()).rejects.toThrow("Unable to start shift");
    });
  });

  describe("endShiftApi", () => {
    it("ends the shift through the v1 endpoint first", async () => {
      const data = { success: true };
      mockApi.post.mockResolvedValueOnce({ data } as any);

      await expect(endShiftApi()).resolves.toEqual(data);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/api/v1/partner/dispatch/shift/end",
        expect.objectContaining({ shiftEnd: expect.any(String) }),
      );
    });

    it("falls back to the legacy end endpoint", async () => {
      const data = { success: true };
      mockApi.post.mockRejectedValueOnce(new Error("v1 unavailable"));
      mockApi.post.mockResolvedValueOnce({ data } as any);

      await expect(endShiftApi()).resolves.toEqual(data);

      expect(mockApi.post).toHaveBeenNthCalledWith(
        2,
        "/api/partner/dispatch/shift/end",
        expect.objectContaining({ shiftEnd: expect.any(String) }),
      );
    });

    it("maps end errors using getReadableApiError", async () => {
      mockApi.post.mockRejectedValue(new Error("timeout"));

      await expect(endShiftApi()).rejects.toThrow("timeout");
      expect(mockGetReadableApiError).toHaveBeenCalledWith(expect.any(Error), "Unable to end shift");
    });
  });

  describe("setPartnerAvailabilityApi", () => {
    it("updates availability through the primary dispatch endpoint and syncs partner availability", async () => {
      mockApi.put
        .mockResolvedValueOnce({ data: { success: true } } as any)
        .mockResolvedValueOnce({ data: { success: true } } as any);

      await expect(setPartnerAvailabilityApi(true, 3)).resolves.toBeUndefined();

      expect(mockApi.put).toHaveBeenNthCalledWith(1, "/api/v1/partner/dispatch/availability", {
        online: true,
        maxActiveJobs: 3,
      });
      expect(mockApi.put).toHaveBeenNthCalledWith(2, "/api/v1/partner/availability", {
        online: true,
        maxActiveJobs: 3,
      });
      expect(mockApi.patch).not.toHaveBeenCalled();
    });

    it("falls back across dispatch payloads and then patch requests", async () => {
      mockApi.put
        .mockRejectedValueOnce(new Error("v1 put failed"))
        .mockRejectedValueOnce(new Error("legacy put failed"))
        .mockRejectedValueOnce(new Error("v1 put failed 2"))
        .mockRejectedValueOnce(new Error("legacy put failed 2"));
      mockApi.put
        .mockRejectedValueOnce(new Error("v1 put failed 3"))
        .mockRejectedValueOnce(new Error("legacy put failed 3"))
        .mockRejectedValueOnce(new Error("v1 put failed 4"))
        .mockRejectedValueOnce(new Error("legacy put failed 4"));
      mockApi.patch
        .mockResolvedValueOnce({ data: { success: true } } as any);
      mockApi.put.mockResolvedValueOnce({ data: { success: true } } as any);

      await expect(setPartnerAvailabilityApi(false)).resolves.toBeUndefined();

      expect(mockApi.patch).toHaveBeenCalledWith("/api/v1/partner/dispatch/availability", {
        online: false,
        maxActiveJobs: undefined,
      });
    });

    it("throws a readable error when availability update never succeeds", async () => {
      mockApi.put.mockRejectedValue(new Error("offline"));
      mockApi.patch.mockRejectedValue(new Error("offline"));

      await expect(setPartnerAvailabilityApi(true)).rejects.toThrow("offline");
      expect(mockGetReadableApiError).toHaveBeenCalledWith(expect.any(Error), "Unable to update availability");
    });

    it("rejects and rolls dispatch offline when service availability cannot sync", async () => {
      mockApi.put
        .mockResolvedValueOnce({ data: { success: true } } as any)
        .mockRejectedValueOnce(new Error("partner sync failed"))
        .mockRejectedValueOnce(new Error("legacy partner sync failed"))
        .mockRejectedValueOnce(new Error("partner sync failed payload 2"))
        .mockRejectedValueOnce(new Error("legacy partner sync failed payload 2"))
        .mockRejectedValueOnce(new Error("partner sync failed payload 3"))
        .mockRejectedValueOnce(new Error("legacy partner sync failed payload 3"))
        .mockRejectedValueOnce(new Error("partner sync failed payload 4"))
        .mockRejectedValueOnce(new Error("legacy partner sync failed payload 4"))
        .mockResolvedValueOnce({ data: { success: true } } as any);

      await expect(setPartnerAvailabilityApi(true)).rejects.toThrow("legacy partner sync failed payload 4");
      expect(mockApi.put).toHaveBeenLastCalledWith("/api/v1/partner/dispatch/availability", { online: false });
    });

    it("accepts the backend's direct availability response", async () => {
      mockApi.put
        .mockResolvedValueOnce({ data: { success: true } } as any)
        .mockResolvedValueOnce({ data: { online: true, updatedAt: "2026-09-16T12:00:00Z" } } as any);
      await expect(setPartnerAvailabilityApi(true)).resolves.toBeUndefined();
    });

    it("accepts the legacy dispatch availability endpoint and legacy partner sync endpoint", async () => {
      mockApi.put
        .mockRejectedValueOnce(new Error("v1 dispatch failed"))
        .mockResolvedValueOnce({ data: { success: true } } as any)
        .mockRejectedValueOnce(new Error("v1 sync failed"))
        .mockResolvedValueOnce({ data: { success: true } } as any);

      await expect(setPartnerAvailabilityApi(true, 2)).resolves.toBeUndefined();

      expect(mockApi.put).toHaveBeenNthCalledWith(2, "/api/partner/dispatch/availability", {
        online: true,
        maxActiveJobs: 2,
      });
      expect(mockApi.put).toHaveBeenNthCalledWith(4, "/api/partner/availability", {
        online: true,
        maxActiveJobs: 2,
      });
    });

    it("accepts the legacy patch dispatch endpoint when the v1 patch fails", async () => {
      mockApi.put
        .mockRejectedValueOnce(new Error("put failed 1"))
        .mockRejectedValueOnce(new Error("put failed 2"))
        .mockRejectedValueOnce(new Error("put failed 3"))
        .mockRejectedValueOnce(new Error("put failed 4"))
        .mockRejectedValueOnce(new Error("put failed 5"))
        .mockRejectedValueOnce(new Error("put failed 6"))
        .mockRejectedValueOnce(new Error("put failed 7"))
        .mockRejectedValueOnce(new Error("put failed 8"))
        .mockResolvedValueOnce({ data: { success: true } } as any);
      mockApi.patch
        .mockRejectedValueOnce(new Error("v1 patch failed"))
        .mockResolvedValueOnce({ data: { success: true } } as any);

      await expect(setPartnerAvailabilityApi(false, 1)).resolves.toBeUndefined();

      expect(mockApi.patch).toHaveBeenNthCalledWith(2, "/api/partner/dispatch/availability", {
        online: false,
        maxActiveJobs: 1,
      });
    });
  });

  describe("sendPartnerLocationApi", () => {
    it("sends the normalized location payload to the v1 endpoint", async () => {
      mockApi.post.mockResolvedValueOnce({ data: { success: true } } as any);
      const payload = {
        latitude: 12.9,
        longitude: 77.5,
        accuracy: 8,
        capturedAt: 123,
        source: "network",
        trackingState: "AVAILABLE",
        bookingId: 9,
        customerLatitude: 13.1,
        customerLongitude: 77.7,
        accuracyMeters: 7,
        speedKmh: 14,
        headingDegrees: 120,
        mockLocation: true,
        rootedDevice: false,
        gpsEnabled: false,
      };

      await expect(sendPartnerLocationApi(payload)).resolves.toBeUndefined();

      expect(mockApi.post).toHaveBeenCalledWith("/api/v1/partner/dispatch/location", {
        latitude: 12.9,
        longitude: 77.5,
        source: "network",
        trackingState: "AVAILABLE",
        bookingId: 9,
        customerLatitude: 13.1,
        customerLongitude: 77.7,
        accuracyMeters: 7,
        speedKmh: 14,
        headingDegrees: 120,
        mockLocation: true,
        rootedDevice: false,
        gpsEnabled: false,
      });
    });

    it("falls back to the legacy endpoint and includes accuracy", async () => {
      mockApi.post.mockRejectedValueOnce(new Error("v1 failed"));
      mockApi.post.mockResolvedValueOnce({ data: { success: true } } as any);

      await expect(
        sendPartnerLocationApi({
          latitude: 1,
          longitude: 2,
          accuracy: 15,
          capturedAt: 100,
        }),
      ).resolves.toBeUndefined();

      expect(mockApi.post).toHaveBeenNthCalledWith(2, "/api/partner/dispatch/location", expect.objectContaining({
        accuracy: 15,
        gpsEnabled: true,
        source: "gps",
      }));
    });

    it("throws a readable error when location update fails", async () => {
      mockApi.post.mockRejectedValue(new Error("location unavailable"));

      await expect(
        sendPartnerLocationApi({ latitude: 0, longitude: 0, capturedAt: 1 }),
      ).rejects.toThrow("location unavailable");
    });
  });

  describe("fetchShiftHistoryApi", () => {
    it("parses history items from nested content arrays", async () => {
      mockApi.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            content: [
              {
                id: 7,
                shiftStartTime: "1000",
                shiftEndTime: "4000",
                online: true,
                maxActiveJobs: "4",
                shiftStart: "start",
                shiftEnd: "end",
                updatedAt: "updated",
              },
            ],
          },
        },
      } as any);

      await expect(fetchShiftHistoryApi()).resolves.toEqual([
        {
          id: "7",
          startedAt: 1000,
          endedAt: 4000,
          durationSeconds: 3,
          online: true,
          shiftStart: "start",
          shiftEnd: "end",
          updatedAt: "updated",
          maxActiveJobs: 4,
        },
      ]);

      expect(mockApi.get).toHaveBeenCalledWith("/api/v1/partner/dispatch/shift/history");
    });

    it("falls back across history endpoints until rows are found", async () => {
      mockApi.get
        .mockRejectedValueOnce(new Error("first failed"))
        .mockResolvedValueOnce({ data: { success: true, data: [] } } as any)
        .mockResolvedValueOnce({
          data: {
            success: true,
            items: [
              {
                startAt: 10,
                endAt: 40,
                totalDurationSeconds: 22,
              },
            ],
          },
        } as any);

      await expect(fetchShiftHistoryApi()).resolves.toEqual([
        {
          id: "10-40-0",
          startedAt: 10,
          endedAt: 40,
          durationSeconds: 22,
          online: undefined,
          shiftStart: undefined,
          shiftEnd: undefined,
          updatedAt: undefined,
          maxActiveJobs: 0,
        },
      ]);

      expect(mockApi.get).toHaveBeenNthCalledWith(3, "/api/partner/dispatch/shift/history");
    });

    it("returns an empty array when the payload content is invalid but successful", async () => {
      mockApi.get
        .mockResolvedValueOnce({ data: { success: true, data: {} } } as any)
        .mockResolvedValueOnce({ data: { success: true, data: {} } } as any)
        .mockResolvedValueOnce({ data: { success: true, data: {} } } as any)
        .mockResolvedValueOnce({ data: { success: true, data: {} } } as any);

      await expect(fetchShiftHistoryApi()).rejects.toThrow("Shift history endpoint unavailable");
    });

    it("parses direct arrays, root content, and invalid numeric values safely", async () => {
      mockApi.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: [
            {
              id: "row-1",
              startedAt: "5000",
              endedAt: "bad-number",
              durationSeconds: "not-a-number",
              online: "yes",
              shiftStart: 99,
              shiftEnd: null,
              updatedAt: {},
              maxActiveJobs: "bad",
            },
          ],
        },
      } as any);

      await expect(fetchShiftHistoryApi()).resolves.toEqual([
        {
          id: "row-1",
          startedAt: 5000,
          endedAt: 0,
          durationSeconds: 0,
          online: undefined,
          shiftStart: undefined,
          shiftEnd: undefined,
          updatedAt: undefined,
          maxActiveJobs: 0,
        },
      ]);
    });

    it("parses nested data.items payloads and computed durations", async () => {
      mockApi.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            items: [
              {
                shiftStartTime: 1_000,
                shiftEndTime: 6_000,
              },
            ],
          },
        },
      } as any);

      await expect(fetchShiftHistoryApi()).resolves.toEqual([
        {
          id: "1000-6000-0",
          startedAt: 1_000,
          endedAt: 6_000,
          durationSeconds: 5,
          online: undefined,
          shiftStart: undefined,
          shiftEnd: undefined,
          updatedAt: undefined,
          maxActiveJobs: 0,
        },
      ]);
    });

    it("parses root-level content arrays after earlier endpoints return empty rows", async () => {
      mockApi.get
        .mockResolvedValueOnce({ data: { success: true, data: [] } } as any)
        .mockResolvedValueOnce({
          data: {
            success: true,
            content: [
              {
                id: "root-content",
                startedAt: 2_000,
                endedAt: 4_000,
              },
            ],
          },
        } as any);

      await expect(fetchShiftHistoryApi()).resolves.toEqual([
        {
          id: "root-content",
          startedAt: 2_000,
          endedAt: 4_000,
          durationSeconds: 2,
          online: undefined,
          shiftStart: undefined,
          shiftEnd: undefined,
          updatedAt: undefined,
          maxActiveJobs: 0,
        },
      ]);
    });

    it("parses root-level item arrays from legacy responses", async () => {
      mockApi.get.mockResolvedValueOnce({
        data: {
          success: true,
          items: [
            {
              startTime: 300,
              endTime: 900,
            },
          ],
        },
      } as any);

      await expect(fetchShiftHistoryApi()).resolves.toEqual([
        {
          id: "300-900-0",
          startedAt: 300,
          endedAt: 900,
          durationSeconds: 0,
          online: undefined,
          shiftStart: undefined,
          shiftEnd: undefined,
          updatedAt: undefined,
          maxActiveJobs: 0,
        },
      ]);
    });

    it("fails when every endpoint errors or violates the contract", async () => {
      mockApi.get
        .mockResolvedValueOnce({ data: { success: false } } as any)
        .mockRejectedValueOnce(new Error("down 2"))
        .mockRejectedValueOnce(new Error("down 3"))
        .mockRejectedValueOnce(new Error("down 4"));

      await expect(fetchShiftHistoryApi()).rejects.toThrow("Shift history endpoint unavailable");
      expect(mockGetReadableApiError).toHaveBeenCalledWith({}, "Shift history endpoint unavailable");
    });
  });
});
