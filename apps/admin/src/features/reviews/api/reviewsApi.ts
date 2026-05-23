import { api } from "@/api/axios";

import type {
  AdminReview,
  AdminReviewsListResponse,
  AdminReviewsQueryParams,
  AdminReviewsStats,
} from "../types";

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === "object" ? (value as UnknownRecord) : {};

const asString = (value: unknown): string =>
  typeof value === "string" || typeof value === "number" ? String(value) : "";

const asNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const readArray = (payload: unknown, keys: string[]): UnknownRecord[] => {
  if (Array.isArray(payload)) {
    return payload as UnknownRecord[];
  }
  const root = asRecord(payload);
  for (const key of keys) {
    const candidate = root[key];
    if (Array.isArray(candidate)) {
      return candidate as UnknownRecord[];
    }
  }
  const nested = asRecord(root.data);
  for (const key of keys) {
    const candidate = nested[key];
    if (Array.isArray(candidate)) {
      return candidate as UnknownRecord[];
    }
  }
  return [];
};

const normalizeStatus = (value: unknown): AdminReview["status"] => {
  const status = asString(value).toUpperCase();
  if (status === "APPROVED") return "APPROVED";
  if (status === "REJECTED") return "REJECTED";
  if (status === "HIDDEN") return "HIDDEN";
  return "PENDING";
};

const toReview = (row: UnknownRecord): AdminReview => ({
  id: asString(row.id ?? row.reviewId),
  customerName: asString(row.customerName ?? row.userName ?? row.customer),
  partnerName: asString(row.partnerName ?? row.partner),
  serviceName: asString(row.serviceName ?? row.service),
  rating: asNumber(row.rating),
  comment: asString(row.comment ?? row.reviewComment),
  images: readArray(row.images, ["images", "media", "attachments"]).map((item) => asString(item)).filter(Boolean),
  status: normalizeStatus(row.status),
  reportCount: asNumber(row.reportCount ?? row.reports ?? row.flagCount),
  reportReason: asString(row.reportReason ?? row.reason) || undefined,
  createdAt: asString(row.createdAt ?? row.created_on) || undefined,
});

const readPagination = (payload: unknown, size: number, page: number) => {
  const root = asRecord(payload);
  const nested = asRecord(root.data);
  const source = Object.keys(nested).length > 0 ? nested : root;

  const totalElements = asNumber(source.totalElements ?? source.total, 0);
  const totalPages = asNumber(source.totalPages, Math.max(1, Math.ceil(totalElements / size || 1)));
  const pageNumber = asNumber(source.pageNumber ?? source.page, page);

  return { totalElements, totalPages, pageNumber };
};

export async function getAdminReviews(params: AdminReviewsQueryParams): Promise<AdminReviewsListResponse> {
  const query = {
    page: params.page,
    size: params.size,
    rating: params.rating,
    status: params.status || undefined,
    partner: params.partner || undefined,
    service: params.service || undefined,
    search: params.search || undefined,
  };
  const { data } = await api.get("/api/admin/reviews", { params: query });
  const content = readArray(data, ["content", "data", "items", "reviews", "results"]).map(toReview);
  const meta = readPagination(data, params.size, params.page);
  return { content, ...meta };
}

export async function getAdminReviewById(id: string): Promise<AdminReview | null> {
  const { data } = await api.get(`/api/admin/reviews/${id}`);
  const root = asRecord(data);
  const nested = asRecord(root.data);
  const source = Object.keys(nested).length > 0 ? nested : root;
  if (Object.keys(source).length === 0) {
    return null;
  }
  return toReview(source);
}

export async function approveAdminReview(id: string) {
  await api.patch(`/api/admin/reviews/${id}/approve`);
}

export async function rejectAdminReview(id: string) {
  await api.patch(`/api/admin/reviews/${id}/reject`);
}

export async function hideAdminReview(id: string) {
  await api.patch(`/api/admin/reviews/${id}/hide`);
}

export async function getReportedAdminReviews(params: { page: number; size: number }): Promise<AdminReviewsListResponse> {
  const { data } = await api.get("/api/admin/reviews/reported", { params });
  const content = readArray(data, ["content", "data", "items", "reviews", "results"]).map(toReview);
  const meta = readPagination(data, params.size, params.page);
  return { content, ...meta };
}

export async function getAdminReviewsStats(): Promise<AdminReviewsStats> {
  const { data } = await api.get("/api/admin/reviews/stats");
  const root = asRecord(data);
  const nested = asRecord(root.data);
  const source = Object.keys(nested).length > 0 ? nested : root;

  const partnerWiseRatings = readArray(source.partnerWiseRatings, ["partnerWiseRatings", "partnerRatings", "partners"]).map((item) => ({
    name: asString(item.name ?? item.partnerName ?? item.label),
    value: asNumber(item.value ?? item.rating ?? item.averageRating),
  }));

  const serviceWiseRatings = readArray(source.serviceWiseRatings, ["serviceWiseRatings", "serviceRatings", "services"]).map((item) => ({
    name: asString(item.name ?? item.serviceName ?? item.label),
    value: asNumber(item.value ?? item.rating ?? item.averageRating),
  }));

  return {
    totalReviews: asNumber(source.totalReviews),
    averageRating: asNumber(source.averageRating),
    hiddenReviews: asNumber(source.hiddenReviews),
    reportedReviews: asNumber(source.reportedReviews),
    partnerWiseRatings,
    serviceWiseRatings,
  };
}


