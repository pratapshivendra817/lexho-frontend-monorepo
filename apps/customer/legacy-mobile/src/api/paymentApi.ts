import { api, parseApiError } from "./client";
import type { InitiatePaymentRequest } from "../types/contracts";

export async function initiatePayment(payload: InitiatePaymentRequest) {
  try { const { data } = await api.post("/api/payments/initiate", payload); return data; }
  catch (error) { throw new Error(parseApiError(error, "Payment initiation failed")); }
}

export type PaymentOption = {
  id: string;
  mode: string;
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

  throw new Error(parseApiError(lastError, "Payment options unavailable"));
}
