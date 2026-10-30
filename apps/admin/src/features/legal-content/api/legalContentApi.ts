import { api } from "@/api/axios";
import type { LegalDocument, LegalDocumentPayload, LegalDocumentVersion } from "../types";

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const asString = (value: unknown): string =>
  typeof value === "string" || typeof value === "number" ? String(value).trim() : "";

// API responses expose legal IDs as lc_12, while mutation routes require 12.
const toBackendId = (id: string) => String(id).replace(/^lc_/, "");

const extractRows = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;
  const root = asRecord(payload);
  const nestedData = asRecord(root.data);
  const pageData = asRecord(nestedData.data);
  const candidates = [
    root.items,
    root.documents,
    nestedData.items,
    nestedData.documents,
    pageData.items,
    pageData.documents,
    pageData.content,
    nestedData.content,
    root.content,
    root.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
};

function normalizeDocument(input: unknown): LegalDocument {
  const row = asRecord(input);
  return {
    id: asString(row.id), title: asString(row.title), documentType: asString(row.documentType || row.type), platform: (asString(row.platform || row.userType) || undefined) as LegalDocument["platform"], format: (asString(row.format) || undefined) as LegalDocument["format"],
    version: asString(row.version), status: asString(row.status).toUpperCase() || "DRAFT",
    content: asString(row.content || row.body || row.markdown), summary: asString(row.summary) || undefined, changeNote: asString(row.changeNote) || undefined,
    effectiveFrom: asString(row.effectiveFrom || row.effectiveDate) || undefined, createdBy: asString(row.createdBy) || undefined, createdAt: asString(row.createdAt) || undefined, updatedAt: asString(row.updatedAt || row.lastUpdated) || undefined,
    publishedAt: asString(row.publishedAt) || undefined,
  };
}

const toRequestPayload = (payload: LegalDocumentPayload) => ({
  title: payload.title.trim(),
  platform: payload.platform,
  documentType: payload.documentType,
  format: payload.format,
  content: payload.content,
  summary: payload.summary?.trim() || undefined,
  changeNote: payload.changeNote?.trim() || undefined,
  effectiveFrom: payload.effectiveFrom ? (payload.effectiveFrom.includes("T") ? payload.effectiveFrom : `${payload.effectiveFrom}T00:00:00Z`) : null,
  publish: false,
});

export async function getLegalDocuments(filters: { documentType?: string; status?: string; platform?: string } = {}) { const { data } = await api.get("/api/v1/admin/legal", { params: filters }); return extractRows(data).map(normalizeDocument); }

export async function createLegalDocument(payload: LegalDocumentPayload) { const { data } = await api.post("/api/v1/admin/legal", toRequestPayload(payload)); return normalizeDocument(asRecord(data).data ?? data); }
export async function updateLegalDocument(id: string, payload: LegalDocumentPayload) { const { data } = await api.put(`/api/v1/admin/legal/${toBackendId(id)}`, toRequestPayload(payload)); return normalizeDocument(asRecord(data).data ?? data); }
export async function publishLegalDocument(id: string) { await api.post(`/api/v1/admin/legal/${toBackendId(id)}/publish`); }
export async function archiveLegalDocument(id: string) { await api.post(`/api/v1/admin/legal/${toBackendId(id)}/archive`); }
export async function getLegalVersions(id: string): Promise<LegalDocumentVersion[]> { const { data } = await api.get(`/api/v1/admin/legal/${toBackendId(id)}/versions`); return extractRows(data).map((item) => normalizeDocument(item)); }
