import { Platform } from "react-native";

const DEFAULT_BASE_URL = "http://localhost:8082";
const EMULATOR_BASE_URL = "http://10.0.2.2:8082";
// Set this to your machine LAN IP for physical Android/iOS devices in local development.
const DEV_MACHINE_LOCAL_IP = "";
const DEV_MACHINE_HOST = DEV_MACHINE_LOCAL_IP.trim();
const LOCAL_IP_BASE_URL = DEV_MACHINE_HOST ? `http://${DEV_MACHINE_HOST}:8082` : "";

export const API_BASE_URL =
  DEFAULT_BASE_URL.includes("localhost")
    ? Platform.OS === "android"
      ? EMULATOR_BASE_URL
      : LOCAL_IP_BASE_URL || DEFAULT_BASE_URL
    : DEFAULT_BASE_URL;

export const DEV_IMAGE_HOST = DEV_MACHINE_HOST;

// Dev-only login bypass switch. Set to false to restore normal OTP flow.
export const DEV_LOGIN_BYPASS = __DEV__ && true;
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

export const TOKEN_KEY = "@lexho/customer/token";
export const REFRESH_TOKEN_KEY = "@lexho/customer/refresh-token";
export const USER_KEY = "@lexho/customer/user";
