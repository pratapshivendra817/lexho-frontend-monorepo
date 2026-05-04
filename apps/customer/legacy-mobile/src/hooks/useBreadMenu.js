import { useQuery } from "@tanstack/react-query";

import { fetchBreadMenu } from "../api/homeapi";

export function useBreadMenu() {
  return useQuery({
    queryKey: ["bread-menu"],
    queryFn: fetchBreadMenu,
  });
}
