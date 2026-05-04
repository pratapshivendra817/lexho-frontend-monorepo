import AsyncStorage from "@react-native-async-storage/async-storage";

import type { CartItem } from "../types/api";
import {
  AUTH_TOKEN_STORAGE_KEY,
  CART_STORAGE_KEY,
  THEME_MODE_STORAGE_KEY,
  USER_STORAGE_KEY,
} from "../utils/constants";

export type StoredUser = {
  id: string;
  mobile: string;
  name?: string;
};

const normalizeStorageString = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value);
  return normalized.length ? normalized : null;
};

const isValidStorageKey = (key: unknown): key is string => {
  return typeof key === "string" && key.trim().length > 0;
};

const safeSetItem = async (key: unknown, value: unknown): Promise<void> => {
  if (!isValidStorageKey(key)) return;
  const normalizedValue = normalizeStorageString(value);
  if (normalizedValue === null) return;
  await AsyncStorage.setItem(key, normalizedValue);
};

const safeRemoveItem = async (key: unknown): Promise<void> => {
  if (!isValidStorageKey(key)) return;
  await AsyncStorage.removeItem(key);
};

const safeMultiRemove = async (keys: unknown[]): Promise<void> => {
  const validKeys = keys.filter(isValidStorageKey);
  if (!validKeys.length) return;
  await AsyncStorage.multiRemove(validKeys);
};

export async function saveAuthSession(token: string | null | undefined, user: StoredUser | null | undefined) {
  const normalizedToken = normalizeStorageString(token);
  if (!normalizedToken) {
    await clearAuthSession();
    return;
  }

  await safeSetItem(AUTH_TOKEN_STORAGE_KEY, normalizedToken);

  if (user) {
    await safeSetItem(USER_STORAGE_KEY, JSON.stringify(user));
    return;
  }

  await safeRemoveItem(USER_STORAGE_KEY);
}

export async function clearAuthSession() {
  await safeMultiRemove([AUTH_TOKEN_STORAGE_KEY, USER_STORAGE_KEY]);
}

export async function getStoredAuthSession() {
  if (!isValidStorageKey(AUTH_TOKEN_STORAGE_KEY) || !isValidStorageKey(USER_STORAGE_KEY)) {
    return { token: "", user: null };
  }

  const [[, token], [, userRaw]] = await AsyncStorage.multiGet([AUTH_TOKEN_STORAGE_KEY, USER_STORAGE_KEY]);
  let parsedUser: StoredUser | null = null;

  if (userRaw) {
    try {
      parsedUser = JSON.parse(userRaw) as StoredUser;
    } catch {
      await safeRemoveItem(USER_STORAGE_KEY);
    }
  }

  return {
    token: token ?? "",
    user: parsedUser,
  };
}

export async function saveThemeMode(mode: "light" | "dark") {
  await safeSetItem(THEME_MODE_STORAGE_KEY, mode);
}

export async function getThemeMode(): Promise<"light" | "dark" | null> {
  if (!isValidStorageKey(THEME_MODE_STORAGE_KEY)) {
    return null;
  }
  const mode = await AsyncStorage.getItem(THEME_MODE_STORAGE_KEY);
  return mode === "light" || mode === "dark" ? mode : null;
}

export async function saveCartSnapshot(items: CartItem[] = []) {
  const safeItems = Array.isArray(items) ? items : [];
  await safeSetItem(CART_STORAGE_KEY, JSON.stringify(safeItems));
}

export async function getCartSnapshot(): Promise<CartItem[]> {
  if (!isValidStorageKey(CART_STORAGE_KEY)) {
    return [];
  }
  const raw = await AsyncStorage.getItem(CART_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
