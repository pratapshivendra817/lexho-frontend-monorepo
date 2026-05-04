import { useQuery } from "@tanstack/react-query";

import { fetchCookPackages } from "../api/homeapi";

export function useCookPackages(categoryId) {
  return useQuery({
    queryKey: ["cook-packages", categoryId],
    queryFn: () => fetchCookPackages(categoryId),
    enabled: Boolean(categoryId),
  });
}
