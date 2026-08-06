import API, { getReadableApiError } from "../../../services/api";

import type {
  ActiveRoute,
  CoordinatePoint,
  NavigationInstruction,
  NavigationRouteResponse,
} from "../types";

type NavigationRouteParams = {
  bookingId: number;
  origin: CoordinatePoint;
  destination: CoordinatePoint;
  deviationThresholdMeters?: number;
};

const ROUTE_ENDPOINTS = [
  "/api/v1/partner/navigation/route",
  "/api/v1/partner/route",
  "/api/v1/navigation/route",
  "/api/partner/navigation/route",
];

function asNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function asText(value: unknown, fallback = "") {
  return value == null ? fallback : String(value);
}

function unwrap(payload: any) {
  return payload?.data?.data ?? payload?.data ?? payload ?? {};
}

function decodePolyline(encoded: string): CoordinatePoint[] {
  let index = 0;
  let latitude = 0;
  let longitude = 0;
  const coordinates: CoordinatePoint[] = [];

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    latitude += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    longitude += result & 1 ? ~(result >> 1) : result >> 1;

    coordinates.push({
      latitude: latitude / 1e5,
      longitude: longitude / 1e5,
    });
  }

  return coordinates;
}

function normalizeCoordinate(value: any): CoordinatePoint | null {
  const latitude = asNumber(value?.latitude ?? value?.lat, Number.NaN);
  const longitude = asNumber(value?.longitude ?? value?.lng ?? value?.lon, Number.NaN);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

function normalizeCoordinates(source: any, fallback: CoordinatePoint[]): CoordinatePoint[] {
  if (Array.isArray(source?.coordinates)) {
    const parsed = source.coordinates.map(normalizeCoordinate).filter(Boolean) as CoordinatePoint[];
    if (parsed.length > 0) return parsed;
  }
  if (Array.isArray(source?.polylineCoordinates)) {
    const parsed = source.polylineCoordinates.map(normalizeCoordinate).filter(Boolean) as CoordinatePoint[];
    if (parsed.length > 0) return parsed;
  }
  const encoded = asText(source?.polyline ?? source?.geometry ?? source?.overviewPolyline, "").trim();
  if (encoded) {
    const decoded = decodePolyline(encoded);
    if (decoded.length > 0) return decoded;
  }
  return fallback;
}

function normalizeInstructions(source: any): NavigationInstruction[] {
  const steps = Array.isArray(source?.steps)
    ? source.steps
    : Array.isArray(source?.instructions)
      ? source.instructions
      : Array.isArray(source?.legs?.[0]?.steps)
        ? source.legs[0].steps
        : [];

  return steps.map((step: any, index: number) => ({
    id: asText(step?.id, `step-${index}`),
    text: asText(step?.text ?? step?.instruction ?? step?.maneuver?.instruction, "Continue"),
    distanceMeters: asNumber(step?.distanceMeters ?? step?.distance, 0),
    durationSeconds: asNumber(step?.durationSeconds ?? step?.duration, 0),
    maneuverType: step?.maneuverType ?? step?.maneuver?.type,
    modifier: step?.modifier ?? step?.maneuver?.modifier,
    coordinate: normalizeCoordinate(step?.coordinate ?? step?.maneuver?.location) ?? undefined,
  }));
}

function buildFallbackRoute(params: NavigationRouteParams): ActiveRoute {
  const distanceMeters = haversineDistance(params.origin, params.destination);
  const etaSeconds = Math.max(60, Math.round(distanceMeters / 8.33));
  return {
    bookingId: params.bookingId,
    partnerLocation: params.origin,
    customerLocation: params.destination,
    coordinates: [params.origin, params.destination],
    etaSeconds,
    distanceMeters,
    trafficDelaySeconds: 0,
    deviationThresholdMeters: params.deviationThresholdMeters ?? 100,
    instructions: [
      {
        id: "direct-route",
        text: "Head to customer location",
        distanceMeters,
        durationSeconds: etaSeconds,
        maneuverType: "depart",
        coordinate: params.destination,
      },
    ],
    fetchedAt: Date.now(),
    source: "fallback",
  };
}

function haversineDistance(origin: CoordinatePoint, destination: CoordinatePoint) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(destination.latitude - origin.latitude);
  const dLng = toRad(destination.longitude - origin.longitude);
  const lat1 = toRad(origin.latitude);
  const lat2 = toRad(destination.latitude);
  const arc =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return earthRadius * 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc));
}

function normalizeRoute(payload: any, params: NavigationRouteParams): ActiveRoute {
  const source = unwrap(payload);
  const fallback = buildFallbackRoute(params);
  const routeSource = source?.route ?? source?.data ?? source;
  const coordinates = normalizeCoordinates(routeSource, fallback.coordinates);
  const instructions = normalizeInstructions(routeSource);

  return {
    bookingId: params.bookingId,
    partnerLocation: normalizeCoordinate(routeSource?.origin) ?? params.origin,
    customerLocation: normalizeCoordinate(routeSource?.destination) ?? params.destination,
    coordinates,
    etaSeconds: asNumber(routeSource?.etaSeconds ?? routeSource?.durationSeconds ?? routeSource?.etaMinutes, fallback.etaSeconds),
    distanceMeters: asNumber(routeSource?.distanceMeters ?? routeSource?.distance, fallback.distanceMeters),
    trafficDelaySeconds: asNumber(routeSource?.trafficDelaySeconds ?? routeSource?.trafficDelay ?? routeSource?.trafficMinutes, 0),
    deviationThresholdMeters: asNumber(routeSource?.deviationThresholdMeters, params.deviationThresholdMeters ?? 100),
    instructions: instructions.length > 0 ? instructions : fallback.instructions,
    fetchedAt: Date.now(),
    source: "backend",
  };
}

export async function fetchNavigationRoute(params: NavigationRouteParams): Promise<NavigationRouteResponse> {
  const query = {
    bookingId: params.bookingId,
    originLat: params.origin.latitude,
    originLng: params.origin.longitude,
    destinationLat: params.destination.latitude,
    destinationLng: params.destination.longitude,
  };

  let lastError: unknown = null;
  for (const endpoint of ROUTE_ENDPOINTS) {
    try {
      const response = await API.get(endpoint, { params: query });
      return { route: normalizeRoute(response.data, params) };
    } catch (error: any) {
      if (error?.response?.status === 404) {
        lastError = error;
        continue;
      }
      throw new Error(getReadableApiError(error, "Unable to fetch navigation route"));
    }
  }

  if (lastError) {
    return { route: buildFallbackRoute(params) };
  }

  return { route: buildFallbackRoute(params) };
}
