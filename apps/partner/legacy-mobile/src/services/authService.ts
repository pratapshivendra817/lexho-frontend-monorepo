import API, { API_ENDPOINTS, getReadableApiError } from "./api";

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

// Backward-compatible exports for existing screens in this workspace.
export const sendOtp = async (mobileOrEmail: string) => {
  if (mobileOrEmail.includes("@")) {
    return adminLogin({ email: mobileOrEmail, password: "" });
  }
  return API.post(API_ENDPOINTS.adminLogin, { mobile: mobileOrEmail }).then(res => res.data);
};

export const verifyOtp = async (emailOrMobile: string, otp: string) => {
  return verifyAdminOtp({ email: emailOrMobile, otp });
};
