import { api } from "@/api/axios";

export type AccountDeletionRequest = { id: string; userType?: "CUSTOMER" | "PARTNER" | string; userName?: string; userEmail?: string; reason?: string; status: string; requestedAt?: string; reviewedAt?: string; scheduledAt?: string; processedAt?: string };
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" ? value as Record<string, unknown> : {};
const text = (value: unknown) => String(value ?? "").trim();
const mapRequest = (value: unknown): AccountDeletionRequest => { const row = record(value); return { id:text(row.id || row.requestId), userType:text(row.userType || row.requesterType) || undefined, userName:text(row.userName || row.name || row.fullName) || undefined, userEmail:text(row.userEmail || row.email) || undefined, reason:text(row.reason) || undefined, status:text(row.status) || "REQUESTED", requestedAt:text(row.requestedAt || row.createdAt) || undefined, reviewedAt:text(row.reviewedAt) || undefined, scheduledAt:text(row.scheduledAt) || undefined, processedAt:text(row.processedAt) || undefined }; };
const rows = (data: unknown) => { const root=record(data); const nested=record(root.data); const value=Array.isArray(root)?root:Array.isArray(root.items)?root.items:Array.isArray(nested.items)?nested.items:Array.isArray(nested.content)?nested.content:Array.isArray(root.data)?root.data:[]; return value.map(mapRequest); };
export async function getAccountDeletionRequests(params: { userType?: string; status?: string } = {}) { const {data}=await api.get("/api/v1/admin/account-deletion",{params}); return rows(data); }
export async function getAccountDeletionRequest(id:string){const{data}=await api.get(`/api/v1/admin/account-deletion/${id}`);return mapRequest(record(data).data ?? data);}
export async function approveAccountDeletion(id:string){await api.post(`/api/v1/admin/account-deletion/${id}/approve`);}
export async function rejectAccountDeletion(id:string,reason?:string){await api.post(`/api/v1/admin/account-deletion/${id}/reject`,reason?{reason}:undefined);}
export async function processAccountDeletion(id:string){await api.post(`/api/v1/admin/account-deletion/${id}/process`);}
