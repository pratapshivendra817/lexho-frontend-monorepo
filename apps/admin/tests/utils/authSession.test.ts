import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearAccessToken,
  clearRefreshToken,
  getAccessToken,
  getOrCreateAdminDeviceId,
  getRefreshToken,
  hasAdminSession,
  hasRequiredRole,
  setAccessToken,
  setRefreshToken,
} from "@/utils/authSession";

type StorageMap = Map<string, string>;

function createStorage() {
  const store: StorageMap = new Map();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, String(value));
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
  };
}

function createToken(payload: unknown) {
  return `header.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.signature`;
}

describe("authSession", () => {
  beforeEach(() => {
    const storage = createStorage();
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("atob", (value: string) => Buffer.from(value, "base64").toString("binary"));
    vi.stubGlobal("crypto", undefined);
    vi.spyOn(Date, "now").mockReturnValue(1700000000000);
  });

  it("reads and writes access and refresh tokens through localStorage", () => {
    expect(getAccessToken()).toBeNull();

    setAccessToken("admin-token");
    expect(getAccessToken()).toBe("admin-token");

    localStorage.removeItem("admin_access_token");
    localStorage.setItem("access_token", "customer-token");
    expect(getAccessToken()).toBeNull();

    setRefreshToken("refresh-token");
    expect(getRefreshToken()).toBe("refresh-token");
    clearRefreshToken();
    expect(getRefreshToken()).toBeNull();
  });

  it("creates or reuses admin device ids across all fallback strategies", () => {
    localStorage.setItem("admin_device_id", "existing-device");
    expect(getOrCreateAdminDeviceId()).toBe("existing-device");

    localStorage.setItem("admin_device_id", "   ");
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn(() => "uuid-1"),
    });
    expect(getOrCreateAdminDeviceId()).toBe("admin-uuid-1");

    localStorage.removeItem("admin_device_id");
    vi.stubGlobal("crypto", {
      getRandomValues: vi.fn((bytes: Uint8Array) => {
        bytes.set([1, 2, 3, 4, 5, 6, 7, 8]);
        return bytes;
      }),
    });
    expect(getOrCreateAdminDeviceId()).toBe("admin-0102030405060708");

    localStorage.removeItem("admin_device_id");
    vi.stubGlobal("crypto", undefined);
    expect(getOrCreateAdminDeviceId()).toBe("admin-1700000000000-1");

    localStorage.removeItem("admin_device_id");
    expect(getOrCreateAdminDeviceId()).toBe("admin-1700000000000-2");
  });

  it("clears access state and reports whether an admin session exists", () => {
    localStorage.setItem("admin_access_token", "admin-token");
    localStorage.setItem("access_token", "customer-token");
    localStorage.setItem("admin_refresh_token", "refresh-token");

    expect(hasAdminSession()).toBe(true);

    clearAccessToken();

    expect(localStorage.getItem("admin_access_token")).toBeNull();
    expect(localStorage.getItem("access_token")).toBe("customer-token");
    expect(localStorage.getItem("admin_refresh_token")).toBeNull();
    expect(hasAdminSession()).toBe(false);
  });

  it("matches required roles from normalized token payloads", () => {
    expect(hasRequiredRole([])).toBe(true);
    expect(hasRequiredRole(["ADMIN"])).toBe(false);

    localStorage.setItem(
      "admin_access_token",
      createToken({
        roles: ["role_admin", "user"],
        authorities: ["ignored"],
      }),
    );
    expect(hasRequiredRole(["ADMIN"])).toBe(true);

    localStorage.setItem(
      "admin_access_token",
      createToken({
        role: "admin",
      }),
    );
    expect(hasRequiredRole(["ADMIN"])).toBe(true);
  });

  it("rejects malformed or roleless tokens", () => {
    localStorage.setItem("admin_access_token", "bad-token");
    expect(hasRequiredRole(["ADMIN"])).toBe(false);

    localStorage.setItem("admin_access_token", createToken({ roles: [123, "user"], authorities: [] }));
    expect(hasRequiredRole(["ADMIN"])).toBe(false);

    vi.stubGlobal("atob", () => {
      throw new Error("decode failure");
    });
    localStorage.setItem("admin_access_token", createToken({ role: "ADMIN" }));
    expect(hasRequiredRole(["ADMIN"])).toBe(false);
  });
});
