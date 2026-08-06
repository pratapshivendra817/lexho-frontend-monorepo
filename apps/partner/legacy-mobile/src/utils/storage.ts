import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "admin_jwt_token";
const REFRESH_TOKEN_KEY = "partner_refresh_token";
const PROFILE_KEY = "admin_profile";
const DEVICE_ID_KEY = "partner_device_id";
const PROVIDER_ID_KEY = "partner_provider_id";
let fallbackDeviceIdSequence = 0;

export type StoredAdminProfile = {
  email: string;
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

export const saveToken = async (token: unknown): Promise<void> => {
  const normalizedToken = normalizeStorageString(token);
  if (!normalizedToken) {
    await safeRemoveItem(TOKEN_KEY);
    return;
  }

  await safeSetItem(TOKEN_KEY, normalizedToken);
};

export const saveRefreshToken = async (token: unknown): Promise<void> => {
  const normalized = normalizeStorageString(token);
  if (!normalized) {
    await safeRemoveItem(REFRESH_TOKEN_KEY);
    return;
  }
  await safeSetItem(REFRESH_TOKEN_KEY, normalized);
};

export const getToken = async (): Promise<string | null> => {
  if (!isValidStorageKey(TOKEN_KEY)) {
    return null;
  }
  return AsyncStorage.getItem(TOKEN_KEY);
};

export const getRefreshToken = async (): Promise<string | null> => {
  if (!isValidStorageKey(REFRESH_TOKEN_KEY)) {
    return null;
  }
  return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
};

export const getOrCreateDeviceId = async (): Promise<string> => {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing && existing.trim().length > 0) {
    return existing;
  }
  const cryptoApi = globalThis.crypto as
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
  const created = `partner-${suffix}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, created);
  return created;
};

export const saveAdminProfile = async (profile: StoredAdminProfile | null | undefined): Promise<void> => {
  if (!profile) {
    await safeRemoveItem(PROFILE_KEY);
    return;
  }

  await safeSetItem(PROFILE_KEY, JSON.stringify(profile));
};

export const getAdminProfile = async (): Promise<StoredAdminProfile | null> => {
  if (!isValidStorageKey(PROFILE_KEY)) {
    return null;
  }
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredAdminProfile;
  } catch {
    await safeRemoveItem(PROFILE_KEY);
    return null;
  }
};

export const clearSession = async (): Promise<void> => {
  await safeMultiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, PROFILE_KEY, PROVIDER_ID_KEY]);
};

export const savePartnerProviderId = async (providerId: string | number | null | undefined): Promise<void> => {
  const normalized = normalizeStorageString(providerId);
  if (!normalized) {
    await safeRemoveItem(PROVIDER_ID_KEY);
    return;
  }
  await safeSetItem(PROVIDER_ID_KEY, normalized);
};

export const getPartnerProviderId = async (): Promise<string | null> => {
  if (!isValidStorageKey(PROVIDER_ID_KEY)) {
    return null;
  }
  return AsyncStorage.getItem(PROVIDER_ID_KEY);
};

export const extractJwtToken = (payload: Record<string, any> = {}): string | null => {
  const token =
    payload.token ||
    payload.accessToken ||
    payload.jwt ||
    payload.jwtToken ||
    payload.authToken ||
    payload.result?.token ||
    payload.result?.accessToken ||
    payload.result?.jwt ||
    payload.data?.token ||
    payload.data?.accessToken ||
    payload.data?.jwt ||
    null;

  return token ? String(token) : null;
};
