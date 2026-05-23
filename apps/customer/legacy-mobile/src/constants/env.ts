import { NativeModules, Platform } from "react-native";

const LAN_HOST = "192.168.31.38";
const EMULATOR_HOST = "10.0.2.2";

function isProbablyAndroidEmulator() {
  if (Platform.OS !== "android") return false;
  const platformConstants = (NativeModules as any)?.PlatformConstants ?? {};
  const fingerprint = String(platformConstants.Fingerprint ?? "").toLowerCase();
  const model = String(platformConstants.Model ?? "").toLowerCase();
  const brand = String(platformConstants.Brand ?? "").toLowerCase();
  const manufacturer = String(platformConstants.Manufacturer ?? "").toLowerCase();

  return (
    fingerprint.includes("generic") ||
    model.includes("sdk") ||
    model.includes("emulator") ||
    brand.includes("generic") ||
    manufacturer.includes("genymotion")
  );
}

const HOST = isProbablyAndroidEmulator() ? EMULATOR_HOST : LAN_HOST;
const DEFAULT_BASE_URL = `http://${HOST}:8082`;
export const LOCATION_API_BASE_URL = `${DEFAULT_BASE_URL}/api/v1/customer/location`;

export const API_BASE_URL = DEFAULT_BASE_URL;
export const DEV_IMAGE_HOST = HOST;
export const USE_FETCH_UPLOAD = __DEV__ && true;

// Dev-only login bypass switch. Set to false to restore normal OTP flow.
export const DEV_LOGIN_BYPASS = __DEV__ && false;
// Backward-compatible alias for existing references.
export const DEV_AUTH_BYPASS = DEV_LOGIN_BYPASS;
export const DEV_BYPASS_SESSION = {
  token: "",
  refreshToken: "dev-bypass-refresh",
  user: {
    id: "dev-user-001",
    name: "Dev Customer",
    mobile: "9999999999",
  },
} as const;

// If your backend still requires auth during dev bypass, paste a valid customer JWT here.
export const DEV_BYPASS_API_TOKEN = DEV_BYPASS_SESSION.token;
export const DEV_INTERNAL_TOKEN = "LexhoInternal@2026";

export const TOKEN_KEY = "@lexho/customer/token";
export const REFRESH_TOKEN_KEY = "@lexho/customer/refresh-token";
export const USER_KEY = "@lexho/customer/user";
export const DEVICE_ID_KEY = "@lexho/customer/device-id";
export const ENABLE_LIVE_TRACKING = false;
export const ENABLE_BOOKING_WS = false;
