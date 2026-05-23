import { PermissionsAndroid, Platform } from "react-native";
import Geolocation from "react-native-geolocation-service";

export async function requestForegroundLocationPermission(): Promise<boolean> {
  if (Platform.OS === "ios") {
    const status = await Geolocation.requestAuthorization("whenInUse");
    return status === "granted";
  }

  const fine = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
  const coarse = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION);
  return fine === PermissionsAndroid.RESULTS.GRANTED && coarse === PermissionsAndroid.RESULTS.GRANTED;
}

export async function requestBackgroundLocationPermission(): Promise<boolean> {
  if (Platform.OS === "ios") {
    const status = await Geolocation.requestAuthorization("always");
    return status === "granted";
  }

  const bg = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION);
  return bg === PermissionsAndroid.RESULTS.GRANTED;
}

export async function ensureLocationPermissions(): Promise<boolean> {
  const foreground = await requestForegroundLocationPermission();
  if (!foreground) return false;
  // Background permission is best-effort; foreground tracking still works without it.
  await requestBackgroundLocationPermission();
  return true;
}
