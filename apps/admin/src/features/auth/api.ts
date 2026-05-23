import { createApiClient } from "@lexho/api";
import { isAxiosError } from "axios";

import { appConfig } from "../../config";

const authClient = createApiClient({
  baseURL: appConfig.apiBaseUrl,
});

const ADMIN_AUTH_ENDPOINTS = {
  login: "/api/admin/login",
  verifyOtp: "/api/admin/verify-otp",
} as const;

function extractApiError(error: unknown, fallback: string) {
  if (!isAxiosError(error)) {
    return fallback;
  }

  if (!error.response) {
    if (error.code === "ERR_NETWORK") {
      return "Cannot reach backend. Please check API base URL and server status.";
    }
    return fallback;
  }

  const payload = error.response?.data;
  const status = error.response?.status;

  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return status ? `${message} (HTTP ${status})` : message;
    }
  }

  return status ? `${fallback} (HTTP ${status})` : fallback;
}

export const requestAdminOtp = async (payload: {
  email: string;
  password: string;
}) => {
  const email = payload.email.trim();
  const password = payload.password.trim();

  const requestPayload = { email: email.toLowerCase(), password };
  try {
    return await authClient.post(ADMIN_AUTH_ENDPOINTS.login, requestPayload);
  } catch (error) {
    throw new Error(extractApiError(error, "Unable to request OTP"));
  }
};

export const verifyAdminOtp = async (payload: {
  email: string;
  otp: string;
}) => {
  const email = payload.email.trim();
  const requestPayload = { email: email.toLowerCase(), otp: payload.otp.trim() };
  try {
    return await authClient.post(ADMIN_AUTH_ENDPOINTS.verifyOtp, requestPayload);
  } catch (error) {
    throw new Error(extractApiError(error, "OTP verification failed"));
  }
};

