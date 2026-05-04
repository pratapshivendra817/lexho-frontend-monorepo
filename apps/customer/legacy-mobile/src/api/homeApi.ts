import { api, extractList, parseApiError } from "./client";
import { API_BASE_URL, DEV_IMAGE_HOST } from "../constants/env";
import { Platform } from "react-native";
import { getToken } from "../utils/storage";
import { store } from "../redux/store";
import { DEV_LOGIN_BYPASS } from "../constants/env";
import { DEV_BYPASS_API_TOKEN } from "../constants/env";
import type { BannerDto, BookingSummaryDto, CategoryDto, HomeDashboardResponse, ServiceDto } from "../types/contracts";

export async function getDashboard(): Promise<HomeDashboardResponse> { try { const { data } = await api.get("/api/home/dashboard"); return data as HomeDashboardResponse; } catch (error) { throw new Error(parseApiError(error, "Dashboard failed")); } }

function toAbsoluteUrl(url?: string) {
  if (!url) return undefined;

  const replaceLocalhostHost = (input: string) => {
    const overrideHost = DEV_IMAGE_HOST || "";
    if (/^https?:\/\/localhost/i.test(input) || /^https?:\/\/127\.0\.0\.1/i.test(input)) {
      if (Platform.OS === "android") {
        // Android emulator must use 10.0.2.2 for host machine loopback.
        return input.replace("://localhost", "://10.0.2.2").replace("://127.0.0.1", "://10.0.2.2");
      }
      if (overrideHost) {
        return input.replace("://localhost", `://${overrideHost}`).replace("://127.0.0.1", `://${overrideHost}`);
      }
    }
    return input;
  };

  if (/^https?:\/\//i.test(url)) {
    return replaceLocalhostHost(url);
  }
  const base = replaceLocalhostHost(API_BASE_URL).replace(/\/+$/, "");
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${base}${path}`;
}

function extractCollection<T>(data: any, keys: string[]): T[] {
  const direct = extractList<T>(data);
  if (direct.length > 0) return direct;

  const nestedCandidates = [
    data?.data,
    data?.result,
    data?.payload,
    data?.data?.data,
    data?.data?.result,
  ];
  for (const candidate of nestedCandidates) {
    const nestedDirect = extractList<T>(candidate);
    if (nestedDirect.length > 0) return nestedDirect;
  }

  for (const key of keys) {
    const nested = extractList<T>(
      data?.[key] ??
      data?.data?.[key] ??
      data?.result?.[key] ??
      data?.payload?.[key] ??
      data?.data?.data?.[key],
    );
    if (nested.length > 0) return nested;
  }
  return [];
}

function findFirstObjectArray(value: any): any[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (!value || typeof value !== "object") {
    return [];
  }
  for (const key of Object.keys(value)) {
    const nested = findFirstObjectArray(value[key]);
    if (nested.length > 0) {
      return nested;
    }
  }
  return [];
}

function objectValuesAsArray<T>(value: any): T[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }
  const values = Object.values(value);
  if (!values.length) return [];
  if (values.every((entry) => entry && typeof entry === "object")) {
    return values as T[];
  }
  return [];
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

export async function getBanners(): Promise<BannerDto[]> {
  try {
    const headers = await authHeaders();
    let data: any;
    try {
      const response = await api.get("/api/banners", { headers, params: { page: 0, size: 20 } });
      data = response.data;
    } catch (error) {
      // If endpoint is public and auth fails for any reason, fallback to public request.
      const status = (error as any)?.response?.status;
      if (status === 401 || status === 403) {
        const response = await api.get("/api/banners", { params: { page: 0, size: 20 } });
        data = response.data;
      } else {
        throw error;
      }
    }

    const items = extractCollection<BannerDto>(data, ["banners", "items", "records", "rows"]);
    if (__DEV__ && items.length === 0) {
      // eslint-disable-next-line no-console
      console.log("[homeApi:getBanners:empty]", { topLevelKeys: data && typeof data === "object" ? Object.keys(data) : [] });
    }
    const mapped = items.map((item) => ({
      ...item,
      imageUrl: toAbsoluteUrl(item?.bannerImageUrl ?? item?.imageUrl),
      bannerImageUrl: toAbsoluteUrl(item?.bannerImageUrl ?? item?.imageUrl),
    }));
    if (__DEV__) {
      const missingImageIds = mapped
        .filter((item) => !(item?.bannerImageUrl ?? item?.imageUrl))
        .map((item) => String(item?.bannerId ?? item?.id ?? ""))
        .filter(Boolean);
      if (missingImageIds.length > 0) {
        // eslint-disable-next-line no-console
        console.log("[homeApi:getBanners:missingImageUrl]", { missingImageIds });
      }
    }
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log("[homeApi:getBanners]", {
        apiBaseUrl: API_BASE_URL,
        devImageHost: DEV_IMAGE_HOST || null,
        platform: Platform.OS,
        tokenProvided: !!headers.Authorization,
        count: mapped.length,
        topLevelKeys: data && typeof data === "object" ? Object.keys(data) : [],
        rawImageUrl: items[0]?.bannerImageUrl ?? items[0]?.imageUrl ?? null,
        sample: mapped[0]
          ? {
              id: mapped[0].bannerId ?? mapped[0].id,
              title: mapped[0].title,
              imageUrl: mapped[0].bannerImageUrl ?? mapped[0].imageUrl,
              status: mapped[0].status,
              startDate: (mapped[0] as any).startDate,
              endDate: (mapped[0] as any).endDate,
              city: (mapped[0] as any).city,
              platformType: (mapped[0] as any).platformType,
            }
          : null,
      });
    }
    return mapped;
  } catch (error) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log("[homeApi:getBanners:error]", {
        platform: Platform.OS,
        message: parseApiError(error, "Banners failed"),
      });
    }
    throw new Error(parseApiError(error, "Banners failed"));
  }
}

export async function getCategories(): Promise<CategoryDto[]> {
  try {
    const headers = await authHeaders();
    let data: any;
    try {
      const response = await api.get("/api/categories", { headers });
      data = response.data;
    } catch (error) {
      const status = (error as any)?.response?.status;
      if (status === 401 || status === 403) {
        const response = await api.get("/api/categories");
        data = response.data;
      } else {
        throw error;
      }
    }
    const extracted = extractCollection<CategoryDto>(data, ["categories", "items", "rows", "records"]);
    const firstArray = findFirstObjectArray(data) as CategoryDto[];
    const dataObjectValues = objectValuesAsArray<CategoryDto>(data?.data);
    const items = extracted.length > 0 ? extracted : firstArray.length > 0 ? firstArray : dataObjectValues;
    if (__DEV__ && items.length === 0) {
      // eslint-disable-next-line no-console
      console.log("[homeApi:getCategories:empty]", { topLevelKeys: data && typeof data === "object" ? Object.keys(data) : [] });
    }
    const mapped = items.map((item) => ({
      ...item,
      categoryIcon: toAbsoluteUrl(item?.categoryIcon ?? (item as any)?.iconUrl ?? item?.icon),
      categoryImage: toAbsoluteUrl(item?.categoryImage ?? (item as any)?.iconUrl ?? item?.imageUrl),
      imageUrl: toAbsoluteUrl((item as any)?.iconUrl ?? item?.categoryImage ?? item?.imageUrl),
    }));
    if (__DEV__) {
      const missingImageIds = mapped
        .filter((item) => !(item?.categoryImage ?? item?.categoryIcon ?? (item as any)?.imageUrl))
        .map((item) => String(item?.categoryId ?? item?.id ?? ""))
        .filter(Boolean);
      if (missingImageIds.length > 0) {
        // eslint-disable-next-line no-console
        console.log("[homeApi:getCategories:missingImageUrl]", { missingImageIds });
      }
    }
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log("[homeApi:getCategories]", {
        apiBaseUrl: API_BASE_URL,
        devImageHost: DEV_IMAGE_HOST || null,
        platform: Platform.OS,
        tokenProvided: !!headers.Authorization,
        count: mapped.length,
        topLevelKeys: data && typeof data === "object" ? Object.keys(data) : [],
        rawImageUrl: (items[0] as any)?.categoryImage ?? (items[0] as any)?.iconUrl ?? (items[0] as any)?.imageUrl ?? null,
        sample: mapped[0]
          ? {
              id: mapped[0].categoryId ?? mapped[0].id,
              categoryName: mapped[0].categoryName ?? mapped[0].name,
              categoryImage: mapped[0].categoryImage,
              activeStatus: mapped[0].activeStatus ?? (mapped[0] as any).status,
              displayOrder: mapped[0].displayOrder,
            }
          : null,
      });
    }
    return mapped;
  } catch (error) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log("[homeApi:getCategories:error]", parseApiError(error, "Categories failed"));
    }
    throw new Error(parseApiError(error, "Categories failed"));
  }
}
export async function getRecommendedServices(): Promise<ServiceDto[]> { try { const { data } = await api.get("/api/services/recommended"); return extractList<ServiceDto>(data); } catch (error) { throw new Error(parseApiError(error, "Recommended services failed")); } }
export async function getQuickServices(): Promise<ServiceDto[]> { try { const { data } = await api.get("/api/services/quick"); return extractList<ServiceDto>(data); } catch (error) { throw new Error(parseApiError(error, "Quick services failed")); } }
export async function searchServices(keyword: string): Promise<ServiceDto[]> { try { const { data } = await api.get("/api/search/services", { params: { keyword } }); return extractList<ServiceDto>(data); } catch (error) { throw new Error(parseApiError(error, "Search failed")); } }

export async function getHomeData() {
  const [dashboard, banners, categories, recommendedServices, quickServices] = await Promise.all([
    getDashboard(),
    getBanners(),
    getCategories(),
    getRecommendedServices(),
    getQuickServices(),
  ]);

  return {
    greeting: dashboard?.greeting ?? "Welcome to Lexho",
    location: dashboard?.location ?? "Your city",
    banners,
    categories,
    featuredServices: [],
    recommendedServices,
    quickServices,
    recentBookings: (dashboard?.recentBookings ?? []) as BookingSummaryDto[],
  };
}
