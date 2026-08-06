import AsyncStorage from "@react-native-async-storage/async-storage";

const mockSaveSession = jest.fn();
const mockClearSession = jest.fn();
const mockLoadSession = jest.fn();
const mockGetToken = jest.fn();

jest.mock("../src/utils/storage", () => ({
  saveSession: (...args: any[]) => mockSaveSession(...args),
  clearSession: (...args: any[]) => mockClearSession(...args),
  loadSession: (...args: any[]) => mockLoadSession(...args),
  getToken: (...args: any[]) => mockGetToken(...args),
}));

import {
  clearAuthSession,
  getCartSnapshot,
  getStoredAuthSession,
  getThemeMode,
  saveAuthSession,
  saveCartSnapshot,
  saveThemeMode,
} from "../src/services/storage";
import { CART_STORAGE_KEY, THEME_MODE_STORAGE_KEY } from "../src/utils/constants";

describe("services/storage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    mockSaveSession.mockResolvedValue(undefined);
    mockClearSession.mockResolvedValue(undefined);
    mockLoadSession.mockResolvedValue(null);
    mockGetToken.mockResolvedValue(null);
  });

  it("saves, loads, falls back, and clears authentication sessions", async () => {
    await saveAuthSession("token-1", { id: "1", mobile: "999", name: "User" });
    expect(mockSaveSession).toHaveBeenCalledWith(
      "token-1",
      undefined,
      { id: "1", mobile: "999", name: "User" },
    );

    mockLoadSession.mockResolvedValueOnce({
      token: "stored",
      user: { id: "2", mobile: "888" },
    });
    await expect(getStoredAuthSession()).resolves.toEqual({
      token: "stored",
      user: { id: "2", mobile: "888" },
    });

    mockGetToken.mockResolvedValueOnce("fallback");
    await expect(getStoredAuthSession()).resolves.toEqual({
      token: "fallback",
      user: null,
    });

    await saveAuthSession("", null);
    await clearAuthSession();
    expect(mockClearSession).toHaveBeenCalledTimes(2);
  });

  it("stores and validates theme values", async () => {
    await saveThemeMode("dark");
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      THEME_MODE_STORAGE_KEY,
      "dark",
    );

    (AsyncStorage.getItem as jest.Mock)
      .mockResolvedValueOnce("light")
      .mockResolvedValueOnce("system");
    await expect(getThemeMode()).resolves.toBe("light");
    await expect(getThemeMode()).resolves.toBeNull();
  });

  it("serializes carts and handles empty, malformed, and non-array snapshots", async () => {
    const items = [{ id: "1", quantity: 2 }] as any;
    await saveCartSnapshot(items);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      CART_STORAGE_KEY,
      JSON.stringify(items),
    );

    (AsyncStorage.getItem as jest.Mock)
      .mockResolvedValueOnce(JSON.stringify(items))
      .mockResolvedValueOnce("")
      .mockResolvedValueOnce("{bad")
      .mockResolvedValueOnce(JSON.stringify({ item: 1 }));

    await expect(getCartSnapshot()).resolves.toEqual(items);
    await expect(getCartSnapshot()).resolves.toEqual([]);
    await expect(getCartSnapshot()).resolves.toEqual([]);
    await expect(getCartSnapshot()).resolves.toEqual([]);

    await saveCartSnapshot(null as any);
    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith(
      CART_STORAGE_KEY,
      "[]",
    );
  });
});
