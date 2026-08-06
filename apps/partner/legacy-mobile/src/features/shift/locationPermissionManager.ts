import { PermissionsAndroid, Platform } from "react-native";
import Geolocation from "react-native-geolocation-service";
import { requestBackgroundLocationStep, requestForegroundLocationStep } from "./backgroundLocationCompliance";

export async function requestForegroundLocationPermission(): Promise<boolean> {
  if (Platform.OS === "ios") {
    const status = await Geolocation.requestAuthorization("whenInUse");
    return status === "granted";
  }
  return (await requestForegroundLocationStep()) === "granted";
}

export async function requestBackgroundLocationPermission(): Promise<boolean> {
  if (Platform.OS === "ios") {
    const status = await Geolocation.requestAuthorization("always");
    return status === "granted";
  }
  return (await requestBackgroundLocationStep()) === "granted";
}

export async function ensureLocationPermissions(): Promise<boolean> {
  const foreground = await requestForegroundLocationPermission();
  if (!foreground) return false;
  // Background permission is best-effort; foreground tracking still works without it.
  await requestBackgroundLocationPermission();
  return true;
}
