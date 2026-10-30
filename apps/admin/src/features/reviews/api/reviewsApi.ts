import { api } from "@/api/axios";

import type {
  AdminReportedReviewRow,
  AdminReportedReviewsListResponse,
  AdminReportedReviewsQueryParams,
  AdminReview,
  AdminReviewDetail,
  AdminReviewModerationEntry,
  AdminReviewReport,
  AdminReviewReportStatus,
  AdminReviewsListResponse,
  AdminReviewsQueryParams,
  AdminReviewsStats,
  AdminReviewSettings,
} from "../types";

type UnknownRecord = Record<string, unknown>;

const ADMIN_REVIEW_BASES = ["/api/v1/admin/reviews", "/api/admin/reviews"] as const;

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

const asBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "enabled"].includes(normalized)) return true;
    if (["false", "0", "no", "disabled"].includes(normalized)) return false;
  }
  return fallback;
};

const readArray = (payload: unknown, keys: string[]): UnknownRecord[] => {
  if (Array.isArray(payload)) return payload as UnknownRecord[];
  const root = asRecord(payload);
  for (const key of keys) {
    const candidate = root[key];
    if (Array.isArray(candidate)) return candidate as UnknownRecord[];
  }
  const nested = asRecord(root.data);
  for (const key of keys) {
    const candidate = nested[key];
    if (Array.isArray(candidate)) return candidate as UnknownRecord[];
  }
  return [];
};

const readObject = (payload: unknown, keys: string[]): UnknownRecord => {
  const root = asRecord(payload);
  for (const key of keys) {
    const candidate = asRecord(root[key]);
    if (Object.keys(candidate).length > 0) return candidate;
  }
  const nested = asRecord(root.data);
  for (const key of keys) {
    const candidate = asRecord(nested[key]);
    if (Object.keys(candidate).length > 0) return candidate;
  }
  return Object.keys(nested).length > 0 ? nested : root;
};

const normalizeReviewStatus = (value: unknown): AdminReview["status"] => {
  const status = asString(value).toUpperCase();
  if (status === "APPROVED") return "APPROVED";
  if (status === "REJECTED") return "REJECTED";
  if (status === "HIDDEN") return "HIDDEN";
  return "PENDING";
};

const normalizeReportStatus = (value: unknown): AdminReviewReportStatus => {
  const status = asString(value).toUpperCase();
  if (status === "DISMISSED") return "DISMISSED";
  if (status === "ACTION_TAKEN") return "ACTION_TAKEN";
  return "OPEN";
};

const toReview = (row: UnknownRecord): AdminReview => ({
  id: asString(row.id ?? row.reviewId),
  bookingId: asString(row.bookingId ?? asRecord(row.booking).id) || undefined,
  customerId:
    asString(row.customerId ?? row.userId ?? asRecord(row.customer).id ?? asRecord(row.user).id) || undefined,
  partnerId:
    asString(row.partnerId ?? row.providerId ?? asRecord(row.partner).id ?? asRecord(row.provider).id) || undefined,
  providerId:
    asString(row.providerId ?? row.partnerId ?? asRecord(row.provider).id ?? asRecord(row.partner).id) || undefined,
  serviceId: asString(row.serviceId ?? asRecord(row.service).id) || undefined,
  customerName: asString(
    row.customerName ??
      row.userName ??
      asRecord(row.customer).name ??
      asRecord(row.user).name ??
      row.customer,
  ),
  partnerName: asString(
    row.partnerName ??
      asRecord(row.partner).name ??
      asRecord(row.provider).name ??
      row.partner,
  ),
  serviceName: asString(row.serviceName ?? asRecord(row.service).name ?? row.service),
  rating: asNumber(row.rating),
  comment: asString(row.comment ?? row.reviewComment ?? row.reviewText),
  reviewText: asString(row.reviewText ?? row.comment ?? row.reviewComment) || undefined,
  images: readArray(row.images, ["images", "media", "attachments"])
    .map((item) => asString(item.url ?? item.path ?? item))
    .filter(Boolean),
  status: normalizeReviewStatus(row.status),
  reportCount: asNumber(row.reportCount ?? row.reportsCount ?? row.reports ?? row.flagCount),
  reportReason: asString(row.reportReason ?? row.reason) || undefined,
  moderationReason:
    asString(row.moderationReason ?? row.adminReason ?? row.rejectionReason ?? row.hideReason) || undefined,
  requestId: asString(row.requestId) || undefined,
  correlationId: asString(row.correlationId) || undefined,
  createdAt: asString(row.createdAt ?? row.created_on) || undefined,
  updatedAt: asString(row.updatedAt ?? row.updated_on) || undefined,
});

const toReport = (row: UnknownRecord): AdminReviewReport => ({
  id: asString(row.id ?? row.reportId),
  reviewId: asString(row.reviewId ?? asRecord(row.review).id) || undefined,
  status: normalizeReportStatus(row.status),
  reason: asString(row.reason ?? row.reportReason) || undefined,
  reportedByCustomerId:
    asString(row.reportedByCustomerId ?? asRecord(row.customer).id ?? asRecord(row.reportedBy).id) || undefined,
  reportedByCustomerName:
    asString(row.reportedByCustomerName ?? asRecord(row.customer).name ?? asRecord(row.reportedBy).name) || undefined,
  createdAt: asString(row.createdAt) || undefined,
  updatedAt: asString(row.updatedAt) || undefined,
});

const toModerationEntry = (row: UnknownRecord): AdminReviewModerationEntry => ({
  id: asString(row.id ?? row.historyId),
  action: asString(row.action ?? row.type ?? row.status),
  reason: asString(row.reason ?? row.note ?? row.comment) || undefined,
  actorName: asString(row.actorName ?? asRecord(row.actor).name ?? row.adminName) || undefined,
  actorId: asString(row.actorId ?? asRecord(row.actor).id ?? row.adminId) || undefined,
  createdAt: asString(row.createdAt) || undefined,
});

const readPagination = (payload: unknown, size: number, page: number) => {
  const root = asRecord(payload);
  const nested = asRecord(root.data);
  const source = Object.keys(nested).length > 0 ? nested : root;
  const totalElements = asNumber(source.totalElements ?? source.total, 0);
  const totalPages = asNumber(source.totalPages, Math.max(1, Math.ceil(totalElements / Math.max(size, 1))));
  const pageNumber = asNumber(source.pageNumber ?? source.page, page);
  return { totalElements, totalPages, pageNumber };
};

async function requestWithFallback<T>(runner: (base: string) => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (const base of ADMIN_REVIEW_BASES) {
    try {
      return await runner(base);
    } catch (error: any) {
      lastError = error;
      const status = error?.response?.status;
      if (status !== 404 && status !== 405) {
        throw error;
      }
    }
  }
  throw lastError;
}

const defaultSettings: AdminReviewSettings = {
  reviewsEnabled: true,
  ratingEnabled: true,
  writtenReviewsEnabled: true,
  autoApproveReviews: false,
  services: [],
};

export async function getAdminReviews(params: AdminReviewsQueryParams): Promise<AdminReviewsListResponse> {
  const query = {
    page: params.page,
    size: params.size,
    sortBy: params.sortBy || undefined,
    sortDir: params.sortDir || undefined,
    rating: params.rating,
    status: params.status || undefined,
    providerId: params.providerId || undefined,
    serviceId: params.serviceId || undefined,
    search: params.search || undefined,
    startDate: params.startDate || undefined,
    endDate: params.endDate || undefined,
    reported: params.reported === "" ? undefined : params.reported,
  };
  return requestWithFallback(async (base) => {
    const { data } = await api.get(base, { params: query });
    const content = readArray(data, ["content", "data", "items", "reviews", "results"]).map(toReview);
    const meta = readPagination(data, params.size, params.page);
    return { content, ...meta };
  });
}

export async function getAdminReviewById(id: string): Promise<AdminReviewDetail> {
  return requestWithFallback(async (base) => {
    const { data } = await api.get(`${base}/${id}`);
    const reviewSource = readObject(data, ["review", "data"]);
    return {
      review: Object.keys(reviewSource).length > 0 ? toReview(reviewSource) : null,
      booking: readObject(data, ["booking"]),
      customer: readObject(data, ["customer"]),
      partner: readObject(data, ["partner", "provider"]),
      service: readObject(data, ["service"]),
      reports: readArray(data, ["reports"]).map(toReport),
      moderationHistory: readArray(data, ["moderationHistory", "history", "audit"]).map(toModerationEntry),
    };
  });
}

export async function approveAdminReview(id: string, reason?: string) {
  return requestWithFallback(async (base) => {
    await api.patch(`${base}/${id}/approve`, reason ? { reason } : undefined);
  });
}

export async function rejectAdminReview(id: string, reason: string) {
  return requestWithFallback(async (base) => {
    await api.patch(`${base}/${id}/reject`, { reason });
  });
}

export async function hideAdminReview(id: string, reason: string) {
  return requestWithFallback(async (base) => {
    await api.patch(`${base}/${id}/hide`, { reason });
  });
}

export async function unhideAdminReview(id: string, reason?: string) {
  return requestWithFallback(async (base) => {
    await api.patch(`${base}/${id}/unhide`, reason ? { reason } : undefined);
  });
}

export async function getReportedAdminReviews(
  params: AdminReportedReviewsQueryParams,
): Promise<AdminReportedReviewsListResponse> {
  return requestWithFallback(async (base) => {
    const { data } = await api.get(`${base}/reported`, {
      params: {
        page: params.page,
        size: params.size,
        status: params.status || undefined,
      },
    });
    const content = readArray(data, ["content", "data", "items", "reviews", "results"]).map((row) => {
      const source = asRecord(row);
      const review = toReview(asRecord(source.review).id ? asRecord(source.review) : source);
      return {
        reportId: asString(source.reportId ?? source.id ?? asRecord(source.report).id),
        reportStatus: normalizeReportStatus(source.status ?? asRecord(source.report).status),
        review,
        reportReason: asString(source.reason ?? source.reportReason ?? asRecord(source.report).reason) || undefined,
        reportedByCustomerName:
          asString(source.reportedByCustomerName ?? asRecord(source.customer).name ?? asRecord(source.reportedBy).name) ||
          undefined,
        createdAt: asString(source.createdAt ?? asRecord(source.report).createdAt) || undefined,
      } satisfies AdminReportedReviewRow;
    });
    const meta = readPagination(data, params.size, params.page);
    return { content, ...meta };
  });
}

export async function dismissAdminReviewReport(reportId: string) {
  return requestWithFallback(async (base) => {
    await api.patch(`${base}/reported/${reportId}/dismiss`);
  });
}

export async function hideReviewFromReport(reportId: string) {
  return requestWithFallback(async (base) => {
    await api.patch(`${base}/reported/${reportId}/hide-review`);
  });
}

export async function rejectReviewFromReport(reportId: string) {
  return requestWithFallback(async (base) => {
    await api.patch(`${base}/reported/${reportId}/reject-review`);
  });
}

export async function getAdminReviewsStats(filters?: {
  startDate?: string;
  endDate?: string;
  serviceId?: string;
  providerId?: string;
}): Promise<AdminReviewsStats> {
  return requestWithFallback(async (base) => {
    const { data } = await api.get(`${base}/stats`, {
      params: {
        startDate: filters?.startDate || undefined,
        endDate: filters?.endDate || undefined,
        serviceId: filters?.serviceId || undefined,
        providerId: filters?.providerId || undefined,
      },
    });
    const source = readObject(data, ["data", "stats"]);
    const distributionSource = readArray(source.ratingDistribution, ["ratingDistribution", "distribution", "ratings"]);
    const ratingDistribution = distributionSource
      .map((item) => ({
        rating: asNumber(item.rating ?? item.star ?? item.value),
        count: asNumber(item.count ?? item.total ?? item.reviews),
      }))
      .filter((item) => item.rating > 0);

    return {
      total: asNumber(source.total ?? source.totalReviews),
      pending: asNumber(source.pending),
      approved: asNumber(source.approved),
      rejected: asNumber(source.rejected),
      hidden: asNumber(source.hidden ?? source.hiddenReviews),
      reported: asNumber(source.reported ?? source.reportedReviews),
      averageRating: asNumber(source.averageRating ?? source.avgRating),
      ratingDistribution,
    };
  });
}

export async function getAdminReviewSettings(): Promise<AdminReviewSettings> {
  return requestWithFallback(async (base) => {
    const { data } = await api.get(`${base}/settings`);
    const source = readObject(data, ["data", "settings"]);
    return {
      reviewsEnabled: asBoolean(source.reviewsEnabled, defaultSettings.reviewsEnabled),
      ratingEnabled: asBoolean(source.ratingEnabled, defaultSettings.ratingEnabled),
      writtenReviewsEnabled: asBoolean(source.writtenReviewsEnabled, defaultSettings.writtenReviewsEnabled),
      autoApproveReviews: asBoolean(source.autoApproveReviews, defaultSettings.autoApproveReviews),
      services: readArray(source.services, ["services"])
        .map((item) => ({
          serviceId: asNumber(item.serviceId ?? item.id),
          reviewEnabled: asBoolean(item.reviewEnabled, true),
        }))
        .filter((item) => item.serviceId > 0),
    };
  });
}

export async function updateAdminReviewSettings(payload: AdminReviewSettings): Promise<AdminReviewSettings> {
  return requestWithFallback(async (base) => {
    const { data } = await api.put(`${base}/settings`, payload);
    const source = readObject(data, ["data", "settings"]);
    if (Object.keys(source).length === 0) {
      return payload;
    }
    return {
      reviewsEnabled: asBoolean(source.reviewsEnabled, payload.reviewsEnabled),
      ratingEnabled: asBoolean(source.ratingEnabled, payload.ratingEnabled),
      writtenReviewsEnabled: asBoolean(source.writtenReviewsEnabled, payload.writtenReviewsEnabled),
      autoApproveReviews: asBoolean(source.autoApproveReviews, payload.autoApproveReviews),
      services: readArray(source.services, ["services"])
        .map((item) => ({
          serviceId: asNumber(item.serviceId ?? item.id),
          reviewEnabled: asBoolean(item.reviewEnabled, true),
        }))
        .filter((item) => item.serviceId > 0),
    };
  });
}
