import { api, extractList, unwrapPayload } from "./client";
import type { CookFamilySize } from "./subscriptionPricingApi";

export type CookFamilySizeOptionDto = {
  familySizeId: number;
  familySize: CookFamilySize | string;
  label: string;
  subtitle?: string;
  active: boolean;
  sortOrder: number;
};

const fallbackOptions: CookFamilySizeOptionDto[] = [
  { familySizeId: 1, familySize: "SMALL", label: "1-2 Members", subtitle: "Small family", active: true, sortOrder: 1 },
  { familySizeId: 2, familySize: "MEDIUM", label: "3-5 Members", subtitle: "Medium family", active: true, sortOrder: 2 },
  { familySizeId: 3, familySize: "LARGE", label: "6-8 Members", subtitle: "Large family", active: true, sortOrder: 3 },
  { familySizeId: 4, familySize: "XLARGE", label: "8+ Members", subtitle: "Large gathering", active: true, sortOrder: 4 },
];

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value: unknown, fallback = true) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") return ["true", "1", "active", "enabled", "yes"].includes(value.trim().toLowerCase());
  return fallback;
}

function toCookFamilySize(row: any, index: number): CookFamilySizeOptionDto | null {
  const familySizeId = toNumber(row?.familySizeId ?? row?.id ?? row?.value, index + 1);
  const familySize = String(row?.familySize ?? row?.code ?? row?.key ?? row?.name ?? "").trim();
  const label = String(row?.label ?? row?.familySizeLabel ?? row?.displayName ?? row?.name ?? "").trim();
  if (!familySizeId || !familySize || !label) return null;
  return {
    familySizeId,
    familySize,
    label,
    subtitle: String(row?.subtitle ?? row?.description ?? "").trim() || undefined,
    active: toBoolean(row?.active ?? row?.enabled, true),
    sortOrder: toNumber(row?.sortOrder ?? row?.displayOrder, index + 1),
  };
}

export async function getCookFamilySizes(): Promise<CookFamilySizeOptionDto[]> {
  const endpoints = ["/api/customer/cook-family-sizes", "/api/customer/cook/family-sizes", "/api/subscription/cook-family-sizes"];
  for (const endpoint of endpoints) {
    try {
      const { data } = await api.get(endpoint);
      const rows = extractList<any>(unwrapPayload(data, []))
        .map((row, index) => toCookFamilySize(row, index))
        .filter((item: CookFamilySizeOptionDto | null): item is CookFamilySizeOptionDto => Boolean(item && item.active))
        .sort((first, second) => first.sortOrder - second.sortOrder);
      if (rows.length > 0) return rows;
    } catch {
      // Try next endpoint. Fallback keeps dev usable until backend config is available.
    }
  }
  return fallbackOptions;
}
