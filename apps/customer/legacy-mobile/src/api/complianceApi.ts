import { api, parseApiError, unwrapPayload } from "./client";

export type LegalDocumentType = "terms" | "privacy" | "cancellation" | "cookie" | "disclaimer" | "grievance" | "about";
export type LegalDocument = { type: LegalDocumentType; title: string; version: string; effectiveDate?: string; publishedAt?: string; updatedAt?: string; content: string };
export type LegalAcceptance = { documentType: LegalDocumentType; version: string; acceptedAt?: string };
export type CustomerFaq = { id: string; category: string; question: string; answer: string };
export type SupportContact = { email?: string; phone?: string };
export type DeleteAccountStatus = { status: "REQUESTED" | "UNDER_REVIEW" | "SCHEDULED" | "DELETED" | "REJECTED" | "CANCELLED" | string; canCancel?: boolean; requestedAt?: string; scheduledAt?: string; reason?: string };

const legalPaths: Record<LegalDocumentType, string> = {
  terms: "/api/v1/legal/terms", privacy: "/api/v1/legal/privacy", cancellation: "/api/v1/legal/cancellation", cookie: "/api/v1/legal/cookie", disclaimer: "/api/v1/legal/disclaimer", grievance: "/api/v1/legal/grievance", about: "/api/v1/legal/about",
};

const asRecord = (value: unknown): Record<string, unknown> => value && typeof value === "object" ? value as Record<string, unknown> : {};
const asString = (value: unknown) => String(value ?? "").trim();

export async function getLegalDocument(type: LegalDocumentType): Promise<LegalDocument> {
  try {
    const { data } = await api.get(legalPaths[type]);
    const source = asRecord(unwrapPayload(data, {}));
    return { type, title: asString(source.title) || type.replace(/(^|-)\w/g, (match) => match.toUpperCase()), version: asString(source.version) || "", effectiveDate: asString(source.effectiveDate || source.effective_at) || undefined, publishedAt: asString(source.publishedAt || source.published_at) || undefined, updatedAt: asString(source.updatedAt || source.updated_at) || undefined, content: asString(source.content || source.body || source.markdown) };
  } catch (error) { throw new Error(parseApiError(error, "Unable to load this legal document")); }
}

export async function acceptLegalDocument(documentType: LegalDocumentType, version: string) {
  try { await api.post("/api/v1/legal/accept", { documentType, version }); }
  catch (error) { throw new Error(parseApiError(error, "Unable to record acceptance")); }
}

export async function getLegalAcceptanceHistory(): Promise<LegalAcceptance[]> {
  try {
    const { data } = await api.get("/api/v1/legal/acceptance-history");
    const rows = unwrapPayload<unknown>(data, []);
    return (Array.isArray(rows) ? rows : []).map((item) => { const row = asRecord(item); return { documentType: asString(row.documentType || row.type) as LegalDocumentType, version: asString(row.version), acceptedAt: asString(row.acceptedAt || row.accepted_at) || undefined }; }).filter((item) => item.documentType && item.version);
  } catch (error) { throw new Error(parseApiError(error, "Unable to load acceptance history")); }
}

export async function getCustomerFaqs(): Promise<CustomerFaq[]> {
  try {
    const { data } = await api.get("/api/v1/faqs", { params: { userType: "CUSTOMER" } });
    const raw = unwrapPayload<unknown>(data, []); const rows = Array.isArray(raw) ? raw : asRecord(raw).content;
    return (Array.isArray(rows) ? rows : []).map((item, index) => { const row = asRecord(item); return { id: asString(row.id) || `faq-${index}`, category: asString(row.category || row.categoryName) || "General", question: asString(row.question), answer: asString(row.answer) }; }).filter((item) => item.question && item.answer);
  } catch (error) { throw new Error(parseApiError(error, "Unable to load FAQs")); }
}

export async function getSupportContact(): Promise<SupportContact> {
  try { const { data } = await api.get("/api/v1/support/contact"); const row = asRecord(unwrapPayload(data, {})); return { email: asString(row.email || row.supportEmail) || undefined, phone: asString(row.phone || row.mobile || row.supportPhone) || undefined }; }
  catch (error) { throw new Error(parseApiError(error, "Unable to load support contact details")); }
}

export async function createDeleteAccountRequest() {
  try { const { data } = await api.post("/api/v1/account/delete-request"); return unwrapPayload(data, {}); }
  catch (error) { throw new Error(parseApiError(error, "Unable to submit delete request")); }
}
export async function getDeleteAccountStatus(): Promise<DeleteAccountStatus | null> {
  try { const { data } = await api.get("/api/v1/account/delete-request/stat"); const row = asRecord(unwrapPayload(data, {})); return asString(row.status) ? { status: asString(row.status), canCancel: Boolean(row.canCancel ?? row.cancellable), requestedAt: asString(row.requestedAt) || undefined, scheduledAt: asString(row.scheduledAt) || undefined, reason: asString(row.reason) || undefined } : null; }
  catch (error: any) { if (Number(error?.response?.status) === 404) return null; throw new Error(parseApiError(error, "Unable to load deletion status")); }
}
export async function cancelDeleteAccountRequest() {
  try { await api.post("/api/v1/account/delete-request/cancel"); }
  catch (error) { throw new Error(parseApiError(error, "Unable to cancel delete request")); }
}
