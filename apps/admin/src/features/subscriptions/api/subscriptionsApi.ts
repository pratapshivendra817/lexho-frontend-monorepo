import { api } from "@/api/axios";

import type {
  AdminSubscriptionAssignment,
  AdminSubscriptionDetail,
  AdminSubscriptionListItem,
  AdminSubscriptionsResponse,
  AdminSubscriptionStatus,
  AdminSubscriptionVisit,
  AdminSubscriptionVisitStatus,
} from "../types";

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as UnknownRecord) : {};

const asArray = (value: unknown): UnknownRecord[] => (Array.isArray(value) ? (value as UnknownRecord[]) : []);

const asString = (value: unknown): string | undefined => {
  if (value == null) return undefined;
  const text = String(value).trim();
  return text || undefined;
};

const asNumber = (value: unknown): number | undefined => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const asBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") return ["true", "1", "yes"].includes(value.trim().toLowerCase());
  return undefined;
};

const unwrapData = (data: unknown): unknown => {
  const root = asRecord(data);
  return root.data ?? data;
};

const readRows = (data: unknown): UnknownRecord[] => {
  const unwrapped = unwrapData(data);
  if (Array.isArray(unwrapped)) return unwrapped as UnknownRecord[];
  const source = asRecord(unwrapped);
  for (const key of ["content", "items", "subscriptions", "results", "calendar", "visits"]) {
    if (Array.isArray(source[key])) return source[key] as UnknownRecord[];
  }
  return [];
};

function normalizeVisit(row: UnknownRecord): AdminSubscriptionVisit {
  const partner = asRecord(row.partner);
  return {
    id: asNumber(row.id ?? row.visitId) ?? 0,
    visitDate: asString(row.visitDate ?? row.scheduledDate ?? row.date),
    date: asString(row.date ?? row.visitDate ?? row.scheduledDate),
    timeSlot: asString(row.timeSlot ?? row.slot),
    status: asString(row.status) ?? "SCHEDULED",
    partnerId: asNumber(row.partnerId),
    partnerName: asString(row.partnerName ?? partner.name),
  };
}

function normalizeSubscription(row: UnknownRecord): AdminSubscriptionListItem {
  const customer = asRecord(row.customer);
  const service = asRecord(row.service);
  const partner = asRecord(row.partner);
  return {
    id: asNumber(row.id ?? row.subscriptionId) ?? 0,
    customerId: asNumber(row.customerId ?? customer.id),
    customerName: asString(row.customerName ?? customer.name),
    serviceId: asNumber(row.serviceId ?? service.id),
    serviceName: asString(row.serviceName ?? service.name),
    status: asString(row.status) ?? "ACTIVE",
    frequency: asString(row.frequency ?? row.frequencyLabel),
    startDate: asString(row.startDate),
    endDate: asString(row.endDate),
    visits: asNumber(row.visits ?? row.totalVisits ?? row.visitCount),
    durationHours: asNumber(row.durationHours),
    timeSlot: asString(row.timeSlot),
    finalAmount: asNumber(row.finalAmount ?? row.price ?? row.amount ?? row.totalAmount),
    partnerName: asString(row.partnerName ?? partner.name),
    createdAt: asString(row.createdAt),
  };
}

function normalizeDetail(data: unknown): AdminSubscriptionDetail {
  const source = asRecord(unwrapData(data));
  const base = normalizeSubscription(source);
  const visitsList = asArray(source.visitsList ?? source.visits ?? source.calendar).map(normalizeVisit);
  const addOnsRaw = source.addOns;
  return {
    ...base,
    address: asString(source.address ?? source.addressLine ?? asRecord(source.addressDetails).fullAddress),
    paymentOption: asString(source.paymentOption),
    samePartnerPreferred: asBoolean(source.samePartnerPreferred),
    replacementPartnerAllowed: asBoolean(source.replacementPartnerAllowed),
    autoRenewal: asBoolean(source.autoRenewal),
    trialVisit: asBoolean(source.trialVisit),
    instructions: asString(source.serviceInstructions ?? source.instructions),
    addOns: Array.isArray(addOnsRaw) ? addOnsRaw.map((item) => String(item)).filter(Boolean) : undefined,
    visitsList,
  };
}

function normalizeAssignment(data: unknown): AdminSubscriptionAssignment {
  const source = asRecord(unwrapData(data));
  return {
    subscriptionId: asNumber(source.subscriptionId) ?? 0,
    partnerId: asNumber(source.partnerId) ?? null,
    partnerName: asString(source.partnerName) ?? null,
    status: asString(source.status),
    replacementPartnerId: asNumber(source.replacementPartnerId) ?? null,
    replacementPartnerName: asString(source.replacementPartnerName) ?? null,
    replacementReason: asString(source.replacementReason) ?? null,
    assignedAt: asString(source.assignedAt) ?? null,
    replacedAt: asString(source.replacedAt) ?? null,
    visitAssignments: asArray(source.visitAssignments).map((row) => ({
      id: asNumber(row.id),
      visitId: asNumber(row.visitId),
      partnerId: asNumber(row.partnerId),
      partnerName: asString(row.partnerName),
      status: asString(row.status),
      reason: asString(row.reason),
      assignedAt: asString(row.assignedAt),
    })),
  };
}

export async function getAdminSubscriptions(params: {
  page: number;
  size: number;
  customerId?: string;
  status?: string;
}): Promise<AdminSubscriptionsResponse> {
  const { data } = await api.get("/api/admin/subscriptions", {
    params: {
      page: params.page,
      size: params.size,
      customerId: params.customerId || undefined,
      status: params.status || undefined,
    },
  });
  const rows = readRows(data).map(normalizeSubscription);
  const root = asRecord(unwrapData(data));
  return {
    content: rows,
    totalElements: asNumber(root.totalElements ?? root.total ?? rows.length) ?? rows.length,
    totalPages: asNumber(root.totalPages) ?? Math.max(1, Math.ceil(rows.length / params.size)),
    pageNumber: asNumber(root.pageNumber ?? root.page ?? params.page) ?? params.page,
  };
}

export async function getAdminSubscriptionDetail(subscriptionId: string): Promise<AdminSubscriptionDetail> {
  const { data } = await api.get(`/api/admin/subscriptions/${subscriptionId}`);
  return normalizeDetail(data);
}

export async function getAdminSubscriptionCalendar(subscriptionId: string): Promise<AdminSubscriptionVisit[]> {
  const { data } = await api.get(`/api/admin/subscriptions/${subscriptionId}/calendar`);
  return readRows(data).map(normalizeVisit);
}

export async function updateAdminSubscriptionStatus(subscriptionId: string, status: AdminSubscriptionStatus) {
  const { data } = await api.patch(`/api/admin/subscriptions/${subscriptionId}/status`, { status });
  return data;
}

export async function updateAdminSubscriptionVisitStatus(
  subscriptionId: string,
  visitId: number,
  status: AdminSubscriptionVisitStatus,
) {
  const { data } = await api.patch(`/api/admin/subscriptions/${subscriptionId}/visits/${visitId}/status`, { status });
  return data;
}

export async function getAdminSubscriptionAssignment(subscriptionId: string): Promise<AdminSubscriptionAssignment> {
  const { data } = await api.get(`/api/admin/subscriptions/${subscriptionId}/assignment`);
  return normalizeAssignment(data);
}

export async function assignAdminSubscriptionPartner(
  subscriptionId: string,
  payload: { partnerId: number; reason: string },
) {
  const { data } = await api.post(`/api/admin/subscriptions/${subscriptionId}/assign-partner`, payload);
  return normalizeAssignment(data);
}

export async function replaceAdminSubscriptionPartner(
  subscriptionId: string,
  payload: { partnerId: number; reason: string },
) {
  const { data } = await api.post(`/api/admin/subscriptions/${subscriptionId}/replacement-partner`, payload);
  return normalizeAssignment(data);
}

export async function assignAdminSubscriptionVisitPartner(
  subscriptionId: string,
  visitId: number,
  payload: { partnerId: number; reason: string },
) {
  const { data } = await api.patch(
    `/api/admin/subscriptions/${subscriptionId}/visits/${visitId}/assign-partner`,
    payload,
  );
  return data;
}
