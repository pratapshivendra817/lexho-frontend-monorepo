import { api } from "@/api/axios";

import type {
  AdminCookSubscriptionPricing,
  AdminCookSubscriptionPricingPayload,
  AdminSubscriptionPricing,
  AdminSubscriptionPricingPayload,
  CookFamilySize,
} from "../pricingTypes";

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBoolean = (value: unknown, fallback = true) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") return ["true", "1", "active", "yes"].includes(value.trim().toLowerCase());
  return fallback;
};

const unwrap = (data: any) => data?.data ?? data;
const FAMILY_SIZE_LABELS: Record<CookFamilySize, string> = {
  SMALL: "1-2 Members",
  MEDIUM: "3-4 Members",
  LARGE: "5-6 Members",
  XLARGE: "6-8 Members",
};

function normalizePricing(row: any): AdminSubscriptionPricing {
  return {
    id: toNumber(row?.id),
    serviceId: row?.serviceId == null ? null : toNumber(row.serviceId),
    durationHours: toNumber(row?.durationHours),
    perVisitPrice: toNumber(row?.perVisitPrice),
    active: toBoolean(row?.active, true),
  };
}

function normalizeFamilySize(value: unknown): CookFamilySize {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "SMALL" || normalized === "MEDIUM" || normalized === "LARGE" || normalized === "XLARGE") {
    return normalized;
  }
  return "MEDIUM";
}

function normalizeCookPricing(row: any): AdminCookSubscriptionPricing {
  const familySize = normalizeFamilySize(row?.familySize);
  return {
    id: toNumber(row?.id),
    serviceId: row?.serviceId == null ? null : toNumber(row.serviceId),
    familySize,
    familySizeLabel: String(row?.familySizeLabel ?? FAMILY_SIZE_LABELS[familySize]),
    pricePerVisit: toNumber(row?.pricePerVisit ?? row?.perVisitPrice),
    active: toBoolean(row?.active, true),
  };
}

export async function getAdminSubscriptionPricing(): Promise<AdminSubscriptionPricing[]> {
  const { data } = await api.get("/api/admin/subscription-pricing");
  const rows = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
  return rows.map(normalizePricing).sort((first: AdminSubscriptionPricing, second: AdminSubscriptionPricing) => {
    const firstService = first.serviceId ?? 0;
    const secondService = second.serviceId ?? 0;
    if (firstService !== secondService) return firstService - secondService;
    return first.durationHours - second.durationHours;
  });
}

export async function createAdminSubscriptionPricing(
  payload: AdminSubscriptionPricingPayload,
): Promise<AdminSubscriptionPricing> {
  const { data } = await api.post("/api/admin/subscription-pricing", payload);
  return normalizePricing(unwrap(data));
}

export async function updateAdminSubscriptionPricing(
  id: number,
  payload: AdminSubscriptionPricingPayload,
): Promise<AdminSubscriptionPricing> {
  const { data } = await api.put(`/api/admin/subscription-pricing/${id}`, payload);
  return normalizePricing(unwrap(data));
}

export async function deleteAdminSubscriptionPricing(id: number): Promise<{ message: string }> {
  const { data } = await api.delete(`/api/admin/subscription-pricing/${id}`);
  return { message: String(data?.message ?? "Subscription duration price deleted successfully") };
}

export async function getAdminCookSubscriptionPricing(): Promise<AdminCookSubscriptionPricing[]> {
  const { data } = await api.get("/api/admin/subscription-pricing/cook");
  const rows = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
  return rows.map(normalizeCookPricing).sort((first: AdminCookSubscriptionPricing, second: AdminCookSubscriptionPricing) => {
    const firstService = first.serviceId ?? 0;
    const secondService = second.serviceId ?? 0;
    if (firstService !== secondService) return firstService - secondService;
    return first.familySize.localeCompare(second.familySize);
  });
}

export async function createAdminCookSubscriptionPricing(
  payload: AdminCookSubscriptionPricingPayload,
): Promise<AdminCookSubscriptionPricing> {
  const { data } = await api.post("/api/admin/subscription-pricing/cook", payload);
  return normalizeCookPricing(unwrap(data));
}

export async function updateAdminCookSubscriptionPricing(
  id: number,
  payload: AdminCookSubscriptionPricingPayload,
): Promise<AdminCookSubscriptionPricing> {
  const { data } = await api.put(`/api/admin/subscription-pricing/cook/${id}`, payload);
  return normalizeCookPricing(unwrap(data));
}

export async function deleteAdminCookSubscriptionPricing(id: number): Promise<{ message: string }> {
  const { data } = await api.delete(`/api/admin/subscription-pricing/cook/${id}`);
  return { message: String(data?.message ?? "Cook subscription price deleted successfully") };
}
