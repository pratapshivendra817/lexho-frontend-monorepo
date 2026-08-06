import type { DispatchRouteCoordinate } from "./types";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function normalizeCoordinate(latitude: unknown, longitude: unknown): DispatchRouteCoordinate | null {
  const lat = asNumber(latitude);
  const lng = asNumber(longitude);
  if (lat == null || lng == null) return null;
  return { latitude: lat, longitude: lng };
}

export function parseRouteCoordinates(input: unknown): DispatchRouteCoordinate[] {
  if (!input) return [];

  if (Array.isArray(input)) {
    return input
      .map((item) => {
        if (Array.isArray(item) && item.length >= 2) {
          return normalizeCoordinate(item[1], item[0]);
        }
        const record = asRecord(item);
        return normalizeCoordinate(
          record.latitude ?? record.lat,
          record.longitude ?? record.lng ?? record.lon,
        );
      })
      .filter((item): item is DispatchRouteCoordinate => Boolean(item));
  }

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return [];
    try {
      return parseRouteCoordinates(JSON.parse(trimmed));
    } catch {
      return [];
    }
  }

  const record = asRecord(input);
  const geometry = asRecord(record.geometry);
  if (Array.isArray(geometry.coordinates)) return parseRouteCoordinates(geometry.coordinates);
  if (Array.isArray(record.coordinates)) return parseRouteCoordinates(record.coordinates);
  if (Array.isArray(record.route)) return parseRouteCoordinates(record.route);
  if (Array.isArray(record.polyline)) return parseRouteCoordinates(record.polyline);
  return [];
}

export function formatEtaMinutes(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "N/A";
  if (value < 1) return "<1 min";
  return `${Math.round(value)} min`;
}

export function formatDistanceMeters(value?: number | null, fallback?: string) {
  if (fallback?.trim()) return fallback;
  if (value == null || !Number.isFinite(value)) return "N/A";
  if (value < 1000) return `${Math.round(value)} m`;
  return `${(value / 1000).toFixed(1)} km`;
}
