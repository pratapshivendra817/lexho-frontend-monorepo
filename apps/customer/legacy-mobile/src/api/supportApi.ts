import { api, parseApiError } from "./client";
import type { CreateSupportTicketRequest, SupportTicketDto } from "../types/contracts";

export async function createSupportTicket(payload: CreateSupportTicketRequest) { try { const { data } = await api.post('/api/support/create', payload); return data as SupportTicketDto; } catch (e) { throw new Error(parseApiError(e, 'Support create failed')); } }
export async function getSupportHistory(): Promise<SupportTicketDto[]> { try { const { data } = await api.get('/api/support/history'); return (Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []) as SupportTicketDto[]; } catch (e) { throw new Error(parseApiError(e, 'Support history failed')); } }
