import AsyncStorage from "@react-native-async-storage/async-storage";

const storage = AsyncStorage;
const {
  clearPendingReferralCode,
  getPendingReferralCode,
  savePendingReferralCode,
  clearPendingPaymentBookingId,
  clearSession,
  getOrCreateDeviceId,
  getPendingPaymentBookingId,
  getRefreshToken,
  getToken,
  loadSession,
  savePendingPaymentBookingId,
  saveSession,
} = require("../src/utils/storage.js");

describe("utils/storage.js", () => {
  const mutableStorage = AsyncStorage;
  const originalMethods = {
    getItem: AsyncStorage.getItem,
    setItem: AsyncStorage.setItem,
    removeItem: AsyncStorage.removeItem,
    multiGet: AsyncStorage.multiGet,
    multiRemove: AsyncStorage.multiRemove,
  };

  beforeEach(async () => {
    Object.assign(mutableStorage, originalMethods);
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  afterAll(() => {
    Object.assign(mutableStorage, originalMethods);
  });

  it("saves, loads, and clears a complete session", async () => {
    const user = { id: "user-1", name: "Customer" };
    await saveSession(" token ", " refresh ", user);

    await expect(loadSession()).resolves.toEqual({
      token: "token",
      refreshToken: "refresh",
      user,
    });
    await expect(getToken()).resolves.toBe("token");
    await expect(getRefreshToken()).resolves.toBe("refresh");

    await clearSession();
    await expect(loadSession()).resolves.toEqual({
      token: null,
      refreshToken: null,
      user: null,
    });
  });

  it("saves, reads, and clears the pending signup referral", async () => {
    await expect(getPendingReferralCode()).resolves.toBeNull();
    await savePendingReferralCode(" lex-ho_42! ");
    expect(storage.setItem).toHaveBeenCalledWith(
      "@lexho/customer/pending-referral-code", "LEX-HO_42",
    );
    await expect(getPendingReferralCode()).resolves.toBe("LEX-HO_42");
    await clearPendingReferralCode();
    await expect(getPendingReferralCode()).resolves.toBeNull();
  });

  it.each([null, undefined, "", "   ", "!@#"])(
    "ignores empty or invalid referral code %s",
    async (value) => {
      await savePendingReferralCode(value);
      expect(storage.setItem).not.toHaveBeenCalled();
    },
  );

  it("ignores empty tokens and unserializable users", async () => {
    await saveSession("   ", "refresh", { id: "ignored" });
    expect(storage.setItem).not.toHaveBeenCalled();

    const circular = {};
    circular.self = circular;
    await saveSession("token", null, circular);
    expect(storage.setItem).not.toHaveBeenCalledWith(
      "@lexho/customer/user",
      expect.any(String),
    );
  });

  it("falls back to legacy session values and invalid JSON safely", async () => {
    storage.multiGet
      .mockResolvedValueOnce([
        ["@lexho/customer/token", null],
        ["@lexho/customer/refresh-token", null],
        ["@lexho/customer/user", null],
        ["@customer/auth-token", "legacy"],
        ["@customer/user", '{"id":"legacy-user"}'],
      ])
      .mockResolvedValueOnce([
        ["@lexho/customer/token", "token"],
        ["@lexho/customer/refresh-token", null],
        ["@lexho/customer/user", "{invalid"],
      ]);

    await expect(loadSession()).resolves.toEqual({
      token: "legacy",
      refreshToken: null,
      user: { id: "legacy-user" },
    });
    await expect(loadSession()).resolves.toEqual({
      token: "token",
      refreshToken: null,
      user: null,
    });
  });

  it("returns an empty session after storage failure", async () => {
    storage.multiGet.mockRejectedValueOnce(new Error("read failed"));

    await expect(loadSession()).resolves.toEqual({
      token: null,
      refreshToken: null,
      user: null,
    });
  });

  it("loads through individual reads when multiGet is unavailable", async () => {
    mutableStorage.multiGet = undefined;
    storage.getItem
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("refresh")
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("legacy-token")
      .mockResolvedValueOnce('{"id":"legacy-user"}');

    await expect(loadSession()).resolves.toEqual({
      token: "legacy-token",
      refreshToken: "refresh",
      user: { id: "legacy-user" },
    });
  });

  it("clears through individual removals when multiRemove is unavailable", async () => {
    mutableStorage.multiRemove = undefined;
    mutableStorage.removeItem = jest.fn().mockResolvedValue(undefined);

    await clearSession();

    expect(storage.removeItem).toHaveBeenCalledTimes(5);
  });

  it("reads the legacy token when the current token is absent", async () => {
    storage.getItem
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("legacy-token");

    await expect(getToken()).resolves.toBe("legacy-token");
  });

  it("uses timestamp device fallback when a storage method is unavailable", async () => {
    jest.spyOn(Date, "now").mockReturnValue(200);
    mutableStorage.getItem = undefined;

    await expect(getOrCreateDeviceId()).resolves.toBe("customer-200");
    jest.restoreAllMocks();
  });

  it("returns safely when optional storage methods are unavailable", async () => {
    mutableStorage.setItem = undefined;
    await expect(saveSession("token")).resolves.toBeUndefined();
    await expect(
      savePendingPaymentBookingId("booking"),
    ).resolves.toBeUndefined();

    mutableStorage.getItem = undefined;
    await expect(getToken()).resolves.toBeNull();
    await expect(getRefreshToken()).resolves.toBeNull();
    await expect(getPendingPaymentBookingId()).resolves.toBeNull();

    mutableStorage.multiRemove = undefined;
    mutableStorage.removeItem = undefined;
    await expect(clearSession()).resolves.toBeUndefined();
    await expect(clearPendingPaymentBookingId()).resolves.toBeUndefined();
  });

  it("creates and reuses a device ID", async () => {
    storage.getItem
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("existing-device");
    jest.spyOn(Date, "now").mockReturnValueOnce(100);

    await expect(getOrCreateDeviceId()).resolves.toMatch(/^customer-/);
    await expect(getOrCreateDeviceId()).resolves.toBe("existing-device");
    jest.restoreAllMocks();
  });

  it("saves, reads, and clears a normalized pending booking ID", async () => {
    await savePendingPaymentBookingId(" booking-1 ");
    expect(storage.setItem).toHaveBeenCalledWith(
      "@lexho/customer/pending-payment-booking-id",
      "booking-1",
    );

    storage.getItem.mockResolvedValueOnce(" booking-1 ");
    await expect(getPendingPaymentBookingId()).resolves.toBe("booking-1");

    await clearPendingPaymentBookingId();
    expect(storage.removeItem).toHaveBeenCalledWith(
      "@lexho/customer/pending-payment-booking-id",
    );
  });

  it.each([null, undefined, "", "   "])(
    "ignores empty pending booking ID %s",
    async (value) => {
      await savePendingPaymentBookingId(value);
      expect(storage.setItem).not.toHaveBeenCalled();
    },
  );
});
