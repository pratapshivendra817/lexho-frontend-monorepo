import Config from "react-native-config";

import type { ActiveRoute, CoordinatePoint } from "../types";

const DEFAULT_MAPBOX_STYLE = "mapbox://styles/mapbox/dark-v11";

let tokenConfigured = false;

export function getMapboxToken() {
  return String(Config.MAPBOX_PUBLIC_TOKEN ?? "").trim();
}

export function ensureMapboxConfigured(Mapbox: any) {
  if (tokenConfigured) return;
  const token = getMapboxToken();
  if (token) {
    Mapbox.setAccessToken(token);
    tokenConfigured = true;
  }
}

export function getMapboxStyleUrl() {
  return DEFAULT_MAPBOX_STYLE;
}

export function toMapboxCoordinate(point: CoordinatePoint): [number, number] {
  return [point.longitude, point.latitude];
}

export function buildRouteFeature(route: ActiveRoute) {
  return {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "LineString" as const,
      coordinates: route.coordinates.map(toMapboxCoordinate),
    },
  };
}

export function getRouteBounds(route: ActiveRoute) {
  const points = [route.partnerLocation, route.customerLocation, ...route.coordinates];
  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);

  return {
    ne: [Math.max(...longitudes), Math.max(...latitudes)] as [number, number],
    sw: [Math.min(...longitudes), Math.min(...latitudes)] as [number, number],
  };
}
