import { api } from "@/api/axios";

import type {
  AdminCleaningCoverage,
  AdminCleaningCoveragePayload,
  AdminCleaningCoverageTask,
  AdminCookCoverage,
  AdminCookCoverageItem,
  AdminCookCoveragePayload,
  CookFamilySize,
} from "../types";

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBool = (value: unknown, fallback = true): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "active", "yes"].includes(normalized)) return true;
    if (["false", "0", "inactive", "no"].includes(normalized)) return false;
  }
  return fallback;
};

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const FAMILY_SIZE_LABELS: Record<CookFamilySize, string> = {
  SMALL: "1-2 Members",
  MEDIUM: "3-4 Members",
  LARGE: "5-6 Members",
  XLARGE: "6-8 Members",
};

function normalizeTask(row: any): AdminCleaningCoverageTask {
  return {
    id: row?.id != null ? toNumber(row.id) : undefined,
    name: String(row?.name ?? "").trim(),
    estimatedMinutes: toNumber(row?.estimatedMinutes),
    icon: String(row?.icon ?? "").trim(),
    sortOrder: row?.sortOrder != null ? toNumber(row.sortOrder) : undefined,
  };
}

function normalizeFamilySize(value: unknown): CookFamilySize {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "SMALL" || normalized === "MEDIUM" || normalized === "LARGE" || normalized === "XLARGE") return normalized;
  return "MEDIUM";
}

function normalizeCookItem(row: any): AdminCookCoverageItem {
  return {
    id: row?.id != null ? toNumber(row.id) : undefined,
    name: String(row?.name ?? "").trim(),
    icon: String(row?.icon ?? "").trim(),
    sortOrder: row?.sortOrder != null ? toNumber(row.sortOrder) : undefined,
    quantity: row?.quantity != null ? toNumber(row.quantity) : undefined,
  };
}

function normalizeCoverage(row: any): AdminCleaningCoverage {
  return {
    id: toNumber(row?.id),
    durationHours: toNumber(row?.durationHours),
    reference: String(row?.reference ?? "").trim(),
    sortOrder: toNumber(row?.sortOrder),
    active: toBool(row?.active, true),
    tasks: asArray<any>(row?.tasks).map(normalizeTask),
  };
}

function readDataList(data: any): AdminCleaningCoverage[] {
  const rows = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
  return rows.map(normalizeCoverage);
}

function readDataItem(data: any): AdminCleaningCoverage {
  const row = data?.data && !Array.isArray(data.data) ? data.data : data;
  return normalizeCoverage(row);
}

function normalizeCookCoverage(row: any): AdminCookCoverage {
  const familySize = normalizeFamilySize(row?.familySize);
  return {
    id: toNumber(row?.id),
    serviceId: row?.serviceId == null ? null : toNumber(row?.serviceId),
    familySize,
    members: String(row?.members ?? "").trim(),
    familySizeLabel: String(row?.familySizeLabel ?? FAMILY_SIZE_LABELS[familySize]).trim(),
    reference: String(row?.reference ?? "").trim(),
    sortOrder: toNumber(row?.sortOrder),
    active: toBool(row?.active, true),
    items: asArray<any>(row?.items).map(normalizeCookItem),
  };
}

function readCookDataList(data: any): AdminCookCoverage[] {
  const rows = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
  return rows.map(normalizeCookCoverage);
}

function readCookDataItem(data: any): AdminCookCoverage {
  const row = data?.data && !Array.isArray(data.data) ? data.data : data;
  return normalizeCookCoverage(row);
}

export async function getAdminCleaningCoverage(): Promise<AdminCleaningCoverage[]> {
  const { data } = await api.get("/api/admin/cleaning-coverage");
  return readDataList(data);
}

export async function createAdminCleaningCoverage(payload: AdminCleaningCoveragePayload): Promise<AdminCleaningCoverage> {
  const { data } = await api.post("/api/admin/cleaning-coverage", payload);
  return readDataItem(data);
}

export async function updateAdminCleaningCoverage(
  id: number,
  payload: AdminCleaningCoveragePayload,
): Promise<AdminCleaningCoverage> {
  const { data } = await api.put(`/api/admin/cleaning-coverage/${id}`, payload);
  return readDataItem(data);
}

export async function deleteAdminCleaningCoverage(id: number): Promise<{ message: string }> {
  const { data } = await api.delete(`/api/admin/cleaning-coverage/${id}`);
  return { message: String(data?.message ?? "Cleaning coverage deleted successfully") };
}

export async function getAdminCookCoverage(): Promise<AdminCookCoverage[]> {
  const { data } = await api.get("/api/admin/cook-coverage");
  return readCookDataList(data);
}

export async function createAdminCookCoverage(payload: AdminCookCoveragePayload): Promise<AdminCookCoverage> {
  const { data } = await api.post("/api/admin/cook-coverage", payload);
  return readCookDataItem(data);
}

export async function updateAdminCookCoverage(id: number, payload: AdminCookCoveragePayload): Promise<AdminCookCoverage> {
  const { data } = await api.put(`/api/admin/cook-coverage/${id}`, payload);
  return readCookDataItem(data);
}

export async function deleteAdminCookCoverage(id: number): Promise<{ message: string }> {
  const { data } = await api.delete(`/api/admin/cook-coverage/${id}`);
  return { message: String(data?.message ?? "Cook coverage deleted successfully") };
}
