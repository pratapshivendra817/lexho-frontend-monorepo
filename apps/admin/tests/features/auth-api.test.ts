import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  isAxiosError: vi.fn(),
}));

vi.mock("@lexho/api", () => ({
  createApiClient: () => ({
    post: mocks.post,
  }),
}));

vi.mock("axios", () => ({
  isAxiosError: mocks.isAxiosError,
}));

describe("features/auth api", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("normalizes requestAdminOtp payloads and posts to the login endpoint", async () => {
    mocks.post.mockResolvedValueOnce({ data: { ok: true } });
    mocks.isAxiosError.mockReturnValue(false);

    const { requestAdminOtp } = await import("@/features/auth/api");

    await expect(
      requestAdminOtp({ email: "  ADMIN@Lexho.com ", password: "  secret123  " }),
    ).resolves.toEqual({ data: { ok: true } });

    expect(mocks.post).toHaveBeenCalledWith("/api/admin/login", {
      email: "admin@lexho.com",
      password: "secret123",
    });
  });

  it("maps verifyAdminOtp payloads and posts to the verify endpoint", async () => {
    mocks.post.mockResolvedValueOnce({ data: { token: "jwt" } });
    mocks.isAxiosError.mockReturnValue(false);

    const { verifyAdminOtp } = await import("@/features/auth/api");

    await expect(
      verifyAdminOtp({ email: "  ADMIN@Lexho.com ", otp: " 123456 " }),
    ).resolves.toEqual({ data: { token: "jwt" } });

    expect(mocks.post).toHaveBeenCalledWith("/api/admin/verify-otp", {
      email: "admin@lexho.com",
      otp: "123456",
    });
  });

  it("maps network and generic non-response requestAdminOtp failures", async () => {
    const { requestAdminOtp } = await import("@/features/auth/api");

    mocks.isAxiosError.mockReturnValue(true);
    mocks.post.mockRejectedValueOnce({ code: "ERR_NETWORK" });
    await expect(
      requestAdminOtp({ email: "admin@lexho.com", password: "secret123" }),
    ).rejects.toThrow("Cannot reach backend. Please check API base URL and server status.");

    mocks.post.mockRejectedValueOnce({ code: "ECONNABORTED" });
    await expect(
      requestAdminOtp({ email: "admin@lexho.com", password: "secret123" }),
    ).rejects.toThrow("Unable to request OTP");

    mocks.isAxiosError.mockReturnValue(false);
    mocks.post.mockRejectedValueOnce(new Error("plain"));
    await expect(
      requestAdminOtp({ email: "admin@lexho.com", password: "secret123" }),
    ).rejects.toThrow("Unable to request OTP");
  });

  it("prefers response payload messages and status-specific fallback messages", async () => {
    const { requestAdminOtp, verifyAdminOtp } = await import("@/features/auth/api");

    mocks.isAxiosError.mockReturnValue(true);

    mocks.post.mockRejectedValueOnce({
      response: {
        status: 401,
        data: { message: "Wrong credentials" },
      },
    });
    await expect(
      requestAdminOtp({ email: "admin@lexho.com", password: "secret123" }),
    ).rejects.toThrow("Wrong credentials (HTTP 401)");

    mocks.post.mockRejectedValueOnce({
      response: {
        status: 401,
        data: {},
      },
    });
    await expect(
      verifyAdminOtp({ email: "admin@lexho.com", otp: "123456" }),
    ).rejects.toThrow("Invalid or expired OTP");
  });

  it("falls back to status-based or generic HTTP messages when payload messages are unusable", async () => {
    const { requestAdminOtp, verifyAdminOtp } = await import("@/features/auth/api");

    mocks.isAxiosError.mockReturnValue(true);

    mocks.post.mockRejectedValueOnce({
      response: {
        status: 429,
        data: { message: "   " },
      },
    });
    await expect(
      requestAdminOtp({ email: "admin@lexho.com", password: "secret123" }),
    ).rejects.toThrow("Unable to request OTP (HTTP 429)");

    mocks.post.mockRejectedValueOnce({
      response: {
        status: 500,
        data: null,
      },
    });
    await expect(
      verifyAdminOtp({ email: "admin@lexho.com", otp: "123456" }),
    ).rejects.toThrow("OTP verification failed (HTTP 500)");
  });
});
