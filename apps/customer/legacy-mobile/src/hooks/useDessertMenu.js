import { useQuery } from "@tanstack/react-query";

import { fetchDessertMenu } from "../api/homeapi";

export function useDessertMenu() {
  return useQuery({
    queryKey: ["dessert-menu"],
    queryFn: fetchDessertMenu,
  });
}
