jest.mock("../src/services/api", () => ({
  __esModule: true,
  default: { get: jest.fn() },
  getReadableApiError: (error: any, fallback: string) => error?.message ?? fallback,
}));

import API from "../src/services/api";
import { fetchNavigationRoute } from "../src/modules/navigation/services/navigationApi";

describe("navigationApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("normalizes backend route payloads from nested data with coordinate arrays", async () => {
    (API.get as jest.Mock).mockResolvedValueOnce({
      data: {
        data: {
          route: {
            origin: { lat: "28.61", lng: "77.2" },
            destination: { latitude: 28.62, longitude: 77.21 },
            coordinates: [
              { latitude: 28.61, longitude: 77.2 },
              { latitude: 28.62, longitude: 77.21 },
            ],
            etaSeconds: 600,
            distanceMeters: 3200,
            trafficDelaySeconds: 90,
            deviationThresholdMeters: 150,
            steps: [
              {
                id: "turn-1",
                text: "Turn left",
                distanceMeters: 120,
                durationSeconds: 45,
                coordinate: { latitude: 28.615, longitude: 77.205 },
              },
            ],
          },
        },
      },
    });

    const result = await fetchNavigationRoute({
      bookingId: 7,
      origin: { latitude: 28.61, longitude: 77.2 },
      destination: { latitude: 28.62, longitude: 77.21 },
      deviationThresholdMeters: 120,
    });

    expect(result.route).toMatchObject({
      bookingId: 7,
      partnerLocation: { latitude: 28.61, longitude: 77.2 },
      customerLocation: { latitude: 28.62, longitude: 77.21 },
      etaSeconds: 600,
      distanceMeters: 3200,
      trafficDelaySeconds: 90,
      deviationThresholdMeters: 150,
      source: "backend",
    });
    expect(result.route.coordinates).toHaveLength(2);
    expect(result.route.instructions[0]).toEqual(
      expect.objectContaining({
        id: "turn-1",
        text: "Turn left",
        distanceMeters: 120,
        durationSeconds: 45,
        coordinate: { latitude: 28.615, longitude: 77.205 },
      }),
    );
    expect(result.route.fetchedAt).toBe(1_700_000_000_000);
  });

  it("decodes encoded polylines and normalizes instruction fallbacks", async () => {
    (API.get as jest.Mock).mockResolvedValueOnce({
      data: {
        route: {
          polyline: "_p~iF~ps|U_ulLnnqC_mqNvxq`@",
          etaMinutes: "15",
          distance: "5400",
          trafficMinutes: 3,
          instructions: [
            {
              instruction: "Continue straight",
              distance: "240",
              duration: "60",
              maneuver: {
                type: "continue",
                modifier: "straight",
                location: { lat: 38.5, lng: -120.2 },
              },
            },
          ],
        },
      },
    });

    const result = await fetchNavigationRoute({
      bookingId: 9,
      origin: { latitude: 1, longitude: 2 },
      destination: { latitude: 3, longitude: 4 },
    });

    expect(result.route.coordinates).toEqual([
      { latitude: 38.5, longitude: -120.2 },
      { latitude: 40.7, longitude: -120.95 },
      { latitude: 43.252, longitude: -126.453 },
    ]);
    expect(result.route.instructions[0]).toEqual(
      expect.objectContaining({
        id: "step-0",
        text: "Continue straight",
        distanceMeters: 240,
        durationSeconds: 60,
        maneuverType: "continue",
        modifier: "straight",
      }),
    );
    expect(result.route.etaSeconds).toBe(15);
    expect(result.route.distanceMeters).toBe(5400);
    expect(result.route.trafficDelaySeconds).toBe(3);
  });

  it("falls back to the direct route when all endpoints return 404", async () => {
    (API.get as jest.Mock).mockRejectedValue({ response: { status: 404 }, message: "missing" });

    const result = await fetchNavigationRoute({
      bookingId: 7,
      origin: { latitude: 28.61, longitude: 77.2 },
      destination: { latitude: 28.62, longitude: 77.21 },
    });

    expect(API.get).toHaveBeenCalledTimes(4);
    expect(result.route.source).toBe("fallback");
    expect(result.route.coordinates).toEqual([
      { latitude: 28.61, longitude: 77.2 },
      { latitude: 28.62, longitude: 77.21 },
    ]);
    expect(result.route.instructions[0].text).toBe("Head to customer location");
  });

  it("uses fallback instructions when backend steps are unavailable", async () => {
    (API.get as jest.Mock).mockResolvedValueOnce({
      data: {
        data: {
          route: {
            coordinates: [{ latitude: 28.61, longitude: 77.2 }],
            distanceMeters: 1000,
            etaSeconds: 240,
            steps: [],
          },
        },
      },
    });

    const result = await fetchNavigationRoute({
      bookingId: 12,
      origin: { latitude: 28.61, longitude: 77.2 },
      destination: { latitude: 28.62, longitude: 77.21 },
      deviationThresholdMeters: 80,
    });

    expect(result.route.instructions).toEqual([
      expect.objectContaining({
        id: "direct-route",
        text: "Head to customer location",
      }),
    ]);
    expect(result.route.deviationThresholdMeters).toBe(80);
  });

  it("throws a readable error for non-404 backend failures", async () => {
    (API.get as jest.Mock).mockRejectedValueOnce({ response: { status: 500 }, message: "route failed" });

    await expect(
      fetchNavigationRoute({
        bookingId: 7,
        origin: { latitude: 28.61, longitude: 77.2 },
        destination: { latitude: 28.62, longitude: 77.21 },
      }),
    ).rejects.toThrow("route failed");
  });
});
