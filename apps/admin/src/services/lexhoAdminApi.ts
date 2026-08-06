import { api } from "@/api/axios";
import { appConfig } from "@/config";
import type {
  CategoryItem,
  CategoryPayload,
  DashboardServiceSummary,
  PaginatedResponse,
  ServiceAnalyticsPoint,
  ServiceDetailItem,
  ServiceDetailType,
  ServiceItem,
  ServicePayload,
  TopService,
} from "@/types/adminCatalog";

type UnknownRecord = Record<string, unknown>;
type ApiErrorShape = { response?: { data?: { message?: unknown }; status?: unknown }; message?: unknown };

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
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) {
    const origin = getApiOrigin();
    try {
      const parsed = new URL(trimmed);
      if ((parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") && origin) {
        const target = new URL(origin);
        parsed.protocol = target.protocol;
        parsed.host = target.host;
        return parsed.toString();
      }
    } catch {
      return trimmed;
    }
    return trimmed;
  }
  const origin = getApiOrigin();
  if (!origin) return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${origin}${normalizedPath}`;
};

const toRelativeAssetPath = (value: unknown): string => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (!/^https?:\/\//i.test(trimmed)) return trimmed;
  try {
    const parsed = new URL(trimmed);
    return `${parsed.pathname}${parsed.search ?? ""}`;
  } catch {
    return trimmed.replace(/^https?:\/\/[^/]+/i, "");
  }
};

const normalizeAdminApiError = (error: unknown, fallback: string): Error => {
  const e = error as ApiErrorShape;
  const serverMessage = typeof e?.response?.data?.message === "string" ? e.response.data.message.trim() : "";
  const genericMessage = typeof e?.message === "string" ? e.message.trim() : "";
  const message = serverMessage || genericMessage || fallback;
  return new Error(message);
};

const readArray = <T>(payload: unknown, keys: string[]): T[] => {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  const record = asRecord(payload);
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value as T[];
    }
  }

  return [];
};

const readObject = <T>(payload: unknown, keys: string[]): T | null => {
  const record = asRecord(payload);
  for (const key of keys) {
    const value = record[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as T;
    }
  }

  if (Object.keys(record).length > 0) {
    return record as unknown as T;
  }

  return null;
};

const readNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const readBooleanLike = (value: unknown, fallback = false): boolean => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "active", "enabled", "yes"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "inactive", "disabled", "no"].includes(normalized)) {
      return false;
    }
  }

  return fallback;
};

const readId = (row: UnknownRecord): string =>
  String(row.id ?? row._id ?? row.categoryId ?? row.serviceId ?? "");

const MAX_DETAIL_ITEM_LENGTH = 255;

const splitByNumberedMarkers = (value: string): string[] =>
  value
    .split(/(?=\b(?:Q)?\d{1,2}[.)]\s*)/i)
    .map((item) => item.trim())
    .filter(Boolean);

const splitBySentence = (value: string): string[] =>
  value
    .split(/(?<=[.?!])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);

const chunkByMaxLength = (value: string, maxLength: number): string[] => {
  const normalized = value.trim();
  if (!normalized) return [];
  if (normalized.length <= maxLength) return [normalized];

  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const chunks: string[] = [];
  let current = "";
  for (const word of words) {
    if (!current) {
      if (word.length <= maxLength) {
        current = word;
        continue;
      }
      for (let i = 0; i < word.length; i += maxLength) {
        chunks.push(word.slice(i, i + maxLength));
      }
      continue;
    }
    const next = `${current} ${word}`;
    if (next.length <= maxLength) {
      current = next;
      continue;
    }
    chunks.push(current);
    if (word.length <= maxLength) {
      current = word;
      continue;
    }
    for (let i = 0; i < word.length; i += maxLength) {
      const part = word.slice(i, i + maxLength);
      if (part.length === maxLength) {
        chunks.push(part);
      } else {
        current = part;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
};

const normalizeServiceDetailItems = (type: ServiceDetailType, items: string[]): string[] => {
  const cleanDetailText = (value: string): string => {
    let text = String(value ?? "").trim();
    if (!text) return "";

    // Remove common escaped JSON fragments users may paste accidentally.
    text = text.replace(/\\r\\n|\\n|\\r/g, " ");
    text = text.replace(/\\"/g, "\"");
    text = text.replace(/\\,/g, ",");
    text = text.replace(/"\s*,\s*"/g, " ");
    text = text.replace(/^"+|"+$/g, "");
    text = text.replace(/^'+|'+$/g, "");
    text = text.replace(/(?:,\s*)+$/g, "");
    text = text.replace(/\s+/g, " ").trim();
    return text;
  };

  const normalizedInput = items
    .flatMap((value) => String(value ?? "").split(/\r?\n/))
    .map((item) => cleanDetailText(item))
    .filter(Boolean);

  const expanded: string[] = [];
  for (const item of normalizedInput) {
    if (item.length <= MAX_DETAIL_ITEM_LENGTH) {
      expanded.push(item);
      continue;
    }

    const numbered = splitByNumberedMarkers(item);
    if (numbered.length > 1) {
      expanded.push(...numbered);
      continue;
    }

    if (type === "FAQ" || type === "INSTRUCTION") {
      const sentenceParts = splitBySentence(item);
      if (sentenceParts.length > 1) {
        expanded.push(...sentenceParts);
        continue;
      }
    }

    expanded.push(...chunkByMaxLength(item, MAX_DETAIL_ITEM_LENGTH));
  }

  return expanded
    .flatMap((item) => (item.length <= MAX_DETAIL_ITEM_LENGTH ? [item] : chunkByMaxLength(item, MAX_DETAIL_ITEM_LENGTH)))
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && item.length <= MAX_DETAIL_ITEM_LENGTH);
};

const mapDetailRow = (detail: UnknownRecord, fallbackType: ServiceDetailType = "INCLUDED"): ServiceDetailItem => ({
  id: String(detail.id ?? detail._id ?? detail.detailId ?? detail.itemId ?? `${fallbackType}-${detail.itemName ?? detail.name ?? detail.value ?? ""}`),
  type: (["INCLUDED", "EXCLUDED", "FAQ", "INSTRUCTION"].includes(String(detail.type ?? fallbackType).toUpperCase())
    ? String(detail.type ?? fallbackType).toUpperCase()
    : "INCLUDED") as ServiceDetailType,
  itemName: String(detail.itemName ?? detail.name ?? detail.value ?? ""),
});

const readServiceDetails = (row: UnknownRecord): ServiceDetailItem[] => {
  const normalizedDetails = readArray<UnknownRecord>(row.details, ["details"]).map((detail) => mapDetailRow(detail));
  if (normalizedDetails.length > 0) {
    return normalizedDetails;
  }

  const includedRows = readArray<unknown>(row.included, ["included", "includedItems"]).map((value) => {
    if (typeof value === "string") {
      return { itemName: value };
    }
    return asRecord(value);
  });
  const excludedRows = readArray<unknown>(row.excluded, ["excluded", "excludedItems"]).map((value) => {
    if (typeof value === "string") {
      return { itemName: value };
    }
    return asRecord(value);
  });

  return [
    ...includedRows.map((detail) => mapDetailRow(asRecord(detail), "INCLUDED")),
    ...excludedRows.map((detail) => mapDetailRow(asRecord(detail), "EXCLUDED")),
    ...readArray<unknown>(row.faqs, ["faqs"]).map((value) => mapDetailRow(typeof value === "string" ? { itemName: value } : asRecord(value), "FAQ")),
    ...readArray<unknown>(row.instructions, ["instructions"]).map((value) =>
      mapDetailRow(typeof value === "string" ? { itemName: value } : asRecord(value), "INSTRUCTION"),
    ),
  ].filter((detail) => detail.itemName.trim().length > 0);
};

const mapServiceRow = (row: UnknownRecord, fallbackId = ""): ServiceItem => {
  const detailRows = readServiceDetails(row);

  return {
    id: String(row.id ?? row._id ?? fallbackId),
    name: String(row.name ?? row.serviceName ?? ""),
    serviceType: String(row.service_type ?? row.serviceType ?? ""),
    categoryId: String(row.categoryId ?? asRecord(row.category).id ?? ""),
    categoryName: String(row.categoryName ?? asRecord(row.category).name ?? ""),
    description: String(row.description ?? ""),
    price: readNumber(row.price ?? row.basePrice),
    rating: readNumber(row.rating, 0),
    imageUrl: toAbsoluteAssetUrl(row.imageUrl ?? row.thumbnailUrl ?? row.iconUrl),
    active: readBooleanLike(row.active ?? row.status ?? row.isActive, true),
    details: detailRows,
  };
};

const toCategoryPayload = (payload: CategoryPayload) => {
  const active = Boolean(payload.active);
  const normalizedDisplayOrder = Number(payload.displayOrder);
  return {
    name: payload.name,
    iconUrl: toRelativeAssetPath(payload.iconUrl),
    displayOrder: Number.isFinite(normalizedDisplayOrder) ? normalizedDisplayOrder : undefined,
    priority: Number.isFinite(normalizedDisplayOrder) ? normalizedDisplayOrder : undefined,
    active,
    status: active ? "ACTIVE" : "INACTIVE",
  };
};

const parseUploadUrl = (payload: unknown): string | null => {
  const root = asRecord(payload);
  const candidates: unknown[] = [
    root.imageUrl,
    root.url,
    root.fileUrl,
    root.location,
    root.path,
  ];

  const nested = readObject<UnknownRecord>(payload, ["data", "result"]);
  if (nested) {
    candidates.push(
      nested.imageUrl,
      nested.url,
      nested.fileUrl,
      nested.location,
      nested.path,
    );
  }

  for (const candidate of candidates) {
    if (typeof candidate !== "string") {
      continue;
    }

    const trimmed = candidate.trim();
    if (!trimmed) {
      continue;
    }

    return toAbsoluteAssetUrl(trimmed);
  }

  return null;
};

export async function getServiceSummary(): Promise<DashboardServiceSummary> {
  const { data } = await api.get("/api/admin/dashboard/service-summary");
  const source = readObject<UnknownRecord>(data, ["data", "summary", "result"]) ?? {};

  return {
    totalServices: readNumber(source.totalServices),
    activeServices: readNumber(source.activeServices),
    inactiveServices: readNumber(source.inactiveServices),
    totalBookings: readNumber(source.totalBookings),
    totalRevenue: readNumber(source.totalRevenue),
  };
}

export async function getTopServices(limit = 10): Promise<TopService[]> {
  const { data } = await api.get("/api/admin/dashboard/top-services", { params: { limit } });
  const rows = readArray<UnknownRecord>(data, ["data", "items", "results", "services"]);

  return rows.map((row, index) => ({
    serviceId: String(row.serviceId ?? row.id ?? `svc-${index + 1}`),
    serviceName: String(row.serviceName ?? row.name ?? "Unknown Service"),
    bookings: readNumber(row.bookings),
    revenue: readNumber(row.revenue),
  }));
}

export async function getServiceAnalytics(): Promise<ServiceAnalyticsPoint[]> {
  const { data } = await api.get("/api/admin/dashboard/service-analytics");
  const rows = readArray<UnknownRecord>(data, ["data", "items", "results", "analytics"]);

  return rows.map((row, index) => ({
    label: String(row.label ?? row.month ?? row.name ?? `Point ${index + 1}`),
    bookings: readNumber(row.bookings),
    revenue: readNumber(row.revenue),
  }));
}

export async function getCategories(params: {
  page: number;
  limit: number;
  search?: string;
}): Promise<PaginatedResponse<CategoryItem>> {
  const { data } = await api.get("/api/admin/categories", { params });

  const items = readArray<UnknownRecord>(data, ["data", "items", "content", "results"]).map(
    (row) => ({
      id: readId(row),
      name: String(row.name ?? ""),
      iconUrl: toAbsoluteAssetUrl(row.iconUrl ?? row.imageUrl),
      active: readBooleanLike(row.active ?? row.isActive ?? row.status, false),
      displayOrder: readNumber(row.displayOrder ?? row.priority ?? row.order, 0) || undefined,
    }),
  );

  const root = asRecord(data);
  const total = readNumber(root.total ?? root.totalElements ?? items.length, items.length);

  return { items, total };
}

export async function createCategory(payload: CategoryPayload) {
  await api.post("/api/admin/categories", toCategoryPayload(payload));
}

export async function updateCategory(id: string, payload: CategoryPayload) {
  await api.put(`/api/admin/categories/${id}`, toCategoryPayload(payload));
}

export async function updateCategoryStatus(id: string, active: boolean) {
  await api.patch(`/api/admin/categories/${id}/status`, {
    active,
    isActive: active,
    status: active ? "ACTIVE" : "INACTIVE",
  });
}

export async function deleteCategory(id: string) {
  await api.delete(`/api/admin/categories/${id}`);
}

export async function getServices(params: {
  page: number;
  limit: number;
  search?: string;
  category?: string;
  status?: string;
  sort?: string;
}): Promise<PaginatedResponse<ServiceItem>> {
  let data: unknown;
  try {
    const response = await api.get("/api/admin/services", { params });
    data = response.data;
  } catch (error) {
    throw normalizeAdminApiError(error, "Failed to load services");
  }

  const items = readArray<UnknownRecord>(data, ["data", "items", "content", "results"]).map(
    (row) => mapServiceRow(row, readId(row)),
  );

  const root = asRecord(data);
  const total = readNumber(root.total ?? root.totalElements ?? items.length, items.length);

  return { items, total };
}

export async function getServiceById(id: string): Promise<ServiceItem | null> {
  let data: unknown;
  try {
    const response = await api.get(`/api/admin/services/${id}`);
    data = response.data;
  } catch (error) {
    throw normalizeAdminApiError(error, "Failed to load service details");
  }
  const row = readObject<UnknownRecord>(data, ["data", "item", "service", "result"]);
  if (!row) {
    return null;
  }

  return mapServiceRow(row, id);
}

export async function createService(payload: ServicePayload): Promise<{ id: string } | null> {
  try {
    const relativeImageUrl = toRelativeAssetPath(payload.imageUrl);
    const normalizedPayload = {
      ...payload,
      imageUrl: relativeImageUrl || undefined,
    };
    const { data } = await api.post("/api/admin/services", normalizedPayload);
    const row = readObject<UnknownRecord>(data, ["data", "item", "service", "result"]) ?? asRecord(data);
    const id = readId(row);
    return id ? { id } : null;
  } catch (error) {
    throw normalizeAdminApiError(error, "Unable to create service");
  }
}

export async function updateService(id: string, payload: ServicePayload) {
  try {
    const relativeImageUrl = toRelativeAssetPath(payload.imageUrl);
    const normalizedPayload = {
      ...payload,
      imageUrl: relativeImageUrl || undefined,
    };
    await api.put(`/api/admin/services/${id}`, normalizedPayload);
  } catch (error) {
    throw normalizeAdminApiError(error, "Unable to update service");
  }
}

export async function toggleServiceStatus(id: string) {
  try {
    await api.patch(`/api/admin/services/${id}/toggle-status`);
  } catch (error) {
    throw normalizeAdminApiError(error, "Unable to update service status");
  }
}

export async function deleteService(id: string) {
  try {
    await api.delete(`/api/admin/services/${id}`);
  } catch (error) {
    throw normalizeAdminApiError(error, "Unable to delete service");
  }
}

export async function addServiceDetails(
  serviceId: string,
  payload: { type: ServiceDetailType; items: string[] },
) {
  const endpoint = `/api/admin/services/${serviceId}/details`;
  try {
    const items = normalizeServiceDetailItems(payload.type, payload.items);
    if (items.length === 0) {
      throw new Error("At least one detail item is required");
    }
    await api.post(endpoint, { ...payload, items });
  } catch (error) {
    const err = error as ApiErrorShape;
    const status = Number(err?.response?.status ?? 0);
    const items = normalizeServiceDetailItems(payload.type, payload.items);

    if (status >= 500 && items.length > 1) {
      const failedItems: string[] = [];
      for (const item of items) {
        try {
          await api.post(endpoint, { type: payload.type, items: [item] });
        } catch {
          failedItems.push(item);
        }
      }
      if (failedItems.length === 0) {
        return;
      }
      throw new Error(`Some items failed to save (${failedItems.length}/${items.length}). Please try shorter/plain-text phrasing.`);
    }

    throw normalizeAdminApiError(error, "Unable to add service details");
  }
}

export async function updateServiceDetail(
  serviceId: string,
  detailId: string,
  payload: { type: ServiceDetailType; itemName: string },
) {
  try {
    await api.put(`/api/admin/services/${serviceId}/details/${detailId}`, payload);
  } catch (error) {
    throw normalizeAdminApiError(error, "Unable to update service detail");
  }
}

export async function deleteServiceDetail(serviceId: string, detailId: string) {
  try {
    await api.delete(`/api/admin/services/${serviceId}/details/${detailId}`);
  } catch (error) {
    throw normalizeAdminApiError(error, "Unable to delete service detail");
  }
}

export async function uploadAdminImage(file: File): Promise<string> {
  if (!(file instanceof File)) {
    throw new Error("Selected upload is not a valid file");
  }
  if (!file.name.trim()) {
    throw new Error("Selected file name is missing");
  }

  const formData = new FormData();
  formData.append("file", file, file.name);

  // Let the browser set the multipart boundary; forcing the header breaks file parsing.
  const { data } = await api.post(appConfig.adminImageUploadEndpoint, formData);

  const imageUrl = parseUploadUrl(data);
  if (!imageUrl) {
    throw new Error("Image upload succeeded but response URL is missing");
  }

  return imageUrl;
}
