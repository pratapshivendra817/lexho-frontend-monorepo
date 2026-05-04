import { api, parseApiError } from "./client";
import type { InitiatePaymentRequest } from "../types/contracts";

export async function initiatePayment(payload: InitiatePaymentRequest) {
  try { const { data } = await api.post("/api/payments/initiate", payload); return data; }
  catch (error) { throw new Error(parseApiError(error, "Payment initiation failed")); }
}
