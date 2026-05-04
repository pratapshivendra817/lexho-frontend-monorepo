import axios from "axios";

import type { CustomerReview, CustomerReviewPayload } from "../types";

type UnknownRecord = Record<string, unknown>;

const customerApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8082",
});

customerApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("customer_access_token") ?? localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === "object" ? (value as UnknownRecord) : {};

const asString = (value: unknown): string =>
  typeof value === "string" || typeof value === "number" ? String(value) : "";

const asNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const readArray = (payload: unknown): UnknownRecord[] => {
  if (Array.isArray(payload)) return payload as UnknownRecord[];
  const root = asRecord(payload);
  const keys = ["data", "content", "items", "results", "reviews"];
  for (const key of keys) {
    const value = root[key];
    if (Array.isArray(value)) return value as UnknownRecord[];
  }
  const nested = asRecord(root.data);
  if (Array.isArray(nested.content)) return nested.content as UnknownRecord[];
  return [];
};

const toReview = (row: UnknownRecord): CustomerReview => ({
  id: asString(row.id ?? row.reviewId),
  bookingId: asString(row.bookingId ?? row.booking?.id),
  bookingLabel: asString(row.bookingLabel ?? row.serviceName ?? row.booking?.serviceName) || undefined,
  rating: asNumber(row.rating),
  comment: asString(row.comment ?? row.reviewComment),
  images: readArray(row.images).map((item) => asString(item)).filter(Boolean),
  createdAt: asString(row.createdAt) || undefined,
  reportCount: asNumber(row.reportCount ?? row.reports, 0),
});

export async function getCustomerReviews() {
  const { data } = await customerApi.get("/api/customer/reviews");
  return readArray(data).map(toReview);
}

const buildReviewFormData = (payload: CustomerReviewPayload) => {
  const formData = new FormData();
  formData.append("bookingId", payload.bookingId);
  formData.append("rating", String(payload.rating));
  formData.append("comment", payload.comment);
  payload.images.forEach((file) => formData.append("images", file));
  return formData;
};

export async function createCustomerReview(payload: CustomerReviewPayload) {
  const formData = buildReviewFormData(payload);
  await customerApi.post("/api/customer/reviews", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export async function updateCustomerReview(id: string, payload: CustomerReviewPayload) {
  const formData = buildReviewFormData(payload);
  await customerApi.put(`/api/customer/reviews/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export async function deleteCustomerReview(id: string) {
  await customerApi.delete(`/api/customer/reviews/${id}`);
}

export async function reportCustomerReview(id: string, reason: string) {
  await customerApi.post(`/api/customer/reviews/${id}/report`, { reason });
}
