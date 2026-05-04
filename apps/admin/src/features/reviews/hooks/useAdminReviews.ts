import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  approveAdminReview,
  getAdminReviewById,
  getAdminReviews,
  getAdminReviewsStats,
  getReportedAdminReviews,
  hideAdminReview,
  rejectAdminReview,
} from "../api/reviewsApi";
import type { AdminReviewsQueryParams } from "../types";

export function useAdminReviewsQuery(params: AdminReviewsQueryParams) {
  return useQuery({
    queryKey: ["admin-reviews", params],
    queryFn: () => getAdminReviews(params),
    placeholderData: (previous) => previous,
    retry: false,
  });
}

export function useReportedAdminReviewsQuery(params: { page: number; size: number }) {
  return useQuery({
    queryKey: ["admin-reported-reviews", params],
    queryFn: () => getReportedAdminReviews(params),
    placeholderData: (previous) => previous,
    retry: false,
  });
}

export function useAdminReviewDetailsQuery(id: string | undefined) {
  return useQuery({
    queryKey: ["admin-review-details", id],
    queryFn: () => getAdminReviewById(id ?? ""),
    enabled: Boolean(id),
    retry: false,
  });
}

export function useAdminReviewStatsQuery() {
  return useQuery({
    queryKey: ["admin-review-stats"],
    queryFn: getAdminReviewsStats,
    retry: false,
  });
}

export function useAdminReviewMutations() {
  const queryClient = useQueryClient();

  const invalidateAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-reported-reviews"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-review-stats"] });
  };

  return {
    approveMutation: useMutation({
      mutationFn: (id: string) => approveAdminReview(id),
      onSuccess: invalidateAll,
    }),
    rejectMutation: useMutation({
      mutationFn: (id: string) => rejectAdminReview(id),
      onSuccess: invalidateAll,
    }),
    hideMutation: useMutation({
      mutationFn: (id: string) => hideAdminReview(id),
      onSuccess: invalidateAll,
    }),
  };
}
