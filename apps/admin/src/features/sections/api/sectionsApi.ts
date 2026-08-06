import { api } from "@/api/axios";

import type { AdminSection, SectionItem, SectionItemPayload, SectionPayload, SectionType } from "../types";

type UnknownRecord = Record<string, unknown>;

const SECTIONS_BASE = "/api/admin/sections";

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
    const normalized = value.toLowerCase();
    if (["true", "1", "active", "enabled", "yes"].includes(normalized)) return true;
    if (["false", "0", "inactive", "disabled", "no"].includes(normalized)) return false;
  }
  return fallback;
};

const normalizeType = (value: unknown): SectionType | null => {
  const normalized = asString(value).toUpperCase();
  if (normalized === "STATS" || normalized === "TRUST" || normalized === "TAGLINE" || normalized === "HIGHLIGHTS") return normalized;
  return null;
};

const readVisualColor = (row: UnknownRecord, keys: string[]): string | null => {
  for (const key of keys) {
    const value = asString(row[key]);
    if (value) return value;
  }
  return null;
};

const toSectionItem = (row: UnknownRecord, index: number, sectionIdFallback = 0): SectionItem => ({
  id: asNumber(row.id ?? row.itemId, index + 1),
  sectionId: asNumber(row.sectionId, sectionIdFallback),
  title: asString(row.title),
  subtitle: asString(row.subtitle) || null,
  value: asString(row.value) || null,
  icon: asString(row.icon),
  color: readVisualColor(row, ["color", "textColor", "text_color"]),
  borderColor: readVisualColor(row, ["borderColor", "border_color"]),
  backgroundColor: readVisualColor(row, ["backgroundColor", "background_color", "bgColor", "bg_color"]),
  iconColor: readVisualColor(row, ["iconColor", "icon_color"]),
  priority: asNumber(row.priority, index + 1),
  active: asBoolean(row.active ?? row.isActive ?? row.status === "ACTIVE", true),
});

const toSection = (row: UnknownRecord, index: number): AdminSection | null => {
  const type = normalizeType(row.type);
  if (!type) return null;
  const id = asNumber(row.id ?? row.sectionId, index + 1);
  const itemRows = Array.isArray(row.items) ? (row.items as UnknownRecord[]) : [];
  return {
    id,
    type,
    title: asString(row.title) || null,
    subtitle: asString(row.subtitle ?? row.description) || null,
    icon: asString(row.icon) || null,
    color: readVisualColor(row, ["color", "textColor", "text_color"]),
    borderColor: readVisualColor(row, ["borderColor", "border_color"]),
    backgroundColor: readVisualColor(row, ["backgroundColor", "background_color", "bgColor", "bg_color"]),
    iconColor: readVisualColor(row, ["iconColor", "icon_color"]),
    priority: asNumber(row.priority, index + 1),
    active: asBoolean(row.active ?? row.isActive ?? row.status === "ACTIVE", true),
    createdAt: asString(row.createdAt) || null,
    items: itemRows.map((item, itemIndex) => toSectionItem(item, itemIndex, id)),
  };
};

const readSectionRows = (payload: unknown): UnknownRecord[] => {
  if (Array.isArray(payload)) return payload as UnknownRecord[];
  const root = asRecord(payload);
  const nested = asRecord(root.data);
  const candidates = [root.data, root.content, root.items, root.results, nested.content, nested.items, nested.results];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate as UnknownRecord[];
  }
  return [];
};

export async function getSections(): Promise<AdminSection[]> {
  const { data } = await api.get(SECTIONS_BASE, { params: { page: 0, size: 10 } });
  return readSectionRows(data)
    .map(toSection)
    .filter((row): row is AdminSection => Boolean(row));
}

export async function createSection(payload: SectionPayload) {
  const { data } = await api.post(SECTIONS_BASE, payload);
  return data;
}

export async function updateSection(id: number, payload: SectionPayload) {
  const { data } = await api.put(`${SECTIONS_BASE}/${id}`, payload);
  return data;
}

export async function updateSectionStatus(id: number, isActive: boolean) {
  const { data } = await api.patch(`${SECTIONS_BASE}/${id}/status`, { isActive });
  return data;
}

export async function reorderSections(rows: Array<{ id: number; priority: number }>) {
  const { data } = await api.patch(`${SECTIONS_BASE}/reorder`, rows);
  return data;
}

export async function addSectionItems(id: number, items: SectionItemPayload[]) {
  const endpoint = `${SECTIONS_BASE}/${id}/items`;

  // Primary shape (current API contract used by frontend).
  try {
    const { data } = await api.post(endpoint, items);
    return data;
  } catch (firstError: any) {
    const status = firstError?.response?.status;
    // If backend returns 500 for array payload, retry safer shapes.
    if (status !== 500) throw firstError;
  }

  // Fallback 1: wrapped payload accepted by some backend variants.
  try {
    const { data } = await api.post(endpoint, { items });
    return data;
  } catch (secondError: any) {
    const status = secondError?.response?.status;
    if (status !== 500) throw secondError;
  }

  // Fallback 2: create items one-by-one for strict endpoints expecting single item payload.
  let lastResponse: unknown = null;
  for (const item of items) {
    const { data } = await api.post(endpoint, item);
    lastResponse = data;
  }
  return lastResponse;
}

export async function updateSectionItem(sectionId: number, itemId: number, payload: SectionItemPayload) {
  const { data } = await api.put(`${SECTIONS_BASE}/${sectionId}/items/${itemId}`, payload);
  return data;
}

export async function updateSectionItemStatus(sectionId: number, itemId: number, isActive: boolean) {
  const { data } = await api.patch(`${SECTIONS_BASE}/${sectionId}/items/${itemId}/status`, { isActive });
  return data;
}

export async function deleteSectionItem(sectionId: number, itemId: number) {
  const { data } = await api.delete(`${SECTIONS_BASE}/${sectionId}/items/${itemId}`);
  return data;
}

export async function reorderSectionItems(sectionId: number, rows: Array<{ id: number; priority: number }>) {
  const { data } = await api.patch(`${SECTIONS_BASE}/${sectionId}/reorder`, rows);
  return data;
}
