import { api } from "@/api/axios";

import type {
  ProviderDetails,
  ProviderDocument,
  ProviderListItem,
  ProviderServiceType,
  ProviderStats,
  ProviderStatus,
  ProvidersListResponse,
  ProvidersQueryParams,
} from "../types";

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === "object" ? (value as UnknownRecord) : {};

const asString = (value: unknown): string =>
  typeof value === "string" || typeof value === "number" ? String(value) : "";

const asNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const readArray = (payload: unknown): UnknownRecord[] => {
  if (Array.isArray(payload)) {
    return payload as UnknownRecord[];
  }

  const root = asRecord(payload);
  const keys = ["content", "data", "items", "providers", "results", "documents", "history"];
  for (const key of keys) {
    const value = root[key];
    if (Array.isArray(value)) {
      return value as UnknownRecord[];
    }
  }

  const nested = asRecord(root.data);
  if (Array.isArray(nested.content)) {
    return nested.content as UnknownRecord[];
  }

  return [];
};

const normalizeStatus = (value: unknown): ProviderStatus => {
  const status = asString(value).toUpperCase();
  if (status === "APPROVED") return "APPROVED";
  if (status === "REJECTED") return "REJECTED";
  if (status === "BLOCKED") return "BLOCKED";
  return "PENDING";
};

const normalizeServiceType = (value: unknown): string => {
  const serviceType = asString(value).toUpperCase();
  if (serviceType === "COOK") return "COOK";
  if (serviceType === "CLEANING") return "CLEANING";
  return asString(value);
};

const toListItem = (row: UnknownRecord): ProviderListItem => ({
  id: asString(row.id ?? row.providerId),
  name: asString(row.name ?? row.fullName),
  phone: asString(row.phone ?? row.mobile),
  serviceType: normalizeServiceType(row.serviceType ?? row.category),
  city: asString(row.city),
  appliedDate: asString(row.appliedDate ?? row.createdAt ?? row.created_on),
  status: normalizeStatus(row.status),
});

const readStats = (payload: unknown): ProviderStats => {
  const root = asRecord(payload);
  const nested = asRecord(root.data);
  const source = Object.keys(nested).length > 0 ? nested : root;

  return {
    pending: asNumber(source.pending),
    approved: asNumber(source.approved),
    rejected: asNumber(source.rejected),
    blocked: asNumber(source.blocked),
  };
};

const readDocuments = (payload: unknown): ProviderDocument[] =>
  readArray(payload).map((row) => ({
    id: asString(row.id ?? row.documentId),
    name: asString(row.name ?? row.fileName ?? row.documentType),
    documentType: asString(row.documentType),
    contentType: asString(row.contentType ?? row.mimeType),
    previewUrl: asString(row.previewUrl ?? row.url) || undefined,
    uploadedAt: asString(row.uploadedAt ?? row.createdAt) || undefined,
  }));

export async function getProviderStats(): Promise<ProviderStats> {
  const { data } = await api.get("/api/admin/providers/stats");
  return readStats(data);
}

export async function getProviders(params: ProvidersQueryParams): Promise<ProvidersListResponse> {
  const query = {
    page: params.page,
    size: params.size,
    status: params.status || undefined,
    serviceType: params.serviceType || undefined,
    city: params.city || undefined,
    search: params.search || undefined,
    sortBy: params.sortBy || "createdAt",
    sortDir: params.sortDir || "desc",
  };

  const { data } = await api.get("/api/admin/providers", { params: query });
  const content = readArray(data).map(toListItem);
  const root = asRecord(data);
  const nested = asRecord(root.data);
  const source = Object.keys(nested).length > 0 ? nested : root;

  return {
    content,
    totalElements: asNumber(source.totalElements ?? source.total ?? content.length, content.length),
    totalPages: asNumber(source.totalPages, Math.max(1, Math.ceil(content.length / params.size))),
    pageNumber: asNumber(source.pageNumber ?? source.page ?? params.page, params.page),
  };
}

export async function getProviderDetails(id: string): Promise<ProviderDetails | null> {
  const { data } = await api.get(`/api/admin/providers/${id}`);
  const root = asRecord(data);
  const nested = asRecord(root.data);
  const source = Object.keys(nested).length > 0 ? nested : root;

  if (Object.keys(source).length === 0) {
    return null;
  }

  return {
    ...toListItem(source),
    email: asString(source.email) || undefined,
    gender: asString(source.gender) || undefined,
    dob: asString(source.dob) || undefined,
    state: asString(source.state) || undefined,
    address: asString(source.address) || undefined,
    experience: asString(source.experience) || undefined,
    availabilityType: asString(source.availabilityType) || undefined,
    serviceAreas: readArray(source.serviceAreas).map((item) => asString(item)),
    workingDays: readArray(source.workingDays).map((item) => asString(item)),
    startTime: asString(source.startTime) || undefined,
    endTime: asString(source.endTime) || undefined,
    accountNumber: asString(source.accountNumber) || undefined,
    ifscCode: asString(source.ifscCode) || undefined,
    documents: readDocuments(source.documents),
    statusHistory: readArray(source.statusHistory).map((item) => ({
      status: normalizeStatus(item.status),
      reason: asString(item.reason) || undefined,
      changedAt: asString(item.changedAt ?? item.createdAt) || undefined,
      changedBy: asString(item.changedBy) || undefined,
    })),
  };
}

export async function approveProvider(id: string) {
  await api.put(`/api/admin/providers/${id}/approve`);
}

export async function rejectProvider(id: string, reason: string) {
  await api.put(`/api/admin/providers/${id}/reject`, { reason });
}

export async function blockProvider(id: string, reason: string) {
  await api.put(`/api/admin/providers/${id}/block`, { reason });
}

export async function unblockProvider(id: string) {
  await api.put(`/api/admin/providers/${id}/unblock`);
}

export async function deleteProvider(id: string) {
  await api.delete(`/api/admin/providers/${id}`);
}

export async function downloadProviderDocument(providerId: string, documentId: string) {
  const { data, headers } = await api.get(
    `/api/admin/providers/${providerId}/documents/${documentId}/download`,
    { responseType: "blob" },
  );

  const blob = new Blob([data], { type: headers["content-type"] || "application/octet-stream" });
  const fileName = `provider-${providerId}-doc-${documentId}`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export const providerServiceTypes: ProviderServiceType[] = ["", "COOK", "CLEANING"];
