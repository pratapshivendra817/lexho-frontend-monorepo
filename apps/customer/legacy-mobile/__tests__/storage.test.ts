import AsyncStorage from "@react-native-async-storage/async-storage";

const {
  clearPendingPaymentBookingId,
  clearSession,
  getOrCreateDeviceId,
  getPendingPaymentBookingId,
  getRefreshToken,
  getToken,
  loadSession,
  savePendingPaymentBookingId,
  saveSession,
} = require("../src/utils/storage.ts") as typeof import("../src/utils/storage");
import {
  DEVICE_ID_KEY,
  REFRESH_TOKEN_KEY,
  TOKEN_KEY,
  USER_KEY,
} from "../src/constants/env";

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const LEGACY_TOKEN_KEY = "@customer/auth-token";
const LEGACY_USER_KEY = "@customer/user";
const PENDING_PAYMENT_BOOKING_KEY =
  "@lexho/customer/pending-payment-booking-id";

describe("utils/storage", () => {
  const runtime = globalThis as typeof globalThis & { __DEV__: boolean };
  const mutableStorage = AsyncStorage as any;
  const originalMethods = {
    getItem: AsyncStorage.getItem,
    setItem: AsyncStorage.setItem,
    removeItem: AsyncStorage.removeItem,
    multiGet: AsyncStorage.multiGet,
    multiRemove: AsyncStorage.multiRemove,
  };
  const originalDev = runtime.__DEV__;

  beforeEach(async () => {
    mutableStorage.getItem = originalMethods.getItem;
    mutableStorage.setItem = originalMethods.setItem;
    mutableStorage.removeItem = originalMethods.removeItem;
    mutableStorage.multiGet = originalMethods.multiGet;
    mutableStorage.multiRemove = originalMethods.multiRemove;
    jest.clearAllMocks();
    await AsyncStorage.clear();
    runtime.__DEV__ = true;
  });

  afterAll(() => {
    mutableStorage.getItem = originalMethods.getItem;
    mutableStorage.setItem = originalMethods.setItem;
    mutableStorage.removeItem = originalMethods.removeItem;
    mutableStorage.multiGet = originalMethods.multiGet;
    mutableStorage.multiRemove = originalMethods.multiRemove;
    runtime.__DEV__ = originalDev;
  });

  describe("saveSession", () => {
    it("stores current and legacy session values with serialized user data", async () => {
      const user = {
        id: "customer-1",
        name: "Customer",
        mobile: "9999999999",
        email: "customer@example.com",
      };

      await saveSession("access-token", "refresh-token", user);

      expect(storage.setItem).toHaveBeenNthCalledWith(
        1,
        TOKEN_KEY,
        "access-token",
      );
      expect(storage.setItem).toHaveBeenNthCalledWith(
        2,
        LEGACY_TOKEN_KEY,
        "access-token",
      );
      expect(storage.setItem).toHaveBeenCalledWith(
        REFRESH_TOKEN_KEY,
        "refresh-token",
      );
      expect(storage.setItem).toHaveBeenCalledWith(
        USER_KEY,
        JSON.stringify(user),
      );
      expect(storage.setItem).toHaveBeenCalledWith(
        LEGACY_USER_KEY,
        JSON.stringify(user),
      );
      expect(storage.multiGet).toHaveBeenCalledWith([
        TOKEN_KEY,
        REFRESH_TOKEN_KEY,
        USER_KEY,
      ]);
    });

    it.each([
      ["undefined refresh and user", undefined, undefined],
      ["empty refresh and null user", "", null],
    ])("stores only access tokens for %s", async (_label, refreshToken, user) => {
      await saveSession("token-only", refreshToken, user);

      expect(storage.setItem).toHaveBeenCalledWith(TOKEN_KEY, "token-only");
      expect(storage.setItem).toHaveBeenCalledWith(
        LEGACY_TOKEN_KEY,
        "token-only",
      );
      expect(storage.setItem).not.toHaveBeenCalledWith(
        REFRESH_TOKEN_KEY,
        expect.anything(),
      );
      expect(storage.removeItem).toHaveBeenCalledWith(REFRESH_TOKEN_KEY);
      expect(storage.setItem).not.toHaveBeenCalledWith(
        USER_KEY,
        expect.anything(),
      );
    });

    it("preserves empty access tokens because callers own token validation", async () => {
      await saveSession("", "refresh-only");

      expect(storage.setItem).toHaveBeenCalledWith(TOKEN_KEY, "");
      expect(storage.setItem).toHaveBeenCalledWith(LEGACY_TOKEN_KEY, "");
      expect(storage.setItem).toHaveBeenCalledWith(
        REFRESH_TOKEN_KEY,
        "refresh-only",
      );
    });

    it("skips persistence when setItem is unavailable", async () => {
      mutableStorage.setItem = undefined;

      await expect(
        saveSession("token", "refresh", { id: "1" }),
      ).resolves.toBeUndefined();
      expect(storage.multiGet).not.toHaveBeenCalled();
    });

    it("rejects invalid circular user serialization after writing tokens", async () => {
      const circular: Record<string, unknown> = { id: "circular" };
      circular.self = circular;

      await expect(
        saveSession("token", "refresh", circular as never),
      ).rejects.toThrow();

      expect(storage.setItem).toHaveBeenCalledWith(TOKEN_KEY, "token");
      expect(storage.setItem).not.toHaveBeenCalledWith(
        USER_KEY,
        expect.any(String),
      );
      expect(storage.multiGet).not.toHaveBeenCalled();
    });

    it("propagates storage write and verification failures", async () => {
      storage.setItem.mockRejectedValueOnce(new Error("write failed"));
      await expect(saveSession("token")).rejects.toThrow("write failed");

      storage.setItem.mockResolvedValue(undefined);
      storage.multiGet.mockRejectedValueOnce(new Error("verify failed"));
      await expect(saveSession("token")).rejects.toThrow("verify failed");
    });
  });

  describe("loadSession", () => {
    it("deserializes a complete session through multiGet", async () => {
      const user = { id: "1", name: "Customer" };
      storage.multiGet.mockResolvedValueOnce([
        [TOKEN_KEY, "token"],
        [REFRESH_TOKEN_KEY, "refresh"],
        [USER_KEY, JSON.stringify(user)],
        [LEGACY_TOKEN_KEY, "legacy-token"],
        [LEGACY_USER_KEY, JSON.stringify({ id: "legacy" })],
      ]);

      await expect(loadSession()).resolves.toEqual({
        token: "token",
        refreshToken: "refresh",
        user,
      });
    });

    it("falls back to legacy token and user values", async () => {
      storage.multiGet.mockResolvedValueOnce([
        [TOKEN_KEY, null],
        [REFRESH_TOKEN_KEY, null],
        [USER_KEY, null],
        [LEGACY_TOKEN_KEY, "legacy-token"],
        [LEGACY_USER_KEY, JSON.stringify({ id: "legacy-user" })],
      ]);

      await expect(loadSession()).resolves.toEqual({
        token: "legacy-token",
        refreshToken: null,
        user: { id: "legacy-user" },
      });
    });

    it.each([
      ["null result", null],
      ["undefined result", undefined],
      ["malformed non-array result", { token: "invalid" }],
      ["empty result", []],
    ])("returns an empty session for a %s", async (_label, result) => {
      storage.multiGet.mockResolvedValueOnce(result as never);

      await expect(loadSession()).resolves.toEqual({
        token: null,
        refreshToken: null,
        user: null,
      });
    });

    it.each([
      ["invalid JSON", "{broken"],
      ["empty string", ""],
      ["JSON null", "null"],
    ])("handles %s user storage", async (_label, userRaw) => {
      storage.multiGet.mockResolvedValueOnce([
        [TOKEN_KEY, "token"],
        [REFRESH_TOKEN_KEY, "refresh"],
        [USER_KEY, userRaw],
        [LEGACY_TOKEN_KEY, null],
        [LEGACY_USER_KEY, null],
      ]);

      await expect(loadSession()).resolves.toEqual({
        token: "token",
        refreshToken: "refresh",
        user: null,
      });
    });

    it("uses individual getItem reads when multiGet is unavailable", async () => {
      mutableStorage.multiGet = undefined;
      storage.getItem
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce("refresh")
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce("legacy-token")
        .mockResolvedValueOnce(JSON.stringify({ id: "legacy-user" }));

      await expect(loadSession()).resolves.toEqual({
        token: "legacy-token",
        refreshToken: "refresh",
        user: { id: "legacy-user" },
      });
      expect(storage.getItem).toHaveBeenNthCalledWith(1, TOKEN_KEY);
      expect(storage.getItem).toHaveBeenNthCalledWith(4, LEGACY_TOKEN_KEY);
      expect(storage.getItem).toHaveBeenNthCalledWith(5, LEGACY_USER_KEY);
    });

    it("does not read legacy values when individual current values exist", async () => {
      mutableStorage.multiGet = undefined;
      storage.getItem
        .mockResolvedValueOnce("current-token")
        .mockResolvedValueOnce("current-refresh")
        .mockResolvedValueOnce(JSON.stringify({ id: "current-user" }));

      await expect(loadSession()).resolves.toEqual({
        token: "current-token",
        refreshToken: "current-refresh",
        user: { id: "current-user" },
      });
      expect(storage.getItem).toHaveBeenCalledTimes(3);
      expect(storage.getItem).not.toHaveBeenCalledWith(LEGACY_TOKEN_KEY);
      expect(storage.getItem).not.toHaveBeenCalledWith(LEGACY_USER_KEY);
    });

    it("returns an empty session when both read APIs are unavailable", async () => {
      mutableStorage.multiGet = undefined;
      mutableStorage.getItem = undefined;

      await expect(loadSession()).resolves.toEqual({
        token: null,
        refreshToken: null,
        user: null,
      });
    });

    it("swallows storage and deserialization exceptions", async () => {
      storage.multiGet.mockRejectedValueOnce(new Error("storage unavailable"));

      await expect(loadSession()).resolves.toEqual({
        token: null,
        refreshToken: null,
        user: null,
      });
    });
  });

  describe("getToken", () => {
    it("falls back to the legacy token key", async () => {
      storage.getItem
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce("legacy-token");

      await expect(getToken()).resolves.toBe("legacy-token");
    });
  });

  describe("clearSession", () => {
    const sessionKeys = [
      TOKEN_KEY,
      REFRESH_TOKEN_KEY,
      USER_KEY,
      LEGACY_TOKEN_KEY,
      LEGACY_USER_KEY,
    ];

    it("removes every session key in a single operation", async () => {
      await clearSession();

      expect(storage.multiRemove).toHaveBeenCalledWith(sessionKeys);
      expect(storage.removeItem).not.toHaveBeenCalled();
    });

    it("falls back to individual removals", async () => {
      mutableStorage.multiRemove = undefined;
      mutableStorage.removeItem = jest.fn().mockResolvedValue(undefined);

      await clearSession();

      expect(storage.removeItem).toHaveBeenCalledTimes(5);
      sessionKeys.forEach((key) => {
        expect(storage.removeItem).toHaveBeenCalledWith(key);
      });
    });

    it("resolves safely when removal APIs are unavailable", async () => {
      mutableStorage.multiRemove = undefined;
      mutableStorage.removeItem = undefined;

      await expect(clearSession()).resolves.toBeUndefined();
    });

    it("propagates removal failures", async () => {
      storage.multiRemove.mockRejectedValueOnce(new Error("clear failed"));

      await expect(clearSession()).rejects.toThrow("clear failed");
    });
  });

  describe("token getters", () => {
    it.each([
      ["access token", getToken, TOKEN_KEY, "access-token"],
      ["refresh token", getRefreshToken, REFRESH_TOKEN_KEY, "refresh-token"],
    ])("reads the %s", async (_label, getter, key, value) => {
      storage.getItem.mockResolvedValueOnce(value);

      await expect(getter()).resolves.toBe(value);
      expect(storage.getItem).toHaveBeenCalledWith(key);
    });

    it.each([
      ["null", null],
      ["undefined", undefined],
      ["empty string", ""],
    ])("preserves a %s token value from storage", async (_label, value) => {
      storage.getItem.mockResolvedValueOnce(value as never);
      await expect(getToken()).resolves.toBe(value);
    });

    it("returns null when getItem is unavailable", async () => {
      mutableStorage.getItem = undefined;

      await expect(getToken()).resolves.toBeNull();
      await expect(getRefreshToken()).resolves.toBeNull();
    });

    it("propagates token read failures", async () => {
      storage.getItem.mockRejectedValueOnce(new Error("read failed"));
      await expect(getToken()).rejects.toThrow("read failed");

      storage.getItem.mockRejectedValueOnce(new Error("refresh failed"));
      await expect(getRefreshToken()).rejects.toThrow("refresh failed");
    });
  });

  describe("getOrCreateDeviceId", () => {
    it.each([
      ["normal", "device-1"],
      ["whitespace padded", "  device-2  "],
    ])("reuses an existing %s ID unchanged", async (_label, deviceId) => {
      storage.getItem.mockResolvedValueOnce(deviceId);

      await expect(getOrCreateDeviceId()).resolves.toBe(deviceId);
      expect(storage.setItem).not.toHaveBeenCalled();
    });

    it.each([
      ["null", null],
      ["undefined", undefined],
      ["empty", ""],
      ["whitespace", "   "],
    ])("creates and persists an ID for a %s stored value", async (_label, value) => {
      storage.getItem.mockResolvedValueOnce(value as never);
      jest.spyOn(Date, "now").mockReturnValueOnce(1000);

      const created = await getOrCreateDeviceId();

      expect(created).toMatch(/^customer-/);
      expect(storage.setItem).toHaveBeenCalledWith(DEVICE_ID_KEY, created);
      jest.restoreAllMocks();
    });

    it("creates a timestamp-only fallback when storage methods are unavailable", async () => {
      jest.spyOn(Date, "now").mockReturnValue(2000);
      mutableStorage.getItem = undefined;

      await expect(getOrCreateDeviceId()).resolves.toBe("customer-2000");

      mutableStorage.getItem = originalMethods.getItem;
      mutableStorage.setItem = undefined;
      await expect(getOrCreateDeviceId()).resolves.toBe("customer-2000");
      jest.restoreAllMocks();
    });

    it("propagates device ID read and write failures", async () => {
      storage.getItem.mockRejectedValueOnce(new Error("device read failed"));
      await expect(getOrCreateDeviceId()).rejects.toThrow(
        "device read failed",
      );

      storage.getItem.mockResolvedValueOnce(null);
      storage.setItem.mockRejectedValueOnce(new Error("device write failed"));
      await expect(getOrCreateDeviceId()).rejects.toThrow(
        "device write failed",
      );
    });
  });

  describe("pending payment booking ID", () => {
    it.each([
      ["string", "  booking-1  ", "booking-1"],
      ["number", 42, "42"],
    ])("normalizes and saves a %s ID", async (_label, input, expected) => {
      await savePendingPaymentBookingId(input);

      expect(storage.setItem).toHaveBeenCalledWith(
        PENDING_PAYMENT_BOOKING_KEY,
        expected,
      );
    });

    it.each([
      ["null", null],
      ["undefined", undefined],
      ["empty", ""],
      ["whitespace", "   "],
    ])("ignores a %s ID", async (_label, input) => {
      await savePendingPaymentBookingId(input);

      expect(storage.setItem).not.toHaveBeenCalled();
    });

    it("skips saving when setItem is unavailable", async () => {
      mutableStorage.setItem = undefined;

      await expect(
        savePendingPaymentBookingId("booking-2"),
      ).resolves.toBeUndefined();
    });

    it.each([
      ["stored value", "  booking-3  ", "booking-3"],
      ["empty string", "", null],
      ["whitespace", "   ", null],
      ["null", null, null],
      ["undefined", undefined, null],
    ])("reads a %s", async (_label, stored, expected) => {
      storage.getItem.mockResolvedValueOnce(stored as never);

      await expect(getPendingPaymentBookingId()).resolves.toBe(expected);
      expect(storage.getItem).toHaveBeenCalledWith(
        PENDING_PAYMENT_BOOKING_KEY,
      );
    });

    it("returns null when getItem is unavailable", async () => {
      mutableStorage.getItem = undefined;

      await expect(getPendingPaymentBookingId()).resolves.toBeNull();
    });

    it("removes the pending booking ID", async () => {
      await clearPendingPaymentBookingId();

      expect(storage.removeItem).toHaveBeenCalledWith(
        PENDING_PAYMENT_BOOKING_KEY,
      );
    });

    it("skips removal when removeItem is unavailable", async () => {
      mutableStorage.removeItem = undefined;

      await expect(clearPendingPaymentBookingId()).resolves.toBeUndefined();
    });

    it("propagates pending ID storage failures", async () => {
      storage.setItem.mockRejectedValueOnce(new Error("pending write failed"));
      await expect(
        savePendingPaymentBookingId("booking-4"),
      ).rejects.toThrow("pending write failed");

      storage.getItem.mockRejectedValueOnce(new Error("pending read failed"));
      await expect(getPendingPaymentBookingId()).rejects.toThrow(
        "pending read failed",
      );

      storage.removeItem.mockRejectedValueOnce(
        new Error("pending remove failed"),
      );
      await expect(clearPendingPaymentBookingId()).rejects.toThrow(
        "pending remove failed",
      );
    });
  });

  it("suppresses debug output in production mode", async () => {
    runtime.__DEV__ = false;
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    storage.getItem.mockResolvedValueOnce("token");

    await getToken();

    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("returns an empty session when the storage provider is unavailable", async () => {
    jest.resetModules();
    jest.doMock("@react-native-async-storage/async-storage", () => ({
      __esModule: true,
      default: null,
    }));
    const isolatedStorage = require("../src/utils/storage.ts") as typeof import("../src/utils/storage");

    await expect(isolatedStorage.loadSession()).resolves.toEqual({
      token: null,
      refreshToken: null,
      user: null,
    });
  });
});
