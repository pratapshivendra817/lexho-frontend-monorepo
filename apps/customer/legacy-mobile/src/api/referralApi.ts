import { api, parseApiError, unwrapPayload } from "./client";
import type { ApplyReferralRequest, AppliedReferralDto } from "../types/contracts";

export async function generateReferral(): Promise<{ code: string }> {
  try {
    const { data } = await api.post("/api/referrals/generate");
    const root = unwrapPayload<any>(data, data);
    return { code: String(root?.code ?? "").trim().toUpperCase() };
  } catch (error) {
    throw new Error(parseApiError(error, "Generate referral failed"));
  }
}

export async function applyReferral(payload: ApplyReferralRequest): Promise<AppliedReferralDto> {
  try {
    const { data } = await api.post("/api/referrals/apply", { code: payload.code.trim().toUpperCase() });
    return unwrapPayload<AppliedReferralDto>(data, data);
  } catch (error) {
    throw new Error(parseApiError(error, "Apply referral failed"));
  }
}

export async function getMyAppliedReferral(): Promise<AppliedReferralDto | null> {
  try {
    const { data } = await api.get("/api/referrals/me");
    const root = unwrapPayload<any>(data, data);
    return root && typeof root === "object" ? root as AppliedReferralDto : null;
  } catch (error: any) {
    if (Number(error?.response?.status ?? 0) === 404) return null;
    throw new Error(parseApiError(error, "Referral details unavailable"));
  }
}
