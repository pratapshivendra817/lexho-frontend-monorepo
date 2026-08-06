const mockPost = jest.fn();
const mockTokenStorage = {
  getSession: jest.fn(),
  getRefreshToken: jest.fn(),
  saveTokens: jest.fn(),
  clear: jest.fn(),
};
const mockExtractAccessToken = jest.fn();
const mockExtractRefreshToken = jest.fn();
const mockGetDeviceId = jest.fn();

jest.mock("axios", () => ({ __esModule: true, default: { post: (...args: any[]) => mockPost(...args) } }));
jest.mock("../src/constants/env", () => ({ API_BASE_URL: "http://api.test:8082/" }));
jest.mock("../src/services/tokenStorage", () => ({
  tokenStorage: {
    getSession: (...args: any[]) => mockTokenStorage.getSession(...args),
    getRefreshToken: (...args: any[]) => mockTokenStorage.getRefreshToken(...args),
    saveTokens: (...args: any[]) => mockTokenStorage.saveTokens(...args),
    clear: (...args: any[]) => mockTokenStorage.clear(...args),
  },
}));
jest.mock("../src/utils/authSessionManager", () => ({
  extractAccessToken: (...args: any[]) => mockExtractAccessToken(...args),
  extractRefreshToken: (...args: any[]) => mockExtractRefreshToken(...args),
}));
jest.mock("../src/utils/storage", () => ({ getOrCreateDeviceId: () => mockGetDeviceId() }));

import { authService } from "../src/services/authService";

describe("authService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTokenStorage.getSession.mockResolvedValue({ token: "old", refreshToken: "refresh", user: { id: "1" } });
    mockGetDeviceId.mockResolvedValue("device-1");
    mockPost.mockResolvedValue({ data: { accessToken: "new-access", refreshToken: "new-refresh" } });
    mockExtractAccessToken.mockReturnValue("new-access");
    mockExtractRefreshToken.mockReturnValue("new-refresh");
  });

  it("refreshes and persists a rotated token pair", async () => {
    await expect(authService.refreshAccessToken()).resolves.toEqual({
      accessToken: "new-access",
      refreshToken: "new-refresh",
      user: { id: "1" },
    });
    expect(mockPost).toHaveBeenCalledWith("http://api.test:8082/api/v1/auth/refresh", {
      refreshToken: "refresh",
      deviceId: "device-1",
    });
    expect(mockTokenStorage.saveTokens).toHaveBeenCalledWith(
      { accessToken: "new-access", refreshToken: "new-refresh" },
      { id: "1" },
    );
  });

  it("falls back to the legacy refresh endpoint when v1 is unavailable", async () => {
    mockPost
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce({ data: { accessToken: "new-access", refreshToken: "new-refresh" } });

    await expect(authService.refreshAccessToken()).resolves.toMatchObject({
      accessToken: "new-access",
      refreshToken: "new-refresh",
    });

    expect(mockPost).toHaveBeenNthCalledWith(1, "http://api.test:8082/api/v1/auth/refresh", {
      refreshToken: "refresh",
      deviceId: "device-1",
    });
    expect(mockPost).toHaveBeenNthCalledWith(2, "http://api.test:8082/api/auth/refresh", {
      refreshToken: "refresh",
      deviceId: "device-1",
    });
  });

  it("shares one refresh request across concurrent callers", async () => {
    let resolvePost!: (value: unknown) => void;
    mockPost.mockReturnValue(new Promise(resolve => { resolvePost = resolve; }));

    const first = authService.refreshAccessToken();
    const second = authService.refreshAccessToken();
    resolvePost({ data: { accessToken: "new-access" } });

    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it("rejects when no refresh token exists or the response has no access token", async () => {
    mockTokenStorage.getSession.mockResolvedValueOnce({ token: null, refreshToken: null, user: null });
    mockTokenStorage.getRefreshToken.mockResolvedValueOnce(null);
    await expect(authService.refreshAccessToken()).rejects.toThrow("Refresh token is unavailable");

    mockExtractAccessToken.mockReturnValueOnce("");
    await expect(authService.refreshAccessToken()).rejects.toThrow("did not include an access token");
  });
});
