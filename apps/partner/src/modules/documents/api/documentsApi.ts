import axios from "axios";

import type { DocumentType, UploadedDocument } from "@/modules/providers/types/onboarding";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8082";

const partnerApi = axios.create({
  baseURL: API_BASE_URL,
});

partnerApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("partner_access_token") ?? localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function uploadProviderDocument(
  providerId: string,
  documentType: DocumentType,
  file: File,
  onProgress?: (progress: number) => void,
): Promise<UploadedDocument> {
  const formData = new FormData();
  formData.append("providerId", providerId);
  formData.append("documentType", documentType);
  formData.append("file", file);

  const { data } = await partnerApi.post("/api/provider/documents/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (event) => {
      if (!event.total || !onProgress) return;
      const progress = Math.round((event.loaded * 100) / event.total);
      onProgress(progress);
    },
  });

  const source = (data?.data ?? data) as Record<string, unknown>;
  return {
    id: String(source.id ?? source.documentId ?? ""),
    documentType,
    url: typeof source.url === "string" ? source.url : undefined,
    contentType: typeof source.contentType === "string" ? source.contentType : undefined,
  };
}

export async function getProviderDocument(documentId: string): Promise<UploadedDocument | null> {
  const { data } = await partnerApi.get(`/api/provider/documents/${documentId}`);
  const source = (data?.data ?? data) as Record<string, unknown>;
  if (!source || Object.keys(source).length === 0) {
    return null;
  }
  return {
    id: String(source.id ?? source.documentId ?? documentId),
    documentType: String(source.documentType ?? "") as DocumentType,
    url: typeof source.url === "string" ? source.url : undefined,
    contentType: typeof source.contentType === "string" ? source.contentType : undefined,
  };
}
