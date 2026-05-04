import { useQuery } from "@tanstack/react-query";

import { fetchNonVegCuisineMenu } from "../api/homeapi";

export function useNonVegCuisineMenu(cuisineId) {
  return useQuery({
    queryKey: ["non-veg-cuisine-menu", cuisineId],
    queryFn: () => fetchNonVegCuisineMenu(cuisineId),
    enabled: Boolean(cuisineId),
  });
}
