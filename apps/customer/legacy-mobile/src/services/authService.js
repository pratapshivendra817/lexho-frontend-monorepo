import { refreshTokenApi, verifyOtp } from "../api/authApi";

export async function loginWithOtp(payload) {
  const mobile = String(payload?.mobile ?? "").trim();
  const otp = String(payload?.otp ?? "").trim();
  if (!mobile || !otp) {
    throw new Error("mobile and otp are required");
  }
  return verifyOtp(mobile, otp);
}

export async function refreshAuthToken(refreshToken) {
  const token = String(refreshToken ?? "").trim();
  if (!token) {
    throw new Error("refreshToken is required");
  }
  return refreshTokenApi(token);
}
