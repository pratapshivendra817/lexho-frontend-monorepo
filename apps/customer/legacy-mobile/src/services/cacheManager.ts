import AsyncStorage from "@react-native-async-storage/async-storage";

type CacheEntry<T> = {
  value: T;
  cachedAt: number;
};

const PREFIX = "@lexho/customer/cache/";

async function readEntry<T>(key: string): Promise<CacheEntry<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(`${PREFIX}${key}`);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry<T>;
  } catch {
    return null;
  }
}

export const cacheManager = {
  async get<T>(key: string, maxAgeMs?: number): Promise<T | null> {
    const entry = await readEntry<T>(key);
    if (!entry) return null;
    if (maxAgeMs && Date.now() - entry.cachedAt > maxAgeMs) {
      return null;
    }
    return entry.value;
  },

  async set<T>(key: string, value: T) {
    const entry: CacheEntry<T> = {
      value,
      cachedAt: Date.now(),
    };
    await AsyncStorage.setItem(`${PREFIX}${key}`, JSON.stringify(entry));
  },

  async getEntry<T>(key: string) {
    return readEntry<T>(key);
  },

  async remove(key: string) {
    await AsyncStorage.removeItem(`${PREFIX}${key}`);
  },
};
