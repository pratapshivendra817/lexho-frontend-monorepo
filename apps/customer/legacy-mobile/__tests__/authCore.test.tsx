import React from "react";
import { Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { cleanup, render, waitFor } from "@testing-library/react-native";

const mockDispatch = jest.fn();
const mockRefresh = jest.fn();

jest.mock("../src/redux/hooks", () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock("../src/utils/authSessionManager", () => {
  const actual = jest.requireActual("../src/utils/authSessionManager");
  return {
    ...actual,
    tryRefreshSessionWithAxios: (...args: unknown[]) => mockRefresh(...args),
  };
});

import authReducer, {
  clearSessionState,
  setHydrated,
  setSession,
} from "../src/redux/authSlice";
import {
  clearSessionWithReason,
  extractAccessToken,
  extractRefreshToken,
} from "../src/utils/authSessionManager";
import { resolveUserIdFromAuth } from "../src/utils/authUser";
import {
  clearPendingPaymentBookingId,
  clearSession,
  getOrCreateDeviceId,
  getPendingPaymentBookingId,
  getRefreshToken,
  getToken,
  loadSession,
  savePendingPaymentBookingId,
  saveSession,
} from "../src/utils/storage";
import { useAuthBootstrap } from "../src/hooks/useAuthBootstrap";
import {
  DEVICE_ID_KEY,
  REFRESH_TOKEN_KEY,
  TOKEN_KEY,
  USER_KEY,
} from "../src/constants/env";

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

function jwt(payload: Record<string, unknown>) {
  const encoded = (globalThis as any).Buffer.from(
    JSON.stringify(payload),
  ).toString("base64url");
  return `header.${encoded}.signature`;
}

const actualSessionManager = jest.requireActual(
  "../src/utils/authSessionManager",
) as typeof import("../src/utils/authSessionManager");

function BootstrapProbe() {
  useAuthBootstrap();
  return <Text>bootstrap</Text>;
}

describe("auth state and token helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("covers auth reducer session, defaults, clear, and hydration actions", () => {
    const initial = authReducer(undefined, { type: "unknown" });
    expect(initial).toEqual({
      token: null,
      refreshToken: null,
      user: null,
      hydrated: false,
    });

    const authenticated = authReducer(
      initial,
      setSession({ token: "token", user: { id: "7" } }),
    );
    expect(authenticated).toMatchObject({
      token: "token",
      refreshToken: null,
      user: { id: "7" },
    });
    expect(authReducer(authenticated, clearSessionState())).toMatchObject({
      token: null,
      refreshToken: null,
      user: null,
    });
    expect(authReducer(initial, setHydrated(true)).hydrated).toBe(true);
  });

  it.each([
    [{ accessToken: " root-access " }, "root-access"],
    [{ token: "root-token" }, "root-token"],
    [{ data: { accessToken: "nested-access" } }, "nested-access"],
    [{ data: { token: "nested-token" } }, "nested-token"],
    [{ data: { data: { accessToken: "deep-access" } } }, "deep-access"],
    [{ payload: { tokens: { authToken: "payload-access" } } }, "payload-access"],
    [{ accessToken: 12 }, ""],
    [null, ""],
  ])("extracts access tokens from supported response shapes", (payload, token) => {
    expect(extractAccessToken(payload)).toBe(token);
  });

  it.each([
    [{ refreshToken: " root-refresh " }, null, "root-refresh"],
    [{ data: { refreshToken: "nested-refresh" } }, null, "nested-refresh"],
    [{ result: { data: { refreshToken: "deep-refresh" } } }, null, "deep-refresh"],
    [{ payload: { tokens: { refreshToken: "payload-refresh" } } }, null, "payload-refresh"],
    [{}, "fallback-refresh", "fallback-refresh"],
    [{ refreshToken: 12 }, "fallback-refresh", ""],
  ])("extracts refresh tokens and fallback values", (payload, fallback, token) => {
    expect(extractRefreshToken(payload, fallback)).toBe(token);
  });

  it("resolves user ids from auth state and JWT claims", () => {
    expect(resolveUserIdFromAuth("12", "")).toBe(12);
    expect(resolveUserIdFromAuth(null, jwt({ userId: 21 }))).toBe(21);
    expect(resolveUserIdFromAuth(null, jwt({ id: "22" }))).toBe(22);
    expect(resolveUserIdFromAuth(null, jwt({ sub: 23 }))).toBe(23);
    expect(resolveUserIdFromAuth(null, "corrupted")).toBe(0);
    expect(resolveUserIdFromAuth(-1, jwt({ sub: "invalid" }))).toBe(0);
  });

  it("decodes JWTs through Buffer and handles unavailable decoders", () => {
    const originalAtob = (globalThis as any).atob;
    const originalBuffer = (globalThis as any).Buffer;
    (globalThis as any).atob = undefined;

    expect(resolveUserIdFromAuth(null, jwt({ sub: 31 }))).toBe(31);

    (globalThis as any).Buffer = undefined;
    expect(resolveUserIdFromAuth(null, "header.payload.signature")).toBe(0);

    (globalThis as any).atob = originalAtob;
    (globalThis as any).Buffer = originalBuffer;
  });
});

describe("auth storage", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await storage.clear();
  });

  afterEach(async () => {
    await cleanup();
  });

  it("saves, loads, and clears the complete session", async () => {
    const user = { id: "1", mobile: "9876543210" };
    await saveSession("token-1", "refresh-1", user);

    await expect(loadSession()).resolves.toEqual({
      token: "token-1",
      refreshToken: "refresh-1",
      user,
    });
    await expect(getToken()).resolves.toBe("token-1");
    await expect(getRefreshToken()).resolves.toBe("refresh-1");

    await clearSession();
    await expect(loadSession()).resolves.toEqual({
      token: null,
      refreshToken: null,
      user: null,
    });
  });

  it("loads legacy values and tolerates corrupted users and read failures", async () => {
    storage.multiGet
      .mockResolvedValueOnce([
        [TOKEN_KEY, null],
        [REFRESH_TOKEN_KEY, null],
        [USER_KEY, null],
        ["@customer/auth-token", "legacy-token"],
        ["@customer/user", JSON.stringify({ id: "legacy" })],
      ])
      .mockResolvedValueOnce([
        [TOKEN_KEY, "token"],
        [REFRESH_TOKEN_KEY, null],
        [USER_KEY, "{broken"],
        ["@customer/auth-token", null],
        ["@customer/user", null],
      ])
      .mockRejectedValueOnce(new Error("storage unavailable"));

    await expect(loadSession()).resolves.toMatchObject({
      token: "legacy-token",
      user: { id: "legacy" },
    });
    await expect(loadSession()).resolves.toMatchObject({
      token: "token",
      user: null,
    });
    await expect(loadSession()).resolves.toEqual({
      token: null,
      refreshToken: null,
      user: null,
    });
  });

  it("reuses or creates a stable device id", async () => {
    storage.getItem
      .mockResolvedValueOnce("existing-device")
      .mockResolvedValueOnce(null);
    expect(await getOrCreateDeviceId()).toBe("existing-device");

    jest.spyOn(Date, "now").mockReturnValue(1000);
    jest.spyOn(Math, "random").mockReturnValue(0.5);
    const created = await getOrCreateDeviceId();
    expect(created).toMatch(/^customer-1000-/);
    expect(storage.setItem).toHaveBeenCalledWith(DEVICE_ID_KEY, created);
    jest.restoreAllMocks();
  });

  it("stores, reads, ignores empty, and clears pending payment ids", async () => {
    await savePendingPaymentBookingId(" 44 ");
    expect(storage.setItem).toHaveBeenCalledWith(
      "@lexho/customer/pending-payment-booking-id",
      "44",
    );
    storage.getItem.mockResolvedValueOnce(" 44 ");
    await expect(getPendingPaymentBookingId()).resolves.toBe("44");
    storage.getItem.mockResolvedValueOnce("");
    await expect(getPendingPaymentBookingId()).resolves.toBeNull();
    await savePendingPaymentBookingId(null);
    await clearPendingPaymentBookingId();
    expect(storage.removeItem).toHaveBeenCalledWith(
      "@lexho/customer/pending-payment-booking-id",
    );
  });

  it("covers legacy getItem storage fallbacks and legacy token reads", async () => {
    const originalMultiGet = storage.multiGet;
    (storage as any).multiGet = undefined;
    storage.getItem
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("refresh-fallback")
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("legacy-token")
      .mockResolvedValueOnce(JSON.stringify({ id: "legacy-user" }));

    await expect(loadSession()).resolves.toEqual({
      token: "legacy-token",
      refreshToken: "refresh-fallback",
      user: { id: "legacy-user" },
    });

    storage.getItem
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("legacy-token");
    await expect(getToken()).resolves.toBe("legacy-token");
    (storage as any).multiGet = originalMultiGet;
  });

  it("uses individual removals when multiRemove is unavailable", async () => {
    const originalMultiRemove = storage.multiRemove;
    const originalRemoveItem = storage.removeItem;
    (storage as any).multiRemove = undefined;
    (storage as any).removeItem = jest.fn().mockResolvedValue(undefined);

    await clearSession();

    expect(storage.removeItem).toHaveBeenCalledTimes(5);
    (storage as any).multiRemove = originalMultiRemove;
    (storage as any).removeItem = originalRemoveItem;
  });

  it("handles unavailable storage methods and unserializable users", async () => {
    const originalGetItem = storage.getItem;
    const originalSetItem = storage.setItem;
    const originalRemoveItem = storage.removeItem;
    const circular: Record<string, unknown> = { id: "circular" };
    circular.self = circular;

    await saveSession("token", "refresh", circular as any);
    expect(storage.setItem).not.toHaveBeenCalledWith(
      USER_KEY,
      expect.any(String),
    );

    (storage as any).getItem = undefined;
    await expect(getToken()).resolves.toBeNull();
    await expect(getRefreshToken()).resolves.toBeNull();
    await expect(getPendingPaymentBookingId()).resolves.toBeNull();

    (storage as any).setItem = undefined;
    await expect(getOrCreateDeviceId()).resolves.toMatch(/^customer-/);
    await expect(savePendingPaymentBookingId("55")).resolves.toBeUndefined();

    (storage as any).removeItem = undefined;
    await expect(clearPendingPaymentBookingId()).resolves.toBeUndefined();

    (storage as any).getItem = originalGetItem;
    (storage as any).setItem = originalSetItem;
    (storage as any).removeItem = originalRemoveItem;
  });
});

describe("session refresh and cleanup", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await storage.clear();
  });

  it("skips refresh without a refresh token", async () => {
    await expect(
      actualSessionManager.tryRefreshSessionWithAxios({ post: jest.fn() }),
    ).resolves.toEqual({ ok: false, reason: "NO_REFRESH_TOKEN" });
  });

  it("refreshes and persists nested tokens", async () => {
    await saveSession("old-token", "old-refresh", { id: "8" });
    const axiosClient = {
      post: jest.fn().mockResolvedValue({
        data: {
          data: {
            accessToken: "new-token",
            refreshToken: "new-refresh",
          },
        },
      }),
    };

    await expect(
      actualSessionManager.tryRefreshSessionWithAxios(axiosClient),
    ).resolves.toEqual({
      ok: true,
      token: "new-token",
      refreshToken: "new-refresh",
      user: { id: "8" },
    });
    expect(axiosClient.post).toHaveBeenCalledWith(
      expect.stringContaining("/api/auth/refresh"),
      expect.objectContaining({ refreshToken: "old-refresh" }),
    );
  });

  it("reports a refresh response with no access token", async () => {
    storage.multiGet.mockResolvedValueOnce([
      [TOKEN_KEY, null],
      [REFRESH_TOKEN_KEY, "old-refresh"],
      [USER_KEY, null],
      ["@customer/auth-token", null],
      ["@customer/user", null],
    ]);
    const axiosClient = {
      post: jest.fn().mockResolvedValue({ data: { refreshToken: "next" } }),
    };
    await expect(
      actualSessionManager.tryRefreshSessionWithAxios(axiosClient),
    ).resolves.toMatchObject({
      ok: false,
      reason: "MISSING_ACCESS_TOKEN",
    });
  });

  it("clears storage and dispatches the supplied action, even after clear failure", async () => {
    const dispatch = jest.fn();
    const action = jest.fn(() => ({ type: "auth/clear" }));
    await clearSessionWithReason("logout", dispatch, action);
    expect(dispatch).toHaveBeenCalledWith({ type: "auth/clear" });

    storage.multiRemove.mockRejectedValueOnce(new Error("locked"));
    await expect(
      clearSessionWithReason("expired", dispatch, action),
    ).resolves.toBeUndefined();
    expect(dispatch).toHaveBeenCalledTimes(2);
  });
});

describe("useAuthBootstrap", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await storage.clear();
  });

  afterEach(async () => {
    await cleanup();
  });

  it("restores a valid stored session and marks bootstrap hydrated", async () => {
    await saveSession(jwt({ exp: Math.floor(Date.now() / 1000) + 3600 }), "r", {
      id: "1",
    });
    await render(<BootstrapProbe />);

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: "auth/setSession" }),
      ),
    );
    expect(mockDispatch).toHaveBeenCalledWith(setHydrated(true));
  });

  it("keeps an expired token when no refresh token exists", async () => {
    await saveSession(jwt({ exp: 1 }), undefined, { id: "2" });
    await render(<BootstrapProbe />);

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: "auth/setSession" }),
      ),
    );
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("refreshes an expired session and dispatches fresh credentials", async () => {
    await saveSession(jwt({ exp: 1 }), "old-refresh", { id: "3" });
    mockRefresh.mockResolvedValue({
      ok: true,
      token: "fresh-token",
      refreshToken: "fresh-refresh",
      user: { id: "3" },
    });
    await render(<BootstrapProbe />);

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(
        setSession({
          token: "fresh-token",
          refreshToken: "fresh-refresh",
          user: { id: "3" },
        }),
      ),
    );
  });

  it("falls back to the stored token after a transient refresh failure", async () => {
    const expired = jwt({ exp: 1 });
    await saveSession(expired, "old-refresh", { id: "4" });
    mockRefresh.mockRejectedValue(new Error("offline"));
    await render(<BootstrapProbe />);

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(
        setSession({
          token: expired,
          refreshToken: "old-refresh",
          user: { id: "4" },
        }),
      ),
    );
    expect(mockDispatch).toHaveBeenCalledWith(setHydrated(true));
  });

  it("handles empty and corrupted sessions without authenticating", async () => {
    storage.multiGet.mockRejectedValueOnce(new Error("corrupted"));
    await render(<BootstrapProbe />);

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(setHydrated(true)),
    );
    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "auth/setSession" }),
    );
  });

  it("hydrates without a session when refresh returns a handled failure", async () => {
    await saveSession("", "refresh-only");
    storage.multiGet.mockResolvedValueOnce([
      [TOKEN_KEY, null],
      [REFRESH_TOKEN_KEY, "refresh-only"],
      [USER_KEY, null],
      ["@customer/auth-token", null],
      ["@customer/user", null],
    ]);
    mockRefresh.mockResolvedValue({ ok: false, reason: "MISSING_ACCESS_TOKEN" });
    await render(<BootstrapProbe />);

    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    expect(mockDispatch).toHaveBeenCalledWith(setHydrated(true));
    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "auth/setSession" }),
    );
  });

  it("hydrates after refresh throws when there is no fallback access token", async () => {
    storage.multiGet.mockResolvedValueOnce([
      [TOKEN_KEY, null],
      [REFRESH_TOKEN_KEY, "refresh-only"],
      [USER_KEY, null],
      ["@customer/auth-token", null],
      ["@customer/user", null],
    ]);
    mockRefresh.mockRejectedValue(new Error("offline"));
    await render(<BootstrapProbe />);

    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    expect(mockDispatch).toHaveBeenCalledWith(setHydrated(true));
  });
});
