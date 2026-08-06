const mockStorage = {
  getToken: jest.fn(),
  getRefreshToken: jest.fn(),
  loadSession: jest.fn(),
  saveSession: jest.fn(),
  clearSession: jest.fn(),
};

jest.mock("../src/utils/storage", () => ({
  getToken: (...args: any[]) => mockStorage.getToken(...args),
  getRefreshToken: (...args: any[]) => mockStorage.getRefreshToken(...args),
  loadSession: (...args: any[]) => mockStorage.loadSession(...args),
  saveSession: (...args: any[]) => mockStorage.saveSession(...args),
  clearSession: (...args: any[]) => mockStorage.clearSession(...args),
}));

import { tokenStorage } from "../src/services/tokenStorage";

describe("tokenStorage", () => {
  beforeEach(() => jest.clearAllMocks());

  it("reads access tokens, refresh tokens, and complete sessions", async () => {
    mockStorage.getToken.mockResolvedValue("access");
    mockStorage.getRefreshToken.mockResolvedValue("refresh");
    mockStorage.loadSession.mockResolvedValue({ token: "access", refreshToken: "refresh", user: { id: "1" } });

    await expect(tokenStorage.getAccessToken()).resolves.toBe("access");
    await expect(tokenStorage.getRefreshToken()).resolves.toBe("refresh");
    await expect(tokenStorage.getSession()).resolves.toMatchObject({ user: { id: "1" } });
  });

  it("persists both tokens with the current user and clears the session", async () => {
    const user = { id: "1" };
    await tokenStorage.saveTokens({ accessToken: "access", refreshToken: "refresh" }, user);
    await tokenStorage.clear();

    expect(mockStorage.saveSession).toHaveBeenCalledWith("access", "refresh", user);
    expect(mockStorage.clearSession).toHaveBeenCalledTimes(1);
  });
});

