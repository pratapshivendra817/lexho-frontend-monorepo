import { useMutation } from "@tanstack/react-query";

import { uploadProviderDocument } from "@/modules/documents/api/documentsApi";

import { submitProviderOnboarding } from "../api/providerOnboardingApi";
import type { DocumentType, ProviderOnboardingPayload } from "../types/onboarding";

export const PROVIDER_ONBOARDING_DRAFT_KEY = "partner_provider_onboarding_draft";

export function useProviderOnboardingMutation() {
  return useMutation({
    mutationFn: (payload: ProviderOnboardingPayload) => submitProviderOnboarding(payload),
  });
}

export function useProviderDocumentUploadMutation() {
  return useMutation({
    mutationFn: ({
      providerId,
      documentType,
      file,
      onProgress,
    }: {
      providerId: string;
      documentType: DocumentType;
      file: File;
      onProgress?: (progress: number) => void;
    }) => uploadProviderDocument(providerId, documentType, file, onProgress),
  });
}
