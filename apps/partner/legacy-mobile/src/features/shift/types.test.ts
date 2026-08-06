import "./types";
import type { LocationPayload, ShiftHistoryItem, ShiftSession, ShiftStateSnapshot } from "./types";

describe("shift types", () => {
  it("supports compile-safe shift session and state snapshots", () => {
    const session: ShiftSession = {
      startedAt: 1_000,
      endedAt: 4_000,
      durationSeconds: 3,
    };
    const snapshot: ShiftStateSnapshot = {
      shiftStarted: true,
      online: false,
      locationEnabled: true,
      startedAt: session.startedAt,
    };

    expect(session.durationSeconds).toBe(3);
    expect(snapshot).toEqual({
      shiftStarted: true,
      online: false,
      locationEnabled: true,
      startedAt: 1_000,
    });
  });

  it("supports compile-safe history items and location payloads", () => {
    const historyItem: ShiftHistoryItem = {
      id: "shift-1",
      startedAt: 1_000,
      endedAt: 7_000,
      durationSeconds: 6,
      online: true,
      shiftStart: "2026-07-08T09:00:00.000Z",
      shiftEnd: "2026-07-08T09:06:00.000Z",
      updatedAt: "2026-07-08T09:06:00.000Z",
      maxActiveJobs: 4,
    };
    const payload: LocationPayload = {
      latitude: 12.9,
      longitude: 77.5,
      accuracy: 4,
      capturedAt: 123,
      source: "gps",
      trackingState: "AVAILABLE",
      bookingId: 9,
      customerLatitude: 13.1,
      customerLongitude: 77.7,
      accuracyMeters: 4,
      speedKmh: 16,
      headingDegrees: 90,
      mockLocation: false,
      rootedDevice: false,
      gpsEnabled: true,
    };

    expect(historyItem.maxActiveJobs).toBe(4);
    expect(payload).toMatchObject({
      latitude: 12.9,
      longitude: 77.5,
      source: "gps",
      trackingState: "AVAILABLE",
    });
  });
});
