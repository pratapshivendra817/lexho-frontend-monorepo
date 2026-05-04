import { useQuery } from "@tanstack/react-query";

import { fetchChineseCategoryMenu } from "../api/homeapi";

export function useChineseCategoryMenu(categoryId) {
  return useQuery({
    queryKey: ["chinese-category-menu", categoryId],
    queryFn: () => fetchChineseCategoryMenu(categoryId),
    enabled: Boolean(categoryId),
  });
}
