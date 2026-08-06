export type CoordinatePoint = {
  latitude: number;
  longitude: number;
};

export type NavigationInstruction = {
  id: string;
  text: string;
  distanceMeters: number;
  durationSeconds: number;
  maneuverType?: string;
  modifier?: string;
  coordinate?: CoordinatePoint;
};

export type ActiveRoute = {
  bookingId: number;
  partnerLocation: CoordinatePoint;
  customerLocation: CoordinatePoint;
  coordinates: CoordinatePoint[];
  etaSeconds: number;
  distanceMeters: number;
  trafficDelaySeconds: number;
  deviationThresholdMeters: number;
  instructions: NavigationInstruction[];
  fetchedAt: number;
  source: "backend" | "fallback";
};

export type NavigationRouteResponse = {
  route: ActiveRoute;
};

export type NavigationRouteStatus = "idle" | "loading" | "ready" | "rerouting" | "failed";
export type NavigationLifecycleState = "idle" | "previewing" | "navigating" | "arrived";

export type NavigationEvent = {
  id: string;
  type: "route_loaded" | "route_refreshed" | "deviation_detected" | "tracking_started" | "tracking_stopped" | "route_failed";
  createdAt: number;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

export type TrackingLocation = CoordinatePoint & {
  accuracy: number | null;
  headingDegrees?: number | null;
  speedKmh?: number | null;
  timestamp: number;
};
