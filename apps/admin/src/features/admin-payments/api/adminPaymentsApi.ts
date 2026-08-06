import { api } from "@/api/axios";

import type {
  AdminBookingPaymentDetail,
  AdminPaymentDashboard,
  AdminPaymentRefund,
  AdminPaymentTransaction,
  AdminPaymentTransactionParams,
  AdminPaymentTransactionsResponse,
} from "../types";

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === "object" ? (value as UnknownRecord) : {};

const asString = (value: unknown): string =>
  typeof value === "string" || typeof value === "number" ? String(value) : "";

const asNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const readArray = (payload: unknown, keys: string[]): UnknownRecord[] => {
  if (Array.isArray(payload)) return payload as UnknownRecord[];
  const root = asRecord(payload);
  for (const key of keys) {
    if (Array.isArray(root[key])) return root[key] as UnknownRecord[];
  }
  const nested = asRecord(root.data);
  for (const key of keys) {
    if (Array.isArray(nested[key])) return nested[key] as UnknownRecord[];
  }
  return [];
};

const readObject = (payload: unknown, keys: string[]): UnknownRecord => {
  const root = asRecord(payload);
  for (const key of keys) {
    const value = root[key];
    if (value && typeof value === "object" && !Array.isArray(value)) return value as UnknownRecord;
  }
  const nested = asRecord(root.data);
  for (const key of keys) {
    const value = nested[key];
    if (value && typeof value === "object" && !Array.isArray(value)) return value as UnknownRecord;
  }
  return Object.keys(nested).length > 0 ? nested : root;
};

const mapTransaction = (row: UnknownRecord): AdminPaymentTransaction => ({
  id: asString(row.id ?? row.paymentAttemptId ?? row.transactionId ?? row.razorpayPaymentId),
  bookingId: asString(row.bookingId ?? asRecord(row.booking).id),
  status: asString(row.status ?? row.paymentStatus),
  amount: asNumber(row.amount ?? row.paidAmount),
  currency: asString(row.currency) || "INR",
  razorpayOrderId: asString(row.razorpayOrderId ?? row.orderId),
  razorpayPaymentId: asString(row.razorpayPaymentId ?? row.paymentId),
  createdAt: asString(row.createdAt ?? row.attemptedAt),
  updatedAt: asString(row.updatedAt),
});

const mapRefund = (row: UnknownRecord): AdminPaymentRefund => ({
  id: asString(row.id ?? row.refundId ?? row.razorpayRefundId),
  amount: asNumber(row.amount ?? row.refundAmount),
  status: asString(row.status),
  reason: asString(row.reason),
  razorpayRefundId: asString(row.razorpayRefundId ?? row.refundId),
  createdAt: asString(row.createdAt),
  processedAt: asString(row.processedAt ?? row.updatedAt),
});

export async function fetchAdminPaymentDashboard(): Promise<AdminPaymentDashboard> {
  const { data } = await api.get("/api/v1/admin/payments/dashboard");
  const source = readObject(data, ["data", "dashboard", "result", "summary"]);
  return {
    createdAttempts: asNumber(source.createdAttempts ?? source.createdCount ?? source.created),
    paidAttempts: asNumber(source.paidAttempts ?? source.paidCount ?? source.paid),
    failedAttempts: asNumber(source.failedAttempts ?? source.failedCount ?? source.failed),
    refundedAttempts: asNumber(source.refundedAttempts ?? source.refundedCount ?? source.refunded),
    paidAmount: asNumber(source.paidAmount ?? source.totalPaidAmount ?? source.totalPaid),
    processedRefundAmount: asNumber(source.processedRefundAmount ?? source.refundAmount ?? source.totalRefunded),
  };
}

export async function fetchAdminPaymentTransactions(
  params: AdminPaymentTransactionParams,
): Promise<AdminPaymentTransactionsResponse> {
  const { data } = await api.get("/api/v1/admin/payments/transactions", {
    params: {
      bookingId: params.bookingId || undefined,
      status: params.status || undefined,
      page: params.page,
      size: params.size,
    },
  });
  const root = asRecord(data);
  const nested = asRecord(root.data);
  const content = readArray(data, ["content", "data", "items", "transactions", "results"]).map(mapTransaction);
  return {
    content,
    totalElements: asNumber(root.totalElements ?? root.total ?? nested.totalElements ?? nested.total, content.length),
    totalPages: asNumber(root.totalPages ?? nested.totalPages, Math.max(1, Math.ceil(content.length / params.size))),
    pageNumber: asNumber(root.pageNumber ?? root.number ?? nested.pageNumber ?? nested.number, params.page),
  };
}

export async function fetchAdminBookingPaymentDetail(bookingId: string): Promise<AdminBookingPaymentDetail> {
  const { data } = await api.get(`/api/v1/admin/payments/bookings/${bookingId}`);
  const source = readObject(data, ["data", "payment", "result", "item"]);
  return {
    bookingId: asString(source.bookingId ?? bookingId),
    paymentStatus: asString(source.paymentStatus ?? source.status),
    amount: asNumber(source.amount ?? source.paidAmount),
    currency: asString(source.currency) || "INR",
    razorpayOrderId: asString(source.razorpayOrderId ?? source.orderId),
    razorpayPaymentId: asString(source.razorpayPaymentId ?? source.paymentId),
    attempts: readArray(source.attempts ?? source.transactions, ["attempts", "transactions", "items"]).map(mapTransaction),
    refunds: readArray(source.refunds, ["refunds", "items"]).map(mapRefund),
  };
}

export async function reconcileAdminBookingPayment(bookingId: string): Promise<AdminBookingPaymentDetail> {
  const { data } = await api.post(`/api/v1/admin/payments/bookings/${bookingId}/reconcile`);
  const source = readObject(data, ["data", "payment", "result", "item"]);
  if (Object.keys(source).length === 0) {
    return fetchAdminBookingPaymentDetail(bookingId);
  }
  return {
    bookingId: asString(source.bookingId ?? bookingId),
    paymentStatus: asString(source.paymentStatus ?? source.status),
    amount: asNumber(source.amount ?? source.paidAmount),
    currency: asString(source.currency) || "INR",
    razorpayOrderId: asString(source.razorpayOrderId ?? source.orderId),
    razorpayPaymentId: asString(source.razorpayPaymentId ?? source.paymentId),
    attempts: readArray(source.attempts ?? source.transactions, ["attempts", "transactions", "items"]).map(mapTransaction),
    refunds: readArray(source.refunds, ["refunds", "items"]).map(mapRefund),
  };
}

export async function createAdminBookingRefund(
  bookingId: string,
  payload: { amount: number; reason: string; idempotencyKey: string },
) {
  await api.post(
    `/api/v1/admin/payments/bookings/${bookingId}/refunds`,
    { amount: payload.amount, reason: payload.reason },
    { headers: { "Idempotency-Key": payload.idempotencyKey } },
  );
}
