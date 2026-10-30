import { NativeModules, Platform } from 'react-native';
import Config from 'react-native-config';

const MANUAL_REAL_DEVICE_API_HOST = String(
  Config.MANUAL_REAL_DEVICE_API_HOST ?? '',
).trim();
const USE_ADB_REVERSE_FOR_REAL_ANDROID_DEVICE =
  __DEV__ && Platform.OS === 'android'
    ? true
    : String(Config.USE_ADB_REVERSE_FOR_REAL_ANDROID_DEVICE ?? 'false')
      .trim()
      .toLowerCase() === 'true';
const LAN_HOST = String(Config.DEV_LAN_HOST ?? '192.168.31.38').trim();
const EMULATOR_HOST = String(
  Config.ANDROID_EMULATOR_HOST ?? '10.0.2.2',
).trim();
const CONFIGURED_API_BASE_URL = String(Config.API_BASE_URL ?? '').trim();
const PRODUCTION_API_BASE_URL = 'https://api.lexho.com';

function removeTrailingSlashes(value: string): string {
  let end = value.length;

  while (end > 0 && value.codePointAt(end - 1) === 47) {
    end -= 1;
  }

  return end === value.length ? value : value.slice(0, end);
}

function isProbablyAndroidEmulator() {
  if (Platform.OS !== 'android') return false;
  const platformConstants = (NativeModules as any)?.PlatformConstants ?? {};
  const fingerprint = String(platformConstants.Fingerprint ?? '').toLowerCase();
  const model = String(platformConstants.Model ?? '').toLowerCase();
  const brand = String(platformConstants.Brand ?? '').toLowerCase();
  const manufacturer = String(
    platformConstants.Manufacturer ?? '',
  ).toLowerCase();

  return (
    fingerprint.includes('generic') ||
    model.includes('sdk') ||
    model.includes('emulator') ||
    brand.includes('generic') ||
    manufacturer.includes('genymotion')
  );
}

function getMetroHost() {
  const scriptURL = (NativeModules as any)?.SourceCode?.scriptURL;
  if (!scriptURL || typeof scriptURL !== 'string') return null;
  const match = scriptURL.match(/^https?:\/\/([^/:]+):\d+/i);
  return match?.[1] ?? null;
}

function resolveHost() {
  const manualHost = String(MANUAL_REAL_DEVICE_API_HOST ?? '').trim();
  if (manualHost) return manualHost;
  if (isProbablyAndroidEmulator()) return EMULATOR_HOST;
  if (Platform.OS === 'android' && USE_ADB_REVERSE_FOR_REAL_ANDROID_DEVICE)
    return 'localhost';
  return getMetroHost() || LAN_HOST;
}

const HOST = resolveHost();
const DEFAULT_BASE_URL = `http://${HOST}:8082`;
const EFFECTIVE_CONFIGURED_API_BASE_URL =
  __DEV__ && removeTrailingSlashes(CONFIGURED_API_BASE_URL) === PRODUCTION_API_BASE_URL
    ? ''
    : CONFIGURED_API_BASE_URL;
export const API_BASE_URL = removeTrailingSlashes(EFFECTIVE_CONFIGURED_API_BASE_URL) || DEFAULT_BASE_URL;
export const LOCATION_API_BASE_URL = `${API_BASE_URL}/api/v1/customer/location`;
export const WEBSITE_BASE_URL = removeTrailingSlashes(String(Config.WEBSITE_BASE_URL ?? '').trim()) || (__DEV__ ? `http://${HOST}:5173` : 'https://lexho.com');
export const DEV_IMAGE_HOST = HOST;
export const AUTH_FALLBACK_BASE_URLS = String(
  Config.AUTH_FALLBACK_BASE_URLS ?? '',
)
  .split(',')
  .map(value => removeTrailingSlashes(value.trim()))
  .filter(Boolean);
export const USE_FETCH_UPLOAD = __DEV__ && true;

// Dev-only login bypass switch. Set to false to restore normal OTP flow.
export const DEV_LOGIN_BYPASS = __DEV__ && false;
// Backward-compatible alias for existing references.
export const DEV_AUTH_BYPASS = DEV_LOGIN_BYPASS;
export const DEV_BYPASS_SESSION = {
  token: '',
  refreshToken: 'dev-bypass-refresh',
  user: {
    id: 'dev-user-001',
    name: 'Dev Customer',
    mobile: '9999999999',
  },
} as const;

// If your backend still requires auth during dev bypass, paste a valid customer JWT here.
export const DEV_BYPASS_API_TOKEN = DEV_BYPASS_SESSION.token;
export const DEV_INTERNAL_TOKEN = 'LexhoInternal@2026';

export const TOKEN_KEY = '@lexho/customer/token';
export const REFRESH_TOKEN_KEY = '@lexho/customer/refresh-token';
export const USER_KEY = '@lexho/customer/user';
export const DEVICE_ID_KEY = '@lexho/customer/device-id';
export const ENABLE_LIVE_TRACKING = false;
export const ENABLE_BOOKING_WS = false;
export const MAPBOX_PUBLIC_TOKEN = String(
  Config.MAPBOX_PUBLIC_TOKEN ?? '',
).trim();
export const SSL_PINNING_ENABLED = String(Config.SSL_PINNING_ENABLED ?? "false").trim().toLowerCase() === "true";
export const SSL_PINNING_CERT_NAME = String(Config.SSL_PINNING_CERT_NAME ?? "lexho_api").trim() || "lexho_api";

export const LOCATION_DETECT_TIMEOUT_MS = 25000;
export const LOCATION_DESIRED_ACCURACY_METERS = 50;
export const LOCATION_MAX_ACCEPTED_ACCURACY_METERS = 250;
export const LOCATION_ACCURACY_SAMPLE_COUNT = 4;
