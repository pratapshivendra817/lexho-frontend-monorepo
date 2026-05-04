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
  const { data } = await api.get("/api/admin/popular-services", { params: { categoryId } });
  return pickRows(data).map((row) => {
    const service = asRecord(row.service);
    const category = asRecord(row.category);
    return {
      id: asString(row.id ?? row.popularServiceId),
      serviceId: asString(row.serviceId ?? service.id),
      serviceName: asString(row.serviceName ?? service.name),
      categoryId: asString(row.categoryId ?? category.id ?? categoryId),
      priority: asNumber(row.priority, 0),
    };
  });
}

export async function createPopularService(payload: CreatePopularServicePayload) {
  const { data } = await api.post("/api/admin/popular-services", payload);
  return data;
}

export async function deletePopularService(id: string) {
  await api.delete(`/api/admin/popular-services/${id}`);
}
