import { NativeModules, Platform } from "react-native";

const API_PORT = "8082";
const ANDROID_EMULATOR_API_HOST = "10.0.2.2";
const IOS_API_HOST = "localhost";
const DEFAULT_DEVICE_LOCAL_IP = "192.168.1.100";
const MANUAL_REAL_DEVICE_API_HOST = "192.168.31.38";

const isLikelyEmulatorHost = (host) => {
  const normalized = String(host || "").trim().toLowerCase();
  return normalized === "10.0.2.2" || normalized === "10.0.3.2" || normalized === "localhost" || normalized === "127.0.0.1";
};

function isAndroidEmulatorDevice() {
  if (Platform.OS !== "android") return false;
  const constants = Platform.constants;
  const fingerprint = constants?.Fingerprint?.toLowerCase?.() ?? "";
  const model = constants?.Model?.toLowerCase?.() ?? "";
  return fingerprint.includes("generic") || model.includes("emulator");
}

function getMetroHost() {
  const scriptURL = NativeModules?.SourceCode?.scriptURL;
  if (!scriptURL) return null;
  const match = scriptURL.match(/^https?:\/\/([^/:]+):\d+/i);
  return match?.[1] ?? null;
}

function getApiHost() {
  const manualHost = MANUAL_REAL_DEVICE_API_HOST.trim();
  if (manualHost) return manualHost;

  const metroHost = getMetroHost();
  if (Platform.OS === "android") {
    if (metroHost) {
      return isLikelyEmulatorHost(metroHost) ? ANDROID_EMULATOR_API_HOST : metroHost;
    }
    return isAndroidEmulatorDevice() ? ANDROID_EMULATOR_API_HOST : DEFAULT_DEVICE_LOCAL_IP;
  }

  if (metroHost) return metroHost;
  if (Platform.OS === "ios") return IOS_API_HOST;
  return DEFAULT_DEVICE_LOCAL_IP;
}

export const API_BASE_URL = `http://${getApiHost()}:${API_PORT}`;
export const AUTH_TOKEN_STORAGE_KEY = "@customer/auth-token";
export const USER_STORAGE_KEY = "@customer/user";
export const THEME_MODE_STORAGE_KEY = "@customer/theme-mode";
export const CART_STORAGE_KEY = "@customer/cart";
export const ENABLE_FIREBASE_PUSH = false;
export const OTP_LENGTH = 6;

export const STORAGE_KEYS = {
  authToken: AUTH_TOKEN_STORAGE_KEY,
  user: USER_STORAGE_KEY,
  themeMode: THEME_MODE_STORAGE_KEY,
  cart: CART_STORAGE_KEY,
};

export const QUERY_KEYS = {
  home: ["home"],
  banners: ["banners", "homepage"],
  categories: ["categories"],
  services: (categoryId) => ["services", categoryId],
  cart: ["cart"],
  orders: ["orders"],
  order: (orderId) => ["orders", orderId],
  dashboard: ["dashboard"],
  notifications: (page, size) => ["notifications", page, size],
  notificationUnreadCount: ["notifications", "unread-count"],
  reviews: ["reviews"],
};
