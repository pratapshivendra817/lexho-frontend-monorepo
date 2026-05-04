import { useQuery } from "@tanstack/react-query";

import { fetchChineseMenuCategories } from "../api/homeapi";

export function useChineseMenuCategories() {
  return useQuery({
    queryKey: ["chinese-menu-categories"],
    queryFn: fetchChineseMenuCategories,
  });
}
