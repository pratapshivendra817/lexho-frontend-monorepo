import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEVICE_ID_KEY, REFRESH_TOKEN_KEY, TOKEN_KEY, USER_KEY } from "../constants/env";

const LEGACY_TOKEN_KEY = "@customer/auth-token";
const LEGACY_USER_KEY = "@customer/user";

function mask(value?: string | null) {
  const text = String(value ?? "").trim();
  if (!text) return "<empty>";
  if (text.length <= 12) return `${text.slice(0, 3)}...${text.slice(-2)}`;
  return `${text.slice(0, 6)}...${text.slice(-6)}`;
}

function debugLog(event: string, payload: Record<string, unknown>) {
  if (!__DEV__) return;
  // eslint-disable-next-line no-console
  console.log(`[auth:storage:${event}]`, payload);
}

export type SessionUser = {
  id: string;
  name?: string;
  mobile?: string;
  email?: string;
  avatar?: string;
};

export async function saveSession(token: string, refreshToken?: string, user?: SessionUser | null) {
  if (typeof AsyncStorage?.setItem !== "function") {
    debugLog("save:skip", { reason: "AsyncStorage.setItem unavailable" });
    return;
  }
  debugLog("save:start", {
    token: mask(token),
    refreshToken: mask(refreshToken ?? null),
    hasUser: !!user,
  });
  await AsyncStorage.setItem(TOKEN_KEY, token);
  // Backward compatibility for modules still checking legacy key names.
  await AsyncStorage.setItem(LEGACY_TOKEN_KEY, token);
  if (refreshToken) await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  if (user) {
    const userJson = JSON.stringify(user);
    await AsyncStorage.setItem(USER_KEY, userJson);
    await AsyncStorage.setItem(LEGACY_USER_KEY, userJson);
  }
  const check = await AsyncStorage.multiGet([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
  debugLog("save:done", {
    storedToken: mask(check?.[0]?.[1] ?? null),
    storedRefreshToken: mask(check?.[1]?.[1] ?? null),
    hasStoredUser: !!check?.[2]?.[1],
  });
}

export async function clearSession() {
  debugLog("clear:start", {
    keys: [TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY, LEGACY_TOKEN_KEY, LEGACY_USER_KEY],
  });
  if (typeof AsyncStorage?.multiRemove === "function") {
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY, LEGACY_TOKEN_KEY, LEGACY_USER_KEY]);
    debugLog("clear:done", { mode: "multiRemove" });
    return;
  }
  if (typeof AsyncStorage?.removeItem === "function") {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
    await AsyncStorage.removeItem(LEGACY_TOKEN_KEY);
    await AsyncStorage.removeItem(LEGACY_USER_KEY);
    debugLog("clear:done", { mode: "removeItem" });
  }
}

export async function getRefreshToken() {
  if (typeof AsyncStorage?.getItem !== "function") {
    debugLog("getRefreshToken:skip", { reason: "AsyncStorage.getItem unavailable" });
    return null;
  }
  const value = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  debugLog("getRefreshToken:done", { refreshToken: mask(value) });
  return value;
}

export async function getOrCreateDeviceId() {
  if (typeof AsyncStorage?.getItem !== "function" || typeof AsyncStorage?.setItem !== "function") {
    return `customer-${Date.now()}`;
  }

  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing && existing.trim().length > 0) {
    return existing;
  }

  const created = `customer-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}

export async function loadSession() {
  try {
    if (!AsyncStorage) {
      debugLog("load:skip", { reason: "AsyncStorage unavailable" });
      return { token: null, refreshToken: null, user: null };
    }

    let tokenValue: string | null = null;
    let refreshValue: string | null = null;
    let userRaw: string | null = null;

    if (typeof AsyncStorage.multiGet === "function") {
      const result = await AsyncStorage.multiGet([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY, LEGACY_TOKEN_KEY, LEGACY_USER_KEY]);
      const token = Array.isArray(result) ? result[0] : null;
      const refreshToken = Array.isArray(result) ? result[1] : null;
      const userJson = Array.isArray(result) ? result[2] : null;
      const legacyToken = Array.isArray(result) ? result[3] : null;
      const legacyUserJson = Array.isArray(result) ? result[4] : null;
      tokenValue = token?.[1] ?? null;
      refreshValue = refreshToken?.[1] ?? null;
      userRaw = userJson?.[1] ?? null;
      if (!tokenValue) tokenValue = legacyToken?.[1] ?? null;
      if (!userRaw) userRaw = legacyUserJson?.[1] ?? null;
    } else if (typeof AsyncStorage.getItem === "function") {
      tokenValue = await AsyncStorage.getItem(TOKEN_KEY);
      refreshValue = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      userRaw = await AsyncStorage.getItem(USER_KEY);
      if (!tokenValue) tokenValue = await AsyncStorage.getItem(LEGACY_TOKEN_KEY);
      if (!userRaw) userRaw = await AsyncStorage.getItem(LEGACY_USER_KEY);
    }

    let user: SessionUser | null = null;
    if (userRaw) {
      try {
        user = JSON.parse(userRaw) as SessionUser;
      } catch {
        user = null;
      }
    }

    const result = { token: tokenValue, refreshToken: refreshValue, user };
    debugLog("load:done", {
      token: mask(result.token),
      refreshToken: mask(result.refreshToken),
      hasUser: !!result.user,
    });
    return result;
  } catch {
    debugLog("load:error", { message: "loadSession failed" });
    return { token: null, refreshToken: null, user: null };
  }
}

export async function getToken() {
  if (typeof AsyncStorage?.getItem !== "function") {
    debugLog("getToken:skip", { reason: "AsyncStorage.getItem unavailable" });
    return null;
  }
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  debugLog("getToken:done", { token: mask(token) });
  return token;
}
