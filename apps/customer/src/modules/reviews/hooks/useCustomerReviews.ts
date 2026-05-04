import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createCustomerReview,
  deleteCustomerReview,
  getCustomerReviews,
  reportCustomerReview,
  updateCustomerReview,
} from "../api/reviewsApi";
import type { CustomerReviewPayload } from "../types";

export function useCustomerReviewsQuery() {
  return useQuery({
    queryKey: ["customer-reviews"],
    queryFn: getCustomerReviews,
    retry: false,
  });
}

export function useCustomerReviewMutations() {
  const queryClient = useQueryClient();
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["customer-reviews"] });
  };

  return {
    createReviewMutation: useMutation({
      mutationFn: (payload: CustomerReviewPayload) => createCustomerReview(payload),
      onSuccess: invalidate,
    }),
    updateReviewMutation: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: CustomerReviewPayload }) =>
        updateCustomerReview(id, payload),
      onSuccess: invalidate,
    }),
    deleteReviewMutation: useMutation({
      mutationFn: (id: string) => deleteCustomerReview(id),
      onSuccess: invalidate,
    }),
    reportReviewMutation: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) => reportCustomerReview(id, reason),
      onSuccess: invalidate,
    }),
  };
}
