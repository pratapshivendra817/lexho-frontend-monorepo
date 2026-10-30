import { Linking, PermissionsAndroid, Platform } from "react-native";
import Geolocation from "react-native-geolocation-service";

export type PermissionState = "granted" | "denied" | "blocked";

export async function requestLocationPermission(): Promise<PermissionState> {
  try {
    // Prefer react-native-permissions when available.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const permissionsLib = require("react-native-permissions");
    const RESULTS = permissionsLib.RESULTS;
    const PERMISSIONS = permissionsLib.PERMISSIONS;
    const check = permissionsLib.check;
    const request = permissionsLib.request;

    const permission =
      Platform.OS === "android"
        ? PERMISSIONS?.ANDROID?.ACCESS_FINE_LOCATION
        : PERMISSIONS?.IOS?.LOCATION_WHEN_IN_USE;
    if (permission) {
      const status = await check(permission);
      if (status === RESULTS.GRANTED) return "granted";
      if (status === RESULTS.LIMITED) return "granted";
      if (status === RESULTS.BLOCKED) return "blocked";
      const next = await request(permission);
      if (next === RESULTS.GRANTED) return "granted";
      if (next === RESULTS.LIMITED) return "granted";
      if (next === RESULTS.BLOCKED) return "blocked";
      return "denied";
    }
  } catch {
    // Fall back to PermissionsAndroid below.
  }

  if (Platform.OS === "ios") {
    try {
      const status = await (Geolocation as any).requestAuthorization("whenInUse");
      return status === "granted" ? "granted" : "denied";
    } catch {
      return "denied";
    }
  }

  if (Platform.OS !== "android") {
    return "denied";
  }

  const finePermission = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
  const coarsePermission = PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION;

  const [hasFine, hasCoarse] = await Promise.all([
    PermissionsAndroid.check(finePermission),
    PermissionsAndroid.check(coarsePermission),
  ]);
  if (hasFine || hasCoarse) return "granted";

  const result = await PermissionsAndroid.requestMultiple([finePermission, coarsePermission]);
  const fineResult = result[finePermission];
  const coarseResult = result[coarsePermission];

  if (
    fineResult === PermissionsAndroid.RESULTS.GRANTED ||
    coarseResult === PermissionsAndroid.RESULTS.GRANTED
  ) {
    return "granted";
  }
  if (
    fineResult === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ||
    coarseResult === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
  ) {
    return "blocked";
  }
  return "denied";
}

export async function openLocationSettings() {
  await Linking.openSettings();
}
