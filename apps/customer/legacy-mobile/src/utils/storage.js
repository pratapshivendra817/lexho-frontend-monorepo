import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'token';
const SESSION_KEY = 'session';
const DEFAULT_ROLE = 'CUSTOMER';

const normalizeStorageString = value => {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value);
  return normalized.length ? normalized : null;
};

const isValidStorageKey = key => typeof key === 'string' && key.trim().length > 0;

const safeSetItem = async (key, value) => {
  if (!isValidStorageKey(key)) return;
  const normalizedValue = normalizeStorageString(value);
  if (!normalizedValue) return;
  await AsyncStorage.setItem(key, normalizedValue);
};

const safeRemoveItem = async key => {
  if (!isValidStorageKey(key)) return;
  await AsyncStorage.removeItem(key);
};

const safeMultiRemove = async keys => {
  const validKeys = (keys || []).filter(isValidStorageKey);
  if (!validKeys.length) return;
  await AsyncStorage.multiRemove(validKeys);
};

export const saveToken = async (token) => {
  const normalizedToken = normalizeStorageString(token);
  if (!normalizedToken) {
    await safeRemoveItem(TOKEN_KEY);
    return;
  }

  await safeSetItem(TOKEN_KEY, normalizedToken);
};

export const getToken = async () => {
  if (!isValidStorageKey(TOKEN_KEY)) {
    return null;
  }
  return await AsyncStorage.getItem(TOKEN_KEY);
};

export const removeToken = async () => {
  await safeRemoveItem(TOKEN_KEY);
};

const extractUser = (payload = {}) => {
  return (
    payload.user ||
    payload.customer ||
    payload.profile ||
    payload.result?.user ||
    payload.result?.customer ||
    payload.result?.profile ||
    payload.data?.user ||
    payload.data?.customer ||
    payload.data?.profile ||
    null
  );
};

export const extractToken = (payload = {}) => {
  return (
    payload.token ||
    payload.accessToken ||
    payload.authToken ||
    payload.jwt ||
    payload.jwtToken ||
    payload.result?.token ||
    payload.result?.accessToken ||
    payload.data?.token ||
    payload.data?.accessToken ||
    null
  );
};

export const extractUserId = (payload = {}) => {
  const user = extractUser(payload);

  return (
    user?.id ||
    user?.userId ||
    user?._id ||
    user?.user_id ||
    user?.customerId ||
    user?.customer_id ||
    payload.id ||
    payload._id ||
    payload.userId ||
    payload.user_id ||
    payload.customerId ||
    payload.customer_id ||
    payload.result?.id ||
    payload.result?._id ||
    payload.result?.userId ||
    payload.result?.user_id ||
    payload.result?.customerId ||
    payload.result?.customer_id ||
    payload.data?.userId ||
    payload.data?.user_id ||
    payload.data?.customerId ||
    payload.data?.customer_id ||
    payload.data?.id ||
    payload.data?._id ||
    null
  );
};

const normalizeRole = (role) => {
  const value = String(role || DEFAULT_ROLE).toUpperCase();
  if (value === 'ADMIN') return 'ADMIN';
  if (value === 'PARTNER') return 'PARTNER';
  return 'CUSTOMER';
};

export const extractRole = (payload = {}) => {
  const user = extractUser(payload);
  return normalizeRole(
    payload.role ||
      payload.userRole ||
      payload.accountType ||
      payload.result?.role ||
      payload.result?.userRole ||
      payload.data?.role ||
      payload.data?.userRole ||
      user?.role ||
      user?.userRole ||
      user?.accountType
  );
};

export const saveSession = async (payload = {}) => {
  const token = normalizeStorageString(extractToken(payload));
  const user = extractUser(payload);
  const userId = extractUserId(payload);
  const role = extractRole(payload);

  if (!token) {
    return null;
  }

  const session = {
    token,
    role,
    user,
    userId,
  };

  const pairs = [
    [TOKEN_KEY, token],
    [SESSION_KEY, JSON.stringify(session)],
  ].filter(([key, value]) => isValidStorageKey(key) && normalizeStorageString(value));
  if (pairs.length) {
    await AsyncStorage.multiSet(pairs);
  }

  return session;
};

export const getSession = async () => {
  if (!isValidStorageKey(SESSION_KEY)) {
    return null;
  }
  const rawSession = await AsyncStorage.getItem(SESSION_KEY);

  if (!rawSession) {
    const token = await getToken();
    return token ? { token, role: DEFAULT_ROLE, user: null, userId: null } : null;
  }

  try {
    const parsed = JSON.parse(rawSession);
    if (!parsed?.token) {
      return null;
    }
    return {
      token: parsed.token,
      role: normalizeRole(parsed.role),
      user: parsed.user || null,
      userId: parsed.userId || null,
    };
  } catch {
    await safeRemoveItem(SESSION_KEY);
    const token = await getToken();
    return token ? { token, role: DEFAULT_ROLE, user: null, userId: null } : null;
  }
};

export const clearSession = async () => {
  await safeMultiRemove([TOKEN_KEY, SESSION_KEY]);
};
