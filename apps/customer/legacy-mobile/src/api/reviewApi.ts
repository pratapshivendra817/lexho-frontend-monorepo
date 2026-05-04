import { api, parseApiError } from "./client";
import type { AddReviewRequest, ReviewDto } from "../types/contracts";

export async function addReview(payload: AddReviewRequest) { try { const { data } = await api.post('/api/reviews/add', payload); return data as ReviewDto; } catch (e) { throw new Error(parseApiError(e, 'Add review failed')); } }
export async function getServiceReviews(id: string): Promise<ReviewDto[]> { try { const { data } = await api.get(`/api/reviews/service/${id}`); return (Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []) as ReviewDto[]; } catch (e) { throw new Error(parseApiError(e, 'Reviews failed')); } }

export async function getReviews(serviceId = "svc-1") {
  return getServiceReviews(serviceId);
}

export async function createReview(payload: Record<string, unknown>) {
  return addReview(payload as AddReviewRequest);
}

export async function updateReview(idOrPayload: string | Record<string, unknown>, maybePayload?: Record<string, unknown>) {
  const payload = typeof idOrPayload === "string" ? { ...(maybePayload ?? {}), id: idOrPayload } : idOrPayload;
  return addReview(payload as AddReviewRequest);
}

export async function deleteReview(idOrPayload: string | Record<string, unknown>) {
  const payload = typeof idOrPayload === "string" ? { id: idOrPayload } : idOrPayload;
  try {
    const { data } = await api.delete("/api/reviews/add", { data: payload });
    return data;
  } catch (e) {
    throw new Error(parseApiError(e, "Delete review failed"));
  }
}

export async function reportReview(idOrPayload: string | Record<string, unknown>) {
  const payload = typeof idOrPayload === "string" ? { id: idOrPayload } : idOrPayload;
  try {
    const { data } = await api.post("/api/reviews/report", payload);
    return data;
  } catch (e) {
    throw new Error(parseApiError(e, "Report review failed"));
  }
}
