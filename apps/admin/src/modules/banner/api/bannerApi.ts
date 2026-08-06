import { api } from "@/api/axios";
import { appConfig } from "@/config";
import { getCategories, getServices } from "@/services/lexhoAdminApi";

import type {
  BannerCategoryOption,
  BannerFormValues,
  BannerItem,
  BannerListParams,
  BannerListResponse,
  BannerServiceOption,
} from "../types/banner.types";

type UnknownRecord = Record<string, unknown>;
const BANNER_MANAGEMENT_BASE = "/api/admin/banners";

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === "object" ? (value as UnknownRecord) : {};

const getApiOrigin = (): string => {
  const base = String(appConfig.apiBaseUrl ?? "").trim();
  if (!base) return "";
  if (base.startsWith("/")) {
    if (typeof window !== "undefined" && window.location?.origin) {
      return window.location.origin;
    }
    return "";
  }
  try {
    return new URL(base).origin;
  } catch {
    return "";
  }
};

const toAbsoluteAssetUrl = (value: unknown): string => {
  const raw = asString(value);
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) {
    const origin = getApiOrigin();
    try {
      const parsed = new URL(raw);
      if ((parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") && origin) {
        const target = new URL(origin);
        parsed.protocol = target.protocol;
        parsed.host = target.host;
        return parsed.toString();
      }
    } catch {
      return raw;
    }
    return raw;
  }
  const origin = getApiOrigin();
  if (!origin) return raw.startsWith("/") ? raw : `/${raw}`;
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  return `${origin}${path}`;
};

const asString = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
};

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
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "active", "enabled", "yes"].includes(normalized)) return true;
    if (["false", "0", "inactive", "disabled", "no"].includes(normalized)) return false;
  }
  return fallback;
};

const extractRows = (data: unknown): UnknownRecord[] => {
  if (Array.isArray(data)) return data as UnknownRecord[];
  const root = asRecord(data);
  const nestedData = asRecord(root.data);
  const candidates = [
    root.data,
    root.content,
    root.items,
    root.results,
    root.rows,
    nestedData.items,
    nestedData.content,
    nestedData.results,
    nestedData.rows,
    asRecord(nestedData.data).items,
    asRecord(nestedData.data).content,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate as UnknownRecord[];
  }
  return [];
};

const mapBanner = (row: UnknownRecord): BannerItem => {
  const category = asRecord(row.category);
  const statusRaw = asString(row.status).toUpperCase();
  const active = asBoolean(row.active ?? row.isActive ?? statusRaw === "ACTIVE", true);
  return {
    id: asString(row.id ?? row.bannerId),
    title: asString(row.title),
    categoryId: asString(row.categoryId ?? category.id) || null,
    categoryName: asString(row.categoryName ?? category.name),
    imageUrl: toAbsoluteAssetUrl(row.imageUrl ?? row.bannerImageUrl ?? row.thumbnailUrl),
    redirectType: (asString(row.redirectType).toUpperCase() || "CATEGORY") as BannerItem["redirectType"],
    redirectValue: asString(row.redirectValue ?? row.redirectId ?? row.redirectUrl),
    status: active ? "ACTIVE" : "INACTIVE",
    priority: asNumber(row.priority, 0),
    active,
  };
};

const toRelativePath = (url: string) => {
  const value = url.trim();
  if (!value) return value;
  if (/^https?:\/\//i.test(value)) {
    return value.replace(/^https?:\/\/[^/]+/i, "");
  }
  return value;
};

const toPayload = (values: BannerFormValues) => {
  const imageUrl = toRelativePath(values.imageUrl);
  const numericCategoryId = values.categoryId ? Number(values.categoryId) : null;
  const isExternal = values.redirectType === "EXTERNAL";
  const numericRedirectId = !isExternal && values.redirectValue ? Number(values.redirectValue) : null;

  return {
    title: values.title.trim(),
    categoryId: Number.isFinite(numericCategoryId) ? numericCategoryId : null,
    imageUrl,
    redirectType: values.redirectType,
    redirectId: Number.isFinite(numericRedirectId) ? numericRedirectId : null,
    redirectUrl: isExternal ? values.redirectValue.trim() : null,
    priority: values.priority,
    active: values.active,
  };
};

const parseUploadUrl = (payload: unknown): string => {
  const root = asRecord(payload);
  const nested = asRecord(root.data ?? root.result);
  const candidates = [
    root.imageUrl,
    root.url,
    root.fileUrl,
    root.path,
    nested.imageUrl,
    nested.url,
    nested.fileUrl,
    nested.path,
  ];

  for (const value of candidates) {
    const url = asString(value);
    if (!url) continue;
    return toAbsoluteAssetUrl(url);
  }

  throw new Error("Image upload succeeded but response URL is missing");
};

export async function getBannerCategories(): Promise<BannerCategoryOption[]> {
  const response = await getCategories({ page: 1, limit: 500 });
  return (response.items ?? [])
    .filter((item) => Boolean(item.active))
    .map((item) => ({
      id: asString(item.id),
      name: asString(item.name),
    }))
    .filter((item) => item.id && item.name);
}

export async function getBannerServices(): Promise<BannerServiceOption[]> {
  const response = await getServices({ page: 1, limit: 500 });
  return (response.items ?? [])
    .filter((item) => Boolean(item.active))
    .map((item) => ({
      id: asString(item.id),
      name: asString(item.name),
    }))
    .filter((item) => item.id && item.name);
}

export async function getAdminBanners(params: BannerListParams): Promise<BannerListResponse> {
  const query: Record<string, unknown> = {
    page: Math.max(params.page - 1, 0),
    size: params.limit,
  };
  if (params.search) query.search = params.search;
  if (params.categoryId) query.categoryId = params.categoryId;
  if (typeof params.active === "boolean") query.active = params.active;

  const { data } = await api.get(BANNER_MANAGEMENT_BASE, { params: query });
  const rows = extractRows(data).map(mapBanner);
  const root = asRecord(data);
  const total = asNumber(root.totalElements ?? root.total ?? asRecord(root.data).total ?? rows.length, rows.length);
  return { items: rows, total };
}

export async function getAdminBannerById(id: string): Promise<BannerItem | null> {
  const { data } = await api.get(`${BANNER_MANAGEMENT_BASE}/${id}`);
  const root = asRecord(data);
  const source = asRecord(root.data ?? root.banner ?? root.item ?? root.result ?? root);
  if (!asString(source.id ?? source.bannerId ?? id)) return null;
  return mapBanner(source);
}

export async function createAdminBanner(payload: BannerFormValues) {
  const { data } = await api.post(BANNER_MANAGEMENT_BASE, toPayload(payload));
  return data;
}

export async function updateAdminBanner(id: string, payload: BannerFormValues) {
  const { data } = await api.put(`${BANNER_MANAGEMENT_BASE}/${id}`, toPayload(payload));
  return data;
}

export async function deleteAdminBanner(id: string) {
  await api.delete(`${BANNER_MANAGEMENT_BASE}/${id}`);
}

export async function reorderAdminBanners(idsInPriorityOrder: string[]) {
  const payload = {
    bannerIds: idsInPriorityOrder.map((id) => Number(id)).filter((id) => Number.isFinite(id)),
  };
  const { data } = await api.patch(`${BANNER_MANAGEMENT_BASE}/reorder`, payload);
  return data;
}

export async function uploadBannerImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file, file.name);

  const { data } = await api.post("/api/admin/banners/upload/image", formData);

  return parseUploadUrl(data);
}
