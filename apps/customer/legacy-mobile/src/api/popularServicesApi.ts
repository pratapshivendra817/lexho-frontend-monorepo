import { api, parseApiError } from "./client";
import { API_BASE_URL, DEV_IMAGE_HOST } from "../constants/env";
import { Platform } from "react-native";
import { getToken } from "../utils/storage";
import { store } from "../redux/store";
import { DEV_BYPASS_API_TOKEN, DEV_LOGIN_BYPASS } from "../constants/env";

const POPULAR_REQUEST_TIMEOUT_MS = 6000;
const POPULAR_ENDPOINTS = [
  "/api/customer/services/popular",
  "/api/services/popular",
] as const;
let workingPopularEndpoint: string | null = "/api/customer/services/popular";

export type PopularServiceDto = {
  id?: number | string;
  serviceId?: number | string;
  name?: string;
  serviceName?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  rating?: number | string;
  price?: number | string;
  discountedPrice?: number | string;
  categoryId?: number | string;
};

export type PopularServiceCategory = string;

function extractRows(payload: any): PopularServiceDto[] {
  if (Array.isArray(payload)) return mapRows(payload as PopularServiceDto[]);
  if (Array.isArray(payload?.data)) return mapRows(payload.data as PopularServiceDto[]);
  if (Array.isArray(payload?.content)) return mapRows(payload.content as PopularServiceDto[]);
  if (Array.isArray(payload?.items)) return mapRows(payload.items as PopularServiceDto[]);
  if (Array.isArray(payload?.rows)) return mapRows(payload.rows as PopularServiceDto[]);
  if (Array.isArray(payload?.results)) return mapRows(payload.results as PopularServiceDto[]);
  if (Array.isArray(payload?.data?.content)) return mapRows(payload.data.content as PopularServiceDto[]);
  if (Array.isArray(payload?.data?.items)) return mapRows(payload.data.items as PopularServiceDto[]);
  if (Array.isArray(payload?.data?.rows)) return mapRows(payload.data.rows as PopularServiceDto[]);
  if (Array.isArray(payload?.data?.results)) return mapRows(payload.data.results as PopularServiceDto[]);
  return [];
}

async function authHeaders(): Promise<Record<string, string>> {
  if (DEV_LOGIN_BYPASS && __DEV__) {
    return DEV_BYPASS_API_TOKEN ? { Authorization: `Bearer ${DEV_BYPASS_API_TOKEN}` } : {};
  }
  const storageToken = await getToken();
  const stateToken = store.getState()?.auth?.token ?? null;
  const token = storageToken || stateToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function toAbsoluteUrl(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = String(value).trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) {
    if (/^https?:\/\/localhost/i.test(trimmed) || /^https?:\/\/127\.0\.0\.1/i.test(trimmed)) {
      if (DEV_IMAGE_HOST) {
        return trimmed.replace("://localhost", `://${DEV_IMAGE_HOST}`).replace("://127.0.0.1", `://${DEV_IMAGE_HOST}`);
      }
      if (Platform.OS === "android") {
        return trimmed.replace("://localhost", "://10.0.2.2").replace("://127.0.0.1", "://10.0.2.2");
      }
    }
    return trimmed;
  }
  const base = API_BASE_URL.replace(/\/+$/, "");
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${base}${path}`;
}

function mapRows(rows: PopularServiceDto[]): PopularServiceDto[] {
  return rows.map((row) => {
    const raw: any = row ?? {};
    const service: any = raw?.service ?? {};
    const category: any = raw?.category ?? {};
    const imageUrl = toAbsoluteUrl(raw?.imageUrl ?? raw?.thumbnailUrl ?? service?.imageUrl ?? service?.thumbnailUrl);
    const thumbnailUrl = toAbsoluteUrl(raw?.thumbnailUrl ?? raw?.imageUrl ?? service?.thumbnailUrl ?? service?.imageUrl);
    return {
      ...raw,
      id: raw?.id ?? raw?.popularServiceId ?? raw?.serviceId ?? service?.id,
      serviceId: raw?.serviceId ?? service?.id ?? raw?.id,
      name: raw?.name ?? raw?.serviceName ?? service?.name,
      serviceName: raw?.serviceName ?? raw?.name ?? service?.name,
      categoryId: raw?.categoryId ?? category?.id ?? category?.categoryId,
      categoryName: raw?.categoryName ?? category?.name,
      rating: raw?.rating ?? service?.rating,
      price: raw?.price ?? service?.price ?? service?.basePrice,
      discountedPrice: raw?.discountedPrice ?? service?.discountedPrice,
      imageUrl: imageUrl ?? row.imageUrl,
      thumbnailUrl: thumbnailUrl ?? row.thumbnailUrl,
    };
  });
}

function getGeoParams() {
  const state = store.getState() as any;
  const location = state?.location ?? {};
  const current = location?.currentAddress ?? {};
  const selected = location?.selectedAddress ?? {};
  const latitude = Number(selected?.latitude ?? selected?.lat ?? current?.latitude ?? current?.lat ?? 0);
  const longitude = Number(selected?.longitude ?? selected?.lng ?? current?.longitude ?? current?.lng ?? 0);
  const pincode = String(selected?.pincode ?? current?.pincode ?? "").trim();
  return {
    ...(Number.isFinite(latitude) && latitude !== 0 ? { latitude } : {}),
    ...(Number.isFinite(longitude) && longitude !== 0 ? { longitude } : {}),
    ...(pincode ? { pincode } : {}),
  };
}

async function getPopularAttempt(attempt: { url: string; params?: Record<string, unknown> }, headers: Record<string, string>) {
  try {
    const { data } = await api.get(attempt.url, {
      headers,
      params: attempt.params ?? {},
      timeout: POPULAR_REQUEST_TIMEOUT_MS,
    });
    return { data, rows: extractRows(data) };
  } catch (error: any) {
    const status = Number(error?.response?.status ?? 0);
    if ((status === 401 || status === 403) && Object.keys(headers).length > 0) {
      const { data } = await api.get(attempt.url, {
        params: attempt.params ?? {},
        timeout: POPULAR_REQUEST_TIMEOUT_MS,
      });
      return { data, rows: extractRows(data) };
    }
    throw error;
  }
}

export async function getPopularServicesByCategory(category: PopularServiceCategory): Promise<PopularServiceDto[]> {
  const headers = await authHeaders();
  const categoryText = String(category ?? "").trim();
  if (!categoryText) return [];
  const geoParams = getGeoParams();
  const endpointOrder = [
    ...(workingPopularEndpoint ? [workingPopularEndpoint] : []),
    ...POPULAR_ENDPOINTS.filter((endpoint) => endpoint !== workingPopularEndpoint),
  ];
  const attempts: Array<{ url: string; params?: Record<string, unknown> }> = endpointOrder.map((url) => ({
    url,
    params: { categoryId: category, page: 0, size: 50, ...geoParams },
  }));

  for (const attempt of attempts) {
    try {
      const { data, rows } = await getPopularAttempt(attempt, headers);
      workingPopularEndpoint = attempt.url;
      void data;
      return rows;
    } catch (error: any) {
      const status = Number(error?.response?.status ?? 0);
      if (status === 404) continue;
    }
  }
  return [];
}

export async function getPopularServices(): Promise<PopularServiceDto[]> {
  // Backend requires categoryId for popular services. Home fetch loads category-wise instead.
  return [];
}

export async function getPopularCookServices(): Promise<PopularServiceDto[]> {
  return getPopularServicesByCategory("cook");
}

export async function getPopularCleaningServices(): Promise<PopularServiceDto[]> {
  return getPopularServicesByCategory("cleaning");
}
