const mockApiPost = jest.fn();
const mockAxiosPost = jest.fn();
const mockParseApiError = jest.fn();
const mockGetOrCreateDeviceId = jest.fn();

jest.mock("../src/api/client", () => ({
  api: { post: (...args: unknown[]) => mockApiPost(...args) },
  parseApiError: (...args: unknown[]) => mockParseApiError(...args),
}));

jest.mock("axios", () => ({
  __esModule: true,
  default: {
    post: (...args: unknown[]) => mockAxiosPost(...args),
    isAxiosError: (error: { isAxiosError?: boolean }) =>
      error?.isAxiosError === true,
  },
}));

jest.mock("../src/constants/env", () => ({
  API_BASE_URL: "http://localhost:8082/",
  AUTH_FALLBACK_BASE_URLS: [
    "http://localhost:8082",
    "http://backup:8082",
  ],
}));

jest.mock("../src/utils/storage", () => ({
  getOrCreateDeviceId: () => mockGetOrCreateDeviceId(),
}));

import {
  logoutApi,
  refreshTokenApi,
  sendOtp,
  verifyOtp,
} from "../src/api/authApi";

describe("authApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParseApiError.mockImplementation(
      (_error: unknown, fallback: string) => fallback,
    );
    mockGetOrCreateDeviceId.mockResolvedValue("device-1");
  });

  it("sends and verifies OTP through the primary API", async () => {
    mockApiPost
      .mockResolvedValueOnce({ data: { requestId: "otp-1" } })
      .mockResolvedValueOnce({ data: { accessToken: "access-1" } });

    await expect(sendOtp("9876543210")).resolves.toEqual({
      requestId: "otp-1",
    });
    await expect(verifyOtp("9876543210", "1234")).resolves.toEqual({
      accessToken: "access-1",
    });

    expect(mockApiPost).toHaveBeenNthCalledWith(1, "/otp/send", {
      mobile: "9876543210",
      role: "CUSTOMER",
    });
    expect(mockApiPost).toHaveBeenNthCalledWith(2, "/otp/verify", {
      mobile: "9876543210",
      otp: "1234",
    });
  });

  it.each([
    [{ message: "Network Error" }, "http://localhost:8082/otp/send"],
    [{ code: "ERR_NETWORK" }, "http://localhost:8082/otp/send"],
    [{ code: "ECONNABORTED" }, "http://localhost:8082/otp/send"],
    [{ response: { status: 404 } }, "http://localhost:8082/otp/send"],
    [{ response: { status: 405 } }, "http://localhost:8082/otp/send"],
  ])("retries fallback URLs for retryable errors", async (error, firstUrl) => {
    mockApiPost.mockRejectedValue(error);
    mockAxiosPost.mockResolvedValueOnce({ data: { requestId: "fallback" } });

    await expect(sendOtp("9876543210")).resolves.toEqual({
      requestId: "fallback",
    });
    expect(mockAxiosPost).toHaveBeenCalledWith(
      firstUrl,
      { mobile: "9876543210", role: "CUSTOMER" },
      { timeout: 6000 },
    );
  });

  it("tries multiple fallback candidates before succeeding", async () => {
    mockApiPost.mockRejectedValue({ message: "network error" });
    mockAxiosPost
      .mockRejectedValueOnce(new Error("first unavailable"))
      .mockRejectedValueOnce(new Error("second unavailable"))
      .mockResolvedValueOnce({ data: { requestId: "third" } });

    await expect(sendOtp("9876543210")).resolves.toEqual({
      requestId: "third",
    });
    expect(mockAxiosPost).toHaveBeenCalledTimes(3);
  });

  it("normalizes non-retryable and exhausted fallback errors", async () => {
    mockApiPost.mockRejectedValueOnce({ response: { status: 400 } });
    mockParseApiError.mockReturnValueOnce("Invalid mobile");
    await expect(sendOtp("123")).rejects.toThrow("Invalid mobile");
    expect(mockAxiosPost).not.toHaveBeenCalled();

    mockApiPost.mockRejectedValueOnce({ message: "network error" });
    mockAxiosPost.mockRejectedValue({ response: { status: 503 } });
    mockParseApiError.mockReturnValueOnce("Failed to send OTP");
    await expect(sendOtp("9876543210")).rejects.toThrow(
      "Failed to send OTP",
    );
  });

  it("returns the device-specific network error for unreachable Axios calls", async () => {
    mockApiPost.mockRejectedValue({ message: "network error" });
    mockAxiosPost.mockRejectedValue({
      isAxiosError: true,
      message: "Network Error",
    });

    await expect(sendOtp("9876543210")).rejects.toThrow(
      "cannot reach http://localhost:8082/otp/send",
    );
  });

  it("normalizes verification, logout, and refresh failures", async () => {
    mockParseApiError
      .mockReturnValueOnce("OTP expired")
      .mockReturnValueOnce("Logout rejected")
      .mockReturnValueOnce("Refresh rejected");
    mockApiPost
      .mockRejectedValueOnce({ response: { status: 422 } })
      .mockRejectedValueOnce(new Error("logout"))
      .mockRejectedValueOnce(new Error("refresh"));

    await expect(verifyOtp("9876543210", "0000")).rejects.toThrow(
      "OTP expired",
    );
    await expect(logoutApi()).rejects.toThrow("Logout rejected");
    await expect(refreshTokenApi("refresh-1")).rejects.toThrow(
      "Refresh rejected",
    );
  });

  it("logs out and refreshes a session successfully", async () => {
    mockApiPost
      .mockResolvedValueOnce({ data: { success: true } })
      .mockResolvedValueOnce({
        data: { accessToken: "new-access", refreshToken: "new-refresh" },
      });

    await expect(logoutApi()).resolves.toEqual({ success: true });
    await expect(refreshTokenApi("refresh-1")).resolves.toEqual({
      accessToken: "new-access",
      refreshToken: "new-refresh",
    });
    expect(mockApiPost).toHaveBeenNthCalledWith(1, "/auth/logout");
    expect(mockApiPost).toHaveBeenNthCalledWith(2, "/api/auth/refresh", {
      refreshToken: "refresh-1",
      deviceId: "device-1",
    });
  });
});
