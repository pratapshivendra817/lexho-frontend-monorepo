import { PermissionsAndroid, Platform } from "react-native";
import Geolocation from "react-native-geolocation-service";

export type PermissionFlowStatus = "granted" | "denied" | "blocked";

export async function requestForegroundLocationStep(): Promise<PermissionFlowStatus> {
  if (Platform.OS === "ios") {
    const status = await Geolocation.requestAuthorization("whenInUse");
    return status === "granted" ? "granted" : "denied";
  }
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
  return result === PermissionsAndroid.RESULTS.GRANTED ? "granted" : result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ? "blocked" : "denied";
}

export async function requestBackgroundLocationStep(): Promise<PermissionFlowStatus> {
  if (Platform.OS === "ios") {
    const status = await Geolocation.requestAuthorization("always");
    return status === "granted" ? "granted" : "denied";
  }
  if (Number(Platform.Version) < 29) return "granted";
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION);
  return result === PermissionsAndroid.RESULTS.GRANTED ? "granted" : result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ? "blocked" : "denied";
}
