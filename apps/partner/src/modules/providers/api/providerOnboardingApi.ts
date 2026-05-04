import axios from "axios";

import type {
  ProviderOnboardingPayload,
  ProviderOnboardingResponse,
} from "../types/onboarding";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8082";

const providerApi = axios.create({
  baseURL: API_BASE_URL,
});

providerApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("partner_access_token") ?? localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function submitProviderOnboarding(
  payload: ProviderOnboardingPayload,
): Promise<ProviderOnboardingResponse> {
  const { data } = await providerApi.post("/api/provider/onboarding", payload);
  const source = (data?.data ?? data) as Record<string, unknown>;

  return {
    providerId: String(source.providerId ?? source.id ?? ""),
    status: typeof source.status === "string" ? source.status : undefined,
    message: typeof source.message === "string" ? source.message : undefined,
  };
}
