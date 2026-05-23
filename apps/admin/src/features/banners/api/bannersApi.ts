import { api } from "@/api/axios";
import { clearAccessToken, getAccessToken } from "@/utils/authSession";

import type {
  AdminBanner,
  BannerFormPayload,
  BannerReorderPayload,
  BannersListResponse,
  BannersQueryParams,
  BannersStats,
} from "../types";

type UnknownRecord = Record<string, unknown>;
const HOME_BANNERS_BASE = "/api/admin/home/banners";

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

const asBoolean = (value: unknown, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
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

const readArray = (payload: unknown): UnknownRecord[] => {
  if (Array.isArray(payload)) return payload as UnknownRecord[];
  const root = asRecord(payload);
  if (Array.isArray(root.content)) return root.content as UnknownRecord[];
  if (Array.isArray(root.data)) return root.data as UnknownRecord[];
  if (Array.isArray(root.items)) return root.items as UnknownRecord[];
  if (Array.isArray(root.banners)) return root.banners as UnknownRecord[];
  const nested = asRecord(root.data);
  if (Array.isArray(nested.content)) return nested.content as UnknownRecord[];
  return [];
};

const toBanner = (row: UnknownRecord): AdminBanner => ({
  id: asString(row.id ?? row.bannerId),
  title: asString(row.title),
  subtitle: asString(row.subtitle) || undefined,
  imageUrl: asString(row.imageUrl ?? row.bannerImageUrl) || undefined,
  redirectType: (asString(row.redirectType).toUpperCase() || "NONE") as AdminBanner["redirectType"],
  redirectId: asString(row.redirectId) || null,
  priority: asNumber(row.priority, 1),
  active: asBoolean(row.active, true),
  bannerType: (asString(row.bannerType).toUpperCase() || "PROMO") as AdminBanner["bannerType"],
  audience: (asString(row.audience).toUpperCase() || "CUSTOMER") as AdminBanner["audience"],
  createdAt: asString(row.createdAt) || undefined,
});

const buildBannerPayload = (payload: BannerFormPayload) => ({
  title: payload.title.trim(),
  subtitle: payload.subtitle?.trim() || "",
  imageUrl: payload.imageUrl?.trim() || "",
  redirectType: payload.redirectType,
  redirectId: payload.redirectId ?? null,
  priority: payload.priority,
  active: payload.active,
  bannerType: payload.bannerType,
  audience: payload.audience,
});

export async function uploadBannerImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post("/api/admin/banners/upload/image", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
      ...withAdminAuthHeader(),
    },
  });
  const root = asRecord(data);
  const nested = asRecord(root.data);
  return asString(nested.url ?? root.url);
}

export async function getBanners(params: BannersQueryParams): Promise<BannersListResponse> {
  const query = {
    audience: params.audience || undefined,
  };
  const { data } = await api.get(HOME_BANNERS_BASE, {
    params: query,
    headers: withAdminAuthHeader(),
  });

  const allRows = readArray(data).map(toBanner);
  const filteredRows = params.search
    ? allRows.filter((row) =>
        `${row.title} ${row.subtitle ?? ""}`.toLowerCase().includes(params.search!.toLowerCase()),
      )
    : allRows;

  const page = params.page ?? 0;
  const size = params.size ?? 10;
  const start = page * size;
  const content = filteredRows.slice(start, start + size);
  const totalElements = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / size));

  return {
    content,
    totalElements,
    totalPages,
    pageNumber: page,
  };
}

export async function getBannerById(id: string): Promise<AdminBanner | null> {
  const { data } = await api.get(`${HOME_BANNERS_BASE}/${id}`, {
    headers: withAdminAuthHeader(),
  });
  const root = asRecord(data);
  const nested = asRecord(root.data);
  const source = Object.keys(nested).length > 0 ? nested : root;
  if (Object.keys(source).length === 0) return null;
  return toBanner(source);
}

export async function createBanner(payload: BannerFormPayload) {
  const { data } = await api.post(HOME_BANNERS_BASE, buildBannerPayload(payload), {
    headers: withAdminAuthHeader(),
  });
  return data;
}

export async function updateBanner(id: string, payload: BannerFormPayload) {
  const { data } = await api.put(`${HOME_BANNERS_BASE}/${id}`, buildBannerPayload(payload), {
    headers: withAdminAuthHeader(),
  });
  return data;
}

export async function reorderBanners(payload: BannerReorderPayload) {
  const { data } = await api.patch(`${HOME_BANNERS_BASE}/reorder`, payload, {
    headers: withAdminAuthHeader(),
  });
  return data;
}

export async function deleteBanner(id: string) {
  await api.delete(`${HOME_BANNERS_BASE}/${id}`, {
    headers: withAdminAuthHeader(),
  });
}

export async function getBannerStats(): Promise<BannersStats> {
  const { content } = await getBanners({ page: 0, size: 500 });
  const active = content.filter((item) => item.active).length;
  const inactive = content.length - active;
  const customer = content.filter((item) => item.audience === "CUSTOMER").length;
  const partner = content.filter((item) => item.audience === "PARTNER").length;
  const both = content.filter((item) => item.audience === "BOTH").length;
  return { total: content.length, active, inactive, customer, partner, both };
}
