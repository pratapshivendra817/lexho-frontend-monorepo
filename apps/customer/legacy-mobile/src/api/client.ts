import axios from "axios";
import { API_BASE_URL } from "../constants/env";
import { DEV_LOGIN_BYPASS } from "../constants/env";
import { DEV_BYPASS_API_TOKEN } from "../constants/env";
import { getToken } from "../utils/storage";
import { clearSession } from "../utils/storage";
import { store } from "../redux/store";
import { clearSessionState } from "../redux/authSlice";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});
export const apiClient = api;

api.interceptors.request.use(async (config) => {
  if (DEV_LOGIN_BYPASS && __DEV__) {
    if (DEV_BYPASS_API_TOKEN) {
      if (!config.headers) {
        config.headers = {};
      }
      (config.headers as Record<string, string>).Authorization = `Bearer ${DEV_BYPASS_API_TOKEN}`;
      return config;
    }
    // If bypass mode is enabled but no static token is configured,
    // fall through and use persisted auth token from storage/redux.
  }

  const storageToken = await getToken();
  const stateToken = store.getState()?.auth?.token ?? null;
  const token = storageToken || stateToken;
  if (!config.headers) {
    config.headers = {};
  }
  if (token) {
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const message = String(error?.response?.data?.message ?? error?.message ?? "").toLowerCase();
    const unauthorized = status === 401 || message.includes("invalid or expired token") || message.includes("authorization token is required");

    // In dev bypass mode we intentionally keep the mock session alive for fast testing.
    if (unauthorized && !(DEV_LOGIN_BYPASS && __DEV__)) {
      try {
        await clearSession();
      } catch {
        // Ignore cleanup errors; auth state reset is best-effort.
      }
      store.dispatch(clearSessionState());
    }

    return Promise.reject(error);
  },
);

export function parseApiError(error: unknown, fallback = "Something went wrong") {
  const e = error as any;
  return e?.response?.data?.message || e?.message || fallback;
}

export function unwrapPayload<T>(data: any, fallback: T): T {
  if (data?.data !== undefined) return data.data as T;
  if (data !== undefined && data !== null) return data as T;
  return fallback;
}

export function extractList<T>(data: any): T[] {
  if (Array.isArray(data)) return data as T[];
  if (Array.isArray(data?.data)) return data.data as T[];
  if (Array.isArray(data?.content)) return data.content as T[];
  return [];
}
