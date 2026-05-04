import { api, parseApiError } from "./client";
import type { CreateSubscriptionRequest } from "../types/contracts";

export async function createSubscription(payload: CreateSubscriptionRequest) { try { const { data } = await api.post('/api/subscription/create', payload); return data; } catch (e) { throw new Error(parseApiError(e, 'Create subscription failed')); } }
export async function getSubscriptions() { try { const { data } = await api.get('/api/subscription/list'); return data; } catch (e) { throw new Error(parseApiError(e, 'Subscriptions failed')); } }
