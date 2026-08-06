/* istanbul ignore file */

export type ShiftSession = {
  startedAt: number;
  endedAt?: number;
  durationSeconds?: number;
};

export type ShiftStateSnapshot = {
  shiftStarted: boolean;
  online: boolean;
  locationEnabled: boolean;
  startedAt?: number;
};

export type ShiftHistoryItem = {
  id: string;
  startedAt: number;
  endedAt: number;
  durationSeconds: number;
  online?: boolean;
  shiftStart?: string;
  shiftEnd?: string;
  updatedAt?: string;
  maxActiveJobs?: number;
};

export type LocationPayload = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  capturedAt: number;
  source?: "gps" | "network" | "passive" | string;
  trackingState?: string;
  bookingId?: number;
  customerLatitude?: number;
  customerLongitude?: number;
  accuracyMeters?: number;
  speedKmh?: number;
  headingDegrees?: number;
  mockLocation?: boolean;
  rootedDevice?: boolean;
  gpsEnabled?: boolean;
};
