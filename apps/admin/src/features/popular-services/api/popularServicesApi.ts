import { api } from "@/api/axios";

import type {
  CategoryOption,
  CreatePopularServicePayload,
  PopularServiceItem,
  ServiceItem,
} from "../types";

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === "object" ? (value as UnknownRecord) : {};

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

const pickRows = (payload: unknown): UnknownRecord[] => {
  if (Array.isArray(payload)) return payload as UnknownRecord[];
  const root = asRecord(payload);
  const nested = asRecord(root.data);
  const candidates = [root.content, root.items, root.results, root.data, nested.content, nested.items, nested.results];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate as UnknownRecord[];
  }
  return [];
};

const POPULAR_ENDPOINTS = [
  "/api/admin/popular-services",
  "/api/v1/admin/popular-services",
] as const;

async function getWithFallback(path: string, params?: Record<string, unknown>) {
  let lastError: unknown = null;
  for (const base of POPULAR_ENDPOINTS) {
    try {
      return await api.get(`${base}${path}`, { params });
    } catch (error: any) {
      lastError = error;
      const status = Number(error?.response?.status ?? 0);
      if (status === 404) continue;
      throw error;
    }
  }
  throw lastError;
}

async function postWithFallback(path: string, payload: unknown) {
  let lastError: unknown = null;
  for (const base of POPULAR_ENDPOINTS) {
    try {
      return await api.post(`${base}${path}`, payload);
    } catch (error: any) {
      lastError = error;
      const status = Number(error?.response?.status ?? 0);
      if (status === 404) continue;
      throw error;
    }
  }
  throw lastError;
}

async function deleteWithFallback(path: string, payload?: unknown) {
  let lastError: unknown = null;
  for (const base of POPULAR_ENDPOINTS) {
    try {
      return await api.delete(`${base}${path}`, payload ? { data: payload } : undefined);
    } catch (error: any) {
      lastError = error;
      const status = Number(error?.response?.status ?? 0);
      if (status === 404) continue;
      throw error;
    }
  }
  throw lastError;
}

async function patchWithFallback(path: string, payload?: unknown) {
  let lastError: unknown = null;
  for (const base of POPULAR_ENDPOINTS) {
    try {
      return await api.patch(`${base}${path}`, payload ?? {});
    } catch (error: any) {
      lastError = error;
      const status = Number(error?.response?.status ?? 0);
      if (status === 404) continue;
      throw error;
    }
  }
  throw lastError;
}

export async function getCategoryOptions(): Promise<CategoryOption[]> {
  const { data } = await api.get("/api/admin/categories", { params: { page: 1, limit: 200 } });
  return pickRows(data).map((row) => ({
    id: asString(row.id ?? row.categoryId),
    name: asString(row.name ?? row.categoryName),
  }));
}

export async function getServicesByCategory(categoryId: string): Promise<ServiceItem[]> {
  const normalizeRows = (rows: UnknownRecord[]) =>
    rows.map((row) => {
      const category = asRecord(row.category);
      return {
        id: asString(row.id ?? row.serviceId),
        name: asString(row.name ?? row.serviceName),
        imageUrl: asString(row.imageUrl ?? row.thumbnailUrl ?? row.bannerImageUrl),
        price: asNumber(row.basePrice ?? row.price),
        rating: asNumber(row.rating),
        categoryId: asString(row.categoryId ?? category.id ?? category.categoryId),
        categoryName: asString(row.categoryName ?? category.name),
      };
    });

  const requests: Array<Record<string, unknown>> = [
    { page: 0, size: 200, categoryId },
    { page: 1, limit: 200, categoryId },
    { page: 0, size: 200, category: categoryId },
    { page: 1, limit: 200, category: categoryId },
    { page: 0, size: 400 },
  ];

  for (const params of requests) {
    const { data } = await api.get("/api/admin/services", { params });
    const mapped = normalizeRows(pickRows(data));
    if (!mapped.length) continue;

    const filtered = mapped.filter((item) => String(item.categoryId) === String(categoryId));
    if (filtered.length > 0) {
      return filtered;
    }

    // If backend ignored category params, do not leak mismatched category services.
    if (params.categoryId || params.category) {
      continue;
    }
  }

  return [];
}

export async function getPopularServicesByCategory(categoryId: string): Promise<PopularServiceItem[]> {
  const { data } = await getWithFallback("", { categoryId });
  return pickRows(data).map((row) => {
    const service = asRecord(row.service);
    const category = asRecord(row.category);
    return {
      id: asString(row.id ?? row.popularServiceId),
      serviceId: asString(row.serviceId ?? service.id),
      serviceName: asString(row.serviceName ?? service.name),
      categoryId: asString(row.categoryId ?? category.id ?? categoryId),
      priority: asNumber(row.priority, 0),
      deletedAt: asString(row.deletedAt),
    };
  });
}

export async function getDeletedPopularServicesByCategory(categoryId: string): Promise<PopularServiceItem[]> {
  const { data } = await getWithFallback("", { categoryId, deleted: true });
  return pickRows(data).map((row) => {
    const service = asRecord(row.service);
    const category = asRecord(row.category);
    return {
      id: asString(row.id ?? row.popularServiceId),
      serviceId: asString(row.serviceId ?? service.id),
      serviceName: asString(row.serviceName ?? service.name),
      categoryId: asString(row.categoryId ?? category.id ?? categoryId),
      priority: asNumber(row.priority, 0),
      deletedAt: asString(row.deletedAt),
    };
  });
}

export async function createPopularService(payload: CreatePopularServicePayload) {
  const normalizedServiceId = Number(payload?.serviceId);
  const normalizedCategoryId = Number(payload?.categoryId);
  let attemptPriority = Math.max(1, Number(payload?.priority) || 1);

  const isDuplicateLikeError = (error: any) => {
    const status = Number(error?.response?.status ?? 0);
    const message = String(error?.response?.data?.message ?? error?.message ?? "").toLowerCase();
    return status === 400 && (
      message.includes("duplicate") ||
      message.includes("already exists") ||
      message.includes("invalid data") ||
      message.includes("priority")
    );
  };

  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      const { data } = await postWithFallback("", {
        ...payload,
        priority: attemptPriority,
      });
      return data;
    } catch (error: any) {
      if (!isDuplicateLikeError(error)) throw error;
      if (!Number.isFinite(normalizedCategoryId) || normalizedCategoryId <= 0) throw error;

      const existing = await getPopularServicesByCategory(String(normalizedCategoryId));
      const serviceAlreadyExists = existing.some(
        (item) => Number(item.serviceId) === normalizedServiceId,
      );
      if (serviceAlreadyExists) {
        throw new Error("This service is already marked as popular in this category");
      }

      // If backend treats soft-deleted duplicates as invalid create, restore instead.
      const deleted = await getDeletedPopularServicesByCategory(String(normalizedCategoryId));
      const deletedMatch = deleted.find((item) => Number(item.serviceId) === normalizedServiceId);
      if (deletedMatch?.id) {
        await restorePopularService(deletedMatch.id, attemptPriority);
        return { restored: true, id: deletedMatch.id, priority: attemptPriority };
      }

      const usedPriorities = new Set(
        existing
          .map((item) => Number(item.priority))
          .filter((value) => Number.isFinite(value) && value > 0),
      );
      let nextPriority = Math.max(attemptPriority + 1, 1);
      while (usedPriorities.has(nextPriority)) nextPriority += 1;
      attemptPriority = nextPriority;
    }
  }

  throw new Error("Unable to assign a unique popular priority. Please try again.");
}

export async function deletePopularService(id: string, deleteReason?: string) {
  await deleteWithFallback(`/${id}`, deleteReason ? { deleteReason } : undefined);
}

export async function restorePopularService(id: string, priority?: number) {
  const payload = Number.isFinite(priority) && Number(priority) > 0 ? { priority: Number(priority) } : undefined;
  await patchWithFallback(`/${id}/restore`, payload);
}
