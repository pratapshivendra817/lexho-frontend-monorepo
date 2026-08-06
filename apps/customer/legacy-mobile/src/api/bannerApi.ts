import { api, parseApiError } from "./client";
import { API_BASE_URL, DEV_BYPASS_API_TOKEN, DEV_IMAGE_HOST, DEV_LOGIN_BYPASS } from "../constants/env";
import { Platform } from "react-native";
import { getToken } from "../utils/storage";
import { store } from "../redux/store";

export type CategoryBannerDto = {
  id?: string | number;
  bannerId?: string | number;
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  bannerImageUrl?: string;
  redirectType?: string;
  redirectValue?: string | number;
  redirectUrl?: string;
};

function toAbsoluteUrl(url?: string): string | undefined {
  if (!url) return undefined;
  const trimmed = String(url).trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) {
    let normalized = trimmed;
    if (/^https?:\/\/localhost/i.test(normalized) || /^https?:\/\/127\.0\.0\.1/i.test(normalized)) {
      if (DEV_IMAGE_HOST) {
        normalized = normalized.replace("://localhost", `://${DEV_IMAGE_HOST}`).replace("://127.0.0.1", `://${DEV_IMAGE_HOST}`);
      } else if (Platform.OS === "android") {
        normalized = normalized.replace("://localhost", "://10.0.2.2").replace("://127.0.0.1", "://10.0.2.2");
      }
    }
    return normalized;
  }
  const base = API_BASE_URL.replace(/\/+$/, "");
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${base}${path}`;
}

function mapRows(rows: CategoryBannerDto[]): CategoryBannerDto[] {
  return rows.map((row) => ({
    ...row,
    imageUrl: toAbsoluteUrl(row.imageUrl ?? row.bannerImageUrl),
    bannerImageUrl: toAbsoluteUrl(row.bannerImageUrl ?? row.imageUrl),
  }));
}

async function authHeaders() {
  if (DEV_LOGIN_BYPASS && __DEV__) {
    return DEV_BYPASS_API_TOKEN ? { Authorization: `Bearer ${DEV_BYPASS_API_TOKEN}` } : {};
  }
  const storageToken = await getToken();
  const stateToken = store.getState()?.auth?.token ?? null;
  const token = storageToken || stateToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function extractRows(payload: any): CategoryBannerDto[] {
  if (Array.isArray(payload?.data)) return payload.data as CategoryBannerDto[];
  if (Array.isArray(payload?.data?.data)) return payload.data.data as CategoryBannerDto[];
  if (Array.isArray(payload?.data?.content)) return payload.data.content as CategoryBannerDto[];
  if (Array.isArray(payload?.data?.items)) return payload.data.items as CategoryBannerDto[];
  if (Array.isArray(payload?.data?.banners)) return payload.data.banners as CategoryBannerDto[];
  if (Array.isArray(payload?.content)) return payload.content as CategoryBannerDto[];
  if (Array.isArray(payload?.items)) return payload.items as CategoryBannerDto[];
  if (Array.isArray(payload?.banners)) return payload.banners as CategoryBannerDto[];
  if (Array.isArray(payload?.records)) return payload.records as CategoryBannerDto[];
  if (Array.isArray(payload?.rows)) return payload.rows as CategoryBannerDto[];
  if (Array.isArray(payload?.result?.data)) return payload.result.data as CategoryBannerDto[];
  if (Array.isArray(payload?.result?.content)) return payload.result.content as CategoryBannerDto[];
  if (Array.isArray(payload?.result?.items)) return payload.result.items as CategoryBannerDto[];
  if (Array.isArray(payload?.result?.banners)) return payload.result.banners as CategoryBannerDto[];
  if (Array.isArray(payload?.payload?.data)) return payload.payload.data as CategoryBannerDto[];
  if (Array.isArray(payload?.payload?.content)) return payload.payload.content as CategoryBannerDto[];
  if (Array.isArray(payload?.payload?.items)) return payload.payload.items as CategoryBannerDto[];
  if (Array.isArray(payload?.payload?.banners)) return payload.payload.banners as CategoryBannerDto[];
  if (Array.isArray(payload)) return payload as CategoryBannerDto[];
  return [];
}

export async function fetchCustomerBannersByCategory(categoryId: string | number): Promise<CategoryBannerDto[]> {
  try {
    const headers = await authHeaders();
    const shouldSendCategory = String(categoryId ?? "").trim().length > 0;
    if (!shouldSendCategory) return [];
    const attempts = [
      "/api/customer/banners",
      "/api/banners",
    ];

    const paramVariants: Array<Record<string, string | number>> = [{ categoryId }];
    paramVariants.push({ page: 0, size: 20 });
    paramVariants.push({ categoryId, page: 0, size: 20 });
    paramVariants.push({ categoryId, page: 0, size: 20, audience: "CUSTOMER" });
    paramVariants.push({ categoryId, page: 0, size: 20, platformType: Platform.OS.toUpperCase() });
    paramVariants.push({ categoryId, page: 0, size: 20, audience: "CUSTOMER", platformType: Platform.OS.toUpperCase() });

    for (const path of attempts) {
      for (const params of paramVariants) {
        try {
          const { data } = await api.get(path, { params, headers });
          const rows = extractRows(data);
          if (rows.length > 0) return mapRows(rows);
        } catch {
          // Try next variant.
        }
      }
    }

    return [];
  } catch (error) {
    throw new Error(parseApiError(error, "Failed to fetch banners"));
  }
}
