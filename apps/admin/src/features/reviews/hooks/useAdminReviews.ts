import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  approveAdminReview,
  dismissAdminReviewReport,
  getAdminReviewById,
  getAdminReviews,
  getAdminReviewsStats,
  getAdminReviewSettings,
  getReportedAdminReviews,
  hideAdminReview,
  hideReviewFromReport,
  rejectAdminReview,
  rejectReviewFromReport,
  unhideAdminReview,
  updateAdminReviewSettings,
} from "../api/reviewsApi";
import type {
  AdminReportedReviewsQueryParams,
  AdminReviewsQueryParams,
  AdminReviewSettings,
} from "../types";

export function useAdminReviewsQuery(params: AdminReviewsQueryParams) {
  return useQuery({
    queryKey: ["admin-reviews", params],
    queryFn: () => getAdminReviews(params),
    placeholderData: (previous) => previous,
    retry: false,
  });
}

export function useReportedAdminReviewsQuery(params: AdminReportedReviewsQueryParams) {
  return useQuery({
    queryKey: ["admin-reported-reviews", params],
    queryFn: () => getReportedAdminReviews(params),
    placeholderData: (previous) => previous,
    retry: false,
  });
}

export function useAdminReviewDetailsQuery(id: string | undefined) {
  return useQuery({
    queryKey: ["admin-review-detail", id],
    queryFn: () => getAdminReviewById(id ?? ""),
    enabled: Boolean(id),
    retry: false,
  });
}

export function useAdminReviewStatsQuery(filters?: {
  startDate?: string;
  endDate?: string;
  serviceId?: string;
  providerId?: string;
}) {
  return useQuery({
    queryKey: ["admin-review-stats", filters],
    queryFn: () => getAdminReviewsStats(filters),
    retry: false,
  });
}

export function useAdminReviewSettingsQuery() {
  return useQuery({
    queryKey: ["admin-review-settings"],
    queryFn: getAdminReviewSettings,
    retry: false,
  });
}

export function useAdminReviewMutations() {
  const queryClient = useQueryClient();

  const invalidateReviewCaches = async (includeSettings = false) => {
    await queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-review-detail"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-reported-reviews"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-review-stats"] });
    if (includeSettings) {
      await queryClient.invalidateQueries({ queryKey: ["admin-review-settings"] });
    }
  };

  return {
    approveMutation: useMutation({
      mutationFn: (payload: { id: string; reason?: string }) => approveAdminReview(payload.id, payload.reason),
      onSuccess: () => invalidateReviewCaches(),
    }),
    rejectMutation: useMutation({
      mutationFn: (payload: { id: string; reason: string }) => rejectAdminReview(payload.id, payload.reason),
      onSuccess: () => invalidateReviewCaches(),
    }),
    hideMutation: useMutation({
      mutationFn: (payload: { id: string; reason: string }) => hideAdminReview(payload.id, payload.reason),
      onSuccess: () => invalidateReviewCaches(),
    }),
    unhideMutation: useMutation({
      mutationFn: (payload: { id: string; reason?: string }) => unhideAdminReview(payload.id, payload.reason),
      onSuccess: () => invalidateReviewCaches(),
    }),
    dismissReportMutation: useMutation({
      mutationFn: (reportId: string) => dismissAdminReviewReport(reportId),
      onSuccess: () => invalidateReviewCaches(),
    }),
    hideFromReportMutation: useMutation({
      mutationFn: (reportId: string) => hideReviewFromReport(reportId),
      onSuccess: () => invalidateReviewCaches(),
    }),
    rejectFromReportMutation: useMutation({
      mutationFn: (reportId: string) => rejectReviewFromReport(reportId),
      onSuccess: () => invalidateReviewCaches(),
    }),
    saveSettingsMutation: useMutation({
      mutationFn: (payload: AdminReviewSettings) => updateAdminReviewSettings(payload),
      onSuccess: () => invalidateReviewCaches(true),
    }),
  };
}
