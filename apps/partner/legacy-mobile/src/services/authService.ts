import API, { API_ENDPOINTS, getReadableApiError } from "./api";
import { extractJwtToken } from "../utils/storage";

export type AdminLoginRequest = {
  email: string;
  password: string;
};

export type VerifyOtpRequest = {
  email: string;
  otp: string;
};

export const adminLogin = async (payload: AdminLoginRequest): Promise<Record<string, any>> => {
  try {
    const response = await API.post(API_ENDPOINTS.adminLogin, payload);
    return response.data;
  } catch (error: any) {
    throw new Error(
      getReadableApiError(error, "Login failed. Please verify email and password.")
    );
  }
};

export const verifyAdminOtp = async (
  payload: VerifyOtpRequest
): Promise<Record<string, any>> => {
  try {
    const response = await API.post(API_ENDPOINTS.adminVerifyOtp, payload);
    return response.data;
  } catch (error: any) {
    throw new Error(
      getReadableApiError(error, "OTP verification failed. Please try again.")
    );
  }
};

export const resendAdminOtp = async (payload: AdminLoginRequest): Promise<Record<string, any>> => {
  try {
    const response = await API.post(API_ENDPOINTS.adminLogin, payload);
    return response.data;
  } catch (error: any) {
    throw new Error(getReadableApiError(error, "Unable to resend OTP right now."));
  }
};

export const sendOtp = async (mobile: string) => {
  try {
    const response = await API.post(API_ENDPOINTS.authOtpSend, { mobile, role: "PARTNER" });
    return response.data;
  } catch (error: any) {
    throw new Error(getReadableApiError(error, "Unable to send OTP right now."));
  }
};

export const verifyOtp = async (mobile: string, otp: string) => {
  try {
    const response = await API.post(API_ENDPOINTS.authOtpVerify, { mobile, otp, role: "PARTNER" });
    const payload = response.data ?? {};
    const jwt = extractJwtToken(payload);
    if (!jwt) {
      throw new Error("Token missing in verify-otp response.");
    }
    return payload;
  } catch (error: any) {
    throw new Error(getReadableApiError(error, "OTP verification failed. Please try again."));
  }
};
