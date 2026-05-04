// src/api/axios.ts
import axios from "axios";

import { appConfig } from "@/config";
import { summarizeApiErrorPayload } from "@/utils/apiError";
import { clearAccessToken, getAccessToken } from "@/utils/authSession";

export const api = axios.create({
  baseURL: appConfig.apiBaseUrl,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
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

    if (error?.response?.status === 401) {
      clearAccessToken();

      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
    }

    return Promise.reject(error);
  },
);
