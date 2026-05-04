import { api } from "@/api/axios";
import { clearAccessToken, getAccessToken } from "@/utils/authSession";

import type {
  AdminBanner,
  BannerFormPayload,
  BannersListResponse,
  BannersQueryParams,
  BannersStats,
} from "../types";

type UnknownRecord = Record<string, unknown>;
const HOME_BANNERS_BASE = "/api/admin/home-banners";

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

const withAdminAuthHeader = () => {
  const token = getAccessToken();
  if (!token) {
    clearAccessToken();
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.replace("/login");
    }
    throw new Error("Authorization token is required");
  }
  return { Authorization: `Bearer ${token}` };
};

const handleAuthFailure = (error: unknown) => {
  const e = error as any;
  const status = e?.response?.status;
  const message = String(e?.response?.data?.message ?? e?.message ?? "").toLowerCase();
  const unauthorized =
    status === 401 ||
    message.includes("authorization token is required") ||
    message.includes("invalid or expired token");
  if (!unauthorized) return;

  clearAccessToken();
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
};

const toDateTimeLocal = (value?: string) => {
  if (!value) return undefined;
  const v = value.trim();
  if (!v) return undefined;
  const [datePart, timePart = ""] = v.replace(" ", "T").split("T");
  if (!datePart) return undefined;
  const hhmm = timePart.slice(0, 5);
  if (!hhmm) return `${datePart}T00:00`;
  return `${datePart}T${hhmm}`;
};

const readArray = (payload: unknown): UnknownRecord[] => {
  if (Array.isArray(payload)) {
    return payload as UnknownRecord[];
  }

  const root = asRecord(payload);
  const keys = ["content", "data", "items", "banners", "results"];
  for (const key of keys) {
    const value = root[key];
    if (Array.isArray(value)) {
      return value as UnknownRecord[];
    }
  }

  const nested = asRecord(root.data);
  if (Array.isArray(nested.content)) {
    return nested.content as UnknownRecord[];
  }

  return [];
};

const normalizeStatus = (value: unknown): "ACTIVE" | "INACTIVE" | "DRAFT" => {
  const status = asString(value).toUpperCase();
  if (status === "ACTIVE") return "ACTIVE";
  if (status === "INACTIVE") return "INACTIVE";
  return "DRAFT";
};

const normalizePromoType = (value: unknown): "PROMO" | "OFFER" | "ENGAGE" | "" => {
  const promoType = asString(value).toUpperCase();
  if (promoType === "PROMO") return "PROMO";
  if (promoType === "OFFER") return "OFFER";
  if (promoType === "ENGAGE") return "ENGAGE";
  return "";
};

const normalizePlatformType = (value: unknown): "WEB" | "ANDROID" | "IOS" | "ALL" | "" => {
  const platform = asString(value).toUpperCase();
  if (platform === "WEB") return "WEB";
  if (platform === "ANDROID") return "ANDROID";
  if (platform === "IOS") return "IOS";
  if (platform === "ALL") return "ALL";
  return "";
};

const normalizePlacement = (value: unknown): "TOP" | "BOTTOM" => {
  const placement = asString(value).toUpperCase();
  if (placement === "TOP" || placement === "HOME_TOP") return "TOP";
  if (placement === "BOTTOM" || placement === "HOME_BOTTOM") return "BOTTOM";
  return "BOTTOM";
};

const toBanner = (row: UnknownRecord): AdminBanner => ({
  id: asString(row.id ?? row.bannerId),
  title: asString(row.title ?? row.name),
  description: asString(row.description) || undefined,
  city: asString(row.city) || undefined,
  promoType: normalizePromoType(row.promoType ?? row.tag),
  platformType: normalizePlatformType(row.platformType),
  placement: normalizePlacement(row.placement ?? row.bannerPlacement ?? row.section),
  status: normalizeStatus(row.status),
  bannerImageUrl: asString(row.bannerImageUrl ?? row.imageUrl ?? row.image ?? row.thumbnailUrl) || undefined,
  startDate: asString(row.startDate ?? row.startsAt ?? row.startAt) || undefined,
  endDate: asString(row.endDate ?? row.endsAt ?? row.endAt) || undefined,
  slotNumber: asNumber(row.slotNumber ?? row.slot, 1),
  priority: asNumber(row.priority, 1),
  createdAt: asString(row.createdAt) || undefined,
});

const toRelativePath = (url?: string) => {
  if (!url) return null;
  const value = url.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) {
    return value.replace(/^https?:\/\/[^/]+/i, "");
  }
  return value;
};

const buildBannerPayload = (payload: BannerFormPayload) => {
  const bannerImageUrl = toRelativePath(payload.bannerImageUrl);

  const requestPayload: Record<string, unknown> = {
    title: payload.title.trim(),
    bannerImageUrl,
    promoType: payload.promoType || "PROMO",
    platformType: payload.platformType || "WEB",
    placement: payload.placement || "BOTTOM",
    redirectType: "NONE",
    redirectValue: "",
    status: payload.status || "ACTIVE",
    slotNumber: payload.slotNumber,
    priority: payload.priority,
  };

  const description = payload.description?.trim();
  if (description) {
    requestPayload.description = description;
  }

  const city = payload.city?.trim();
  if (city) {
    requestPayload.city = city;
  }

  const startDate = toDateTimeLocal(payload.startDate);
  if (startDate) {
    requestPayload.startDate = startDate;
  }

  const endDate = toDateTimeLocal(payload.endDate);
  if (endDate) {
    requestPayload.endDate = endDate;
  }

  return requestPayload;
};

export async function uploadBannerImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post("/api/admin/banners/upload/image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  const root = asRecord(data);
  const nested = asRecord(root.data);
  return asString(nested.url ?? root.url);
}

export async function getBanners(params: BannersQueryParams): Promise<BannersListResponse> {
  const query = {
    page: params.page,
    size: params.size,
    sortBy: "createdAt",
    sortDir: "desc",
    status: params.status || undefined,
    city: params.city || undefined,
    promoType: params.promoType || undefined,
    platformType: params.platformType || undefined,
    placement: params.placement || undefined,
    search: params.search || undefined,
  };

  const { data } = await api.get(HOME_BANNERS_BASE, { params: query });
  const content = readArray(data).map(toBanner);
  const root = asRecord(data);
  const nested = asRecord(root.data);
  const source = Object.keys(nested).length > 0 ? nested : root;

  return {
    content,
    totalElements: asNumber(source.totalElements ?? source.total ?? content.length, content.length),
    totalPages: asNumber(source.totalPages, Math.max(1, Math.ceil(content.length / params.size))),
    pageNumber: asNumber(source.pageNumber ?? source.page ?? params.page, params.page),
  };
}

export async function getBannerById(id: string): Promise<AdminBanner | null> {
  try {
    const { data } = await api.get(`${HOME_BANNERS_BASE}/${id}`, {
      headers: withAdminAuthHeader(),
    });
    const root = asRecord(data);
    const nested = asRecord(root.data);
    const source = Object.keys(nested).length > 0 ? nested : root;
    if (Object.keys(source).length === 0) {
      return null;
    }
    return toBanner(source);
  } catch (error) {
    handleAuthFailure(error);
    throw error;
  }
}

export async function createBanner(payload: BannerFormPayload) {
  const requestPayload = buildBannerPayload(payload);
  console.log("FINAL PAYLOAD:", requestPayload);
  const { data } = await api.post(HOME_BANNERS_BASE, requestPayload);
  return data;
}

export async function updateBanner(id: string, payload: BannerFormPayload) {
  const primaryPayload = buildBannerPayload(payload);
  console.log("FINAL PAYLOAD:", { id, ...primaryPayload });

  try {
    const { data } = await api.put(`${HOME_BANNERS_BASE}/${id}`, primaryPayload, {
      headers: withAdminAuthHeader(),
    });
    return data;
  } catch (error: any) {
    handleAuthFailure(error);
    throw error;
  }
}

export async function deleteBanner(id: string) {
  await api.delete(`${HOME_BANNERS_BASE}/${id}`);
}

export async function activateBanner(id: string) {
  await api.patch(`${HOME_BANNERS_BASE}/${id}/activate`);
}

export async function deactivateBanner(id: string) {
  await api.patch(`${HOME_BANNERS_BASE}/${id}/deactivate`);
}

export async function draftBanner(id: string) {
  await api.patch(`${HOME_BANNERS_BASE}/${id}/draft`);
}

export async function getBannerStats(): Promise<BannersStats> {
  const { data } = await api.get(`${HOME_BANNERS_BASE}/stats`);
  const root = asRecord(data);
  const nested = asRecord(root.data);
  const source = Object.keys(nested).length > 0 ? nested : root;

  const active = asNumber(source.active);
  const inactive = asNumber(source.inactive);
  const draft = asNumber(source.draft);

  return {
    active,
    inactive,
    draft,
    total: asNumber(source.total, active + inactive + draft),
  };
}
