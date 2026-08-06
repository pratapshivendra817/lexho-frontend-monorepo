jest.mock("./api", () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
  API_ENDPOINTS: {
    adminLogin: "/api/admin/login",
    adminVerifyOtp: "/api/admin/verify-otp",
    authOtpSend: "/otp/send",
    authOtpVerify: "/otp/verify",
  },
  getReadableApiError: jest.fn((error: any, fallback: string) => error?.message ?? fallback),
}));

jest.mock("../utils/storage", () => ({
  extractJwtToken: jest.fn(),
}));

import API, { API_ENDPOINTS, getReadableApiError } from "./api";
import { extractJwtToken } from "../utils/storage";

import {
  adminLogin,
  resendAdminOtp,
  sendOtp,
  verifyAdminOtp,
  verifyOtp,
} from "./authService";

describe("authService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("adminLogin", () => {
    it("returns response data on success", async () => {
      (API.post as jest.Mock).mockResolvedValueOnce({ data: { ok: true } });

      await expect(adminLogin({ email: "a@b.com", password: "secret" })).resolves.toEqual({ ok: true });
      expect(API.post).toHaveBeenCalledWith(API_ENDPOINTS.adminLogin, {
        email: "a@b.com",
        password: "secret",
      });
    });

    it("throws a readable login error on failure", async () => {
      (API.post as jest.Mock).mockRejectedValueOnce(new Error("Bad credentials"));

      await expect(adminLogin({ email: "", password: "" })).rejects.toThrow("Bad credentials");
      expect(getReadableApiError).toHaveBeenCalledWith(
        expect.any(Error),
        "Login failed. Please verify email and password.",
      );
    });
  });

  describe("verifyAdminOtp", () => {
    it("returns response data on success", async () => {
      (API.post as jest.Mock).mockResolvedValueOnce({ data: { verified: true } });

      await expect(verifyAdminOtp({ email: "admin@test.com", otp: "123456" })).resolves.toEqual({
        verified: true,
      });
      expect(API.post).toHaveBeenCalledWith(API_ENDPOINTS.adminVerifyOtp, {
        email: "admin@test.com",
        otp: "123456",
      });
    });

    it("throws a readable otp verification error on failure", async () => {
      (API.post as jest.Mock).mockRejectedValueOnce(new Error("OTP invalid"));

      await expect(verifyAdminOtp({ email: "admin@test.com", otp: "" })).rejects.toThrow("OTP invalid");
      expect(getReadableApiError).toHaveBeenCalledWith(
        expect.any(Error),
        "OTP verification failed. Please try again.",
      );
    });
  });

  describe("resendAdminOtp", () => {
    it("reuses the admin login endpoint", async () => {
      (API.post as jest.Mock).mockResolvedValueOnce({ data: { resent: true } });

      await expect(resendAdminOtp({ email: "admin@test.com", password: "pw" })).resolves.toEqual({
        resent: true,
      });
      expect(API.post).toHaveBeenCalledWith(API_ENDPOINTS.adminLogin, {
        email: "admin@test.com",
        password: "pw",
      });
    });

    it("throws a readable resend error on failure", async () => {
      (API.post as jest.Mock).mockRejectedValueOnce(new Error("Cannot resend"));

      await expect(resendAdminOtp({ email: "", password: "" })).rejects.toThrow("Cannot resend");
      expect(getReadableApiError).toHaveBeenCalledWith(expect.any(Error), "Unable to resend OTP right now.");
    });
  });

  describe("sendOtp", () => {
    it("sends partner otp requests", async () => {
      (API.post as jest.Mock).mockResolvedValueOnce({ data: { sent: true } });

      await expect(sendOtp("9876543210")).resolves.toEqual({ sent: true });
      expect(API.post).toHaveBeenCalledWith(API_ENDPOINTS.authOtpSend, {
        mobile: "9876543210",
        role: "PARTNER",
      });
    });

    it("throws a readable send error on failure", async () => {
      (API.post as jest.Mock).mockRejectedValueOnce(new Error("Send failed"));

      await expect(sendOtp("")).rejects.toThrow("Send failed");
      expect(getReadableApiError).toHaveBeenCalledWith(expect.any(Error), "Unable to send OTP right now.");
    });
  });

  describe("verifyOtp", () => {
    it("returns the payload when a jwt is present", async () => {
      const payload = { token: "jwt-token", user: { id: 1 } };
      (API.post as jest.Mock).mockResolvedValueOnce({ data: payload });
      (extractJwtToken as jest.Mock).mockReturnValue("jwt-token");

      await expect(verifyOtp("9999999999", "123456")).resolves.toEqual(payload);
      expect(API.post).toHaveBeenCalledWith(API_ENDPOINTS.authOtpVerify, {
        mobile: "9999999999",
        otp: "123456",
        role: "PARTNER",
      });
    });

    it("throws when the verify-otp payload is missing a token", async () => {
      (API.post as jest.Mock).mockResolvedValueOnce({ data: {} });
      (extractJwtToken as jest.Mock).mockReturnValue(null);

      await expect(verifyOtp("9999999999", "000000")).rejects.toThrow("Token missing in verify-otp response.");
      expect(getReadableApiError).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Token missing in verify-otp response." }),
        "OTP verification failed. Please try again.",
      );
    });

    it("throws a readable verification error on api failure", async () => {
      (API.post as jest.Mock).mockRejectedValueOnce(new Error("OTP service unavailable"));

      await expect(verifyOtp(undefined as unknown as string, undefined as unknown as string)).rejects.toThrow(
        "OTP service unavailable",
      );
    });
  });
});
