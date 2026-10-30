import axios from "axios";
import { API_BASE_URL } from "../constants/env";
import { DEV_LOGIN_BYPASS } from "../constants/env";
import { DEV_BYPASS_API_TOKEN } from "../constants/env";
import { DEV_INTERNAL_TOKEN } from "../constants/env";
import { getToken } from "../utils/storage";
import { clearSessionState, setSession } from "../redux/authSlice";
import { clearSessionWithReason } from "../utils/authSessionManager";
import { captureFrontendError } from "../services/monitoring";
import { installAuthRefreshInterceptor } from "./authInterceptor";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});
export const apiClient = api;
const NORMALIZED_API_BASE_URL = String(API_BASE_URL ?? "").replace(/\/+$/, "");

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

function toDebugUrl(baseURL?: string, url?: string) {
  const rawUrl = String(url ?? "");
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
  return `${String(baseURL ?? "")}${rawUrl}`;
}

function normalizeRequestUrl(url?: string) {
  const rawUrl = String(url ?? "").trim();
  if (!rawUrl || !NORMALIZED_API_BASE_URL) return url;

  let nextUrl = rawUrl;
  const duplicatedBasePrefix = `${NORMALIZED_API_BASE_URL}${NORMALIZED_API_BASE_URL}`;
  while (nextUrl.startsWith(duplicatedBasePrefix)) {
    nextUrl = `${NORMALIZED_API_BASE_URL}${nextUrl.slice(duplicatedBasePrefix.length)}`;
  }

  if (nextUrl === NORMALIZED_API_BASE_URL) return "/";
  if (nextUrl.startsWith(`${NORMALIZED_API_BASE_URL}/`)) {
    return nextUrl.slice(NORMALIZED_API_BASE_URL.length);
  }

  return nextUrl;
}

function messageForErrorCode(code?: string) {
  switch (String(code ?? "").trim().toUpperCase()) {
    case "RATE_LIMIT_EXCEEDED":
      return "Too many requests. Please try again later.";
    case "PAYMENT_FAILED":
      return "Payment Failed";
    case "PAYMENT_EXPIRED":
      return "Payment expired. Please retry payment.";
    case "BOOKING_NOT_FOUND":
      return "Booking not found.";
    case "REVIEW_ALREADY_EXISTS":
      return "Your review has already been submitted.";
    case "INVALID_RATING":
      return "Please select a valid rating from 1 to 5.";
    case "INTERNAL_ERROR":
      return "Something went wrong. Please try again.";
    case "INSTANT_UNAVAILABLE":
      return "No partner available right now. Please choose a scheduled slot.";
    case "NO_PARTNER_IN_30_MIN":
      return "No partner can reach within 30 minutes. Please choose a scheduled slot.";
    case "SLOT_EXPIRED":
    case "SLOT_UNAVAILABLE":
      return "Selected slot is no longer available. Please choose another slot.";
    default:
      return "";
  }
}

function isProtectedCustomerApi(url?: string) {
  const value = String(url ?? "");
  return value.includes("/api/v1/customer/location/") || value.includes("/api/customer/location/");
}

api.interceptors.request.use(async (config) => {
  config.url = normalizeRequestUrl(config.url);
  const headers = (config.headers ?? {}) as Record<string, string>;
  const skipAuthorization = String(headers["X-Skip-Authorization"] ?? "").trim() === "true";
  const isFormDataRequest = typeof FormData !== "undefined" && config.data instanceof FormData;
  if (isFormDataRequest) {
    delete headers["Content-Type"];
    delete headers["content-type"];
  }
  delete headers["X-Skip-Authorization"];
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

  if (skipAuthorization) {
    delete headers.Authorization;
  } else if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  config.headers = headers as any;

  return config;
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const status = error?.response?.status;
    captureFrontendError(error, {
      screenName: "API",
      userAction: String(error?.config?.method ?? "request").toUpperCase(),
      apiEndpoint: toDebugUrl(error?.config?.baseURL, error?.config?.url),
      errorCode: getApiErrorCode(error) || String(status || "NETWORK_ERROR"),
    });

    return Promise.reject(error);
  },
);

installAuthRefreshInterceptor(api, {
  onSessionRefreshed: session => {
    const appStore = getAppStore();
    appStore?.dispatch?.(
      setSession({
        token: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user ?? undefined,
      }),
    );
  },
  onLogout: (error: any) => {
    if (DEV_LOGIN_BYPASS && __DEV__) return;
    const appStore = getAppStore();
    const endpoint = toDebugUrl(error?.config?.baseURL, error?.config?.url);
    const message = String(error?.response?.data?.message ?? error?.message ?? "");
    return clearSessionWithReason(
      "REFRESH_INVALID",
      appStore?.dispatch ?? (() => null),
      clearSessionState,
      { source: "api-interceptor", status: error?.response?.status, endpoint, message },
    );
  },
});

export function parseApiError(error: unknown, fallback = "Something went wrong") {
  const e = error as any;
  const status = Number(e?.response?.status ?? 0);
  const message = String(e?.response?.data?.message ?? e?.message ?? "");
  const code = getApiErrorCode(error);
  const codedMessage = messageForErrorCode(code);
  if (codedMessage) return codedMessage;

  if (e?.response?.status === 429) {
    return "Too many requests, please try again shortly";
  }
  if (status === 409) {
    return message || fallback;
  }
  return message || fallback;
}

export function getApiErrorCode(error: unknown) {
  const e = error as any;
  return String(e?.response?.data?.code ?? e?.response?.data?.errorCode ?? e?.code ?? e?.errorCode ?? "").trim().toUpperCase();
}

export function getPayloadCode(payload: unknown) {
  const root = (payload as any)?.data && typeof (payload as any).data === "object" ? (payload as any).data : payload as any;
  return String(root?.code ?? root?.errorCode ?? root?.paymentCode ?? "").trim().toUpperCase();
}

export function toApiError(error: unknown, fallback = "Something went wrong") {
  const normalized = new Error(parseApiError(error, fallback)) as Error & { code?: string; errorCode?: string };
  const code = getApiErrorCode(error);
  if (code) {
    normalized.code = code;
    normalized.errorCode = code;
  }
  return normalized;
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
