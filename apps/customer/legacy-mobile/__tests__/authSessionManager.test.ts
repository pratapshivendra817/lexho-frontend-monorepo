const mockClearSession = jest.fn();
const mockGetOrCreateDeviceId = jest.fn();
const mockGetRefreshToken = jest.fn();
const mockLoadSession = jest.fn();
const mockSaveSession = jest.fn();

jest.mock("../src/utils/storage", () => ({
  clearSession: (...args: unknown[]) => mockClearSession(...args),
  getOrCreateDeviceId: (...args: unknown[]) =>
    mockGetOrCreateDeviceId(...args),
  getRefreshToken: (...args: unknown[]) => mockGetRefreshToken(...args),
  loadSession: (...args: unknown[]) => mockLoadSession(...args),
  saveSession: (...args: unknown[]) => mockSaveSession(...args),
}));

import {
  clearSessionWithReason,
  extractAccessToken,
  extractRefreshToken,
  tryRefreshSessionWithAxios,
} from "../src/utils/authSessionManager";
import { API_BASE_URL } from "../src/constants/env";

describe("utils/authSessionManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClearSession.mockResolvedValue(undefined);
    mockGetOrCreateDeviceId.mockResolvedValue("device-1");
    mockGetRefreshToken.mockResolvedValue(null);
    mockLoadSession.mockResolvedValue({
      token: "old-access",
      refreshToken: "old-refresh",
      user: { id: "user-1" },
    });
    mockSaveSession.mockResolvedValue(undefined);
  });

  it.each([
    [{ accessToken: " access " }, "access"],
    [{ token: " token " }, "token"],
    [{ data: { accessToken: " nested-access " } }, "nested-access"],
    [{ data: { token: " nested-token " } }, "nested-token"],
    [{ data: { data: { accessToken: " deep-access " } } }, "deep-access"],
    [{ payload: { tokens: { jwt: " jwt-access " } } }, "jwt-access"],
    [{ accessToken: 123 }, ""],
    [null, ""],
  ])("extracts access token from %#", (payload, expected) => {
    expect(extractAccessToken(payload)).toBe(expected);
  });

  it.each([
    [{ refreshToken: " refresh " }, null, "refresh"],
    [{ data: { refreshToken: " nested " } }, null, "nested"],
    [{ result: { data: { refreshToken: " deep-refresh " } } }, null, "deep-refresh"],
    [{ payload: { tokens: { refreshToken: " rotated-refresh " } } }, null, "rotated-refresh"],
    [{}, " fallback ", "fallback"],
    [{ refreshToken: 123 }, "fallback", ""],
    [undefined, undefined, ""],
  ])("extracts refresh token from %#", (payload, fallback, expected) => {
    expect(extractRefreshToken(payload, fallback)).toBe(expected);
  });

  it("returns a clear reason when no refresh token exists", async () => {
    mockLoadSession.mockResolvedValue({
      token: null,
      refreshToken: null,
      user: null,
    });
    mockGetRefreshToken.mockResolvedValue(null);
    const client = { post: jest.fn() };

    await expect(tryRefreshSessionWithAxios(client)).resolves.toEqual({
      ok: false,
      reason: "NO_REFRESH_TOKEN",
    });
    expect(client.post).not.toHaveBeenCalled();
  });

  it("refreshes and persists a complete session", async () => {
    const client = {
      post: jest.fn().mockResolvedValue({
        data: {
          data: {
            accessToken: "new-access",
            refreshToken: "new-refresh",
          },
        },
      }),
    };

    await expect(tryRefreshSessionWithAxios(client)).resolves.toEqual({
      ok: true,
      token: "new-access",
      refreshToken: "new-refresh",
      user: { id: "user-1" },
    });
    expect(client.post).toHaveBeenCalledWith(
      `${String(API_BASE_URL).replace(/\/+$/, "")}/api/auth/refresh`,
      {
        refreshToken: "old-refresh",
        deviceId: "device-1",
      },
    );
    expect(mockSaveSession).toHaveBeenCalledWith(
      "new-access",
      "new-refresh",
      { id: "user-1" },
    );
  });

  it("uses storage fallback refresh token and reports missing access token", async () => {
    mockLoadSession.mockResolvedValue({
      token: null,
      refreshToken: null,
      user: null,
    });
    mockGetRefreshToken.mockResolvedValue("fallback-refresh");
    const data = { refreshToken: "rotated-refresh" };
    const client = { post: jest.fn().mockResolvedValue({ data }) };

    await expect(tryRefreshSessionWithAxios(client)).resolves.toEqual({
      ok: false,
      reason: "MISSING_ACCESS_TOKEN",
      raw: data,
    });
    expect(mockSaveSession).not.toHaveBeenCalled();
  });

  it("propagates refresh request failures", async () => {
    const error = new Error("offline");
    const client = { post: jest.fn().mockRejectedValue(error) };

    await expect(tryRefreshSessionWithAxios(client)).rejects.toBe(error);
  });

  it("clears storage and dispatches the supplied action", async () => {
    const dispatch = jest.fn();
    const clearAction = jest.fn(() => ({ type: "auth/clear" }));

    await clearSessionWithReason("UNAUTHORIZED", dispatch, clearAction, {
      source: "api",
      status: 401,
    });

    expect(mockClearSession).toHaveBeenCalled();
    expect(clearAction).toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith({ type: "auth/clear" });
  });

  it("swallows storage clearing failures and supports missing dispatch", async () => {
    mockClearSession.mockRejectedValue(new Error("storage unavailable"));

    await expect(
      clearSessionWithReason("LOGOUT"),
    ).resolves.toBeUndefined();
  });
});
