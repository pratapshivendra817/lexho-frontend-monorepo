import { api, extractList, parseApiError, unwrapPayload } from "./client";
import { API_BASE_URL, DEV_IMAGE_HOST } from "../constants/env";
import { Platform } from "react-native";
import { getToken } from "../utils/storage";
import { store } from "../redux/store";
import { DEV_LOGIN_BYPASS } from "../constants/env";
import { DEV_BYPASS_API_TOKEN } from "../constants/env";
import type { BannerDto, BookingSummaryDto, CategoryDto, HomeDashboardResponse, ServiceDto } from "../types/contracts";
import { cacheManager } from "../services/cacheManager";

const HOME_REQUEST_TIMEOUT_MS = 6000;

export async function getDashboard(): Promise<HomeDashboardResponse> {
  try {
    const { data } = await api.get("/api/home/dashboard");
    return unwrapPayload<HomeDashboardResponse>(data, {} as HomeDashboardResponse);
  } catch (error) {
    throw new Error(parseApiError(error, "Dashboard failed"));
  }
}

function toAbsoluteUrl(url?: string) {
  if (!url) return undefined;

  const replaceLocalhostHost = (input: string) => {
    const overrideHost = DEV_IMAGE_HOST || "";
    if (/^https?:\/\/localhost/i.test(input) || /^https?:\/\/127\.0\.0\.1/i.test(input)) {
      if (overrideHost) {
        return input.replace("://localhost", `://${overrideHost}`).replace("://127.0.0.1", `://${overrideHost}`);
      }
      if (Platform.OS === "android") {
        // Android emulator must use 10.0.2.2 for host machine loopback.
        return input.replace("://localhost", "://10.0.2.2").replace("://127.0.0.1", "://10.0.2.2");
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

export async function getBanners(): Promise<BannerDto[]> {
  try {
    const headers = await authHeaders();
    let data: any = null;
    const attempts = [
      // Home campaigns are separate from the single category/service banner feed.
      "/api/customer/home/banners",
      "/api/banners",
      "/api/customer/banners",
      "/api/home/banners",
    ];

    for (const path of attempts) {
      try {
        const response = await api.get(path, {
          headers,
          params: { page: 0, size: 20, audience: "CUSTOMER", platformType: Platform.OS.toUpperCase() },
        });
        data = response.data;
      } catch (error) {
        const status = (error as any)?.response?.status;
        if (status === 401 || status === 403) {
          try {
            const response = await api.get(path, {
              params: { page: 0, size: 20, audience: "CUSTOMER", platformType: Platform.OS.toUpperCase() },
            });
            data = response.data;
          } catch {
            data = null;
          }
        }
      }

      const tentative = extractCollection<BannerDto>(data, ["banners", "items", "records", "rows", "content"]);
      if (tentative.length > 0) {
        break;
      }
    }

    const items = extractCollection<BannerDto>(data, ["banners", "items", "records", "rows", "content"]);
    const mapped = items.map((item) => ({
      ...item,
      imageUrl: toAbsoluteUrl(
        (item as any)?.bannerImageUrl ??
        item?.imageUrl ??
        (item as any)?.thumbnailUrl ??
        (item as any)?.image ??
        (item as any)?.url ??
        (item as any)?.path,
      ),
      bannerImageUrl: toAbsoluteUrl(
        (item as any)?.bannerImageUrl ??
        item?.imageUrl ??
        (item as any)?.thumbnailUrl ??
        (item as any)?.image ??
        (item as any)?.url ??
        (item as any)?.path,
      ),
    }));
    return [...mapped].sort((first: any, second: any) => {
      const firstOrder = Number(first?.displayOrder ?? first?.priority ?? Number.MAX_SAFE_INTEGER);
      const secondOrder = Number(second?.displayOrder ?? second?.priority ?? Number.MAX_SAFE_INTEGER);
      if (firstOrder !== secondOrder) return firstOrder - secondOrder;
      const firstName = String(first?.categoryName ?? first?.name ?? "");
      const secondName = String(second?.categoryName ?? second?.name ?? "");
      return firstName.localeCompare(secondName);
    });
  } catch (error) {
    throw new Error(parseApiError(error, "Banners failed"));
  }
}

export async function getCategories(): Promise<CategoryDto[]> {
  const cacheKey = "service-categories";
  try {
    const headers = await authHeaders();
    let data: any = null;
    const paths = [
      "/api/categories",
      "/api/customer/categories",
      "/api/v1/categories",
      "/api/v1/customer/categories",
    ];
    const geoParams = getGeoParams();
    for (const path of paths) {
      const attempts: Array<{ params?: Record<string, unknown>; withAuth: boolean }> = [
        { params: Object.keys(geoParams).length > 0 ? geoParams : undefined, withAuth: true },
        { params: undefined, withAuth: true },
        { params: Object.keys(geoParams).length > 0 ? geoParams : undefined, withAuth: false },
        { params: undefined, withAuth: false },
      ];
      for (const attempt of attempts) {
        try {
          const response = await api.get(path, {
            headers: attempt.withAuth ? headers : undefined,
            params: attempt.params,
            timeout: HOME_REQUEST_TIMEOUT_MS,
          });
          const rows = extractCollection<CategoryDto>(response.data, ["categories", "items", "rows", "records"]);
          if (!data) data = response.data;
          if (rows.length === 0) continue;
          data = response.data;
          break;
        } catch (error: any) {
          const status = Number(error?.response?.status ?? 0);
          if (status === 404 || status === 401 || status === 403) continue;
          throw error;
        }
      }
      const extractedRows = extractCollection<CategoryDto>(data, ["categories", "items", "rows", "records"]);
      if (extractedRows.length > 0) {
        break;
      }
    }
    const extracted = extractCollection<CategoryDto>(data, ["categories", "items", "rows", "records"]);
    const firstArray = findFirstObjectArray(data) as CategoryDto[];
    const dataObjectValues = objectValuesAsArray<CategoryDto>(data?.data);
    const items = extracted.length > 0 ? extracted : firstArray.length > 0 ? firstArray : dataObjectValues;
    const mapped = items.map((item) => ({
      ...item,
      categoryIcon: toAbsoluteUrl(item?.categoryIcon ?? (item as any)?.iconUrl ?? item?.icon),
      categoryImage: toAbsoluteUrl(item?.categoryImage ?? (item as any)?.iconUrl ?? item?.imageUrl),
      imageUrl: toAbsoluteUrl((item as any)?.iconUrl ?? item?.categoryImage ?? item?.imageUrl),
    }));
    await cacheManager.set(cacheKey, mapped);
    return mapped;
  } catch (error) {
    const cached = await cacheManager.get<CategoryDto[]>(cacheKey, 60 * 60 * 1000);
    if (cached) {
      return cached;
    }
    throw new Error(parseApiError(error, "Categories failed"));
  }
}
function mapServiceImages(rows: ServiceDto[]): ServiceDto[] {
  return rows.map((item) => ({
    ...item,
    imageUrl: toAbsoluteUrl((item as any)?.imageUrl ?? (item as any)?.thumbnailUrl ?? (item as any)?.iconUrl),
  }));
}

export async function getRecommendedServices(): Promise<ServiceDto[]> {
  const cacheKey = "recommended-services";
  try {
    const { data } = await api.get("/api/services/recommended", { params: getGeoParams() });
    const mapped = mapServiceImages(extractCollection<ServiceDto>(data, ["services", "items", "rows", "records", "content"]));
    await cacheManager.set(cacheKey, mapped);
    return mapped;
  } catch (error) {
    const cached = await cacheManager.get<ServiceDto[]>(cacheKey, 30 * 60 * 1000);
    if (cached) {
      return cached;
    }
    throw new Error(parseApiError(error, "Recommended services failed"));
  }
}

export async function getQuickServices(): Promise<ServiceDto[]> {
  const cacheKey = "quick-services";
  try {
    const { data } = await api.get("/api/services/quick", { params: getGeoParams() });
    const mapped = mapServiceImages(extractCollection<ServiceDto>(data, ["services", "items", "rows", "records", "content"]));
    await cacheManager.set(cacheKey, mapped);
    return mapped;
  } catch (error) {
    const cached = await cacheManager.get<ServiceDto[]>(cacheKey, 30 * 60 * 1000);
    if (cached) {
      return cached;
    }
    throw new Error(parseApiError(error, "Quick services failed"));
  }
}

export async function searchServices(keyword: string): Promise<ServiceDto[]> {
  try {
    const { data } = await api.get("/api/search/services", { params: { keyword, ...getGeoParams() } });
    return mapServiceImages(extractCollection<ServiceDto>(data, ["services", "items", "rows", "records", "content"]));
  } catch (error) {
    throw new Error(parseApiError(error, "Search failed"));
  }
}

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
