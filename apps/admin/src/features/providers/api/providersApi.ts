import { api } from "@/api/axios";

import type {
  PartnerDashboardStats,
  PartnerDetails,
  PartnerDocument,
  PartnerListItem,
  PartnerServiceType,
  PartnerSettlementsResponse,
  PartnerSettlementStatus,
  PartnerStats,
  PartnerStatus,
  PartnersListResponse,
  PartnersQueryParams,
} from "../types";

type UnknownRecord = Record<string, unknown>;
const ADMIN_PARTNERS_BASE = "/api/admin/partners";
const ADMIN_PROVIDERS_BASE = "/api/admin/providers";
const ADMIN_V1_PARTNERS_BASE = "/api/v1/admin/partners";

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

const asBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  if (typeof value === "number") return value === 1;
  return fallback;
};

const readArray = (payload: unknown): UnknownRecord[] => {
  if (Array.isArray(payload)) {
    return payload as UnknownRecord[];
  }

  const root = asRecord(payload);
  const keys = ["content", "data", "items", "partners", "results", "documents", "history"];
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

const normalizeStatus = (value: unknown): PartnerStatus => {
  const status = asString(value).toUpperCase();
  if (status === "APPROVED") return "APPROVED";
  if (status === "REJECTED") return "REJECTED";
  if (status === "BLOCKED") return "BLOCKED";
  return "PENDING";
};

const getOnboardingStatusValue = (row: UnknownRecord): unknown =>
  row.onboardingStatus ?? row.status ?? row.verificationStatus;

const normalizeServiceType = (value: unknown): string => {
  const serviceType = asString(value).toUpperCase();
  if (serviceType === "COOK") return "COOK";
  if (serviceType === "CLEANING") return "CLEANING";
  return asString(value);
};

const normalizePreviewUrl = (value: unknown): string | undefined => {
  const raw = asString(value).trim();
  if (!raw) return undefined;
  if (raw.startsWith("blob:") || raw.startsWith("data:")) return raw;

  try {
    const parsed = new URL(raw);
    const isLocalBackendHost =
      parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "0.0.0.0";
    const isBackendPort = parsed.port === "8082";

    if (isLocalBackendHost && isBackendPort && parsed.pathname.startsWith("/api/")) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    // Non-absolute URL, return as-is.
  }

  return raw;
};

const toListItem = (row: UnknownRecord): PartnerListItem => ({
  id: asString(row.id ?? row.partnerId),
  name: asString(row.name ?? row.fullName),
  phone: asString(row.phone ?? row.mobile ?? row.phoneNumber),
  serviceType: normalizeServiceType(row.serviceType ?? row.category ?? row.serviceCategoryName),
  city: asString(row.city),
  appliedDate: asString(row.appliedDate ?? row.createdAt ?? row.created_on),
  status: normalizeStatus(getOnboardingStatusValue(row)),
});

const readStats = (payload: unknown): PartnerStats => {
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

const readDocuments = (payload: unknown): PartnerDocument[] =>
  readArray(payload).map((row) => ({
    id: asString(row.id ?? row.documentId),
    name: asString(row.name ?? row.fileName ?? row.documentType),
    documentType: asString(row.documentType),
    contentType: asString(row.contentType ?? row.mimeType),
    previewUrl: normalizePreviewUrl(row.previewUrl ?? row.url),
    uploadedAt: asString(row.uploadedAt ?? row.createdAt) || undefined,
  }));

const shouldFallbackToLegacyPath = (error: unknown): boolean => {
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === 404 || status === 405;
};

const withLegacyFallback = async <T>(request: (basePath: string) => Promise<T>): Promise<T> => {
  try {
    return await request(ADMIN_PARTNERS_BASE);
  } catch (error) {
    if (!shouldFallbackToLegacyPath(error)) {
      throw error;
    }
    return request(ADMIN_PROVIDERS_BASE);
  }
};

export async function getPartnerStats(): Promise<PartnerStats> {
  const { data } = await withLegacyFallback((basePath) => api.get(`${basePath}/stats`));
  return readStats(data);
}

export async function getPartners(params: PartnersQueryParams): Promise<PartnersListResponse> {
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

  const { data } = await withLegacyFallback((basePath) => api.get(basePath, { params: query }));
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

export async function getPartnerDetails(id: string): Promise<PartnerDetails | null> {
  const [{ data }, bankDetailsResponse] = await Promise.all([
    withLegacyFallback((basePath) => api.get(`${basePath}/${id}`)),
    api.get(`${ADMIN_PARTNERS_BASE}/${id}/bank-details`).catch(() => null),
  ]);
  const root = asRecord(data);
  const nested = asRecord(root.data);
  const source = Object.keys(nested).length > 0 ? nested : root;
  const bankRoot = asRecord(bankDetailsResponse?.data);
  const bankNested = asRecord(bankRoot.data);
  const bankDetails = Object.keys(bankNested).length > 0 ? bankNested : bankRoot;

  if (Object.keys(source).length === 0) {
    return null;
  }

  return {
    ...toListItem(source),
    email: asString(source.email) || undefined,
    gender: asString(source.gender) || undefined,
    dob: asString(source.dob ?? source.dateOfBirth) || undefined,
    state: asString(source.state) || undefined,
    address: asString(source.address ?? source.fullAddress ?? source.currentFullAddress) || undefined,
    experience: asString(source.experience ?? source.experienceYears) || undefined,
    availabilityType: asString(source.availabilityType) || undefined,
    status: normalizeStatus(getOnboardingStatusValue(source)),
    online: asBoolean(source.online, false),
    serviceAreas: readArray(source.serviceAreas).map((item) => asString(item)),
    workingDays: readArray(source.workingDays).map((item) => asString(item)),
    startTime: asString(source.startTime) || undefined,
    endTime: asString(source.endTime) || undefined,
    accountNumber:
      asString(bankDetails.accountNumber ?? bankDetails.bankAccountNumber ?? bankDetails.accountNo) || undefined,
    accountNumberMasked:
      asString(source.accountNumberMasked ?? source.accountNumber ?? source.bankAccount ?? source.bankAccountNumber ?? source.accountNo) ||
      undefined,
    ifscCode: asString(source.ifscCode) || undefined,
    documents: readDocuments(source.documents),
    statusHistory: readArray(source.statusHistory).map((item) => ({
      status: normalizeStatus(getOnboardingStatusValue(item)),
      reason: asString(item.reason) || undefined,
      changedAt: asString(item.changedAt ?? item.createdAt) || undefined,
      changedBy: asString(item.changedBy) || undefined,
    })),
  };
}

export async function approvePartner(id: string) {
  await withLegacyFallback((basePath) => api.put(`${basePath}/${id}/approve`));
}

export async function rejectPartner(id: string, reason: string) {
  await withLegacyFallback((basePath) => api.put(`${basePath}/${id}/reject`, { reason }));
}

export async function blockPartner(id: string, reason: string) {
  await withLegacyFallback((basePath) => api.put(`${basePath}/${id}/block`, { reason }));
}

export async function unblockPartner(id: string) {
  await withLegacyFallback((basePath) => api.put(`${basePath}/${id}/unblock`));
}

export async function deletePartner(id: string) {
  await withLegacyFallback((basePath) => api.delete(`${basePath}/${id}`));
}

export async function getPartnerDashboardStats(id: string): Promise<PartnerDashboardStats> {
  const { data } = await api.get(`${ADMIN_PARTNERS_BASE}/${id}/dashboard/stats`);
  const root = asRecord(data);
  const nested = asRecord(root.data);
  const source = Object.keys(nested).length > 0 ? nested : root;

  return {
    todayEarnings: asNumber(source.todayEarnings ?? source.todayEarning ?? source.earningsToday, 0),
    totalCompletedOrders: asNumber(source.totalCompletedOrders ?? source.completedOrders, 0),
    pendingOrders: asNumber(source.pendingOrders ?? source.newOrders, 0),
  };
}

export async function updatePartnerAvailability(id: string, online: boolean) {
  return withLegacyFallback(async (basePath) => {
    try {
      const { data } = await api.put(`${basePath}/${id}/availability`, {
        online,
        isOnline: online,
        available: online,
      });
      return data;
    } catch (error) {
      if (!shouldFallbackToLegacyPath(error)) {
        throw error;
      }
      const { data } = await api.patch(`${basePath}/${id}/availability`, {
        online,
        isOnline: online,
        available: online,
      });
      return data;
    }
  });
}

export async function getPartnerSettlements(params: {
  page: number;
  size: number;
  search?: string;
  status?: PartnerSettlementStatus | "";
}): Promise<PartnerSettlementsResponse> {
  const { data } = await api.get(`${ADMIN_V1_PARTNERS_BASE}/settlements`, {
    params: {
      search: params.search || undefined,
      status: params.status || undefined,
      page: params.page,
      size: params.size,
    },
  });
  const root = asRecord(data);
  const nested = asRecord(root.data);
  const source = Object.keys(nested).length > 0 ? nested : root;
  const rows = readArray(source.items ?? source).map((row) => ({
    id: asString(row.id),
    providerId: asString(row.providerId),
    amount: asNumber(row.amount),
    status: (asString(row.status).toUpperCase() as PartnerSettlementStatus) || "PENDING",
    referenceBookingId: asString(row.referenceBookingId) || undefined,
    remarks: asString(row.remarks) || undefined,
    processedAt: asString(row.processedAt) || null,
    createdAt: asString(row.createdAt) || undefined,
  }));
  return {
    items: rows,
    totalElements: asNumber(source.totalElements, rows.length),
    totalPages: asNumber(source.totalPages, 1),
    page: asNumber(source.page, params.page),
    size: asNumber(source.size, params.size),
  };
}

export async function updateSettlementStatus(payoutId: string, status: PartnerSettlementStatus, remarks: string) {
  await api.patch(`${ADMIN_V1_PARTNERS_BASE}/settlements/${payoutId}/status`, { status, remarks });
}

export async function reviewPartnerKycDocument(
  partnerId: string,
  documentId: string,
  decision: "APPROVED" | "REJECTED",
  reason: string,
) {
  await api.patch(`${ADMIN_V1_PARTNERS_BASE}/${partnerId}/kyc/documents/${documentId}/review`, {
    decision,
    reason,
  });
}

export async function forcePartnerAvailability(
  partnerId: string,
  payload: { online: boolean; lockMinutes: number; reason: string },
) {
  await api.patch(`${ADMIN_V1_PARTNERS_BASE}/${partnerId}/availability/force`, payload);
}

export async function updatePartnerSkillsGovernance(
  partnerId: string,
  payload: { categoryIds: number[]; subServiceIds: number[] },
) {
  try {
    await api.put(`${ADMIN_V1_PARTNERS_BASE}/${partnerId}/skills`, payload);
  } catch (error) {
    if (!shouldFallbackToLegacyPath(error)) {
      throw error;
    }
    await api.put(`${ADMIN_V1_PARTNERS_BASE}/skills`, { partnerId: Number(partnerId), ...payload });
  }
}

export async function runPartnerRiskAction(
  partnerId: string,
  payload: { action: "SOFT_BLOCK" | "HARD_BLOCK" | "UNBLOCK" | "FLAG_FRAUD"; reason: string },
) {
  await api.patch(`${ADMIN_V1_PARTNERS_BASE}/${partnerId}/risk/action`, payload);
}

export async function downloadPartnerDocument(partnerId: string, documentId: string, previewUrl?: string) {
  if (previewUrl) {
    const directLink = document.createElement("a");
    directLink.href = previewUrl;
    directLink.target = "_blank";
    directLink.rel = "noopener noreferrer";
    directLink.download = `partner-${partnerId}-doc-${documentId}`;
    document.body.appendChild(directLink);
    directLink.click();
    directLink.remove();
    return;
  }

  const candidatePaths = [
    `${ADMIN_PARTNERS_BASE}/${partnerId}/documents/${documentId}/download`,
    `${ADMIN_PARTNERS_BASE}/${partnerId}/documents/${documentId}`,
    `${ADMIN_PARTNERS_BASE}/documents/${documentId}/download`,
    `${ADMIN_PARTNERS_BASE}/documents/${documentId}`,
    `${ADMIN_PROVIDERS_BASE}/${partnerId}/documents/${documentId}/download`,
    `${ADMIN_PROVIDERS_BASE}/${partnerId}/documents/${documentId}`,
    `${ADMIN_PROVIDERS_BASE}/documents/${documentId}/download`,
    `${ADMIN_PROVIDERS_BASE}/documents/${documentId}`,
  ];

  let lastError: unknown;
  let response: { data: BlobPart; headers: Record<string, string> } | null = null;

  for (const path of candidatePaths) {
    try {
      const { data, headers } = await api.get(path, { responseType: "blob" });
      response = { data, headers: headers as Record<string, string> };
      break;
    } catch (error) {
      lastError = error;
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status && ![400, 404, 405].includes(status)) {
        break;
      }
    }
  }

  if (!response) {
    const axiosLikeError = lastError as {
      response?: { data?: Blob | { message?: string } | string };
      message?: string;
    };
    const payload = axiosLikeError?.response?.data;
    if (payload instanceof Blob && payload.type.includes("application/json")) {
      const text = await payload.text();
      try {
        const parsed = JSON.parse(text) as { message?: string };
        throw new Error(parsed?.message || "Unable to download document");
      } catch {
        throw new Error(text || "Unable to download document");
      }
    }
    if (typeof payload === "object" && payload && "message" in payload) {
      throw new Error(String((payload as { message?: string }).message || "Unable to download document"));
    }
    if (typeof payload === "string" && payload.trim()) {
      throw new Error(payload);
    }
    throw new Error(axiosLikeError?.message || "Unable to download document");
  }

  const contentTypeHeader = response.headers["content-type"];
  const blobType =
    typeof contentTypeHeader === "string" && contentTypeHeader.trim().length > 0
      ? contentTypeHeader
      : "application/octet-stream";
  const blob = new Blob([response.data], { type: blobType });
  const fileName = `partner-${partnerId}-doc-${documentId}`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export const partnerServiceTypes: PartnerServiceType[] = ["", "COOK", "CLEANING"];


