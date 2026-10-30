import { api, toApiError } from "./client";
import type { PaymentMode } from "../types/contracts";

export type CreatePaymentOrderRequest = { bookingId: string };

export type CreatePaymentOrderResponse = {
  keyId: string;
  razorpayOrderId: string;
  amountInPaise: number;
  currency: "INR" | string;
};

export type VerifyPaymentRequest = {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
};

export type ReportPaymentFailureRequest = {
  bookingId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  errorCode?: string;
  errorDescription?: string;
  errorReason?: string;
  raw?: unknown;
};

export async function createPaymentOrder(payload: CreatePaymentOrderRequest, idempotencyKey: string): Promise<CreatePaymentOrderResponse> {
  try {
    const numericBookingId = Number(payload.bookingId);
    const { data } = await api.post("/api/payments/create-order", { bookingId: Number.isFinite(numericBookingId) ? numericBookingId : payload.bookingId }, {
      headers: { "Idempotency-Key": idempotencyKey },
    });
    const root = data?.data && typeof data.data === "object" ? data.data : data;
    return root as CreatePaymentOrderResponse;
  } catch (error) {
    throw toApiError(error, "Payment order creation failed");
  }
}

export async function verifyPayment(payload: VerifyPaymentRequest) {
  try {
    const { data } = await api.post("/api/payments/verify", payload);
    return data;
  } catch (error) {
    throw toApiError(error, "Payment verification failed");
  }
}

export async function reportPaymentFailure(payload: ReportPaymentFailureRequest) {
  const body = {
    bookingId: payload.bookingId,
    razorpayOrderId: payload.razorpayOrderId,
    razorpayPaymentId: payload.razorpayPaymentId,
    errorCode: payload.errorCode,
    errorDescription: payload.errorDescription,
    errorReason: payload.errorReason,
    raw: payload.raw,
  };
  const attempts = ["/api/payments/failure", "/api/payments/payment-failed", "/api/payment/failure"];
  let lastError: unknown;
  for (const url of attempts) {
    try {
      const { data } = await api.post(url, body);
      return data;
    } catch (error) {
      lastError = error;
    }
  }
  throw toApiError(lastError, "Payment failure report failed");
}

export type PaymentOption = {
  id: string;
  mode: PaymentMode | "NETBANKING" | string;
  label: string;
  description?: string;
};

function toOptionRows(payload: any): PaymentOption[] {
  const root = payload?.data && typeof payload.data === "object" ? payload.data : payload;
  const candidates = [
    root?.paymentOptions,
    root?.options,
    root?.methods,
    root?.paymentMethods,
    root?.content,
    root?.items,
    root,
  ];
  const rows = candidates.find((entry) => Array.isArray(entry));
  if (!Array.isArray(rows)) return [];

  const mapped = rows
    .map((row: any, idx: number): PaymentOption | null => {
      const mode = String(row?.mode ?? row?.code ?? row?.type ?? row?.name ?? "").trim().toUpperCase();
      if (!mode) return null;
      const label = String(row?.label ?? row?.title ?? row?.displayName ?? mode).trim();
      const id = String(row?.id ?? row?.methodId ?? mode ?? idx).trim();
      const description = String(row?.description ?? row?.subtitle ?? "").trim() || undefined;
      return { id, mode, label, description };
    });
  return mapped.filter((row): row is PaymentOption => row !== null);
}

export async function getPaymentOptions(params: { bookingId?: string; cartId?: number | null; amount?: number }) {
  const payload = {
    bookingId: params.bookingId,
    cartId: params.cartId ?? undefined,
    amount: params.amount ?? undefined,
  };

  const attempts: Array<{ method: "get" | "post"; url: string }> = [
    { method: "get", url: "/api/payments/options" },
    { method: "get", url: "/api/payment/options" },
    { method: "post", url: "/api/payments/options" },
  ];

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      const res =
        attempt.method === "get"
          ? await api.get(attempt.url, { params: payload })
          : await api.post(attempt.url, payload);
      const options = toOptionRows(res?.data);
      return { raw: res?.data, options };
    } catch (error) {
      lastError = error;
    }
  }

  throw toApiError(lastError, "Payment options unavailable");
}
