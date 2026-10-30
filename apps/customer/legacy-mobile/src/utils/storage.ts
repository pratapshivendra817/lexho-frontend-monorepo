import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEVICE_ID_KEY, REFRESH_TOKEN_KEY, TOKEN_KEY, USER_KEY } from "../constants/env";

const LEGACY_TOKEN_KEY = "@customer/auth-token";
const LEGACY_USER_KEY = "@customer/user";
const PENDING_PAYMENT_BOOKING_KEY = "@lexho/customer/pending-payment-booking-id";
const PENDING_REFERRAL_CODE_KEY = "@lexho/customer/pending-referral-code";
let fallbackDeviceIdSequence = 0;

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
  // Backward compatibility for modules still checking legacy key names.
  await AsyncStorage.setItem(LEGACY_TOKEN_KEY, token);
  if (refreshToken) {
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } else if (typeof AsyncStorage?.removeItem === "function") {
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
  }
  if (user) {
    const userJson = JSON.stringify(user);
    await AsyncStorage.setItem(USER_KEY, userJson);
    await AsyncStorage.setItem(LEGACY_USER_KEY, userJson);
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
  if (typeof AsyncStorage?.getItem !== "function") {
    return null;
  }
  return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
}

export async function getOrCreateDeviceId() {
  if (typeof AsyncStorage?.getItem !== "function" || typeof AsyncStorage?.setItem !== "function") {
    return `customer-${Date.now()}`;
  }

  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing && existing.trim().length > 0) {
    return existing;
  }

  const cryptoApi = (globalThis as typeof globalThis & { crypto?: unknown }).crypto as
    | { randomUUID?: () => string; getRandomValues?: (values: Uint8Array) => Uint8Array }
    | undefined;
  let suffix: string;
  if (typeof cryptoApi?.randomUUID === "function") {
    suffix = cryptoApi.randomUUID();
  } else if (typeof cryptoApi?.getRandomValues === "function") {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(8));
    suffix = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  } else {
    fallbackDeviceIdSequence += 1;
    suffix = `${Date.now()}-${fallbackDeviceIdSequence}`;
  }

  const created = `customer-${suffix}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, created);
  return created;
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

    return { token: tokenValue, refreshToken: refreshValue, user };
  } catch {
    return { token: null, refreshToken: null, user: null };
  }
}

export async function getToken() {
  if (typeof AsyncStorage?.getItem !== "function") {
    return null;
  }
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) {
    return token;
  }
  return await AsyncStorage.getItem(LEGACY_TOKEN_KEY);
}

export async function savePendingPaymentBookingId(bookingId?: string | number | null) {
  const normalized = String(bookingId ?? "").trim();
  if (!normalized || typeof AsyncStorage?.setItem !== "function") return;
  await AsyncStorage.setItem(PENDING_PAYMENT_BOOKING_KEY, normalized);
}

export async function getPendingPaymentBookingId() {
  if (typeof AsyncStorage?.getItem !== "function") return null;
  const value = await AsyncStorage.getItem(PENDING_PAYMENT_BOOKING_KEY);
  return String(value ?? "").trim() || null;
}

export async function clearPendingPaymentBookingId() {
  if (typeof AsyncStorage?.removeItem !== "function") return;
  await AsyncStorage.removeItem(PENDING_PAYMENT_BOOKING_KEY);
}

function normalizeReferralCode(value?: string | null) {
  return String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
}

export async function savePendingReferralCode(code?: string | null) {
  const normalized = normalizeReferralCode(code);
  if (!normalized || typeof AsyncStorage?.setItem !== "function") return;
  await AsyncStorage.setItem(PENDING_REFERRAL_CODE_KEY, normalized);
}

export async function getPendingReferralCode() {
  if (typeof AsyncStorage?.getItem !== "function") return null;
  const value = await AsyncStorage.getItem(PENDING_REFERRAL_CODE_KEY);
  return normalizeReferralCode(value) || null;
}

export async function clearPendingReferralCode() {
  if (typeof AsyncStorage?.removeItem !== "function") return;
  await AsyncStorage.removeItem(PENDING_REFERRAL_CODE_KEY);
}
