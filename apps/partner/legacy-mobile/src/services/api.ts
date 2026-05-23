import axios, { AxiosError } from "axios";
import { clearSession, getOrCreateDeviceId, getRefreshToken, getToken, saveRefreshToken, saveToken } from "../utils/storage";

const API_PORT = "8082";
const DEV_MACHINE_LAN_IP = "192.168.31.38";
export const API_BASE_URL = `http://${DEV_MACHINE_LAN_IP}:${API_PORT}`;
export const ENABLE_DISPATCH_WS = false;

export const API_ENDPOINTS = {
  adminLogin: "/api/admin/login",
  adminVerifyOtp: "/api/admin/verify-otp",
  authOtpSend: "/otp/send",
  authOtpVerify: "/otp/verify",
};

type UnauthorizedHandler = () => Promise<void> | void;

let onUnauthorized: UnauthorizedHandler | null = null;

export const setUnauthorizedHandler = (handler: UnauthorizedHandler | null) => {
  onUnauthorized = handler;
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
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await getRefreshToken();
        if (refreshToken) {
          const deviceId = await getOrCreateDeviceId();
          const { data } = await refreshClient.post("/api/auth/refresh", { refreshToken, deviceId });
          const root = data ?? {};
          const nextAccessToken = root.accessToken ?? root.token ?? root?.data?.accessToken ?? root?.data?.token;
          const nextRefreshToken = root.refreshToken ?? root?.data?.refreshToken;
          if (typeof nextAccessToken === "string" && nextAccessToken.trim().length > 0) {
            await saveToken(nextAccessToken);
            if (nextRefreshToken) {
              await saveRefreshToken(nextRefreshToken);
            }
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
            return API(originalRequest);
          }
        }
      } catch {
        // fallback to logout
      }
    }

    if (error.response?.status === 401) {
      await clearSession();
      if (onUnauthorized) {
        await onUnauthorized();
      }
    }

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
