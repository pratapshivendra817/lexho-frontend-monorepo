import { api } from "@/api/axios";
import type {
  CustomerDeleteRequestItem,
  CustomerProfileAdmin,
  CustomerProfileContent,
  CustomerProfileUpdatePayload,
} from "../types";

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const asString = (value: unknown): string =>
  typeof value === "string" || typeof value === "number" ? String(value) : "";

const asBool = (value: unknown, fallback = false): boolean =>
  typeof value === "boolean" ? value : fallback;

const readArray = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;
  const root = asRecord(payload);
  const data = asRecord(root.data);
  const pageData = asRecord(data.data);
  return (root.items as unknown[]) || (data.items as unknown[]) || (pageData.items as unknown[]) || [];
};

const toCustomerProfile = (input: unknown): CustomerProfileAdmin => {
  const row = asRecord(input);
  return {
    id: asString(row.id),
    fullName: asString(row.fullName),
    mobile: asString(row.mobile),
    phoneNumber: asString(row.phoneNumber) || undefined,
    email: asString(row.email),
    gender: (asString(row.gender).toUpperCase() as CustomerProfileAdmin["gender"]) || "",
    profileImageUrl: asString(row.profileImageUrl) || undefined,
    addressCount: Number(row.addressCount || 0),
    active: asBool(row.active, true),
    profileEditLocked: asBool(row.profileEditLocked),
    emailVerified: asBool(row.emailVerified),
    phoneVerified: asBool(row.phoneVerified),
    profileImageApproved: asBool(row.profileImageApproved),
    adminNotes: asString(row.adminNotes),
    updatedAt: asString(row.updatedAt) || undefined,
  };
};

const toDeleteRequest = (input: unknown): CustomerDeleteRequestItem => {
  const row = asRecord(input);
  return {
    id: asString(row.id),
    customerId: asString(row.customerId),
    customerName: asString(row.customerName || row.fullName),
    reason: asString(row.reason),
    createdAt: asString(row.createdAt) || undefined,
    resolved: asBool(row.resolved),
  };
};

const CONTENT_STORAGE_KEY = "admin.profile.content.cms";
const defaultContent: CustomerProfileContent = {
  aboutUs: "Lexho helps customers book trusted home services quickly.",
  termsOfService: "By using Lexho services, users agree to the platform rules and booking terms.",
  privacyPolicy: "Lexho stores only required personal data and uses it securely for service delivery.",
};

export async function getCustomerProfilesAdmin(search = ""): Promise<CustomerProfileAdmin[]> {
  const { data } = await api.get("/api/v1/admin/customers", {
    params: {
      search: search || undefined,
      page: 0,
      size: 50,
      sortBy: "updatedAt",
      sortDir: "desc",
    },
  });
  return readArray(data).map(toCustomerProfile);
}

export async function updateCustomerProfileAdmin(id: string, payload: CustomerProfileUpdatePayload) {
  await api.patch(`/api/v1/admin/customers/${id}/profile-governance`, payload);
}

export async function updateCustomerStatusAdmin(id: string, active: boolean) {
  await api.patch(`/api/v1/admin/customers/${id}/status`, { active });
}

export async function getCustomerDeleteRequestsAdmin(): Promise<CustomerDeleteRequestItem[]> {
  const { data } = await api.get("/api/v1/admin/customers/account-delete-requests", {
    params: { resolved: false, page: 0, size: 50 },
  });
  return readArray(data).map(toDeleteRequest);
}

export async function resolveCustomerDeleteRequestAdmin(requestId: string, approve: boolean, reason: string) {
  await api.patch(`/api/v1/admin/customers/account-delete-requests/${requestId}/resolve`, { approve, reason });
}

export async function getProfileContentAdmin(): Promise<CustomerProfileContent> {
  try {
    const { data } = await api.get("/api/admin/profile-content");
    const root = asRecord(data);
    const content = asRecord(root.data || root);
    return {
      aboutUs: asString(content.aboutUs) || defaultContent.aboutUs,
      termsOfService: asString(content.termsOfService) || defaultContent.termsOfService,
      privacyPolicy: asString(content.privacyPolicy) || defaultContent.privacyPolicy,
    };
  } catch {
    const raw = window.localStorage.getItem(CONTENT_STORAGE_KEY);
    if (!raw) return defaultContent;
    try {
      return { ...defaultContent, ...(JSON.parse(raw) as Partial<CustomerProfileContent>) };
    } catch {
      return defaultContent;
    }
  }
}

export async function updateProfileContentAdmin(payload: CustomerProfileContent) {
  try {
    await api.put("/api/admin/profile-content", payload);
  } catch {
    window.localStorage.setItem(CONTENT_STORAGE_KEY, JSON.stringify(payload));
  }
}
