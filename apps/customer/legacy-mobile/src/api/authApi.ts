import { api, parseApiError } from "./client";
import axios from "axios";
import { API_BASE_URL } from "../constants/env";
import type { RefreshTokenRequest, RefreshTokenResponse, SendOtpRequest, SendOtpResponse, VerifyOtpRequest, VerifyOtpResponse } from "../types/contracts";
import { getOrCreateDeviceId } from "../utils/storage";

const AUTH_RETRY_TIMEOUT_MS = 6000;
const MAX_FALLBACK_ATTEMPTS = 3;

function buildAuthBaseCandidates() {
  const normalized = String(API_BASE_URL ?? "").replace(/\/+$/, "");
  const candidates = [normalized];
  if (normalized.includes("localhost")) {
    candidates.push(normalized.replace("localhost", "10.0.2.2"));
    candidates.push(normalized.replace("localhost", "127.0.0.1"));
  } else if (normalized.includes("10.0.2.2")) {
    candidates.push(normalized.replace("10.0.2.2", "localhost"));
    candidates.push(normalized.replace("10.0.2.2", "127.0.0.1"));
  } else if (normalized.includes("127.0.0.1")) {
    candidates.push(normalized.replace("127.0.0.1", "localhost"));
    candidates.push(normalized.replace("127.0.0.1", "10.0.2.2"));
  }

  // Keep explicit physical-device fallback for this local network setup.
  if (!candidates.some((base) => base.includes("192.168.31.38"))) {
    candidates.push("http://192.168.31.38:8082");
  }
  return Array.from(new Set(candidates));
}

async function postWithBaseAndPathFallback<T>(paths: string[], payload: any): Promise<T> {
  const normalizedPaths = Array.from(
    new Set(paths.map((value) => String(value ?? "").trim()).filter((value) => value.length > 0)),
  );
  if (normalizedPaths.length === 0) {
    throw new Error("Auth path is missing");
  }

  let lastError: any = null;
  try {
    const { data } = await api.post(normalizedPaths[0], payload);
    return data as T;
  } catch (error: any) {
    lastError = error;
    const message = String(error?.message ?? "").toLowerCase();
    const status = Number(error?.response?.status ?? 0);
    const code = String(error?.code ?? "").toUpperCase();
    const shouldFallback =
      message.includes("network error") ||
      code === "ERR_NETWORK" ||
      code === "ECONNABORTED" ||
      status === 404 ||
      status === 405;
    if (!shouldFallback) {
      throw lastError;
    }

    const bases = buildAuthBaseCandidates();
    const candidateUrls = normalizedPaths.flatMap((path) => bases.map((base) => `${base}${path}`));
    const uniqueCandidateUrls = Array.from(new Set(candidateUrls)).slice(0, MAX_FALLBACK_ATTEMPTS);

    for (const url of uniqueCandidateUrls) {
      try {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log("[auth-api:retry]", { url, payload });
        }
        const { data } = await axios.post(url, payload, { timeout: AUTH_RETRY_TIMEOUT_MS });
        return data as T;
      } catch (retryError: any) {
        lastError = retryError;
        // try next candidate
      }
    }
    throw lastError;
  }
}

export async function sendOtp(mobile: string): Promise<SendOtpResponse> {
  try {
    const payload: SendOtpRequest = { mobile, role: "CUSTOMER" };
    const data = await postWithBaseAndPathFallback<SendOtpResponse>(
      ["/otp/send", "/api/auth/otp/send", "/api/auth/customer/login"],
      payload,
    );
    if (__DEV__) {
      const debugData = data as any;
      const devOtp = debugData?.otp ?? debugData?.data?.otp ?? debugData?.code ?? debugData?.data?.code;
      if (devOtp) {
        console.log(`[DEV OTP] ${mobile}: ${devOtp}`);
      } else {
        console.log("[DEV OTP] OTP not present in /otp/send response payload.");
      }
    }
    return data;
  } catch (error: any) {
    if (axios.isAxiosError(error) && !error.response) {
      throw new Error(
        `Network Error: cannot reach ${String(API_BASE_URL).replace(/\/+$/, "")}/otp/send from device. Ensure phone and PC are on same Wi-Fi and backend is running on port 8082.`,
      );
    }
    throw new Error(parseApiError(error, "Failed to send OTP"));
  }
}

export async function verifyOtp(mobile: string, otp: string): Promise<VerifyOtpResponse> {
  try {
    const payload: VerifyOtpRequest = { mobile, otp };
    return await postWithBaseAndPathFallback<VerifyOtpResponse>(
      ["/otp/verify", "/api/auth/otp/verify", "/api/auth/customer/login"],
      payload,
    );
  } catch (error) {
    throw new Error(parseApiError(error, "OTP verification failed"));
  }
}

export async function logoutApi() {
  try {
    const { data } = await api.post("/auth/logout");
    return data;
  } catch (error) {
    throw new Error(parseApiError(error, "Logout failed"));
  }
}

export async function refreshTokenApi(refreshToken: string): Promise<RefreshTokenResponse> {
  try {
    const deviceId = await getOrCreateDeviceId();
    const payload: RefreshTokenRequest & { deviceId: string } = { refreshToken, deviceId };
    const { data } = await api.post("/api/auth/refresh", payload);
    return data as RefreshTokenResponse;
  } catch (error) {
    throw new Error(parseApiError(error, "Refresh token failed"));
  }
}
