import { PermissionsAndroid, Platform } from "react-native";
import Geolocation from "react-native-geolocation-service";
import type { SOSLocation } from "../types";

export async function requestSOSLocationPermission() {
  if (Platform.OS === "ios") return (await (Geolocation as any).requestAuthorization("whenInUse")) === "granted";
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
    title: "Emergency location access",
    message: "Location is required to send your position during an SOS emergency.",
    buttonPositive: "Allow",
  });
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

const mapPosition = (position: any): SOSLocation => ({ latitude: Number(position.coords.latitude), longitude: Number(position.coords.longitude), accuracy: Number.isFinite(Number(position.coords.accuracy)) ? Number(position.coords.accuracy) : null, capturedAt: new Date(position.timestamp || Date.now()).toISOString() });

export async function captureSOSLocation(): Promise<SOSLocation> {
  if (!(await requestSOSLocationPermission())) throw new Error("Location permission denied");
  return new Promise((resolve, reject) => Geolocation.getCurrentPosition(position => resolve(mapPosition(position)), error => reject(new Error(error.message || "Unable to capture emergency location")), { enableHighAccuracy: true, timeout: 15000, maximumAge: 0, forceRequestLocation: true, showLocationDialog: true }));
}

export async function watchSOSLocation(onLocation: (location: SOSLocation) => void, onError?: (error: Error) => void) {
  if (!(await requestSOSLocationPermission())) throw new Error("Location permission denied");
  const id = (Geolocation as any).watchPosition((position: any) => onLocation(mapPosition(position)), (error: any) => onError?.(new Error(error.message || "Emergency location tracking failed")), { enableHighAccuracy: true, distanceFilter: 20, interval: 15000, fastestInterval: 10000, showLocationDialog: true, forceRequestLocation: true });
  return () => (Geolocation as any).clearWatch(id);
}
