import { Linking, PermissionsAndroid, Platform } from "react-native";

export type PermissionState = "granted" | "denied" | "blocked";

export async function requestLocationPermission(): Promise<PermissionState> {
  if (Platform.OS !== "android") {
    return "denied";
  }

  try {
    // Prefer react-native-permissions when available.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const permissionsLib = require("react-native-permissions");
    const RESULTS = permissionsLib.RESULTS;
    const PERMISSIONS = permissionsLib.PERMISSIONS;
    const check = permissionsLib.check;
    const request = permissionsLib.request;

    const fine = PERMISSIONS?.ANDROID?.ACCESS_FINE_LOCATION;
    if (fine) {
      const status = await check(fine);
      if (status === RESULTS.GRANTED) return "granted";
      const next = await request(fine);
      if (next === RESULTS.GRANTED) return "granted";
      if (next === RESULTS.BLOCKED) return "blocked";
      return "denied";
    }
  } catch {
    // Fall back to PermissionsAndroid below.
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
