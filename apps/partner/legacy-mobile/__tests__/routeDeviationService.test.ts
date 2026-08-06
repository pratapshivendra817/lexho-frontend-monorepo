import { distanceBetweenPoints, getMinimumRouteDistanceMeters, hasRouteDeviation } from "../src/modules/navigation/services/routeDeviationService";

const route = {
  bookingId: 1,
  partnerLocation: { latitude: 28.61, longitude: 77.2 },
  customerLocation: { latitude: 28.62, longitude: 77.21 },
  coordinates: [
    { latitude: 28.61, longitude: 77.2 },
    { latitude: 28.615, longitude: 77.205 },
    { latitude: 28.62, longitude: 77.21 },
  ],
  etaSeconds: 900,
  distanceMeters: 2000,
  trafficDelaySeconds: 0,
  deviationThresholdMeters: 100,
  instructions: [],
  fetchedAt: Date.now(),
  source: "backend" as const,
};

describe("routeDeviationService", () => {
  it("calculates geographic distance", () => {
    expect(distanceBetweenPoints(route.partnerLocation, route.customerLocation)).toBeGreaterThan(1000);
  });

  it("keeps on-route points under threshold", () => {
    const current = { latitude: 28.6151, longitude: 77.2051 };
    expect(getMinimumRouteDistanceMeters(route, current)).toBeLessThan(100);
    expect(hasRouteDeviation(route, current)).toBe(false);
  });

  it("detects large deviation", () => {
    const current = { latitude: 28.63, longitude: 77.23 };
    expect(hasRouteDeviation(route, current)).toBe(true);
  });
});
