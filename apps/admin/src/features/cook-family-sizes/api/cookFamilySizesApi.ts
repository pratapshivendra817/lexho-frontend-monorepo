import { api } from "@/api/axios";

import type { AdminCookFamilySize, AdminCookFamilySizePayload } from "../types";

function unwrap(data: unknown) {
  if (data && typeof data === "object" && "data" in data) {
    return (data as { data?: unknown }).data ?? data;
  }
  return data;
}

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

function normalizeRow(row: any, index: number): AdminCookFamilySize {
  return {
    familySizeId: toNumber(row?.familySizeId ?? row?.id, index + 1),
    familySize: String(row?.familySize ?? row?.code ?? "").trim(),
    familySizeLabel: String(row?.familySizeLabel ?? row?.label ?? row?.displayName ?? "").trim(),
    active: toBoolean(row?.active, true),
    displayOrder: toNumber(row?.displayOrder ?? row?.sortOrder, index + 1),
  };
}

function normalizeList(data: unknown): AdminCookFamilySize[] {
  const payload = unwrap(data);
  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as any).data)
      ? (payload as any).data
      : [];
  return rows
    .map((row: any, index: number) => normalizeRow(row, index))
    .sort((first: AdminCookFamilySize, second: AdminCookFamilySize) => first.displayOrder - second.displayOrder);
}

export async function getAdminCookFamilySizes() {
  const { data } = await api.get("/api/admin/cook-family-sizes");
  return normalizeList(data);
}

export async function createAdminCookFamilySize(payload: AdminCookFamilySizePayload) {
  const { data } = await api.post("/api/admin/cook-family-sizes", payload);
  return normalizeRow(unwrap(data), 0);
}

export async function updateAdminCookFamilySize(familySizeId: number, payload: AdminCookFamilySizePayload) {
  const { data } = await api.put(`/api/admin/cook-family-sizes/${familySizeId}`, payload);
  return normalizeRow(unwrap(data), 0);
}

export async function updateAdminCookFamilySizeStatus(familySizeId: number, active: boolean) {
  const { data } = await api.patch(`/api/admin/cook-family-sizes/${familySizeId}/status`, { active });
  return normalizeRow(unwrap(data), 0);
}

export async function deleteAdminCookFamilySize(familySizeId: number) {
  await api.delete(`/api/admin/cook-family-sizes/${familySizeId}`);
  return familySizeId;
}
