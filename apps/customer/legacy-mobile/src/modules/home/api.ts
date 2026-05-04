import { api, parseApiError } from "../../api/client";
import type { HomeSection, HomeSectionItem, HomeSectionType } from "./types";

type UnknownRecord = Record<string, unknown>;

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
    const v = value.toLowerCase();
    if (["true", "1", "active", "enabled", "yes"].includes(v)) return true;
    if (["false", "0", "inactive", "disabled", "no"].includes(v)) return false;
  }
  return fallback;
};

const normalizeType = (value: unknown): HomeSectionType => {
  const type = asString(value).toUpperCase();
  if (type === "STATS" || type === "TRUST" || type === "TAGLINE" || type === "HIGHLIGHTS" || type === "BANNERS") return type;
  return "CUSTOM";
};

const readRows = (payload: unknown): UnknownRecord[] => {
  if (Array.isArray(payload)) return payload as UnknownRecord[];
  const root = asRecord(payload);
  const nested = asRecord(root.data);
  const nestedNested = asRecord(nested.data);
  const candidates = [
    root.data,
    root.content,
    root.items,
    root.results,
    nested.data,
    nested.content,
    nested.items,
    nested.results,
    nestedNested.data,
    nestedNested.content,
    nestedNested.items,
    nestedNested.results,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate as UnknownRecord[];
  }
  return [];
};

const mapItem = (row: UnknownRecord, index: number): HomeSectionItem => ({
  id: asString(row.id ?? row.itemId ?? index),
  title: asString(row.title),
  value: asString(row.value) || undefined,
  priority: asNumber(row.priority, index + 1),
  isActive: asBoolean(row.isActive ?? row.active ?? row.status === "ACTIVE", true),
});

const mapSection = (row: UnknownRecord, index: number): HomeSection => ({
  id: asString(row.id ?? row.sectionId ?? index),
  type: normalizeType(row.type),
  title: asString(row.title),
  subtitle: asString(row.subtitle ?? row.description) || undefined,
  priority: asNumber(row.priority, index + 1),
  isActive: asBoolean(row.isActive ?? row.active ?? row.status === "ACTIVE", true),
  items: readRows(row.items).map(mapItem),
});

async function fetchSectionItems(sectionId: string): Promise<HomeSectionItem[]> {
  const endpointCandidates = [
    `/api/customer/home/sections/${sectionId}/items`,
    `/api/sections/${sectionId}/items`,
    `/api/admin/sections/${sectionId}/items`,
  ];

  for (const endpoint of endpointCandidates) {
    try {
      const { data } = await api.get(endpoint);
      return readRows(data).map(mapItem);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        continue;
      }
    }
  }

  return [];
}

function isUnauthorizedError(error: any) {
  const status = error?.response?.status;
  const message = String(error?.response?.data?.message ?? error?.message ?? "").toLowerCase();
  return (
    status === 401 ||
    status === 403 ||
    message.includes("authorization token is required") ||
    message.includes("invalid or expired token")
  );
}

export async function getHomeSections(): Promise<HomeSection[]> {
  const endpointCandidates = [
    "/api/customer/home/sections",
    "/api/sections",
    "/api/admin/sections",
  ];

  let lastError: unknown = null;
  for (const endpoint of endpointCandidates) {
    try {
      const { data } = await api.get(endpoint);
      const base = readRows(data).map(mapSection);
      const hydrated = await Promise.all(
        base.map(async (section) => {
          if (section.items.length > 0) return section;
          const items = await fetchSectionItems(section.id);
          return { ...section, items };
        }),
      );
      return hydrated
        .filter((section) => section.isActive)
        .map((section) => ({
          ...section,
          items: [...section.items].filter((item) => item.isActive).sort((a, b) => a.priority - b.priority),
        }))
        .sort((a, b) => a.priority - b.priority);
    } catch (error: any) {
      lastError = error;
      if (isUnauthorizedError(error)) {
        continue;
      }
    }
  }

  if (isUnauthorizedError(lastError)) {
    // Customer app should stay usable even when sections endpoint is admin-protected.
    return [];
  }

  try {
    throw lastError;
  } catch (error) {
    throw new Error(parseApiError(error, "Failed to load homepage sections"));
  }
}
