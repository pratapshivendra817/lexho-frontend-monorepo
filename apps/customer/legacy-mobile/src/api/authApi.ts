import { api, parseApiError } from "./client";
import type { RefreshTokenRequest, RefreshTokenResponse, SendOtpRequest, SendOtpResponse, VerifyOtpRequest, VerifyOtpResponse } from "../types/contracts";

export async function sendOtp(mobile: string): Promise<SendOtpResponse> {
  try {
    const payload: SendOtpRequest = { mobile };
    const { data } = await api.post("/otp/send", payload);
    if (__DEV__) {
      const devOtp = data?.otp ?? data?.data?.otp ?? data?.code ?? data?.data?.code;
      if (devOtp) {
        console.log(`[DEV OTP] ${mobile}: ${devOtp}`);
      } else {
        console.log("[DEV OTP] OTP not present in /otp/send response payload.");
      }
    }
    return data;
  } catch (error) {
    throw new Error(parseApiError(error, "Failed to send OTP"));
  }
}

export async function verifyOtp(mobile: string, otp: string): Promise<VerifyOtpResponse> {
  try {
    const payload: VerifyOtpRequest = { mobile, otp };
    const { data } = await api.post("/otp/verify", payload);
    return data as VerifyOtpResponse;
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
    const payload: RefreshTokenRequest = { refreshToken };
    const { data } = await api.post("/auth/refresh-token", payload);
    return data as RefreshTokenResponse;
  } catch (error) {
    throw new Error(parseApiError(error, "Refresh token failed"));
  }
}
