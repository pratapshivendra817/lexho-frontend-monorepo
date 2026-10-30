import API, { getReadableApiError } from "./api";

export type PartnerLegalType = "partner-terms" | "privacy" | "cancellation" | "cookie" | "disclaimer" | "grievance" | "about";
export type PartnerLegalDocument = { type: PartnerLegalType; title: string; version: string; effectiveDate?: string; content: string };
export type PartnerFaq = { id: string; category: string; question: string; answer: string };
export type DeleteStatus = { status: string; canCancel?: boolean; requestedAt?: string; scheduledAt?: string };

const paths: Record<PartnerLegalType, string> = { "partner-terms":"/api/v1/legal/partner-terms", privacy:"/api/v1/legal/privacy", cancellation:"/api/v1/legal/cancellation", cookie:"/api/v1/legal/cookie", disclaimer:"/api/v1/legal/disclaimer", grievance:"/api/v1/legal/grievance", about:"/api/v1/legal/about" };
const record = (value: unknown): Record<string, any> => value && typeof value === "object" ? value as Record<string, any> : {};
const text = (value: unknown) => String(value ?? "").trim();
const payload = (data: any) => record(data?.data ?? data);

export async function getPartnerLegalDocument(type: PartnerLegalType): Promise<PartnerLegalDocument> { try { const { data } = await API.get(paths[type]); const row = payload(data); return { type, title:text(row.title) || type, version:text(row.version), effectiveDate:text(row.effectiveDate || row.effective_at) || undefined, content:text(row.content || row.body || row.markdown) }; } catch (error) { throw new Error(getReadableApiError(error, "Unable to load legal document")); } }
export const getPartnerTerms = () => getPartnerLegalDocument("partner-terms");
export const getPrivacyPolicy = () => getPartnerLegalDocument("privacy");
export const getCancellationPolicy = () => getPartnerLegalDocument("cancellation");
export const getCookiePolicy = () => getPartnerLegalDocument("cookie");
export const getDisclaimer = () => getPartnerLegalDocument("disclaimer");
export const getGrievancePolicy = () => getPartnerLegalDocument("grievance");
export const getAbout = () => getPartnerLegalDocument("about");
export async function acceptLegalDocument(documentType: PartnerLegalType, version: string) { try { await API.post("/api/v1/legal/accept", { documentType, version }); } catch (error) { throw new Error(getReadableApiError(error, "Unable to record acceptance")); } }
export async function getLegalAcceptanceHistory() { try { const { data } = await API.get("/api/v1/legal/acceptance-history"); const rows = data?.data ?? data; return (Array.isArray(rows) ? rows : []).map((item: any) => ({ documentType:text(item.documentType || item.type), version:text(item.version), acceptedAt:text(item.acceptedAt) })); } catch (error) { throw new Error(getReadableApiError(error, "Unable to load acceptance history")); } }
export async function getPartnerFaqs(): Promise<PartnerFaq[]> { try { const { data } = await API.get("/api/v1/faqs", { params:{ userType:"PARTNER" } }); const rows = data?.data?.content ?? data?.data ?? data; return (Array.isArray(rows) ? rows : []).map((item:any,index) => ({ id:text(item.id) || `faq-${index}`, category:text(item.category || item.categoryName) || "General", question:text(item.question), answer:text(item.answer) })).filter((item:PartnerFaq) => item.question && item.answer); } catch (error) { throw new Error(getReadableApiError(error, "Unable to load FAQs")); } }
export async function getSupportContact() { try { const { data } = await API.get("/api/v1/support/contact"); const row=payload(data); return { email:text(row.email || row.supportEmail), phone:text(row.phone || row.mobile || row.supportPhone) }; } catch(error) { throw new Error(getReadableApiError(error,"Unable to load support contact")); } }
export async function createDeleteAccountRequest() { try { await API.post("/api/v1/account/delete-request"); } catch(error) { throw new Error(getReadableApiError(error,"Unable to submit delete request")); } }
export async function getDeleteAccountStatus():Promise<DeleteStatus|null> { try { const {data}=await API.get("/api/v1/account/delete-request/stat"); const row=payload(data); return text(row.status) ? { status:text(row.status),canCancel:Boolean(row.canCancel ?? row.cancellable),requestedAt:text(row.requestedAt)||undefined,scheduledAt:text(row.scheduledAt)||undefined }:null; } catch(error:any) { if(error?.response?.status===404)return null; throw new Error(getReadableApiError(error,"Unable to load deletion status")); } }
export async function cancelDeleteAccountRequest() { try { await API.post("/api/v1/account/delete-request/cancel"); } catch(error) { throw new Error(getReadableApiError(error,"Unable to cancel delete request")); } }
