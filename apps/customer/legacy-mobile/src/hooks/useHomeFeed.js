import { useQuery } from "@tanstack/react-query";

import { fetchHomeFeed } from "../api/homeapi";

export function useHomeFeed() {
  return useQuery({
    queryKey: ["home-feed"],
    queryFn: fetchHomeFeed,
  });
}


