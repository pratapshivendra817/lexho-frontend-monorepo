import Geolocation from "react-native-geolocation-service";

import { getCurrentLocation } from "../../../services/locationTrackingService";
import type { TrackingLocation } from "../types";

type LocationListener = (location: TrackingLocation) => void;
type ErrorListener = (error: Error) => void;

const DEFAULT_DISTANCE_FILTER = 15;

function mapPosition(position: any): TrackingLocation {
  return {
    latitude: Number(position.coords.latitude),
    longitude: Number(position.coords.longitude),
    accuracy: Number.isFinite(Number(position.coords.accuracy)) ? Number(position.coords.accuracy) : null,
    headingDegrees:
      typeof position.coords.heading === "number" && position.coords.heading >= 0 ? position.coords.heading : null,
    speedKmh:
      typeof position.coords.speed === "number" && position.coords.speed >= 0 ? position.coords.speed * 3.6 : null,
    timestamp: Number(position.timestamp ?? Date.now()),
  };
}

export async function getFreshTrackingLocation(): Promise<TrackingLocation> {
  const current = await getCurrentLocation();
  return {
    latitude: current.latitude,
    longitude: current.longitude,
    accuracy: current.accuracy,
    timestamp: current.timestamp,
    headingDegrees: null,
    speedKmh: null,
  };
}

export function startLiveTracking(onLocation: LocationListener, onError?: ErrorListener) {
  const watchId = Geolocation.watchPosition(
    (position) => onLocation(mapPosition(position)),
    (error) => onError?.(new Error(error?.message || "Unable to stream live location")),
    {
      enableHighAccuracy: true,
      distanceFilter: DEFAULT_DISTANCE_FILTER,
      interval: 10000,
      fastestInterval: 5000,
      showsBackgroundLocationIndicator: true,
      forceRequestLocation: true,
    },
  );

  return () => {
    Geolocation.clearWatch(watchId);
  };
}
