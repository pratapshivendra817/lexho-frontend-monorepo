import { describe, expect, it } from "vitest";

import {
  formatDistanceMeters,
  formatEtaMinutes,
  normalizeCoordinate,
  parseRouteCoordinates,
} from "@/features/live-dispatch/utils";

describe("live-dispatch utils", () => {
  it("normalizes coordinates from numbers and strings", () => {
    expect(normalizeCoordinate(28.61, 77.2)).toEqual({ latitude: 28.61, longitude: 77.2 });
    expect(normalizeCoordinate("28.61", "77.2")).toEqual({ latitude: 28.61, longitude: 77.2 });
    expect(normalizeCoordinate("bad", 77.2)).toBeNull();
    expect(normalizeCoordinate(null, undefined)).toBeNull();
  });

  it("parses route coordinates from arrays, objects and serialized payloads", () => {
    expect(
      parseRouteCoordinates([
        [77.2, 28.61],
        { latitude: "19.07", longitude: "72.87" },
        { lat: 12.9, lng: 77.5 },
        { lat: 10.1, lon: 20.2 },
        { invalid: true },
      ]),
    ).toEqual([
      { latitude: 28.61, longitude: 77.2 },
      { latitude: 19.07, longitude: 72.87 },
      { latitude: 12.9, longitude: 77.5 },
      { latitude: 10.1, longitude: 20.2 },
    ]);

    expect(parseRouteCoordinates('{"geometry":{"coordinates":[[72.8,18.9],[73.1,19.2]]}}')).toEqual([
      { latitude: 18.9, longitude: 72.8 },
      { latitude: 19.2, longitude: 73.1 },
    ]);
    expect(parseRouteCoordinates({ coordinates: [[1, 2]] })).toEqual([{ latitude: 2, longitude: 1 }]);
    expect(parseRouteCoordinates({ route: [{ latitude: 3, longitude: 4 }] })).toEqual([{ latitude: 3, longitude: 4 }]);
    expect(parseRouteCoordinates({ polyline: [{ lat: 5, lng: 6 }] })).toEqual([{ latitude: 5, longitude: 6 }]);
  });

  it("returns empty arrays for invalid route coordinate inputs", () => {
    expect(parseRouteCoordinates(undefined)).toEqual([]);
    expect(parseRouteCoordinates("   ")).toEqual([]);
    expect(parseRouteCoordinates("not-json")).toEqual([]);
    expect(parseRouteCoordinates({ geometry: { coordinates: "bad" } })).toEqual([]);
  });

  it("formats eta and distance with fallbacks", () => {
    expect(formatEtaMinutes()).toBe("N/A");
    expect(formatEtaMinutes(Number.NaN)).toBe("N/A");
    expect(formatEtaMinutes(0.4)).toBe("<1 min");
    expect(formatEtaMinutes(3.6)).toBe("4 min");

    expect(formatDistanceMeters(undefined)).toBe("N/A");
    expect(formatDistanceMeters(350, "  cached ")).toBe("  cached ");
    expect(formatDistanceMeters(499)).toBe("499 m");
    expect(formatDistanceMeters(1600)).toBe("1.6 km");
  });
});
