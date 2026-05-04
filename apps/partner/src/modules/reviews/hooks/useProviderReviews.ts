import { useQuery } from "@tanstack/react-query";

import { getProviderReviews } from "../api/providerReviewsApi";

export function useProviderReviewsQuery(page: number, size: number) {
  return useQuery({
    queryKey: ["provider-reviews", { page, size }],
    queryFn: () => getProviderReviews(page, size),
    placeholderData: (previous) => previous,
    retry: false,
  });
}
