// src/api/axios.ts
import axios from "axios";
import toast from "react-hot-toast";

import { appConfig } from "@/config";
import { summarizeApiErrorPayload } from "@/utils/apiError";
import {
  clearAccessToken,
  getAccessToken,
  getOrCreateAdminDeviceId,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from "@/utils/authSession";

export const api = axios.create({
  baseURL: appConfig.apiBaseUrl,
});
const refreshClient = axios.create({
  baseURL: appConfig.apiBaseUrl,
});
const rateLimitBackoffMs = [3000, 10000, 30000];

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  const url = String(config.url ?? "");
  const isProtectedAdminApi = url.startsWith("/api/admin");
  const isAuthApi = url === "/api/admin/login" || url === "/api/admin/verify-otp";

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  }

  if (isProtectedAdminApi && !isAuthApi) {
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.replace("/login");
    }
    return Promise.reject(new Error("Authorization token is required"));
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const toJsonPreview = (value: unknown, limit = 600): string => {
      if (value == null) {
        return "null";
      }
      if (typeof value === "string") {
        return value.length > limit ? `${value.slice(0, limit)}...` : value;
      }
      try {
        const serialized = JSON.stringify(value);
        return serialized.length > limit ? `${serialized.slice(0, limit)}...` : serialized;
      } catch {
        return "UNSERIALIZABLE";
      }
    };

    const method = String(error?.config?.method ?? "GET").toUpperCase();
    const baseURL = String(error?.config?.baseURL ?? "");
    const url = String(error?.config?.url ?? "");
    const fullUrl = `${baseURL}${url}`;
    const status = error?.response?.status ?? "NO_STATUS";
    const responseBody = error?.response?.data;
    const requestBody = error?.config?.data;
    const responseSummary = summarizeApiErrorPayload(responseBody);

    console.error(
      `[Admin API Error] ${method} ${fullUrl} -> ${status} | ${responseSummary} | req=${toJsonPreview(requestBody)} | res=${toJsonPreview(responseBody)}`,
      {
      requestBody,
      responseBody,
      error,
      },
    );

    const statusCode = error?.response?.status;
    const originalRequest = error?.config as
      | (typeof error.config & {
          _retry?: boolean;
          _retry429Count?: number;
        })
      | undefined;

    if (statusCode === 429 && originalRequest) {
      const retryCount = originalRequest._retry429Count ?? 0;
      if (retryCount < rateLimitBackoffMs.length) {
        originalRequest._retry429Count = retryCount + 1;
        toast.error("Too many requests, please try again shortly");
        await new Promise((resolve) => {
          window.setTimeout(resolve, rateLimitBackoffMs[retryCount]);
        });
        return api(originalRequest);
      }
    }

    if (statusCode === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = getRefreshToken();
        if (refreshToken) {
          const deviceId = getOrCreateAdminDeviceId();
          const { data } = await refreshClient.post("/api/auth/refresh", { refreshToken, deviceId });
          const root = (data ?? {}) as Record<string, unknown>;
          const nestedData =
            root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : undefined;
          const nextAccessToken =
            (root.accessToken as string | undefined) ??
            (root.token as string | undefined) ??
            (nestedData?.accessToken as string | undefined) ??
            (nestedData?.token as string | undefined);
          const nextRefreshToken =
            (root.refreshToken as string | undefined) ?? (nestedData?.refreshToken as string | undefined);

          if (typeof nextAccessToken === "string" && nextAccessToken.trim().length > 0) {
            setAccessToken(nextAccessToken);
            if (typeof nextRefreshToken === "string" && nextRefreshToken.trim().length > 0) {
              setRefreshToken(nextRefreshToken);
            }
            originalRequest.headers = originalRequest.headers ?? {};
            (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${nextAccessToken}`;
            return api(originalRequest);
          }
        }
      } catch {
        // continue to forced logout below
      }
    }

    if (statusCode === 401) {
      clearAccessToken();

      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
    }

    return Promise.reject(error);
  },
);

