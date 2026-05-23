import axios from "axios";
import { isAxiosError } from "axios";
import type {
  CreateServiceableAreaPayload,
  ServiceableAreaItem,
  ServiceableAreaListResponse,
  ServiceableAreaQueryParams,
  UpdateServiceableAreaPayload,
} from "../types";
import { getAccessToken } from "@/utils/authSession";
import { appConfig } from "@/config";

type AnyObj = Record<string, unknown>;

const BASE_PATH = "/api/v1/admin/serviceable-areas";
const LEGACY_BASE_PATH = "/api/admin/serviceable-areas";
const serviceableAreasApi = axios.create({
  baseURL: appConfig.apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

serviceableAreasApi.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (!token) {
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.replace("/login");
    }
    return Promise.reject(new Error("Authorization token is required"));
  }
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

const VALID_SORT_FIELDS = new Set(["id", "name", "city", "state", "pincode", "country", "createdAt", "updatedAt"]);

function normalizeQueryParams(params: ServiceableAreaQueryParams) {
  const page = Number.isFinite(params.page) ? Math.max(0, Math.trunc(params.page)) : 0;
  const size = Number.isFinite(params.size) ? Math.max(1, Math.trunc(params.size)) : 10;
  const sortBy = VALID_SORT_FIELDS.has(params.sortBy) ? params.sortBy : "id";
  const sortDir = params.sortDir === "asc" ? "asc" : "desc";
  const normalizedQuery = params.query?.trim();

  return {
    page,
    size,
    sortBy,
    sortDir,
    query: normalizedQuery && normalizedQuery.length > 0 ? normalizedQuery : undefined,
    status: params.status && params.status !== "ALL" ? params.status : undefined,
  };
}

function mapArea(input: unknown): ServiceableAreaItem {
  const source = (input ?? {}) as AnyObj;
  return {
    id: String(source.id ?? source.areaId ?? ""),
    name: asString(source.name),
    pincode: asString(source.pincode ?? source.pinCode ?? source.postalCode),
    city: asString(source.city),
    state: asString(source.state),
    country: asString(source.country || "India"),
    cityId: asNumber(source.cityId, 0) || undefined,
    zoneId: asNumber(source.zoneId, 0) || undefined,
    polygonJson: asString(source.polygonJson) || undefined,
    active: asBoolean(source.active ?? source.isActive, true),
    createdAt: asString(source.createdAt) || undefined,
    updatedAt: asString(source.updatedAt) || undefined,
  };
}

function logApiError(context: string, error: unknown) {
  if (!isAxiosError(error)) {
    console.error(`[ServiceableAreas] ${context} failed`, error);
    return;
  }

  console.error(`[ServiceableAreas] ${context} failed`, {
    status: error.response?.status,
    url: error.config?.url,
    method: error.config?.method,
    requestData: error.config?.data,
    responseData: error.response?.data,
  });
}

function normalizePagedResponse(raw: unknown, fallbackPage: number, fallbackSize: number): ServiceableAreaListResponse {
  const root = (raw ?? {}) as AnyObj;
  const data = ((root.data ?? root) ?? {}) as AnyObj;
  const content =
    asArray<unknown>(data.items).length > 0
      ? asArray<unknown>(data.items)
      : asArray<unknown>(data.content).length > 0
        ? asArray<unknown>(data.content)
        : asArray<unknown>(data.rows);

  return {
    items: content.map(mapArea).filter((item) => item.id),
    total: asNumber(data.total ?? data.totalElements ?? data.count ?? content.length, content.length),
    page: asNumber(data.page ?? data.number, fallbackPage),
    size: asNumber(data.size ?? data.pageSize, fallbackSize),
  };
}

export async function getServiceableAreas(params: ServiceableAreaQueryParams): Promise<ServiceableAreaListResponse> {
  const normalized = normalizeQueryParams(params);
  try {
    const response = await serviceableAreasApi.get(BASE_PATH, {
      params: {
        page: normalized.page,
        size: normalized.size,
        sortBy: normalized.sortBy,
        sortDir: normalized.sortDir,
        ...(normalized.query ? { search: normalized.query } : {}),
        ...(normalized.status ? { status: normalized.status } : {}),
      },
    });
    return normalizePagedResponse(response.data, normalized.page, normalized.size);
  } catch (error) {
    if (normalized.query) {
      try {
        const response = await serviceableAreasApi.get(`${BASE_PATH}/search`, {
          params: {
            q: normalized.query,
            page: normalized.page,
            size: normalized.size,
          },
        });
        return normalizePagedResponse(response.data, normalized.page, normalized.size);
      } catch {
        const legacyResponse = await serviceableAreasApi.get(LEGACY_BASE_PATH, {
          params: {
            page: normalized.page,
            size: normalized.size,
            sortBy: normalized.sortBy,
            sortDir: normalized.sortDir,
            query: normalized.query,
            ...(normalized.status ? { status: normalized.status } : {}),
          },
        });
        return normalizePagedResponse(legacyResponse.data, normalized.page, normalized.size);
      }
    }
    const legacyResponse = await serviceableAreasApi.get(LEGACY_BASE_PATH, {
      params: {
        page: normalized.page,
        size: normalized.size,
        sortBy: normalized.sortBy,
        sortDir: normalized.sortDir,
        ...(normalized.status ? { status: normalized.status } : {}),
      },
    });
    return normalizePagedResponse(legacyResponse.data, normalized.page, normalized.size);
  }
}

export async function createServiceableArea(payload: CreateServiceableAreaPayload): Promise<ServiceableAreaItem> {
  console.log("[ServiceableAreas] create payload", payload);
  try {
    const response = await serviceableAreasApi.post(BASE_PATH, payload, {
      headers: { "Content-Type": "application/json" },
    });
    const data = ((response.data ?? {}) as AnyObj).data as unknown;
    return mapArea(data);
  } catch (error) {
    try {
      const response = await serviceableAreasApi.post(LEGACY_BASE_PATH, payload, {
        headers: { "Content-Type": "application/json" },
      });
      const data = ((response.data ?? {}) as AnyObj).data as unknown;
      return mapArea(data);
    } catch (fallbackError) {
      logApiError("createServiceableArea", fallbackError);
      throw fallbackError;
    }
  }
}

export async function updateServiceableArea(
  id: string,
  payload: UpdateServiceableAreaPayload,
): Promise<ServiceableAreaItem> {
  console.log("[ServiceableAreas] update payload", { id, payload });
  try {
    const response = await serviceableAreasApi.put(`${BASE_PATH}/${id}`, payload, {
      headers: { "Content-Type": "application/json" },
    });
    const data = ((response.data ?? {}) as AnyObj).data as unknown;
    return mapArea(data);
  } catch (error) {
    try {
      const response = await serviceableAreasApi.put(`${LEGACY_BASE_PATH}/${id}`, payload, {
        headers: { "Content-Type": "application/json" },
      });
      const data = ((response.data ?? {}) as AnyObj).data as unknown;
      return mapArea(data);
    } catch (fallbackError) {
      logApiError("updateServiceableArea", fallbackError);
      throw fallbackError;
    }
  }
}

export async function deleteServiceableArea(id: string): Promise<void> {
  try {
    await serviceableAreasApi.delete(`${BASE_PATH}/${id}`);
  } catch {
    await serviceableAreasApi.delete(`${LEGACY_BASE_PATH}/${id}`);
  }
}

export async function updateServiceableAreaStatus(id: string, active: boolean): Promise<void> {
  try {
    await serviceableAreasApi.patch(`${BASE_PATH}/${id}/status`, { active });
  } catch {
    await serviceableAreasApi.patch(`${LEGACY_BASE_PATH}/${id}/status`, { active });
  }
}
