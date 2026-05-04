import axios, { AxiosError } from "axios";
import { Platform } from "react-native";
import { clearSession, getToken } from "../utils/storage";

const API_PORT = "8082";
const DEVICE_LOCAL_IP = "192.168.1.100";

const API_HOSTS = {
  android: "10.0.2.2",
  ios: "localhost",
  default: DEVICE_LOCAL_IP,
};

const getApiHost = (): string => {
  if (Platform.OS === "android") return API_HOSTS.android;
  if (Platform.OS === "ios") return API_HOSTS.ios;
  return API_HOSTS.default;
};

export const API_BASE_URL = `http://${getApiHost()}:${API_PORT}`;

export const API_ENDPOINTS = {
  adminLogin: "/api/admin/login",
  adminVerifyOtp: "/api/admin/verify-otp",
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
