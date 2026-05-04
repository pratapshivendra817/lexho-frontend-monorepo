import { useQuery } from "@tanstack/react-query";

import {
  fetchCleaningCategories,
  fetchCookCategories,
} from "../api/homeapi";

const QUERY_MAP = {
  cook: {
    key: ["cook-categories"],
    fetcher: fetchCookCategories,
  },
  cleaning: {
    key: ["cleaning-categories"],
    fetcher: fetchCleaningCategories,
  },
};

export function useServiceCategories(type) {
  const config = QUERY_MAP[type];

  return useQuery({
    queryKey: config.key,
    queryFn: config.fetcher,
  });
}
