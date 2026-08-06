import { api, toApiError } from "./client";
import type { RefundPaymentRequest } from "../types/contracts";

export async function getPaymentStatus(bookingId: string) { try { const { data } = await api.get(`/api/payments/${bookingId}`); return data; } catch (e) { throw toApiError(e, 'Payment status failed'); } }
export async function retryPayment(bookingId: string) { try { const { data } = await api.post('/api/payments/retry', { bookingId }); return data; } catch (e) { throw toApiError(e, 'Payment retry failed'); } }
export async function refundPayment(payload: RefundPaymentRequest) { try { const { data } = await api.post('/api/payments/refund', payload); return data; } catch (e) { throw toApiError(e, 'Refund failed'); } }
