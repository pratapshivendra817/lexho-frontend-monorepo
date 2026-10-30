import API, { API_BASE_URL, getReadableApiError } from "./api";
import { isAxiosError } from "axios";
import { getPartnerProviderId } from "../utils/storage";
import type { PartnerNotification } from "../types/notification";
import type { OrderTimelineEvent, PartnerOrder } from "../types/order";
import type {
  PartnerDashboardStats,
  PartnerDispatchConfig,
  PartnerLeaveItem,
  PartnerPerformanceSummary,
  PartnerRatingSummary,
  PartnerScreeningCentre,
  PartnerServiceArea,
  PartnerWarningItem,
} from "../types/partner";
import type {
  PartnerBankDetails,
  PartnerEarningsSummary,
  PartnerEarningsTransaction,
  PartnerPayout,
  PartnerWithdrawal,
  PartnerWithdrawalBalance,
} from "../types/payment";
import { withRetry } from "../utils/retry";
import { savePartnerProviderId } from "../utils/storage";
import { cacheOrderDetails, cacheOrderList, getCachedOrderDetails, getCachedOrderList } from "./orderCacheService";

let lastNewOrdersFetchMeta: { endpoint: string | null; status: number | null; at: number | null } = {
  endpoint: null,
  status: null,
  at: null,
};

export function getLastNewOrdersFetchMeta() {
  return lastNewOrdersFetchMeta;
}

export type PartnerOnboardingData = Record<string, unknown>;

type ReactNativeFormFile = {
  uri: string;
  name: string;
  type: string;
};

export type PartnerOnboardingFiles = {
  aadhaarFront: unknown;
  aadhaarBack: unknown;
  panCard: unknown;
  selfie: unknown;
  certificate?: unknown;
};

export type PartnerServiceCategoryOption = {
  id: string;
  name: string;
};

export async function getPartnerCategories() {
  const { data } = await API.get("/api/partner/categories", { params: { limit: 100 } });
  return data;
}

const categoryRows = (payload: any): any[] => {
  if (Array.isArray(payload?.data?.data?.content)) return payload.data.data.content;
  if (Array.isArray(payload?.data?.data?.categories)) return payload.data.data.categories;
  if (Array.isArray(payload?.data?.data?.serviceTypes)) return payload.data.data.serviceTypes;
  if (Array.isArray(payload?.data?.data?.services)) return payload.data.data.services;
  if (Array.isArray(payload?.data?.data?.results)) return payload.data.data.results;
  if (Array.isArray(payload?.data?.data?.records)) return payload.data.data.records;
  if (Array.isArray(payload?.data?.data?.items)) return payload.data.data.items;
  if (Array.isArray(payload?.data?.data?.rows)) return payload.data.data.rows;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.data?.content)) return payload.data.content;
  if (Array.isArray(payload?.data?.categories)) return payload.data.categories;
  if (Array.isArray(payload?.data?.serviceTypes)) return payload.data.serviceTypes;
  if (Array.isArray(payload?.data?.services)) return payload.data.services;
  if (Array.isArray(payload?.data?.results)) return payload.data.results;
  if (Array.isArray(payload?.data?.records)) return payload.data.records;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data?.rows)) return payload.data.rows;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.categories)) return payload.categories;
  if (Array.isArray(payload?.serviceTypes)) return payload.serviceTypes;
  if (Array.isArray(payload?.services)) return payload.services;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
};

const activeCategory = (value: unknown) => {
  if (value == null) return true;
  if (typeof value === "boolean") return value;
  return ["true", "1", "active", "enabled", "yes"].includes(String(value).trim().toLowerCase());
};

export async function getActiveServiceCategories(): Promise<PartnerServiceCategoryOption[]> {
  const paths = [
    "/api/partner/catalog/categories",
    "/api/v1/partner/catalog/categories",
    "/api/partner/categories",
    "/api/v1/partner/categories",
    "/api/categories",
    "/api/customer/categories",
    "/api/v1/categories",
    "/api/v1/customer/categories",
  ];
  let lastError: unknown = null;
  for (const path of paths) {
    try {
      const { data } = await API.get(path, { params: { page: 0, size: 100 } });
      const rows = categoryRows(data)
        .map((row: any) => ({
          id: String(row?.id ?? row?.categoryId ?? "").trim(),
          name: String(row?.displayName ?? row?.name ?? row?.categoryName ?? row?.serviceName ?? row?.title ?? row?.label ?? "").trim(),
          active: activeCategory(row?.active ?? row?.isActive ?? row?.activeStatus ?? row?.enabled ?? row?.status),
        }))
        .filter((row) => row.id && row.name && row.active)
        .map(({ id, name }) => ({ id, name }));
      if (rows.length > 0) return rows;
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(getReadableApiError(lastError, "Unable to load service categories"));
}

export async function getPartnerOnboarding() {
  const { data } = await API.get("/api/partner/onboarding");
  return data;
}

const DEFAULT_ONBOARDING_FILE_TYPES: Record<keyof PartnerOnboardingFiles, string> = {
  aadhaarFront: "image/jpeg",
  aadhaarBack: "image/jpeg",
  panCard: "image/jpeg",
  selfie: "image/jpeg",
  certificate: "image/jpeg",
};

const DEFAULT_ONBOARDING_FILE_NAMES: Record<keyof PartnerOnboardingFiles, string> = {
  aadhaarFront: "aadhaar-front.jpg",
  aadhaarBack: "aadhaar-back.jpg",
  panCard: "pan-card.jpg",
  selfie: "selfie.jpg",
  certificate: "certificate.jpg",
};

function inferOnboardingFileType(fileName: string, uri: string, fieldName: keyof PartnerOnboardingFiles) {
  const source = `${fileName} ${uri}`.toLowerCase();
  if (source.includes(".pdf")) return "application/pdf";
  if (source.includes(".png")) return "image/png";
  return DEFAULT_ONBOARDING_FILE_TYPES[fieldName];
}

function normalizeOnboardingFile(
  value: unknown,
  fieldName: keyof PartnerOnboardingFiles,
): ReactNativeFormFile | null {
  if (!value || typeof value !== "object") return null;
  const file = value as Record<string, unknown>;
  const uri = String(file.uri ?? file.fileCopyUri ?? "").trim();
  if (!uri) return null;

  return {
    uri,
    name: String(file.name ?? DEFAULT_ONBOARDING_FILE_NAMES[fieldName]).trim() || DEFAULT_ONBOARDING_FILE_NAMES[fieldName],
    type: String(file.type ?? "").trim() || inferOnboardingFileType(
      String(file.name ?? DEFAULT_ONBOARDING_FILE_NAMES[fieldName]),
      uri,
      fieldName,
    ),
  };
}

function appendOnboardingFile(
  formData: FormData,
  files: PartnerOnboardingFiles,
  fieldName: keyof PartnerOnboardingFiles,
  required = true,
) {
  const file = normalizeOnboardingFile(files[fieldName], fieldName);
  if (!file) {
    if (required) throw new Error(`${fieldName} document is required`);
    return;
  }
  formData.append(fieldName, file as any);
}

function buildOnboardingFormData(fields: PartnerOnboardingData, files: PartnerOnboardingFiles) {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (key === "skills" && Array.isArray(value)) {
      value.slice(0, 2).forEach((skill) => formData.append("skills", String(skill)));
    } else if (value != null) {
      formData.append(key, String(value));
    }
  });
  appendOnboardingFile(formData, files, "aadhaarFront");
  appendOnboardingFile(formData, files, "aadhaarBack");
  appendOnboardingFile(formData, files, "panCard");
  appendOnboardingFile(formData, files, "selfie");
  appendOnboardingFile(formData, files, "certificate", false);
  return formData;
}

export async function submitPartnerOnboarding(
  fields: PartnerOnboardingData,
  files: PartnerOnboardingFiles,
) {
  try {
    const { data } = await API.post("/api/partner/onboarding", buildOnboardingFormData(fields, files));
    return data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status && ![404, 405].includes(error.response.status)) {
      throw error;
    }
    const { data } = await API.put("/api/partner/onboarding", buildOnboardingFormData(fields, files));
    return data;
  }
}

const parseArray = (payload: any): any[] => {
  const singleObjectCandidates = [
    payload?.data?.data?.request,
    payload?.data?.data?.order,
    payload?.data?.request,
    payload?.data?.order,
    payload?.request,
    payload?.order,
  ];
  for (const item of singleObjectCandidates) {
    if (item && typeof item === "object" && !Array.isArray(item)) return [item];
  }

  if (Array.isArray(payload?.data?.data?.content)) return payload.data.data.content;
  if (Array.isArray(payload?.data?.data?.items)) return payload.data.data.items;
  if (Array.isArray(payload?.data?.data?.rows)) return payload.data.data.rows;
  if (Array.isArray(payload?.data?.data?.requests)) return payload.data.data.requests;
  if (Array.isArray(payload?.data?.data?.orders)) return payload.data.data.orders;
  if (Array.isArray(payload?.data?.data?.dispatchRequests)) return payload.data.data.dispatchRequests;
  if (Array.isArray(payload?.data?.data?.areas)) return payload.data.data.areas;
  if (Array.isArray(payload?.data?.content)) return payload.data.content;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data?.rows)) return payload.data.rows;
  if (Array.isArray(payload?.data?.requests)) return payload.data.requests;
  if (Array.isArray(payload?.data?.orders)) return payload.data.orders;
  if (Array.isArray(payload?.data?.dispatchRequests)) return payload.data.dispatchRequests;
  if (Array.isArray(payload?.data?.areas)) return payload.data.areas;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.requests)) return payload.requests;
  if (Array.isArray(payload?.orders)) return payload.orders;
  if (Array.isArray(payload?.dispatchRequests)) return payload.dispatchRequests;
  if (Array.isArray(payload?.areas)) return payload.areas;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
};

const asNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const toOrder = (row: any): PartnerOrder => {
  const serviceName =
    row?.serviceName ??
    row?.service?.serviceName ??
    row?.service?.name ??
    row?.serviceDetails?.serviceName ??
    row?.serviceDetails?.name ??
    row?.itemName ??
    row?.subServiceName ??
    row?.subService ??
    row?.categoryName;
  const servicePrice =
    row?.servicePrice != null ? asNumber(row.servicePrice) :
    row?.price != null ? asNumber(row.price) :
    row?.totalPrice != null ? asNumber(row.totalPrice) :
    row?.totalAmount != null ? asNumber(row.totalAmount) :
    row?.finalAmount != null ? asNumber(row.finalAmount) :
    row?.amount != null ? asNumber(row.amount) :
    undefined;
  const scheduledAt =
    row?.scheduledAt ??
    row?.scheduledDateTime ??
    (row?.scheduledDate && row?.scheduledTime ? `${row.scheduledDate}T${row.scheduledTime}` : undefined);
  const scheduledAtText = scheduledAt == null ? "" : String(scheduledAt);
  const scheduledParts = scheduledAtText.includes("T")
    ? scheduledAtText.split("T", 2)
    : scheduledAtText.includes(" ")
      ? scheduledAtText.split(" ", 2)
      : [];

  return {
    id: asNumber(row?.id ?? row?.orderId ?? row?.dispatchId ?? row?.requestId ?? row?.bookingId),
    orderId:
      row?.orderId != null
        ? asNumber(row.orderId)
        : row?.bookingId != null
          ? asNumber(row.bookingId)
          : row?.cartId != null
            ? asNumber(row.cartId)
            : undefined,
    requestId: row?.requestId != null ? asNumber(row.requestId) : row?.dispatchId != null ? asNumber(row.dispatchId) : undefined,
    subscriptionId: row?.subscriptionId != null ? asNumber(row.subscriptionId) : undefined,
    subscriptionVisitId: row?.subscriptionVisitId != null ? asNumber(row.subscriptionVisitId) : undefined,
    customerName: row?.customerName ?? row?.customerFullName ?? row?.customer?.name ?? row?.customer?.fullName ?? row?.user?.name ?? row?.user?.fullName ?? row?.customer?.profile?.name,
    customerPhone: row?.customerPhone ?? row?.customerMobile ?? row?.customer?.phone ?? row?.customer?.mobile ?? row?.user?.phone ?? row?.user?.mobile,
    address:
      (typeof row?.address === "object" ? row.address?.fullAddress ?? row.address?.addressLine ?? row.address?.line1 : row?.address) ??
      row?.fullAddress ??
      row?.customerAddress ??
      row?.serviceAddress ??
      row?.location?.addressLine ??
      row?.customer?.address?.fullAddress ?? row?.customer?.address,
    serviceName,
    serviceType: row?.serviceType ?? row?.category ?? row?.categoryName ?? serviceName,
    serviceCategory:
      row?.serviceCategory ??
      row?.category ??
      row?.categoryName ??
      row?.service?.category ??
      row?.serviceCategoryName ??
      row?.skillCategory,
    subService: row?.subService ?? row?.subServiceName ?? serviceName,
    distance: row?.distance != null ? asNumber(row.distance) : undefined,
    etaMinutes: row?.etaMinutes != null ? asNumber(row.etaMinutes) : undefined,
    payout:
      row?.payout != null
        ? asNumber(row.payout)
        : row?.payableAmount != null
          ? asNumber(row.payableAmount)
          : row?.netAmount != null
            ? asNumber(row.netAmount)
            : row?.settlementAmount != null
              ? asNumber(row.settlementAmount)
              : servicePrice != null
                ? servicePrice
                : undefined,
    servicePrice,
    bookingType: String(row?.bookingType ?? row?.booking_type ?? row?.type ?? ((row?.subscriptionVisitId != null || row?.subscriptionId != null) ? "SUBSCRIPTION" : "")).toUpperCase() as any,
    assignmentStatus: String(row?.assignmentStatus ?? row?.dispatchStatus ?? "").toUpperCase() || undefined,
    promisedStartTime:
      row?.promisedStartTime ?? row?.slaStartTime ?? scheduledAt ?? row?.scheduledTime,
    scheduledDate: row?.scheduledDate ?? row?.serviceDate ?? row?.bookingDate ?? scheduledParts[0],
    scheduledTime: row?.scheduledTime ?? row?.serviceTime ?? row?.slotTime ?? scheduledParts[1]?.slice(0, 5),
    slaMinutes: row?.slaMinutes != null ? asNumber(row.slaMinutes) : undefined,
    unavailableReason: row?.unavailableReason ?? row?.reasonCode,
    available: row?.available == null ? true : Boolean(row.available),
    amount:
      row?.amount != null
        ? asNumber(row.amount)
        : row?.payableAmount != null
          ? asNumber(row.payableAmount)
          : row?.netAmount != null
            ? asNumber(row.netAmount)
            : row?.settlementAmount != null
              ? asNumber(row.settlementAmount)
              : servicePrice,
    status: String(row?.status ?? row?.bookingStatus ?? "PENDING").toUpperCase() as any,
    createdAt: row?.createdAt,
    acceptedAt: row?.acceptedAt,
    startedAt: row?.startedAt,
    completedAt: row?.completedAt,
    rejectedAt: row?.rejectedAt,
    expiresAt: row?.expiresAt ?? row?.expiryAt ?? row?.requestExpiresAt,
    expiresInSeconds: row?.expiresInSeconds != null ? asNumber(row.expiresInSeconds) : undefined,
    priority: row?.priority != null ? String(row.priority).toUpperCase() : undefined,
    latitude: row?.latitude != null ? asNumber(row.latitude) : row?.address?.latitude != null ? asNumber(row.address.latitude) : undefined,
    longitude: row?.longitude != null ? asNumber(row.longitude) : row?.address?.longitude != null ? asNumber(row.address.longitude) : undefined,
  };
};

export function getCanonicalPartnerOrderId(order: Pick<PartnerOrder, "id" | "orderId"> | null | undefined) {
  const direct = Number(order?.orderId);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const fallback = Number(order?.id);
  if (Number.isFinite(fallback) && fallback > 0) return fallback;
  return 0;
}

const parseBannerArray = (payload: any): any[] => {
  if (Array.isArray(payload?.data?.content)) return payload.data.content;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data?.banners)) return payload.data.banners;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.banners)) return payload.banners;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
};

export type PartnerBannerItem = {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
};

export type PartnerSkillsPayload = {
  categoryIds: number[];
  subServiceIds: number[];
};


export type PartnerProfilePayload = {
  fullName?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  city?: string;
  pincode?: string;
  address?: string;
};

const toPartnerProfile = (payload: any) => {
  const source = payload?.data?.data ?? payload?.data ?? payload ?? {};
  const id = asText(source?.id ?? source?.partnerId ?? source?.providerId);
  const phone = asText(source?.phone ?? source?.mobile ?? source?.phoneNumber);
  const rawAccountStatus = asText(source?.accountStatus ?? source?.status ?? source?.penaltyStatus).toUpperCase();
  const accountStatus = rawAccountStatus && !["ACTIVE", "NORMAL"].includes(rawAccountStatus) ? rawAccountStatus : undefined;
  return {
    ...source,
    id,
    name: source?.name ?? source?.fullName,
    fullName: source?.fullName ?? source?.name,
    phone,
    mobile: phone,
    profileImageUrl: source?.profileImageUrl ?? source?.imageUrl ?? source?.avatarUrl,
    bankVerificationStatus: source?.bankVerificationStatus ?? source?.bankStatus,
    bankRejectionReason: source?.bankRejectionReason ?? source?.bankReason,
    accountStatus,
  };
};

export async function getPartnerProfile() {
  try {
    const { data } = await withRetry(() => API.get("/api/v1/partner/profile"));
    const profile = toPartnerProfile(data);
    if (profile.id) await savePartnerProviderId(profile.id).catch(() => undefined);
    return profile;
  } catch (primaryError) {
    try {
      const { data } = await withRetry(() => API.get("/api/partner/profile"));
      const profile = toPartnerProfile(data);
      if (profile.id) await savePartnerProviderId(profile.id).catch(() => undefined);
      return profile;
    } catch (fallbackError) {
      throw new Error(getReadableApiError(fallbackError || primaryError, "Unable to fetch profile"));
    }
  }
}

export async function updatePartnerProfile(payload: PartnerProfilePayload) {
  try {
    const { data } = await API.put("/api/v1/partner/profile", payload);
    return data;
  } catch (primaryError) {
    try {
      const { data } = await API.put("/api/partner/profile", payload);
      return data;
    } catch (fallbackError) {
      throw new Error(getReadableApiError(fallbackError || primaryError, "Unable to update profile"));
    }
  }
}

function appendProfileFile(form: FormData, file: { uri: string; type?: string; name?: string }) {
  const uri = String(file?.uri ?? "");
  const name = String(file?.name ?? uri.split(/[\\/]/).pop() ?? "profile.jpg") || "profile.jpg";
  const type = String(file?.type ?? (name.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg"));
  form.append("file", { uri, type, name } as any);
}

export async function uploadPartnerProfileImage(file: { uri: string; type?: string; name?: string }) {
  const form = new FormData();
  appendProfileFile(form, file);
  const config = { headers: { "Content-Type": "multipart/form-data" } };
  try {
    const { data } = await API.post("/api/v1/partner/profile-image", form, config);
    return { ...data, profileImageUrl: data?.profileImageUrl ?? data?.imageUrl };
  } catch (primaryError) {
    try {
      const { data } = await API.post("/api/partner/profile-image", form, config);
      return { ...data, profileImageUrl: data?.profileImageUrl ?? data?.imageUrl };
    } catch (fallbackError) {
      throw new Error(getReadableApiError(fallbackError || primaryError, "Unable to upload profile image"));
    }
  }
}

export async function uploadPartnerDocuments(files: Record<string, any>, onProgress?: (progress: number) => void) {
  const form = new FormData();
  Object.entries(files).forEach(([key, value]) => {
    if (!value?.uri) return;
    const name = String(value.name ?? `${key}.jpg`);
    const type = String(value.type ?? (name.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg"));
    form.append(key, { uri: value.uri, type, name } as any);
  });
  try {
    const { data } = await API.post("/api/v1/partner/documents", form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event: any) => {
        if (event?.total) onProgress?.(Math.round((event.loaded / event.total) * 100));
      },
    });
    onProgress?.(100);
    return data;
  } catch (error) {
    throw new Error(getReadableApiError(error, "Unable to upload documents"));
  }
}

export async function getHealth() {
  const { data } = await withRetry(() => API.get("/api/health"));
  return data;
}

export async function updateAvailability(payload: { online: boolean }) {
  try {
    const { data } = await API.put("/api/v1/partner/availability", payload);
    return data;
  } catch {
    try {
      const { data } = await API.put("/api/partner/availability", payload);
      return data;
    } catch (fallbackError) {
      throw new Error(getReadableApiError(fallbackError, "Unable to update availability"));
    }
  }
}

export async function getDashboardStats(): Promise<PartnerDashboardStats> {
  try {
    const { data } = await withRetry(() => API.get("/api/v1/partner/dashboard/stats"));
    const source = data?.data ?? data;
    return {
      todayEarnings: asNumber(source?.todayEarnings ?? source?.todayEarning ?? source?.earningsToday),
      totalCompletedOrders: asNumber(source?.totalCompletedOrders ?? source?.completedOrders),
      pendingOrders: asNumber(source?.pendingOrders ?? source?.newOrders),
      cancelledOrders: asNumber(source?.cancelledOrders ?? source?.canceledOrders ?? source?.cancelled),
      totalOnlineHours: asNumber(source?.totalOnlineHours ?? source?.onlineHoursToday),
      activeDeliveries: asNumber(source?.activeDeliveries ?? source?.ongoingDeliveries),
      weeklyEarnings: asNumber(source?.weeklyEarnings ?? source?.thisWeekEarnings),
    };
  } catch {
    try {
      const { data } = await withRetry(() => API.get("/api/partner/dashboard/stats"));
      const source = data?.data ?? data;
      return {
        todayEarnings: asNumber(source?.todayEarnings ?? source?.todayEarning ?? source?.earningsToday),
        totalCompletedOrders: asNumber(source?.totalCompletedOrders ?? source?.completedOrders),
        pendingOrders: asNumber(source?.pendingOrders ?? source?.newOrders),
        cancelledOrders: asNumber(source?.cancelledOrders ?? source?.canceledOrders ?? source?.cancelled),
        totalOnlineHours: asNumber(source?.totalOnlineHours ?? source?.onlineHoursToday),
        activeDeliveries: asNumber(source?.activeDeliveries ?? source?.ongoingDeliveries),
        weeklyEarnings: asNumber(source?.weeklyEarnings ?? source?.thisWeekEarnings),
      };
    } catch (fallbackError) {
      throw new Error(getReadableApiError(fallbackError, "Unable to fetch dashboard stats"));
    }
  }
}

export async function getNewDispatchRequests(params?: {
  page?: number;
  size?: number;
  sortBy?: string;
  direction?: "asc" | "desc";
}) {
  const query = {
    status: "PENDING",
    page: params?.page ?? 0,
    size: params?.size ?? 20,
  };

  const endpoints = [
    "/api/v1/partner/requests",
    "/api/v1/orders/new",
    "/api/partner/requests",
    // Compatibility fallbacks
    "/api/orders/new",
    "/api/partner/orders/new",
    "/api/partner/dispatch/new",
    "/api/partner/dispatch/requests/new",
  ];

  let lastNon404Error: unknown = null;
  for (const endpoint of endpoints) {
    try {
      const { data } = await withRetry(() => API.get(endpoint, { params: query }));
      lastNewOrdersFetchMeta = { endpoint, status: 200, at: Date.now() };
      const rows = parseArray(data).map(toOrder);
      await cacheOrderList("newOrders", rows).catch(() => null);
      if (rows.length > 0) return rows;
    } catch (error) {
      // Endpoint can be absent in some deployments; try next one.
      if (isAxiosError(error) && error.response?.status === 404) {
        lastNewOrdersFetchMeta = { endpoint, status: 404, at: Date.now() };
        continue;
      }
      if (isAxiosError(error)) {
        lastNewOrdersFetchMeta = { endpoint, status: error.response?.status ?? null, at: Date.now() };
      }
      lastNon404Error = error;
    }
  }

  if (lastNon404Error) {
    const cached = await getCachedOrderList("newOrders").catch(() => null);
    if (cached?.data?.length) return cached.data;
    throw new Error(getReadableApiError(lastNon404Error, "Unable to fetch new orders"));
  }
  const cached = await getCachedOrderList("newOrders").catch(() => null);
  return cached?.data ?? [];
}

export async function acceptSubscriptionDecision(subscriptionId: number) {
  try {
    const { data } = await API.patch(`/api/v1/partner/subscriptions/${subscriptionId}/accept`);
    return data;
  } catch {
    const { data } = await API.patch(`/api/partner/subscriptions/${subscriptionId}/accept`);
    return data;
  }
}

export async function rejectSubscriptionDecision(subscriptionId: number, reason = "Not available") {
  const payload = { reason: reason.trim() || "Not available" };
  try {
    const { data } = await API.patch(`/api/v1/partner/subscriptions/${subscriptionId}/decline`, payload);
    return data;
  } catch {
    const { data } = await API.patch(`/api/partner/subscriptions/${subscriptionId}/decline`, payload);
    return data;
  }
}

export async function acceptDispatchRequest(requestId: number) {
  try {
    const { data } = await API.patch(`/api/v1/partner/requests/${requestId}/accept`);
    return data;
  } catch {
    try {
      const { data } = await API.patch(`/api/partner/requests/${requestId}/accept`);
      return data;
    } catch {
      try {
        const { data } = await API.patch(`/api/v1/partner/subscriptions/${requestId}/accept`);
        return data;
      } catch {
        try {
          const { data } = await API.patch(`/api/partner/subscriptions/${requestId}/accept`);
          return data;
        } catch {
          try {
            const { data } = await API.post(`/api/v1/orders/${requestId}/accept`);
            return data;
          } catch {
            try {
              const { data } = await API.post(`/api/partner/dispatch/${requestId}/accept`);
              return data;
            } catch {
              const { data } = await API.post(`/api/orders/${requestId}/accept`);
              return data;
            }
          }
        }
      }
    }
  }
}

export async function acceptPartnerOrder(orderId: number) {
  try {
    const { data } = await API.post(`/api/v1/orders/${orderId}/accept`);
    return data;
  } catch {
    const { data } = await API.post(`/api/orders/${orderId}/accept`);
    return data;
  }
}

export async function rejectDispatchRequest(requestId: number, reason = "Not available") {
  const payload = { reason: reason.trim() || "Not available" };
  try {
    const { data } = await API.patch(`/api/v1/partner/requests/${requestId}/reject`, payload);
    return data;
  } catch {
    try {
      const { data } = await API.patch(`/api/partner/requests/${requestId}/reject`, payload);
      return data;
    } catch {
      try {
        const { data } = await API.patch(`/api/v1/partner/subscriptions/${requestId}/decline`, payload);
        return data;
      } catch {
        try {
          const { data } = await API.patch(`/api/partner/subscriptions/${requestId}/decline`, payload);
          return data;
        } catch {
          try {
            const { data } = await API.post(`/api/v1/orders/${requestId}/reject`, payload);
            return data;
          } catch {
            try {
              const { data } = await API.post(`/api/partner/dispatch/${requestId}/reject`, payload);
              return data;
            } catch {
              const { data } = await API.post(`/api/orders/${requestId}/reject`, payload);
              return data;
            }
          }
        }
      }
    }
  }
}

export async function startDispatchShift() {
  try {
    const { data } = await API.post("/api/v1/partner/dispatch/shift/start");
    return data;
  } catch {
    const { data } = await API.post("/api/partner/dispatch/shift/start");
    return data;
  }
}

export async function endDispatchShift() {
  try {
    const { data } = await API.post("/api/v1/partner/dispatch/shift/end", {
      shiftEnd: new Date().toISOString(),
    });
    return data;
  } catch {
    const { data } = await API.post("/api/partner/dispatch/shift/end", {
      shiftEnd: new Date().toISOString(),
    });
    return data;
  }
}

export async function patchDispatchAvailability(payload: { online?: boolean; isOnline?: boolean; available?: boolean; maxActiveJobs?: number }) {
  try {
    const { data } = await API.patch("/api/v1/partner/dispatch/availability", payload);
    return data;
  } catch {
    const { data } = await API.patch("/api/partner/dispatch/availability", payload);
    return data;
  }
}

export async function sendDispatchLocation(payload: {
  latitude: number;
  longitude: number;
  source?: "gps" | "network" | "passive" | string;
  trackingState?: string;
  bookingId?: number;
  customerLatitude?: number;
  customerLongitude?: number;
  accuracyMeters?: number;
  speedKmh?: number;
  headingDegrees?: number;
  mockLocation?: boolean;
  rootedDevice?: boolean;
  gpsEnabled?: boolean;
  accuracy?: number;
}) {
  const requestPayload = {
    latitude: payload.latitude,
    longitude: payload.longitude,
    source: payload.source ?? "gps",
    trackingState: payload.trackingState,
    bookingId: payload.bookingId,
    customerLatitude: payload.customerLatitude,
    customerLongitude: payload.customerLongitude,
    accuracyMeters: payload.accuracyMeters ?? payload.accuracy,
    speedKmh: payload.speedKmh,
    headingDegrees: payload.headingDegrees,
    mockLocation: payload.mockLocation,
    rootedDevice: payload.rootedDevice,
    gpsEnabled: payload.gpsEnabled ?? true,
  };
  try {
    const { data } = await API.post("/api/v1/partner/dispatch/location", requestPayload);
    return data;
  } catch {
    const { data } = await API.post("/api/partner/dispatch/location", {
      ...requestPayload,
      accuracy: payload.accuracy,
    });
    return data;
  }
}

export async function getPartnerOrderById(id: number): Promise<PartnerOrder> {
  try {
    const { data } = await withRetry(() => API.get(`/api/v1/orders/${id}`));
    const root = asRecord(data);
    const nested = asRecord(root.data);
    const source = Object.keys(nested).length > 0 ? nested : root;
    const order = toOrder(source);
    const timeline = await getOrderTimeline(id).catch(() => []);
    const fullOrder = { ...order, timeline };
    await cacheOrderDetails(fullOrder).catch(() => null);
    return fullOrder;
  } catch {
    try {
      const { data } = await withRetry(() => API.get(`/api/partner/orders/${id}`));
      const root = asRecord(data);
      const nested = asRecord(root.data);
      const source = Object.keys(nested).length > 0 ? nested : root;
      const order = toOrder(source);
      const timeline = await getOrderTimeline(id).catch(() => []);
      const fullOrder = { ...order, timeline };
      await cacheOrderDetails(fullOrder).catch(() => null);
      return fullOrder;
    } catch (error) {
      const cached = await getCachedOrderDetails(id).catch(() => null);
      if (cached?.data) return cached.data;
      throw new Error(getReadableApiError(error, "Unable to fetch order details"));
    }
  }
}

export async function getPartnerHomeBanners(limit = 5): Promise<PartnerBannerItem[]> {
  const endpoints: Array<{ path: string; params?: Record<string, string | number | boolean> }> = [
    { path: "/api/v1/partner/banners", params: { page: 0, size: limit } },
    { path: "/api/partner/banners", params: { page: 0, size: limit } },
    { path: "/api/partner/home/banners", params: { page: 0, size: limit } },
    { path: "/api/banners", params: { audience: "PARTNER", active: true, page: 0, size: limit } },
    { path: "/api/customer/banners", params: { audience: "PARTNER", page: 0, size: limit } },
  ];

  for (const endpoint of endpoints) {
    try {
      const { data } = await withRetry(() => API.get(endpoint.path, { params: endpoint.params }));
      const rows = parseBannerArray(data)
        .map((item: any, index: number) => {
          const id = String(item?.id ?? item?.bannerId ?? `${endpoint.path}-${index}`);
          const title = String(item?.title ?? item?.name ?? "Partner Highlights").trim();
          const subtitle = String(item?.subtitle ?? item?.description ?? "").trim();
          const imageUrl = String(item?.bannerImageUrl ?? item?.imageUrl ?? item?.image ?? "").trim();
          return {
            id,
            title,
            subtitle: subtitle.length > 0 ? subtitle : undefined,
            imageUrl: imageUrl.length > 0 ? imageUrl : undefined,
          };
        })
        .filter((row: PartnerBannerItem) => Boolean(row.imageUrl));

      if (rows.length > 0) return rows.slice(0, limit);
    } catch {
      // Try next endpoint shape.
    }
  }

  return [];
}

export async function getNewOrders(params?: { page?: number; size?: number; sortBy?: string; direction?: "asc" | "desc" }) {
  try {
    return await getNewDispatchRequests(params);
  } catch (error) {
    throw new Error(getReadableApiError(error, "Unable to fetch new orders"));
  }
}

export async function acceptOrder(orderId: number) {
  return acceptPartnerOrder(orderId);
}

export async function rejectOrder(orderId: number) {
  return rejectDispatchRequest(orderId, "Not available");
}

export async function startOrder(orderId: number, beforeImage?: { uri: string; type?: string; name?: string }) {
  if (!beforeImage?.uri) {
    try {
      return await API.post(`/api/v1/orders/${orderId}/start`);
    } catch {
      return API.post(`/api/orders/${orderId}/start`);
    }
  }
  const form = new FormData();
  form.append("beforeImage", {
    uri: beforeImage.uri,
    type: beforeImage.type ?? "image/jpeg",
    name: beforeImage.name ?? "before.jpg",
  } as any);
  try {
    return await API.post(`/api/v1/orders/${orderId}/start`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  } catch {
    return API.post(`/api/orders/${orderId}/start`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  }
}

export async function markOrderArrived(orderId: number) {
  try {
    try {
      const { data } = await API.post(`/api/v1/orders/${orderId}/arrive`);
      return data;
    } catch {
      const { data } = await API.post(`/api/orders/${orderId}/arrive`);
      return data;
    }
  } catch (error) {
    throw new Error(getReadableApiError(error, "Unable to mark arrival"));
  }
}

export async function verifyOrderStartPin(orderId: number, pin: string) {
  try {
    const { data } = await API.post(`/api/orders/${orderId}/start/verify`, { pin: String(pin).trim() });
    return data;
  } catch (error) {
    throw new Error(getReadableApiError(error, "Unable to verify start PIN"));
  }
}

export async function requestOrderCompletePin(orderId: number) {
  try {
    const { data } = await API.post(`/api/orders/${orderId}/complete-pin`);
    return data;
  } catch (error) {
    throw new Error(getReadableApiError(error, "Unable to request complete PIN"));
  }
}

export async function verifyOrderCompletePin(orderId: number, pin: string) {
  try {
    const { data } = await API.post(`/api/orders/${orderId}/complete/verify`, { pin: String(pin).trim() });
    return data;
  } catch (error) {
    throw new Error(getReadableApiError(error, "Unable to verify completion PIN"));
  }
}

export async function completeOrder(orderId: number, afterImage?: { uri: string; type?: string; name?: string }) {
  if (!afterImage?.uri) {
    try {
      return await API.post(`/api/v1/orders/${orderId}/complete`);
    } catch {
      return API.post(`/api/orders/${orderId}/complete`);
    }
  }
  const form = new FormData();
  form.append("afterImage", {
    uri: afterImage.uri,
    type: afterImage.type ?? "image/jpeg",
    name: afterImage.name ?? "after.jpg",
  } as any);
  try {
    return await API.post(`/api/v1/orders/${orderId}/complete`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  } catch {
    return API.post(`/api/orders/${orderId}/complete`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  }
}

export async function getOrderHistory(params?: { page?: number; size?: number; sortBy?: string; direction?: "asc" | "desc" }) {
  try {
    const query = {
      page: params?.page ?? 0,
      size: params?.size ?? 20,
      sortBy: params?.sortBy ?? "createdAt",
      direction: params?.direction ?? "desc",
    };
    let data: any;
    try {
      ({ data } = await withRetry(() => API.get("/api/v1/orders/history", { params: query })));
    } catch {
      ({ data } = await withRetry(() => API.get("/api/orders/history", { params: query })));
    }
    const rows = parseArray(data).map(toOrder);
    await cacheOrderList("history", rows).catch(() => null);
    return rows;
  } catch (error) {
    const cached = await getCachedOrderList("history").catch(() => null);
    if (cached?.data?.length) return cached.data;
    throw new Error(getReadableApiError(error, "Unable to fetch order history"));
  }
}

export async function getOrderTimeline(orderId: number): Promise<OrderTimelineEvent[]> {
  const { data } = await withRetry(() => API.get(`/api/v1/orders/${orderId}/timeline`));
  return parseArray(data).map((row: any, index: number) => ({
    id: String(row?.id ?? `${orderId}-${index}`),
    orderId: row?.orderId != null ? asNumber(row.orderId) : orderId,
    fromStatus: row?.fromStatus != null ? String(row.fromStatus) : undefined,
    toStatus: String(row?.toStatus ?? row?.status ?? ""),
    remarks: row?.remarks != null ? String(row.remarks) : undefined,
    actorType: row?.actorType != null ? String(row.actorType) : undefined,
    actorId: row?.actorId != null ? String(row.actorId) : undefined,
    timestamp: row?.timestamp ?? row?.createdAt,
  }));
}

export async function getPartnerNotifications(params?: { page?: number; size?: number }): Promise<PartnerNotification[]> {
  try {
    let data: any;
    try {
      ({ data } = await withRetry(() => API.get("/api/v1/partner/notifications", {
        params: {
          page: params?.page ?? 0,
          size: params?.size ?? 20,
        },
      })));
    } catch {
      ({ data } = await withRetry(() => API.get("/api/provider/notifications", {
        params: {
          page: params?.page ?? 0,
          size: params?.size ?? 20,
        },
      })));
    }

    return parseArray(data).map((item) => ({
      id: String(item?.id ?? item?.notificationId ?? ""),
      title: String(item?.title ?? "Notification"),
      message: String(item?.message ?? item?.body ?? ""),
      read: Boolean(item?.read ?? false),
      createdAt: item?.createdAt,
    }));
  } catch (error) {
    throw new Error(getReadableApiError(error, "Unable to fetch notifications"));
  }
}

export async function getPartnerSkills(): Promise<PartnerSkillsPayload> {
  try {
    const { data } = await API.get("/api/v1/partner/dispatch/skills");
    const source = data?.data ?? data ?? {};
    const categoryIds = Array.isArray(source?.categoryIds) ? source.categoryIds.map((v: any) => Number(v)).filter((v: number) => Number.isFinite(v)) : [];
    const subServiceIds = Array.isArray(source?.subServiceIds) ? source.subServiceIds.map((v: any) => Number(v)).filter((v: number) => Number.isFinite(v)) : [];
    return { categoryIds, subServiceIds };
  } catch (error) {
    throw new Error(getReadableApiError(error, "Unable to fetch partner skills"));
  }
}

export async function updatePartnerSkills(payload: PartnerSkillsPayload) {
  try {
    const { data } = await API.put("/api/v1/partner/dispatch/skills", payload);
    return data;
  } catch (error) {
    throw new Error(getReadableApiError(error, "Unable to update partner skills"));
  }
}

// Backward compatible wrappers for existing login-connected flow
export type PartnerRequestStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED";
export type PartnerRequestItem = PartnerOrder;

export async function fetchPartnerRequests(params?: { status?: PartnerRequestStatus; page?: number; size?: number }) {
  const newOrders = await getNewOrders({ page: params?.page, size: params?.size });
  if (!params?.status || params.status === "PENDING") {
    return newOrders.map((o) => ({ ...o, status: "PENDING" }));
  }
  const history = await getOrderHistory({ page: params?.page, size: params?.size });
  return history.filter((o) => o.status === params.status);
}

export async function fetchPartnerRequestById(requestId: number) {
  const endpoints = [
    `/api/v1/partner/requests/${encodeURIComponent(requestId)}`,
    `/api/partner/requests/${encodeURIComponent(requestId)}`,
    `/api/v1/orders/${encodeURIComponent(requestId)}`,
    `/api/orders/${encodeURIComponent(requestId)}`,
    `/api/partner/orders/${encodeURIComponent(requestId)}`,
  ];

  let lastError: unknown = null;
  for (const endpoint of endpoints) {
    try {
      const { data } = await withRetry(() => API.get(endpoint));
      const row = parseArray(data)[0] ?? unwrapData(data);
      return toOrder(row);
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(getReadableApiError(lastError, "Unable to fetch request details"));
}

export async function acceptPartnerRequest(requestId: number) {
  await acceptDispatchRequest(requestId);
}

export async function rejectPartnerRequest(requestId: number, reason = "Not available") {
  await rejectDispatchRequest(requestId, reason);
}

const unwrapData = (payload: any): any => payload?.data?.data ?? payload?.data ?? payload ?? {};

const asText = (value: unknown, fallback = ""): string =>
  value == null ? fallback : String(value);

export async function getPartnerEarningsSummary(): Promise<PartnerEarningsSummary> {
  try {
    const { data } = await withRetry(() => API.get("/api/v1/partner/earnings/summary"));
    const source = unwrapData(data);
    return {
      todaySettlement: asNumber(source?.todaySettlement ?? source?.todayEarnings ?? source?.today),
      weekSettlement: asNumber(source?.weekSettlement ?? source?.weeklySettlement ?? source?.weekEarnings ?? source?.week),
      monthSettlement: asNumber(source?.monthSettlement ?? source?.monthlySettlement ?? source?.monthEarnings ?? source?.month),
      lifetimeSettlement: asNumber(source?.lifetimeSettlement ?? source?.totalSettlement ?? source?.lifetimeEarnings ?? source?.lifetime),
      availableBalance: asNumber(source?.availableBalance),
      pendingSettlement: asNumber(source?.pendingSettlement ?? source?.pendingBalance ?? source?.reservedBalance),
    };
  } catch (error) {
    throw new Error(getReadableApiError(error, "Unable to fetch earnings summary"));
  }
}

export async function getPartnerEarningsTransactions(params?: { page?: number; size?: number }): Promise<PartnerEarningsTransaction[]> {
  try {
    const { data } = await withRetry(() => API.get("/api/v1/partner/earnings/transactions", {
      params: { page: params?.page ?? 0, size: params?.size ?? 20 },
    }));
    return parseArray(data).map((row: any, index: number) => ({
      id: asText(row?.id ?? row?.transactionId ?? row?.ledgerId ?? index),
      bookingId: row?.bookingId != null ? asText(row.bookingId) : undefined,
      description: asText(row?.description ?? row?.narration ?? row?.type, "Settlement"),
      amount: asNumber(row?.amount ?? row?.netAmount ?? row?.settlementAmount),
      netAmount: row?.netAmount != null ? asNumber(row.netAmount) : undefined,
      settlementAmount: row?.settlementAmount != null ? asNumber(row.settlementAmount) : undefined,
      type: row?.type != null ? asText(row.type) : undefined,
      status: row?.status != null ? asText(row.status) : undefined,
      createdAt: row?.createdAt ?? row?.transactionDate,
    }));
  } catch (error) {
    throw new Error(getReadableApiError(error, "Unable to fetch earnings transactions"));
  }
}

const toPartnerPayout = (row: any): PartnerPayout => ({
  id: asText(row?.id ?? row?.payoutId),
  settlementAmount: asNumber(row?.settlementAmount ?? row?.netAmount ?? row?.payableAmount ?? row?.amount),
  status: normalizePayoutStatus(row?.status, row?.settledAt ?? row?.processedAt),
  createdAt: row?.createdAt,
  settledAt: row?.settledAt ?? row?.processedAt,
});

function normalizePayoutStatus(status: unknown, settledAt: unknown) {
  const normalized = String(status ?? "").trim().toUpperCase();
  if (["SETTLED", "PAID", "COMPLETED", "SUCCESS"].includes(normalized)) {
    return settledAt ? normalized : "PENDING";
  }
  if (["PENDING", "PROCESSING", "APPROVED", "INITIATED"].includes(normalized)) {
    return "PENDING";
  }
  return normalized || "PENDING";
}

export async function getPartnerPayouts(params?: { page?: number; size?: number }): Promise<PartnerPayout[]> {
  try {
    const { data } = await withRetry(() => API.get("/api/v1/partner/payouts", {
      params: { page: params?.page ?? 0, size: params?.size ?? 20 },
    }));
    return parseArray(data).map(toPartnerPayout);
  } catch (error) {
    throw new Error(getReadableApiError(error, "Unable to fetch payouts"));
  }
}

export async function getPartnerPayoutById(payoutId: string): Promise<PartnerPayout> {
  try {
    const { data } = await withRetry(() => API.get(`/api/v1/partner/payouts/${payoutId}`));
    return toPartnerPayout(unwrapData(data));
  } catch (error) {
    throw new Error(getReadableApiError(error, "Unable to fetch payout detail"));
  }
}

export async function getPartnerBankDetails(): Promise<PartnerBankDetails | null> {
  try {
    const { data } = await withRetry(() => API.get("/api/v1/partner/bank-details"));
    const source = unwrapData(data);
    if (!source || Object.keys(source).length === 0) return null;
    return {
      maskedAccountNumber: asText(source?.maskedAccountNumber ?? source?.accountNumberMasked ?? source?.accountNumber),
      ifscCode: source?.ifscCode != null ? asText(source.ifscCode) : undefined,
      verificationStatus: asText(source?.verificationStatus ?? source?.bankVerificationStatus ?? source?.status, "PENDING"),
      rejectionReason: source?.rejectionReason != null ? asText(source.rejectionReason) : undefined,
    };
  } catch (error: any) {
    if (error?.response?.status === 404) return null;
    throw new Error(getReadableApiError(error, "Unable to fetch bank details"));
  }
}

export async function updatePartnerBankDetails(payload: { accountNumber: string; ifscCode: string }): Promise<PartnerBankDetails> {
  try {
    const { data } = await API.put("/api/v1/partner/bank-details", payload);
    const source = unwrapData(data);
    return {
      maskedAccountNumber: asText(source?.maskedAccountNumber ?? source?.accountNumberMasked ?? source?.accountNumber),
      ifscCode: source?.ifscCode != null ? asText(source.ifscCode) : payload.ifscCode,
      verificationStatus: asText(source?.verificationStatus ?? source?.bankVerificationStatus ?? source?.status, "PENDING"),
      rejectionReason: source?.rejectionReason != null ? asText(source.rejectionReason) : undefined,
    };
  } catch (error) {
    throw new Error(getReadableApiError(error, "Unable to update bank details"));
  }
}

const toPartnerWithdrawal = (row: any, index: number): PartnerWithdrawal => ({
  id: asText(row?.id ?? row?.withdrawalId ?? index),
  amount: asNumber(row?.amount),
  status: asText(row?.status, "PENDING"),
  requestedAt: row?.requestedAt ?? row?.createdAt,
  processedAt: row?.processedAt,
});

export async function getPartnerWithdrawalBalance(): Promise<PartnerWithdrawalBalance> {
  try {
    const { data } = await withRetry(() => API.get("/api/v1/partner/withdrawals/balance"));
    const source = unwrapData(data);
    return {
      availableBalance: asNumber(source?.availableBalance),
      settledBalance: asNumber(source?.settledBalance ?? source?.totalSettledBalance),
      reservedBalance: asNumber(source?.reservedBalance ?? source?.withdrawalReservations),
    };
  } catch (error) {
    throw new Error(getReadableApiError(error, "Unable to fetch withdrawal balance"));
  }
}

export async function getPartnerWithdrawals(params?: { page?: number; size?: number }): Promise<PartnerWithdrawal[]> {
  try {
    const { data } = await withRetry(() => API.get("/api/v1/partner/withdrawals", {
      params: { page: params?.page ?? 0, size: params?.size ?? 20 },
    }));
    return parseArray(data).map(toPartnerWithdrawal);
  } catch (error) {
    throw new Error(getReadableApiError(error, "Unable to fetch withdrawals"));
  }
}

export async function createPartnerWithdrawal(amount: number): Promise<PartnerWithdrawal> {
  try {
    const { data } = await API.post("/api/v1/partner/withdrawals", { amount });
    return toPartnerWithdrawal(unwrapData(data), 0);
  } catch (error) {
    throw new Error(getReadableApiError(error, "Unable to request withdrawal"));
  }
}

export async function getPartnerDispatchConfig(): Promise<PartnerDispatchConfig> {
  try {
    const { data } = await withRetry(() => API.get("/api/v1/partner/dispatch/config"));
    const source = unwrapData(data);
    return {
      foregroundTrackingIntervalSeconds: asNumber(
        source?.locationUpdateIntervalSeconds ??
          source?.foregroundTrackingIntervalSeconds ??
          source?.foregroundIntervalSeconds ??
          25,
      ) || 25,
      backgroundTrackingIntervalSeconds: asNumber(source?.backgroundTrackingIntervalSeconds ?? source?.backgroundIntervalSeconds ?? 60) || 60,
      minDistanceMeters: asNumber(source?.minDistanceMeters ?? source?.distanceFilterMeters ?? 50) || 50,
      requestExpiryWarningSeconds: asNumber(source?.requestExpiryWarningSeconds ?? source?.expiryWarningSeconds ?? 30) || 30,
    };
  } catch {
    return {
      foregroundTrackingIntervalSeconds: 25,
      backgroundTrackingIntervalSeconds: 60,
      minDistanceMeters: 50,
      requestExpiryWarningSeconds: 30,
    };
  }
}

export async function getPartnerPerformanceSummary(): Promise<PartnerPerformanceSummary> {
  const { data } = await withRetry(() => API.get("/api/v1/partner/performance"));
  const source = unwrapData(data);
  return {
    acceptanceRate: asNumber(source?.acceptanceRate),
    completionRate: asNumber(source?.completionRate),
    cancellationRate: asNumber(source?.cancellationRate),
    rating: asNumber(source?.rating ?? source?.averageRating),
    onTimeArrivalRate: asNumber(source?.onTimeArrivalRate ?? source?.onTimeArrivalPercentage),
  };
}

export async function getPartnerRatings(): Promise<PartnerRatingSummary> {
  const { data } = await withRetry(() =>
    API.get("/api/v1/partner/ratings", { params: { page: 0, size: 20 } }),
  );
  const source = unwrapData(data);
  const rows = parseArray(source?.feedback ?? source?.reviews ?? data);
  return {
    averageRating: asNumber(source?.averageRating ?? source?.rating),
    totalReviews: asNumber(source?.totalReviews ?? source?.reviewCount ?? rows.length),
    feedback: rows.map((row: any, index: number) => ({
      id: asText(row?.id ?? index),
      rating: asNumber(row?.rating),
      comment: asText(row?.comment ?? row?.feedback ?? row?.message),
      customerName: row?.customerName != null ? asText(row.customerName) : undefined,
      createdAt: row?.createdAt,
    })),
  };
}

export async function getPartnerLeaves(): Promise<PartnerLeaveItem[]> {
  const { data } = await withRetry(() => API.get("/api/v1/partner/leave"));
  return parseArray(data).map((row: any, index: number) => ({
    id: asText(row?.id ?? row?.leaveId ?? index),
    fromDate: asText(row?.fromDate ?? row?.startDate),
    toDate: asText(row?.toDate ?? row?.endDate),
    reason: row?.reason != null ? asText(row.reason) : undefined,
    status: asText(row?.status, "PENDING"),
  }));
}

export async function applyPartnerLeave(payload: { fromDate: string; toDate: string; reason?: string }) {
  const { data } = await API.post("/api/v1/partner/leave", payload);
  return data;
}

export async function cancelPartnerLeave(id: string) {
  const { data } = await API.patch(`/api/v1/partner/leave/${encodeURIComponent(id)}/cancel`);
  return data;
}

export async function getPartnerServiceAreas(): Promise<PartnerServiceArea[]> {
  const { data } = await withRetry(() => API.get("/api/v1/partner/service-areas"));
  return parseArray(data).map((row: any, index: number) => ({
    id: asText(row?.id ?? row?.areaId ?? row?.pincode ?? index),
    name: asText(
      row?.name ?? row?.areaName ?? row?.label ?? [row?.pincode, row?.city].filter(Boolean).join(", "),
      "Service Area",
    ),
    pincode: asText(row?.pincode),
    city: asText(row?.city),
    selected: Boolean(row?.selected ?? row?.preferred ?? row?.active),
  }));
}

export async function updatePartnerServiceAreas(areas: Array<{ pincode: string; city: string }>) {
  const { data } = await API.put("/api/v1/partner/service-areas", { areas });
  return data;
}

export async function getPartnerWarnings(): Promise<PartnerWarningItem[]> {
  try {
    const { data } = await withRetry(() => API.get("/api/v1/partner/warnings"));
    return parseArray(data).map((row: any, index: number) => ({
      id: asText(row?.id ?? row?.warningId ?? index),
      type: asText(row?.type ?? row?.category, "WARNING").toUpperCase(),
      reason: asText(row?.reason ?? row?.message ?? row?.title, "Policy warning"),
      guidance: row?.guidance != null ? asText(row.guidance) : row?.resolutionGuidance != null ? asText(row.resolutionGuidance) : undefined,
      createdAt: row?.createdAt,
      status: row?.status != null ? asText(row.status).toUpperCase() : row?.warningStatus != null ? asText(row.warningStatus).toUpperCase() : undefined,
      active: row?.active == null ? true : Boolean(row.active),
      notificationTitle: row?.notificationTitle != null ? asText(row.notificationTitle) : row?.pushTitle != null ? asText(row.pushTitle) : row?.title != null ? asText(row.title) : undefined,
      notificationMessage: row?.notificationMessage != null ? asText(row.notificationMessage) : row?.pushMessage != null ? asText(row.pushMessage) : row?.message != null ? asText(row.message) : undefined,
    }));
  } catch {
    try {
      const profile = await getPartnerProfile();
      const status = asText(profile?.accountStatus).toUpperCase();
      if (!status || status === "ACTIVE" || status === "NORMAL") return [];
      return [{
        id: "profile-account-status",
        type: status,
        reason: `Partner account status is ${status}.`,
        status,
        active: true,
      }];
    } catch {
      return [];
    }
  }
}

export async function getPartnerScreeningCentre(): Promise<PartnerScreeningCentre | null> {
  const normalize = (input: any): PartnerScreeningCentre => ({
    name: asText(input?.name, "Lexho Screening Centre"),
    address: asText(input?.address),
    latitude: asNumber(input?.latitude),
    longitude: asNumber(input?.longitude),
    phone: input?.phone != null ? asText(input.phone) : undefined,
    landmark: input?.landmark != null ? asText(input.landmark) : undefined,
    entranceInfo: input?.entranceInfo != null ? asText(input.entranceInfo) : undefined,
  });

  const extract = (payload: any): PartnerScreeningCentre | null => {
    const candidates = [
      payload?.data?.data,
      payload?.data,
      payload,
    ];

    for (const candidate of candidates) {
      if (candidate && typeof candidate === "object") {
        const center = normalize(candidate);
        if (center.address || (center.latitude !== 0 && center.longitude !== 0)) return center;
      }
    }

    return null;
  };

  try {
    const { data } = await withRetry(() => API.get("/api/v1/partner/screening-centre"));
    return extract(data);
  } catch (error: any) {
    const message = String(error?.response?.data?.message ?? error?.response?.data?.errorCode ?? error?.message ?? "");
    if (error?.response?.status === 404 || message.includes("SCREENING_CENTRE_NOT_CONFIGURED")) {
      return null;
    }
    throw new Error(getReadableApiError(error, "Unable to load screening centre"));
  }
}
