import { api, parseApiError } from "./client";
import { DEV_BYPASS_API_TOKEN, DEV_LOGIN_BYPASS } from "../constants/env";
import { getToken } from "../utils/storage";
import { store } from "../redux/store";

export type CustomerServiceDto = {
  id: number;
  categoryId?: string | number;
  name?: string;
  serviceName?: string;
  title?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  isNew?: boolean;
  rating?: number | string;
  reviewsCount?: number | string;
  discountedPrice?: number;
  originalPrice?: number;
  price?: number;
};

export type CustomerServiceDetailsDto = {
  serviceId: number;
  serviceName: string;
  included: string[];
  excluded: string[];
};

export type CustomerCatalogQuery = {
  page?: number;
  size?: number;
  search?: string;
};

type ApiShape = { response?: { data?: { message?: unknown } }; message?: unknown };

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      if (typeof row === "string") return asString(row, "");
      const rec = asRecord(row);
      return asString(rec.itemName ?? rec.name ?? rec.value, "");
    })
    .filter(Boolean);
}

function normalizeError(error: unknown, fallback: string): Error {
  const e = error as ApiShape;
  const message = asString(e?.response?.data?.message, "") || asString(e?.message, "") || fallback;
  return new Error(message);
}

export async function fetchCustomerServicesByCategory(params: {
  categoryId: string | number;
  page?: number;
  size?: number;
}): Promise<CustomerServiceDto[]> {
  const { categoryId, page = 0, size = 20 } = params;

  const extractList = (data: any): CustomerServiceDto[] => {
    if (Array.isArray(data?.data)) return data.data as CustomerServiceDto[];
    if (Array.isArray(data?.content)) return data.content as CustomerServiceDto[];
    if (Array.isArray(data?.items)) return data.items as CustomerServiceDto[];
    if (Array.isArray(data)) return data as CustomerServiceDto[];
    return [];
  };

  const authHeaders = async () => {
    if (DEV_LOGIN_BYPASS && __DEV__) {
      return DEV_BYPASS_API_TOKEN ? { Authorization: `Bearer ${DEV_BYPASS_API_TOKEN}` } : {};
    }
    const storageToken = await getToken();
    const stateToken = store.getState()?.auth?.token ?? null;
    const token = storageToken || stateToken;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const tryFetch = async (path: string, includeHeaders: boolean) => {
    const headers = includeHeaders ? await authHeaders() : undefined;
    const { data } = await api.get(path, {
      headers,
      params: { categoryId, page, size },
    });
    return extractList(data);
  };

  try {
    const withAuth = await tryFetch("/api/customer/services", true);
    if (withAuth.length > 0) return withAuth;
  } catch (error: any) {
    const status = error?.response?.status;
    const message = String(error?.response?.data?.message ?? error?.message ?? "").toLowerCase();
    const unauthorized = status === 401 || status === 403 || message.includes("authorization token is required");

    if (!unauthorized) {
      throw normalizeError(error, parseApiError(error, "Failed to fetch services"));
    }
  }

  try {
    const publicServices = await tryFetch("/api/services", false);
    if (publicServices.length > 0) return publicServices;
  } catch {}

  try {
    const { data } = await api.get(`/api/services/category/${categoryId}`, {
      params: { page, size },
    });
    const byCategoryPath = extractList(data);
    if (byCategoryPath.length > 0) return byCategoryPath;
  } catch {}

  return [];
}

export async function fetchServiceDetails(serviceId: string | number): Promise<CustomerServiceDetailsDto> {
  const mapDetailsPayload = (payload: unknown): CustomerServiceDetailsDto => {
    const root = asRecord(payload);
    const wrapped = root?.data && typeof root.data === "object" ? asRecord(root.data) : root;
    const included = toStringList(wrapped.included ?? wrapped.includedItems);
    const excluded = toStringList(wrapped.excluded ?? wrapped.excludedItems);
    const detailRows = asArray(wrapped.details);

    const detailsIncluded = detailRows
      .filter((row) => asString(asRecord(row).type, "").toUpperCase() === "INCLUDED")
      .map((row) => asString(asRecord(row).itemName ?? asRecord(row).name ?? asRecord(row).value, ""))
      .filter(Boolean);

    const detailsExcluded = detailRows
      .filter((row) => asString(asRecord(row).type, "").toUpperCase() === "EXCLUDED")
      .map((row) => asString(asRecord(row).itemName ?? asRecord(row).name ?? asRecord(row).value, ""))
      .filter(Boolean);

    return {
      serviceId: asNumber(wrapped.serviceId ?? wrapped.id, asNumber(serviceId, 0)),
      serviceName: asString(wrapped.serviceName ?? wrapped.name, "Service Details"),
      included: included.length > 0 ? included : detailsIncluded,
      excluded: excluded.length > 0 ? excluded : detailsExcluded,
    };
  };

  try {
    const attempts = [
      `/api/customer/services/${serviceId}/details`,
      `/api/services/${serviceId}/details`,
      `/api/customer/services/catalog?page=0&size=100`,
    ];

    for (const path of attempts) {
      try {
        const { data } = await api.get(path);
        if (path.includes("/catalog")) {
          const root = asRecord(data);
          const list = (asArray(root.data).length ? asArray(root.data) : asArray(root.items)).map((row) => asRecord(row));
          const matched = list.find((row) => asNumber(row.id ?? row.serviceId, 0) === asNumber(serviceId, 0));
          if (matched) return mapDetailsPayload(matched);
          continue;
        }
        return mapDetailsPayload(data);
      } catch {
        // Try next fallback endpoint.
      }
    }

    throw new Error("Service details not found");
  } catch (error) {
    throw normalizeError(error, parseApiError(error, "Failed to fetch service details"));
  }
}

export async function fetchCustomerServicesCatalog(query: CustomerCatalogQuery = {}): Promise<CustomerServiceDto[]> {
  const page = Number.isFinite(Number(query.page)) ? Number(query.page) : 0;
  const size = Number.isFinite(Number(query.size)) ? Number(query.size) : 20;
  const search = asString(query.search, "");

  const extractList = (data: any): CustomerServiceDto[] => {
    if (Array.isArray(data?.data)) return data.data as CustomerServiceDto[];
    if (Array.isArray(data?.content)) return data.content as CustomerServiceDto[];
    if (Array.isArray(data?.items)) return data.items as CustomerServiceDto[];
    if (Array.isArray(data)) return data as CustomerServiceDto[];
    return [];
  };

  try {
    const { data } = await api.get("/api/customer/services/catalog", {
      params: { page, size, search: search || undefined },
    });
    return extractList(data);
  } catch (error) {
    throw normalizeError(error, parseApiError(error, "Failed to search services"));
  }
}
