import { api } from "@/api/axios";

import type {
  BookingDetails,
  BookingListItem,
  BookingListParams,
  BookingListResponse,
  BookingStats,
  BookingStatus,
  DispatchLifecycleStatus,
  ServiceType,
  UpdateBookingPayload,
} from "../types";

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === "object" ? (value as UnknownRecord) : {};

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

const asString = (value: unknown): string =>
  typeof value === "string" || typeof value === "number" ? String(value) : "";

const normalizeStatus = (value: unknown): BookingStatus => {
  const status = asString(value).toUpperCase();
  if (status === "CONFIRMED") return "CONFIRMED";
  if (status === "COMPLETED") return "COMPLETED";
  if (status === "CANCELLED") return "CANCELLED";
  return "PENDING";
};

const normalizeServiceType = (value: unknown): ServiceType => {
  const serviceType = asString(value).toUpperCase();
  if (serviceType === "COOK") return "COOK";
  if (serviceType === "CLEANING") return "CLEANING";
  return "OTHER";
};

const readArray = (payload: unknown, keys: string[]): UnknownRecord[] => {
  if (Array.isArray(payload)) {
    return payload as UnknownRecord[];
  }

  const root = asRecord(payload);
  for (const key of keys) {
    if (Array.isArray(root[key])) {
      return root[key] as UnknownRecord[];
    }
  }

  return [];
};

const toListItem = (row: UnknownRecord): BookingListItem => {
  const customer = asRecord(row.customer);
  const partner = asRecord(row.partner);
  const service = asRecord(row.service);

  return {
    id: asString(row.id ?? row.bookingId),
    customerName: asString(row.customerName ?? customer.name),
    service: asString(row.serviceName ?? row.service ?? service.name),
    serviceType: normalizeServiceType(row.serviceType ?? service.type),
    partnerName: asString(row.partnerName ?? partner.name),
    bookingDate: asString(row.bookingDate ?? row.date),
    amount: asNumber(row.amount ?? row.totalAmount),
    status: normalizeStatus(row.status),
    createdAt: asString(row.createdAt),
  };
};

const toDetails = (payload: unknown, id: string): BookingDetails | null => {
  const root = asRecord(payload);
  const source =
    (Object.keys(asRecord(root.data)).length > 0 ? asRecord(root.data) : null) ??
    (Object.keys(root).length > 0 ? root : null);

  if (!source) {
    return null;
  }

  const customer = asRecord(source.customer);
  const partner = asRecord(source.partner);
  const service = asRecord(source.service);
  const payment = asRecord(source.payment);
  const timelineRows = readArray(source.timeline ?? source.history, ["timeline", "history"]);

  return {
    id: asString(source.id ?? id),
    status: normalizeStatus(source.status),
    service: asString(source.serviceName ?? source.service ?? service.name),
    serviceType: normalizeServiceType(source.serviceType ?? service.type),
    bookingDate: asString(source.bookingDate ?? source.date),
    bookingTime: asString(source.bookingTime ?? source.time),
    notes: asString(source.notes),
    customer: {
      id: asString(customer.id),
      name: asString(source.customerName ?? customer.name),
      phone: asString(customer.phone),
      email: asString(customer.email),
      address: asString(customer.address),
    },
    partner: {
      id: asString(partner.id ?? source.partnerId),
      name: asString(source.partnerName ?? partner.name),
      phone: asString(partner.phone),
      email: asString(partner.email),
      rating: asNumber(partner.rating),
    },
    payment: {
      amount: asNumber(source.amount ?? payment.amount),
      method: asString(payment.method),
      status: asString(payment.status),
      transactionId: asString(payment.transactionId),
      currency: asString(payment.currency),
    },
    timeline: timelineRows.map((row) => ({
      label: asString(row.label ?? row.status ?? row.title),
      at: asString(row.at ?? row.time ?? row.date),
      actor: asString(row.actor ?? row.by),
      notes: asString(row.notes ?? row.message),
    })),
  };
};

export async function getBookingStats(): Promise<BookingStats> {
  const { data } = await api.get("/api/admin/bookings/stats");
  const root = asRecord(data);
  const source = Object.keys(asRecord(root.data)).length > 0 ? asRecord(root.data) : root;

  return {
    pending: asNumber(source.pending),
    confirmed: asNumber(source.confirmed),
    completed: asNumber(source.completed),
    cancelled: asNumber(source.cancelled),
  };
}

export async function getBookings(params: BookingListParams): Promise<BookingListResponse> {
  const queryParams = {
    page: params.page,
    size: params.size,
    sortBy: params.sortBy,
    sortDir: params.sortDir,
    status: params.status || undefined,
    serviceType: params.serviceType || undefined,
    search: params.search || undefined,
    startDate: params.startDate || undefined,
    endDate: params.endDate || undefined,
  };

  const { data } = await api.get("/api/admin/bookings", { params: queryParams });

  const root = asRecord(data);
  const content = readArray(data, ["content", "data", "items", "results"]).map(toListItem);
  const nested = asRecord(root.data);

  return {
    content,
    totalElements: asNumber(root.totalElements ?? nested.totalElements, content.length),
    totalPages: asNumber(root.totalPages ?? nested.totalPages, Math.max(1, Math.ceil(content.length / params.size))),
    pageNumber: asNumber(root.pageNumber ?? nested.pageNumber, params.page),
  };
}

export async function getBookingById(id: string): Promise<BookingDetails | null> {
  const { data } = await api.get(`/api/admin/bookings/${id}`);
  return toDetails(data, id);
}

export async function updateBooking(id: string, payload: UpdateBookingPayload) {
  await api.put(`/api/admin/bookings/${id}`, payload);
}

export async function cancelBooking(id: string) {
  await api.put(`/api/admin/bookings/${id}/cancel`);
}

export async function softDeleteBooking(id: string) {
  await api.delete(`/api/admin/bookings/${id}`);
}

export async function manualDispatchOrder(orderId: string) {
  await api.post(`/api/admin/dispatch/orders/${orderId}`);
}

export async function updateOrderLifecycle(orderId: string, lifecycle: DispatchLifecycleStatus) {
  await api.patch(`/api/admin/dispatch/orders/${orderId}/lifecycle`, { status: lifecycle });
}


