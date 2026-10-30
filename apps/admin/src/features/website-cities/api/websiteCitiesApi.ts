import { api } from "@/api/axios";

import type { WebsiteArea, WebsiteCity, WebsiteLocationPayload } from "../types";

type UnknownRecord = Record<string, unknown>;

const CITIES_BASE = "/api/admin/website/header/cities";
const CITY_AREAS_BASE = "/api/admin/website/cities";
const AREAS_BASE = "/api/admin/website/areas";

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === "object" ? (value as UnknownRecord) : {};

const asString = (value: unknown): string =>
  typeof value === "string" || typeof value === "number" ? String(value).trim() : "";

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
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "active", "enabled", "yes"].includes(normalized)) return true;
    if (["false", "0", "inactive", "disabled", "no"].includes(normalized)) return false;
  }
  return fallback;
};

const readRows = (payload: unknown): UnknownRecord[] => {
  if (Array.isArray(payload)) return payload as UnknownRecord[];

  const root = asRecord(payload);
  const nestedData = asRecord(root.data);
  const candidates = [
    root.data,
    root.items,
    root.results,
    root.content,
    nestedData.items,
    nestedData.results,
    nestedData.content,
    nestedData.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate as UnknownRecord[];
  }

  return [];
};

const toCity = (row: UnknownRecord, index: number): WebsiteCity => ({
  id: asNumber(row.id ?? row.cityId, index + 1),
  name: asString(row.name),
  slug: asString(row.slug),
  displayOrder: asNumber(row.displayOrder ?? row.display_order ?? row.priority, index + 1),
  active: asBoolean(row.active ?? row.isActive ?? row.status === "ACTIVE", true),
  createdAt: asString(row.createdAt ?? row.created_at) || null,
  updatedAt: asString(row.updatedAt ?? row.updated_at) || null,
});

const toArea = (row: UnknownRecord, index: number, cityIdFallback = 0): WebsiteArea => ({
  id: asNumber(row.id ?? row.areaId, index + 1),
  cityId: asNumber(row.cityId ?? row.city_id, cityIdFallback),
  name: asString(row.name),
  slug: asString(row.slug),
  displayOrder: asNumber(row.displayOrder ?? row.display_order ?? row.priority, index + 1),
  active: asBoolean(row.active ?? row.isActive ?? row.status === "ACTIVE", true),
  createdAt: asString(row.createdAt ?? row.created_at) || null,
  updatedAt: asString(row.updatedAt ?? row.updated_at) || null,
});

export async function getWebsiteCities(): Promise<WebsiteCity[]> {
  const { data } = await api.get(CITIES_BASE);
  return readRows(data).map(toCity);
}

export async function createWebsiteCity(payload: WebsiteLocationPayload) {
  const { data } = await api.post(CITIES_BASE, payload);
  return data;
}

export async function updateWebsiteCity(cityId: number, payload: WebsiteLocationPayload) {
  const { data } = await api.put(`${CITIES_BASE}/${cityId}`, payload);
  return data;
}

export async function updateWebsiteCityStatus(cityId: number, active: boolean) {
  const { data } = await api.patch(`${CITIES_BASE}/${cityId}/status`, { active });
  return data;
}

export async function deleteWebsiteCity(cityId: number) {
  const { data } = await api.delete(`${CITIES_BASE}/${cityId}`);
  return data;
}

export async function getCityAreas(cityId: number): Promise<WebsiteArea[]> {
  const { data } = await api.get(`${CITY_AREAS_BASE}/${cityId}/areas`);
  return readRows(data).map((row, index) => toArea(row, index, cityId));
}

export async function createCityArea(cityId: number, payload: WebsiteLocationPayload) {
  const { data } = await api.post(`${CITY_AREAS_BASE}/${cityId}/areas`, payload);
  return data;
}

export async function updateCityArea(areaId: number, payload: WebsiteLocationPayload) {
  const { data } = await api.put(`${AREAS_BASE}/${areaId}`, payload);
  return data;
}

export async function updateCityAreaStatus(areaId: number, active: boolean) {
  const { data } = await api.patch(`${AREAS_BASE}/${areaId}/status`, { active });
  return data;
}

export async function deleteCityArea(areaId: number) {
  const { data } = await api.delete(`${AREAS_BASE}/${areaId}`);
  return data;
}

export async function reorderCityAreas(cityId: number, rows: Array<{ id: number; displayOrder: number }>) {
  // The reorder DTO identifies nested resources as `areaId`, rather than the UI's generic `id` field.
  const payload = rows.map(({ id, displayOrder }) => ({ areaId: id, displayOrder }));
  const { data } = await api.patch(`${CITY_AREAS_BASE}/${cityId}/areas/reorder`, payload);
  return data;
}
