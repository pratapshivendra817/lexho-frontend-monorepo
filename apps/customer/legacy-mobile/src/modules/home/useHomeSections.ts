import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getHomeSections } from "./api";
import type { HomeSection } from "./types";

const HOME_SECTIONS_CACHE_KEY = "@customer_home_sections_cache_v1";
const HOME_SECTIONS_TIMEOUT_MS = 7000;

async function loadCachedHomeSections(): Promise<HomeSection[]> {
  try {
    const raw = await AsyncStorage.getItem(HOME_SECTIONS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HomeSection[]) : [];
  } catch {
    return [];
  }
}

async function saveCachedHomeSections(sections: HomeSection[]) {
  try {
    await AsyncStorage.setItem(HOME_SECTIONS_CACHE_KEY, JSON.stringify(sections));
  } catch {
    // Non-blocking cache write.
  }
}

async function getHomeSectionsWithTimeout() {
  return Promise.race<HomeSection[]>([
    getHomeSections(),
    new Promise<HomeSection[]>((_, reject) =>
      setTimeout(() => reject(new Error("Home sections request timed out")), HOME_SECTIONS_TIMEOUT_MS),
    ),
  ]);
}

export function useHomeSections() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sections, setSections] = useState<HomeSection[]>([]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await getHomeSectionsWithTimeout();
      setSections(rows);
      await saveCachedHomeSections(rows);
    } catch (e: any) {
      const cached = await loadCachedHomeSections();
      if (cached.length > 0) {
        setSections(cached);
        setError("Showing last updated home sections. Live refresh failed.");
      } else {
        setSections([]);
        setError(String(e?.message ?? "Unable to load home sections"));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { loading, error, sections, reload };
}


