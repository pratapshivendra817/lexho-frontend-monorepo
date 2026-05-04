import { api, parseApiError } from "./client";
import type { ApplyReferralRequest } from "../types/contracts";

export async function generateReferral() { try { const { data } = await api.post('/api/referral/generate'); return data; } catch (e) { throw new Error(parseApiError(e, 'Generate referral failed')); } }
export async function applyReferral(payload: ApplyReferralRequest) { try { const { data } = await api.post('/api/referral/apply', payload); return data; } catch (e) { throw new Error(parseApiError(e, 'Apply referral failed')); } }
