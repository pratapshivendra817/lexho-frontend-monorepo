import { useQuery } from "@tanstack/react-query";

import { fetchNonVegCuisines } from "../api/homeapi";

export function useNonVegCuisines() {
  return useQuery({
    queryKey: ["non-veg-cuisines"],
    queryFn: fetchNonVegCuisines,
  });
}
