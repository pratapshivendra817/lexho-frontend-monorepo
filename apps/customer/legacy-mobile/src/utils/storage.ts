import AsyncStorage from "@react-native-async-storage/async-storage";
import { REFRESH_TOKEN_KEY, TOKEN_KEY, USER_KEY } from "../constants/env";

export type SessionUser = {
  id: string;
  name?: string;
  mobile?: string;
  email?: string;
  avatar?: string;
};

export async function saveSession(token: string, refreshToken?: string, user?: SessionUser | null) {
  if (typeof AsyncStorage?.setItem !== "function") {
    return;
  }
  await AsyncStorage.setItem(TOKEN_KEY, token);
  if (refreshToken) await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  if (user) await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function clearSession() {
  if (typeof AsyncStorage?.multiRemove === "function") {
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
    return;
  }
  if (typeof AsyncStorage?.removeItem === "function") {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
  }
}

export async function loadSession() {
  try {
    if (!AsyncStorage) {
      return { token: null, refreshToken: null, user: null };
    }

    let tokenValue: string | null = null;
    let refreshValue: string | null = null;
    let userRaw: string | null = null;

    if (typeof AsyncStorage.multiGet === "function") {
      const result = await AsyncStorage.multiGet([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
      const token = Array.isArray(result) ? result[0] : null;
      const refreshToken = Array.isArray(result) ? result[1] : null;
      const userJson = Array.isArray(result) ? result[2] : null;
      tokenValue = token?.[1] ?? null;
      refreshValue = refreshToken?.[1] ?? null;
      userRaw = userJson?.[1] ?? null;
    } else if (typeof AsyncStorage.getItem === "function") {
      tokenValue = await AsyncStorage.getItem(TOKEN_KEY);
      refreshValue = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      userRaw = await AsyncStorage.getItem(USER_KEY);
    }

    let user: SessionUser | null = null;
    if (userRaw) {
      try {
        user = JSON.parse(userRaw) as SessionUser;
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
  if (typeof AsyncStorage?.getItem !== "function") {
    return null;
  }
  return AsyncStorage.getItem(TOKEN_KEY);
}
