import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "@lexho/customer/token";
const REFRESH_TOKEN_KEY = "@lexho/customer/refresh-token";
const USER_KEY = "@lexho/customer/user";
const DEVICE_ID_KEY = "@lexho/customer/device-id";
const LEGACY_TOKEN_KEY = "@customer/auth-token";
const LEGACY_USER_KEY = "@customer/user";

const asString = (value) => (typeof value === "string" ? value : value == null ? "" : String(value));

const toUserJson = (user) => {
  try {
    return JSON.stringify(user);
  } catch {
    return "";
  }
};

export async function saveSession(token, refreshToken, user) {
  if (typeof AsyncStorage?.setItem !== "function") return;
  const safeToken = asString(token).trim();
  if (!safeToken) return;
  await AsyncStorage.setItem(TOKEN_KEY, safeToken);
  await AsyncStorage.setItem(LEGACY_TOKEN_KEY, safeToken);
  const safeRefresh = asString(refreshToken).trim();
  if (safeRefresh) await AsyncStorage.setItem(REFRESH_TOKEN_KEY, safeRefresh);
  if (user) {
    const userJson = toUserJson(user);
    if (userJson) {
      await AsyncStorage.setItem(USER_KEY, userJson);
      await AsyncStorage.setItem(LEGACY_USER_KEY, userJson);
    }
  }
}

export async function clearSession() {
  if (typeof AsyncStorage?.multiRemove === "function") {
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY, LEGACY_TOKEN_KEY, LEGACY_USER_KEY]);
    return;
  }
  if (typeof AsyncStorage?.removeItem === "function") {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
    await AsyncStorage.removeItem(LEGACY_TOKEN_KEY);
    await AsyncStorage.removeItem(LEGACY_USER_KEY);
  }
}

export async function getRefreshToken() {
  if (typeof AsyncStorage?.getItem !== "function") return null;
  return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
}

export async function getOrCreateDeviceId() {
  if (typeof AsyncStorage?.getItem !== "function" || typeof AsyncStorage?.setItem !== "function") {
    return `customer-${Date.now()}`;
  }
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing && existing.trim()) return existing;
  const created = `customer-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}

export async function loadSession() {
  try {
    let tokenValue = null;
    let refreshValue = null;
    let userRaw = null;

    if (typeof AsyncStorage?.multiGet === "function") {
      const result = await AsyncStorage.multiGet([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY, LEGACY_TOKEN_KEY, LEGACY_USER_KEY]);
      tokenValue = result?.[0]?.[1] ?? null;
      refreshValue = result?.[1]?.[1] ?? null;
      userRaw = result?.[2]?.[1] ?? null;
      if (!tokenValue) tokenValue = result?.[3]?.[1] ?? null;
      if (!userRaw) userRaw = result?.[4]?.[1] ?? null;
    } else if (typeof AsyncStorage?.getItem === "function") {
      tokenValue = await AsyncStorage.getItem(TOKEN_KEY);
      refreshValue = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      userRaw = await AsyncStorage.getItem(USER_KEY);
      if (!tokenValue) tokenValue = await AsyncStorage.getItem(LEGACY_TOKEN_KEY);
      if (!userRaw) userRaw = await AsyncStorage.getItem(LEGACY_USER_KEY);
    }

    let user = null;
    if (userRaw) {
      try {
        user = JSON.parse(userRaw);
      } catch {
        user = null;
      }
    }
    return { token: tokenValue, refreshToken: refreshValue, user };
  } catch {
    return { token: null, refreshToken: null, user: null };
  }
}

export async function getToken() {
  if (typeof AsyncStorage?.getItem !== "function") return null;
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) return token;
  return AsyncStorage.getItem(LEGACY_TOKEN_KEY);
}

