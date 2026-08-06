import type { ActiveRoute, CoordinatePoint } from "../types";

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

export function distanceBetweenPoints(a: CoordinatePoint, b: CoordinatePoint) {
  const earthRadius = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const arc =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return earthRadius * 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc));
}

function distanceToSegmentMeters(point: CoordinatePoint, start: CoordinatePoint, end: CoordinatePoint) {
  const refLat = toRad((start.latitude + end.latitude + point.latitude) / 3);
  const meterPerDegreeLat = 111320;
  const meterPerDegreeLng = 111320 * Math.cos(refLat);

  const toXY = (value: CoordinatePoint) => ({
    x: value.longitude * meterPerDegreeLng,
    y: value.latitude * meterPerDegreeLat,
  });

  const p = toXY(point);
  const a = toXY(start);
  const b = toXY(end);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    return Math.hypot(p.x - a.x, p.y - a.y);
  }

  const projection = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq;
  const clamped = Math.max(0, Math.min(1, projection));
  const projectedX = a.x + clamped * dx;
  const projectedY = a.y + clamped * dy;
  return Math.hypot(p.x - projectedX, p.y - projectedY);
}

export function getMinimumRouteDistanceMeters(route: ActiveRoute, current: CoordinatePoint) {
  if (route.coordinates.length === 0) {
    return Number.POSITIVE_INFINITY;
  }
  if (route.coordinates.length === 1) {
    return distanceBetweenPoints(route.coordinates[0], current);
  }

  let minDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < route.coordinates.length - 1; index += 1) {
    const nextDistance = distanceToSegmentMeters(current, route.coordinates[index], route.coordinates[index + 1]);
    minDistance = Math.min(minDistance, nextDistance);
  }
  return minDistance;
}

export function hasRouteDeviation(route: ActiveRoute, current: CoordinatePoint, thresholdMeters = route.deviationThresholdMeters) {
  return getMinimumRouteDistanceMeters(route, current) > thresholdMeters;
}
