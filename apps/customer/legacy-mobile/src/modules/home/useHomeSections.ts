import { useCallback, useEffect, useState } from "react";
import { getHomeSections } from "./api";
import type { HomeSection } from "./types";

export function useHomeSections() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sections, setSections] = useState<HomeSection[]>([]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await getHomeSections();
      setSections(rows);
    } catch (e: any) {
      setSections([]);
      setError(String(e?.message ?? "Unable to load home sections"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { loading, error, sections, reload };
}
