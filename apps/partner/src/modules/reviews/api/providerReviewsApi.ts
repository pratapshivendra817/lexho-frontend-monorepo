import axios from "axios";

import type { ProviderReview, ProviderReviewsResponse } from "../types";

type UnknownRecord = Record<string, unknown>;

const partnerApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8082",
});

partnerApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("partner_access_token") ?? localStorage.getItem("access_token");
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
  const keys = ["content", "data", "items", "reviews", "results"];
  for (const key of keys) {
    const value = root[key];
    if (Array.isArray(value)) return value as UnknownRecord[];
  }
  const nested = asRecord(root.data);
  if (Array.isArray(nested.content)) return nested.content as UnknownRecord[];
  return [];
};

const toReview = (row: UnknownRecord): ProviderReview => ({
  id: asString(row.id ?? row.reviewId),
  customerName: asString(row.customerName ?? row.userName ?? row.customer),
  serviceName: asString(row.serviceName ?? row.service),
  rating: asNumber(row.rating),
  comment: asString(row.comment ?? row.reviewComment),
  createdAt: asString(row.createdAt) || undefined,
});

export async function getProviderReviews(page: number, size: number): Promise<ProviderReviewsResponse> {
  const { data } = await partnerApi.get("/api/provider/reviews", {
    params: { page, size },
  });
  const content = readArray(data).map(toReview);
  const root = asRecord(data);
  const nested = asRecord(root.data);
  const source = Object.keys(nested).length > 0 ? nested : root;

  return {
    content,
    totalElements: asNumber(source.totalElements ?? source.total, content.length),
    totalPages: asNumber(source.totalPages, Math.max(1, Math.ceil(content.length / size || 1))),
    pageNumber: asNumber(source.pageNumber ?? source.page, page),
  };
}
