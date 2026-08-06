import axios, { AxiosError } from "axios";
import { NativeModules, Platform } from "react-native";
import Config from "react-native-config";
import { clearSession, getOrCreateDeviceId, getRefreshToken, getToken, saveRefreshToken, saveToken } from "../utils/storage";
import { logApiFailure } from "./crashlyticsService";

const API_PORT = "8082";
const MANUAL_REAL_DEVICE_API_HOST = "";
const USE_ADB_REVERSE_FOR_REAL_ANDROID_DEVICE = true;
const DEV_MACHINE_LAN_IP = "192.168.31.38";
const ANDROID_EMULATOR_API_HOST = "10.0.2.2";

function normalizeConfiguredApiBaseUrl(value: unknown) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";
  return trimmed.replace(/\/+$/, "");
}

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

function getMetroHost() {
  const scriptURL = (NativeModules as any)?.SourceCode?.scriptURL;
  if (!scriptURL || typeof scriptURL !== "string") return null;
  const match = scriptURL.match(/^https?:\/\/([^/:]+):\d+/i);
  return match?.[1] ?? null;
}

function resolveApiHost() {
  const manualHost = String(MANUAL_REAL_DEVICE_API_HOST ?? "").trim();
  if (manualHost) return manualHost;
  if (isProbablyAndroidEmulator()) return ANDROID_EMULATOR_API_HOST;
  if (Platform.OS === "android" && USE_ADB_REVERSE_FOR_REAL_ANDROID_DEVICE) return "localhost";
  return getMetroHost() || DEV_MACHINE_LAN_IP;
}

const configuredApiBaseUrl = normalizeConfiguredApiBaseUrl(Config.API_BASE_URL);
const API_HOST = resolveApiHost();
export const API_BASE_URL = configuredApiBaseUrl || `http://${API_HOST}:${API_PORT}`;
export const ENABLE_DISPATCH_WS = true;

export const API_ENDPOINTS = {
  adminLogin: "/api/admin/login",
  adminVerifyOtp: "/api/admin/verify-otp",
  authOtpSend: "/otp/send",
  authOtpVerify: "/otp/verify",
};

type UnauthorizedHandler = () => Promise<void> | void;

let onUnauthorized: UnauthorizedHandler | null = null;
let refreshPromise: Promise<string | null> | null = null;
let onServerOffline: ((message: string | null) => void) | null = null;

export const setUnauthorizedHandler = (handler: UnauthorizedHandler | null) => {
  onUnauthorized = handler;
};

export const setServerOfflineHandler = (handler: ((message: string | null) => void) | null) => {
  onServerOffline = handler;
};

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

API.interceptors.request.use(
  async config => {
    const token = await getToken();
    if (token) {
      config.headers = config.headers || {};
      (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

API.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;
    const status = error.response?.status;

    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = (async () => {
            const refreshToken = await getRefreshToken();
            if (!refreshToken) return null;
            const deviceId = await getOrCreateDeviceId();
            const { data } = await refreshClient.post("/api/v1/auth/refresh", { refreshToken, deviceId }).catch(() =>
              refreshClient.post("/api/auth/refresh", { refreshToken, deviceId }),
            );
            const root = data ?? {};
            const nextAccessToken = root.accessToken ?? root.token ?? root?.data?.accessToken ?? root?.data?.token;
            const nextRefreshToken = root.refreshToken ?? root?.data?.refreshToken;
            if (typeof nextAccessToken === "string" && nextAccessToken.trim().length > 0) {
              await saveToken(nextAccessToken);
              if (nextRefreshToken) {
                await saveRefreshToken(nextRefreshToken);
              }
              return nextAccessToken;
            }
            return null;
          })().finally(() => {
            refreshPromise = null;
          });
        }
        const nextAccessToken = await refreshPromise;
        if (nextAccessToken) {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
          return API(originalRequest);
        }
      } catch {
        // fallback to logout
      }
    }

    if (status === 401 || status === 403) {
      await clearSession();
      if (onUnauthorized) {
        try {
          await onUnauthorized();
        } catch {
          // Preserve the original request failure as the surfaced error.
        }
      }
    }

    if (
      error?.message?.includes("Network Error") ||
      error?.code === "ERR_NETWORK" ||
      error?.code === "ECONNREFUSED" ||
      error?.code === "ECONNABORTED"
    ) {
      onServerOffline?.(getReadableApiError(error, "Server unavailable"));
    }
    void logApiFailure(error, {
      method: originalRequest?.method,
      url: originalRequest?.url,
      status: error.response?.status ?? null,
    });
    return Promise.reject(error);
  }
);

export const getReadableApiError = (error: any, fallbackMessage: string): string => {
  if (error?.response?.status === 429) {
    return "Too many requests, please try again shortly";
  }
  if (error?.response?.data?.message) {
    return String(error.response.data.message);
  }

  if (error?.code === "ECONNABORTED") {
    return "Request timed out. Please try again.";
  }

  if (
    error?.message?.includes("Network Error") ||
    error?.code === "ERR_NETWORK" ||
    error?.code === "ECONNREFUSED"
  ) {
    return `Cannot reach backend at ${API_BASE_URL}.`;
  }

  return fallbackMessage;
};

export default API;
