export type LegalDocumentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED" | string;
export type LegalPlatform = "CUSTOMER" | "PARTNER" | "ADMIN" | "GENERAL" | "WEBSITE";
export type LegalDocumentFormat = "MARKDOWN" | "HTML" | "TEXT";
export type LegalDocument = { id: string; title: string; documentType: string; platform?: LegalPlatform; format?: LegalDocumentFormat; version: string; status: LegalDocumentStatus; content: string; summary?: string; changeNote?: string; effectiveFrom?: string; createdBy?: string; createdAt?: string; updatedAt?: string; publishedAt?: string; metadata?: Record<string, unknown> };
export type LegalDocumentPayload = { title: string; platform: LegalPlatform; documentType: string; format: LegalDocumentFormat; content: string; summary?: string; changeNote?: string; effectiveFrom?: string; publish: false };
export type LegalDocumentVersion = Pick<LegalDocument, "id" | "version" | "status" | "effectiveFrom" | "createdBy" | "createdAt" | "publishedAt"> & { publishedBy?: string; archivedAt?: string; content?: string; title?: string };
