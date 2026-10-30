import { api, extractList, parseApiError, unwrapPayload } from "./client";
import type { CookFamilySize } from "./subscriptionPricingApi";

export type CookCoverageItem = {
  id?: number;
  name: string;
  icon?: string;
  sortOrder: number;
  quantity?: number;
};

export type CookCoverage = {
  id: number;
  serviceId: number | null;
  familySize: CookFamilySize | string;
  members?: string;
  familySizeLabel?: string;
  reference: string;
  sortOrder: number;
  active: boolean;
  items: CookCoverageItem[];
};

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value: unknown, fallback = true) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "active", "yes"].includes(normalized)) return true;
    if (["false", "0", "inactive", "no"].includes(normalized)) return false;
  }
  return fallback;
}

function normalizeFamilySize(value: unknown): CookFamilySize {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "SMALL" || normalized === "MEDIUM" || normalized === "LARGE" || normalized === "XLARGE") return normalized;
  return "MEDIUM";
}

function toCookCoverageItem(row: any, index: number): CookCoverageItem | null {
  const name = String(row?.name ?? "").trim();
  if (!name) return null;
  return {
    id: row?.id != null ? toNumber(row.id) : undefined,
    name,
    icon: String(row?.icon ?? "").trim() || undefined,
    sortOrder: toNumber(row?.sortOrder, index + 1),
    quantity: row?.quantity != null ? toNumber(row.quantity) : undefined,
  };
}

function toCookCoverage(row: any): CookCoverage | null {
  const familySize = normalizeFamilySize(row?.familySize);
  const items = extractList<any>(row?.items ?? [])
    .map((item, index) => toCookCoverageItem(item, index))
    .filter((item: CookCoverageItem | null): item is CookCoverageItem => Boolean(item))
    .sort((first, second) => first.sortOrder - second.sortOrder);
  if (items.length === 0) return null;
  return {
    id: toNumber(row?.id, 0),
    serviceId: row?.serviceId == null ? null : toNumber(row?.serviceId, 0),
    familySize,
    members: String(row?.members ?? "").trim() || undefined,
    familySizeLabel: String(row?.familySizeLabel ?? "").trim() || undefined,
    reference: String(row?.reference ?? "").trim(),
    sortOrder: toNumber(row?.sortOrder, 0),
    active: toBoolean(row?.active, true),
    items,
  };
}

function pickCookCoverageRow(rows: CookCoverage[], params: { familySize: CookFamilySize; serviceId?: number | null }) {
  const activeRows = rows.filter((row) => row.active && normalizeFamilySize(row.familySize) === params.familySize);
  if (activeRows.length === 0) return null;
  const requestedServiceId = toNumber(params.serviceId, 0);
  if (requestedServiceId > 0) {
    const exactServiceRow = activeRows.find((row) => toNumber(row.serviceId, 0) === requestedServiceId);
    if (exactServiceRow) return exactServiceRow;
    const globalRow = activeRows.find((row) => row.serviceId == null || toNumber(row.serviceId, 0) === 0);
    return globalRow ?? null;
  }
  const globalRow = activeRows.find((row) => row.serviceId == null || toNumber(row.serviceId, 0) === 0);
  return globalRow ?? activeRows[0] ?? null;
}

export async function getCookCoverage(params: {
  familySize: CookFamilySize;
  serviceId?: number | null;
  subscription?: boolean;
}): Promise<CookCoverage | null> {
  const requestParams = {
    serviceId: params.serviceId || undefined,
    familySize: params.familySize,
  };
  const endpoints = params.subscription
    ? ["/api/subscription/cook-coverage", "/api/cook-coverage"]
    : ["/api/cook-coverage", "/api/subscription/cook-coverage"];

  let lastError: unknown = null;
  for (const endpoint of endpoints) {
    try {
      const { data } = await api.get(endpoint, { params: requestParams });
      const payload = unwrapPayload<any>(data, data);
      if (Array.isArray(payload)) {
        const rows = payload
          .map((row) => toCookCoverage(row))
          .filter((row: CookCoverage | null): row is CookCoverage => Boolean(row && row.active));
        const exact = pickCookCoverageRow(rows, params);
        if (exact) return exact;
        if (!params.serviceId && rows[0]) return rows[0];
      } else {
        const row = toCookCoverage(payload);
        if (row?.active) {
          const requestedServiceId = toNumber(params.serviceId, 0);
          const rowServiceId = toNumber(row.serviceId, 0);
          if (requestedServiceId <= 0 || rowServiceId === 0 || rowServiceId === requestedServiceId) return row;
        }
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    const message = parseApiError(lastError, "Failed to fetch cook coverage");
    if (message && !/404/i.test(message)) {
      throw new Error(message);
    }
  }
  return null;
}

export function getDisplayCookCoverageItems(params: {
  baseCoverageItems?: Array<{ name?: string | null; quantity?: number | null } | string> | null;
  selectedCoverageItems?: Array<{ name?: string | null; quantity?: number | null } | string> | null;
}) {
  const splitNames = (value: string) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const normalizeItems = (items?: Array<{ name?: string | null; quantity?: number | null } | string> | null) =>
    (Array.isArray(items) ? items : [])
      .flatMap((item) => {
        if (typeof item === "string") {
          return splitNames(item).map((name) => ({ name, quantity: undefined as number | undefined }));
        }
        const rawName = String(item?.name ?? "").trim();
        if (!rawName) return [];
        const quantity = item?.quantity == null ? undefined : toNumber(item.quantity, 0);
        return splitNames(rawName).map((name) => ({
          name,
          quantity: quantity != null && quantity > 0 ? quantity : undefined,
        }));
      })
      .filter((item) => Boolean(item.name));

  const formatItem = (item: { name: string; quantity?: number }) =>
    item.quantity != null && item.quantity > 1 ? `${item.name} x${item.quantity}` : item.name;

  const baseItems = normalizeItems(params.baseCoverageItems);
  const selectedItems = normalizeItems(params.selectedCoverageItems);

  if (baseItems.length === 0) return selectedItems.map(formatItem);
  if (selectedItems.length === 0) return baseItems.map(formatItem);
  const normalizeKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  const selectedByKey = new Map(selectedItems.map((item) => [normalizeKey(item.name), item]));
  const mergedItems = baseItems.map((item) => selectedByKey.get(normalizeKey(item.name)) ?? item);
  const baseKeys = new Set(baseItems.map((item) => normalizeKey(item.name)));
  const additionalSelectedItems = selectedItems.filter((item) => !baseKeys.has(normalizeKey(item.name)));

  return [...mergedItems, ...additionalSelectedItems].map(formatItem);
}
