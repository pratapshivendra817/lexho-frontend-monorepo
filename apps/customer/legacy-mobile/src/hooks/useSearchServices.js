import { useQuery } from "@tanstack/react-query";

import { searchServices } from "../api/homeapi";

export function useSearchServices(query) {
  const normalized = query.trim();

  return useQuery({
    queryKey: ["service-search", normalized],
    queryFn: () => searchServices(normalized),
    enabled: normalized.length > 1,
  });
}
