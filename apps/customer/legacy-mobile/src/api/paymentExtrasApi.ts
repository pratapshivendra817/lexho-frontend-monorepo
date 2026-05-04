import { api, parseApiError } from "./client";
import type { RefundPaymentRequest } from "../types/contracts";

export async function getPaymentStatus(bookingId: string) { try { const { data } = await api.get(`/api/payments/status/${bookingId}`); return data; } catch (e) { throw new Error(parseApiError(e, 'Payment status failed')); } }
export async function refundPayment(payload: RefundPaymentRequest) { try { const { data } = await api.post('/api/payments/refund', payload); return data; } catch (e) { throw new Error(parseApiError(e, 'Refund failed')); } }
