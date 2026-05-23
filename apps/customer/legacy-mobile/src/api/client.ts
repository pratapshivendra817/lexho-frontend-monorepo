import axios from "axios";
import { API_BASE_URL } from "../constants/env";
import { DEV_LOGIN_BYPASS } from "../constants/env";
import { DEV_BYPASS_API_TOKEN } from "../constants/env";
import { DEV_INTERNAL_TOKEN } from "../constants/env";
import { getOrCreateDeviceId, getRefreshToken, getToken, loadSession, saveSession } from "../utils/storage";
import { clearSessionState, setSession } from "../redux/authSlice";
import { clearSessionWithReason, extractAccessToken, extractRefreshToken } from "../utils/authSessionManager";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});
export const apiClient = api;
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

function getAppStore(): any | null {
  try {
    // Lazy require prevents circular-import issues during module initialization.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("../redux/store");
    return mod?.store ?? null;
  } catch {
    return null;
  }
}

function isLocationApi(url?: string) {
  const value = String(url ?? "");
  return value.includes("/api/v1/customer/location/") || value.includes("/api/customer/location/");
}

function toDebugUrl(baseURL?: string, url?: string) {
  const rawUrl = String(url ?? "");
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
  return `${String(baseURL ?? "")}${rawUrl}`;
}

function isProtectedCustomerApi(url?: string) {
  const value = String(url ?? "");
  return value.includes("/api/v1/customer/location/") || value.includes("/api/customer/location/");
}

api.interceptors.request.use(async (config) => {
  const headers = (config.headers ?? {}) as Record<string, string>;
  const isFormDataRequest = typeof FormData !== "undefined" && config.data instanceof FormData;
  if (isFormDataRequest) {
    delete headers["Content-Type"];
    delete headers["content-type"];
  }
  if (DEV_LOGIN_BYPASS && __DEV__) {
    headers["X-Internal-Token"] = DEV_INTERNAL_TOKEN;
    if (DEV_BYPASS_API_TOKEN) {
      headers.Authorization = `Bearer ${DEV_BYPASS_API_TOKEN}`;
      config.headers = headers as any;
      return config;
    }
    // If bypass mode is enabled but no static token is configured,
    // fall through and use persisted auth token from storage/redux.
  }

  const storageToken = await getToken();
  const stateToken = getAppStore()?.getState?.()?.auth?.token ?? null;
  const token = storageToken || stateToken;

  if (isProtectedCustomerApi(config.url) && !token) {
    // Missing token for protected call should fail request, not wipe persisted session.
    return Promise.reject(new Error("Authorization token is required"));
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  config.headers = headers as any;

  if (__DEV__ && isLocationApi(config.url)) {
    // eslint-disable-next-line no-console
      console.log("[location-api:request]", {
        method: String(config.method ?? "get").toUpperCase(),
        url: toDebugUrl(config.baseURL, config.url),
        params: config.params ?? null,
        data: config.data ?? null,
      });
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    if (__DEV__ && isLocationApi(response?.config?.url)) {
      // eslint-disable-next-line no-console
      console.log("[location-api:response]", {
        status: response?.status ?? null,
        method: String(response?.config?.method ?? "get").toUpperCase(),
        url: toDebugUrl(response?.config?.baseURL, response?.config?.url),
        data: response?.data ?? null,
      });
    }
    return response;
  },
  async (error) => {
    const status = error?.response?.status;
    const shouldTryRefresh = status === 401;
    let shouldForceLogout = false;
    const originalRequest = error?.config as any;
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log("[auth:interceptor:error]", {
        status,
        url: `${String(error?.config?.baseURL ?? "")}${String(error?.config?.url ?? "")}`,
        retried: !!originalRequest?._retry,
      });
    }

    if (shouldTryRefresh && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log("[auth:interceptor:401:refresh:attempt]");
      }
      try {
        const session = await loadSession();
        const currentRefreshToken = session.refreshToken || (await getRefreshToken());
        if (currentRefreshToken) {
          const deviceId = await getOrCreateDeviceId();
          const { data } = await refreshClient.post("/api/auth/refresh", { refreshToken: currentRefreshToken, deviceId });
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.log("[auth:interceptor:refresh:response]", {
              topLevelKeys: data && typeof data === "object" ? Object.keys(data) : [],
            });
          }
          const nextAccessToken = extractAccessToken(data);
          const nextRefreshToken = extractRefreshToken(data, currentRefreshToken);
          if (nextAccessToken) {
            const appStore = getAppStore();
            const user = appStore?.getState?.()?.auth?.user ?? session.user ?? undefined;
            await saveSession(nextAccessToken, nextRefreshToken, user);
            appStore?.dispatch?.(setSession({ token: nextAccessToken, refreshToken: nextRefreshToken, user }));
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
            if (__DEV__) {
              // eslint-disable-next-line no-console
              console.log("[auth:interceptor:refresh:success:retry-request]");
            }
            return api(originalRequest);
          }
        }
      } catch (refreshError: any) {
        const refreshStatus = Number(refreshError?.response?.status ?? 0);
        const refreshMessage = String(refreshError?.response?.data?.message ?? refreshError?.message ?? "").toLowerCase();
        shouldForceLogout =
          refreshStatus === 401 ||
          refreshMessage.includes("invalid or expired token") ||
          refreshMessage.includes("invalid refresh token") ||
          refreshMessage.includes("refresh token expired");
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log("[auth:interceptor:refresh:failed]", {
            refreshStatus,
            refreshMessage,
            shouldForceLogout,
          });
        }
      }
    }

    if (status === 401 && !originalRequest?._retry) {
      // If refresh was not even attempted, avoid destructive logout on first unauthorized hit.
      shouldForceLogout = false;
    }

    // In dev bypass mode we intentionally keep the mock session alive for fast testing.
    if (shouldForceLogout && !(DEV_LOGIN_BYPASS && __DEV__)) {
      const endpoint = `${String(error?.config?.baseURL ?? "")}${String(error?.config?.url ?? "")}`;
      const message = String(error?.response?.data?.message ?? error?.message ?? "");
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log("[auth:interceptor:clearSession:trigger]", {
          reason: "REFRESH_INVALID",
          source: "api-interceptor",
          status,
          endpoint,
          message,
        });
      }
      const appStore = getAppStore();
      await clearSessionWithReason("REFRESH_INVALID", appStore?.dispatch ?? (() => null), clearSessionState, {
        source: "api-interceptor",
        status,
        endpoint,
        message,
      });
    }

    if (__DEV__ && isLocationApi(error?.config?.url)) {
      // eslint-disable-next-line no-console
      console.log("[location-api:error]", {
        status: error?.response?.status ?? null,
        method: String(error?.config?.method ?? "get").toUpperCase(),
        url: toDebugUrl(error?.config?.baseURL, error?.config?.url),
        message: String(error?.response?.data?.message ?? error?.message ?? "Unknown error"),
        data: error?.response?.data ?? null,
      });
    }

    return Promise.reject(error);
  },
);

export function parseApiError(error: unknown, fallback = "Something went wrong") {
  const e = error as any;
  if (e?.response?.status === 429) {
    return "Too many requests, please try again shortly";
  }
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
