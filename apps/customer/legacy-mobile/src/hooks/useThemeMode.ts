import { useCallback, useEffect, useState } from "react";
import { useColorScheme } from "react-native";

import { getThemeMode, saveThemeMode } from "../services/storage";

const STORAGE_TIMEOUT_MS = 2500;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race<T>([
      promise,
      new Promise<T>((resolve) => {
        timeoutId = setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export function useThemeMode() {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<"light" | "dark">(systemScheme === "dark" ? "dark" : "light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const saved = await withTimeout(getThemeMode(), STORAGE_TIMEOUT_MS, null);
        if (!mounted) return;
        if (saved) {
          setMode(saved);
        }
      } finally {
        if (mounted) {
          setReady(true);
        }
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const toggleMode = useCallback(async () => {
    const next = mode === "dark" ? "light" : "dark";
    setMode(next);
    await saveThemeMode(next);
  }, [mode]);

  return { mode, ready, toggleMode };
}
