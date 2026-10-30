import { NativeModules, Platform } from "react-native";

import { recordCrash } from "../crashlyticsService";
import { trackEvent, PARTNER_ANALYTICS_EVENTS } from "../firebaseAnalytics";

export type DeviceSecurityStatus = {
  rooted: boolean;
  emulator: boolean;
  developerMode: boolean;
  blocked: boolean;
};

export async function detectDeviceSecurityStatus(): Promise<DeviceSecurityStatus> {
  const platformConstants = (NativeModules as any)?.PlatformConstants ?? {};
  const fingerprint = String(platformConstants.Fingerprint ?? "").toLowerCase();
  const model = String(platformConstants.Model ?? "").toLowerCase();
  const isEmulator =
    Platform.OS === "android" &&
    (fingerprint.includes("generic") || model.includes("sdk") || model.includes("emulator"));

  let rooted = false;
  let developerMode = false;
  try {
    const jailMonkey = require("jail-monkey");
    rooted = Boolean(jailMonkey.isJailBroken?.() || jailMonkey.isOnExternalStorage?.());
    developerMode = Boolean(jailMonkey.isDebuggedMode?.() || jailMonkey.canMockLocation?.());
  } catch {
    rooted = false;
    developerMode = __DEV__;
  }

  // Android development emulators need debugging/mock location for local testing.
  // Release builds retain the device security checks.
  const blocked = !(__DEV__ && isEmulator) && (rooted || developerMode);
  if (blocked) {
    await trackEvent(PARTNER_ANALYTICS_EVENTS.securityBlocked, {
      rooted,
      emulator: isEmulator,
      developerMode,
    });
    await recordCrash(new Error("Blocked device security state detected"), {
      rooted,
      emulator: isEmulator,
      developer_mode: developerMode,
    });
  }
  return { rooted, emulator: isEmulator, developerMode, blocked };
}

