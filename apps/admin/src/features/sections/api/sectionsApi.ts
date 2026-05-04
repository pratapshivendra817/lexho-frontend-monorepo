import { api } from "@/api/axios";

import type { AdminSection, SectionItemPayload, SectionPayload, SectionType } from "../types";

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

const normalizeType = (value: unknown): SectionType => {
  const normalized = asString(value).toUpperCase();
  if (normalized === "STATS" || normalized === "TRUST" || normalized === "BANNERS") return normalized;
  return "CUSTOM";
};

const toSection = (row: UnknownRecord, index: number): AdminSection => ({
  id: asNumber(row.id ?? row.sectionId, index + 1),
  type: normalizeType(row.type),
  title: asString(row.title),
  priority: asNumber(row.priority, index + 1),
  isActive: asBoolean(row.isActive ?? row.active ?? row.status === "ACTIVE", true),
  itemsCount: asNumber(row.itemsCount ?? row.itemCount ?? (Array.isArray(row.items) ? row.items.length : 0), 0),
});

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
  const { data } = await api.get(SECTIONS_BASE);
  return readSectionRows(data).map(toSection);
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
  const { data } = await api.post(`${SECTIONS_BASE}/${id}/items`, items);
  return data;
}
