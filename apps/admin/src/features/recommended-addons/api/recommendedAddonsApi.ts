import { api } from "@/api/axios";

import type {
  AddonCategoryOption,
  AddonServiceOption,
  AddonStatusFilter,
  RecommendedAddon,
  RecommendedAddonPayload,
} from "../types";

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === "object" ? (value as UnknownRecord) : {};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

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
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "yes", "1", "active", "required"].includes(normalized)) return true;
    if (["false", "no", "0", "inactive", "optional"].includes(normalized)) return false;
  }
  return fallback;
};

const pickRows = (payload: unknown): UnknownRecord[] => {
  if (Array.isArray(payload)) return payload as UnknownRecord[];
  const root = asRecord(payload);
  const nested = asRecord(root.data);
  const candidates = [
    root.content,
    root.items,
    root.results,
    root.addons,
    root.recommendedAddons,
    root.serviceAddons,
    root.data,
    nested.data,
    nested.content,
    nested.items,
    nested.results,
    nested.addons,
    nested.recommendedAddons,
    nested.serviceAddons,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate as UnknownRecord[];
  }
  return [];
};

const ADDON_BASES = ["/api/admin/addons", "/api/v1/admin/addons"] as const;

async function withFallback<T>(call: (base: string) => Promise<T>): Promise<T> {
  let lastError: unknown = null;
  for (const base of ADDON_BASES) {
    try {
      return await call(base);
    } catch (error) {
      lastError = error;
      const status = Number(asRecord(asRecord(error).response).status ?? 0);
      if (status === 404) continue;
      throw error;
    }
  }
  throw lastError;
}

function toCategory(row: unknown): AddonCategoryOption | null {
  const source = asRecord(row);
  const category = asRecord(source.category);
  const id = asString(source.id ?? source.categoryId ?? category.id ?? category.categoryId);
  const name = asString(source.name ?? source.categoryName ?? category.name ?? category.categoryName);
  if (!id || !name) return null;
  return { id, name };
}

function toService(row: unknown): AddonServiceOption | null {
  const source = asRecord(row);
  const service = asRecord(source.service);
  const category = asRecord(source.category);
  const serviceCategory = asRecord(service.category);
  const parentService = asRecord(source.parentService ?? service.parentService);
  const id = asString(source.id ?? source.serviceId ?? service.id ?? service.serviceId);
  const name = asString(source.name ?? source.serviceName ?? source.title ?? service.name ?? service.serviceName);
  if (!id || !name) return null;
  return {
    id,
    name,
    categoryId: asString(source.categoryId ?? category.id ?? category.categoryId ?? serviceCategory.id ?? serviceCategory.categoryId) || undefined,
    categoryName:
      asString(
        source.categoryName
        ?? category.name
        ?? category.categoryName
        ?? serviceCategory.name
        ?? serviceCategory.categoryName
        ?? parentService.name
        ?? parentService.serviceName
        ?? source.serviceType
        ?? service.serviceType,
      ) || undefined,
  };
}

function toAddon(row: unknown): RecommendedAddon {
  const source = asRecord(row);
  const categoriesFromIds = asArray(source.categoryIds)
    .map((id) => asString(id))
    .filter(Boolean)
    .map((id) => ({ id, name: `Category #${id}` }));
  const servicesFromIds = asArray(source.serviceIds)
    .map((id) => asString(id))
    .filter(Boolean)
    .map((id) => ({ id, name: `Service #${id}` }));
  const categories = asArray(source.categories ?? source.assignedCategories ?? source.categoryMappings ?? source.addonCategories)
    .map(toCategory)
    .filter((item): item is AddonCategoryOption => Boolean(item));
  const services = asArray(source.services ?? source.assignedServices ?? source.serviceMappings ?? source.addonServices)
    .map(toService)
    .filter((item): item is AddonServiceOption => Boolean(item));
  const active = asBoolean(source.active ?? source.status ?? source.activeStatus, true);
  const quantityAllowed = asBoolean(source.quantityAllowed ?? source.allowQuantity ?? source.quantityEnabled, false);
  const minQuantity = Math.max(1, asNumber(source.minQuantity ?? source.minQty, 1));
  const maxQuantity = Math.max(minQuantity, asNumber(source.maxQuantity ?? source.maxQty, quantityAllowed ? minQuantity : 1));
  return {
    id: asString(source.id ?? source.addonId ?? source.recommendedAddonId),
    name: asString(source.name ?? source.addonName ?? source.title),
    description: asString(source.description ?? source.shortDescription),
    price: asNumber(source.price ?? source.amount ?? source.addonPrice),
    active,
    quantityAllowed,
    minQuantity,
    maxQuantity,
    required: asBoolean(source.required ?? source.isRequired ?? source.addonType, false),
    categories: categories.length > 0 ? categories : categoriesFromIds,
    services: services.length > 0 ? services : servicesFromIds,
    servicesCount: asNumber(source.servicesCount ?? source.serviceCount, services.length || servicesFromIds.length),
    createdAt: asString(source.createdAt ?? source.createdDate),
  };
}

export async function getAddonCategories(): Promise<AddonCategoryOption[]> {
  const { data } = await api.get("/api/admin/categories", { params: { page: 1, limit: 300 } });
  return pickRows(data).map(toCategory).filter((item): item is AddonCategoryOption => Boolean(item));
}

export async function getAddonServices(): Promise<AddonServiceOption[]> {
  const { data } = await api.get("/api/admin/services", { params: { page: 0, size: 500 } });
  return pickRows(data).map(toService).filter((item): item is AddonServiceOption => Boolean(item));
}

export async function getRecommendedAddons(params: {
  search?: string;
  status?: AddonStatusFilter;
  categoryId?: string;
  serviceId?: string;
}): Promise<RecommendedAddon[]> {
  const { data } = await withFallback((base) =>
    api.get(base, {
      params: {
        search: params.search || undefined,
        status: params.status && params.status !== "ALL" ? params.status : undefined,
        categoryId: params.categoryId || undefined,
        serviceId: params.serviceId || undefined,
        page: 0,
        size: 200,
      },
    }),
  );
  return pickRows(data).map(toAddon).filter((item) => item.id && item.name);
}

export async function createRecommendedAddon(payload: RecommendedAddonPayload) {
  const { data } = await withFallback((base) => api.post(base, payload));
  return data;
}

export async function updateRecommendedAddon(id: string, payload: RecommendedAddonPayload) {
  const { data } = await withFallback((base) => api.put(`${base}/${id}`, payload));
  return data;
}

export async function updateRecommendedAddonStatus(id: string, active: boolean) {
  const { data } = await withFallback((base) => api.patch(`${base}/${id}/status`, { active }));
  return data;
}

export async function deleteRecommendedAddon(id: string) {
  try {
    const { data } = await withFallback((base) => api.delete(`${base}/${id}`));
    return { deleted: true, deactivated: false, data };
  } catch (error) {
    const status = Number(asRecord(asRecord(error).response).status ?? 0);
    if (![405, 409, 500].includes(status)) throw error;
    const data = await updateRecommendedAddonStatus(id, false);
    return { deleted: false, deactivated: true, data };
  }
}
