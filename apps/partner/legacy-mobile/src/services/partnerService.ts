import API, { API_BASE_URL, getReadableApiError } from "./api";
import { isAxiosError } from "axios";
import type { PartnerNotification } from "../types/notification";
import type { OrderTimelineEvent, PartnerOrder } from "../types/order";
import type {
  PartnerDashboardStats,
  PartnerDispatchConfig,
  PartnerLeaveItem,
  PartnerPerformanceSummary,
  PartnerProfile,
  PartnerRatingSummary,
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

const getProfileImageUrl = (source: any): string | undefined => {
  const nested = source?.data ?? source?.profile ?? source?.partner ?? source?.user ?? {};
  const value =
    source?.profileImageUrl ??
    source?.profileImage ??
    source?.profilePictureUrl ??
    source?.profilePicture ??
    source?.avatarUrl ??
    source?.avatar ??
    source?.imageUrl ??
    source?.image ??
    source?.photoUrl ??
    source?.photo ??
    nested?.profileImageUrl ??
    nested?.profileImage ??
    nested?.profilePictureUrl ??
    nested?.profilePicture ??
    nested?.avatarUrl ??
    nested?.avatar ??
    nested?.imageUrl ??
    nested?.image ??
    nested?.photoUrl ??
    nested?.photo;

  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  if (/^(https?:|file:|content:|data:)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return `${API_BASE_URL}${trimmed}`;
  return trimmed;
};

const toOrder = (row: any): PartnerOrder => ({
  id: asNumber(row?.id ?? row?.orderId ?? row?.dispatchId ?? row?.requestId),
  orderId:
    row?.orderId != null
      ? asNumber(row.orderId)
      : row?.bookingId != null
        ? asNumber(row.bookingId)
        : undefined,
  requestId: row?.requestId != null ? asNumber(row.requestId) : row?.dispatchId != null ? asNumber(row.dispatchId) : undefined,
  customerName: row?.customerName ?? row?.customer?.name ?? row?.user?.name,
  customerPhone: row?.customerPhone ?? row?.customer?.phone ?? row?.user?.phone,
  address:
    row?.address ??
    row?.customerAddress ??
    row?.serviceAddress ??
    row?.location?.addressLine ??
    row?.customer?.address,
  serviceType: row?.serviceType ?? row?.category ?? row?.service?.name ?? row?.serviceName,
  serviceCategory:
    row?.serviceCategory ??
    row?.category ??
    row?.service?.category ??
    row?.serviceCategoryName ??
    row?.skillCategory,
  subService: row?.subService ?? row?.subServiceName ?? row?.service?.name ?? row?.serviceName,
  distance: row?.distance != null ? asNumber(row.distance) : undefined,
  etaMinutes: row?.etaMinutes != null ? asNumber(row.etaMinutes) : undefined,
  payout: row?.payout != null ? asNumber(row.payout) : row?.amount != null ? asNumber(row.amount) : undefined,
  bookingType: String(row?.bookingType ?? "").toUpperCase() as any,
  assignmentStatus: String(row?.assignmentStatus ?? row?.dispatchStatus ?? "").toUpperCase() || undefined,
  promisedStartTime: row?.promisedStartTime ?? row?.slaStartTime ?? row?.scheduledTime,
  slaMinutes: row?.slaMinutes != null ? asNumber(row.slaMinutes) : undefined,
  unavailableReason: row?.unavailableReason ?? row?.reasonCode,
  available: row?.available == null ? true : Boolean(row.available),
  amount: row?.amount != null ? asNumber(row.amount) : undefined,
  status: String(row?.status ?? "PENDING").toUpperCase() as any,
  createdAt: row?.createdAt,
  acceptedAt: row?.acceptedAt,
  startedAt: row?.startedAt,
  completedAt: row?.completedAt,
  rejectedAt: row?.rejectedAt,
  expiresAt: row?.expiresAt ?? row?.expiryAt ?? row?.requestExpiresAt,
  expiresInSeconds: row?.expiresInSeconds != null ? asNumber(row.expiresInSeconds) : undefined,
  priority: row?.priority != null ? String(row.priority).toUpperCase() : undefined,
  latitude: row?.latitude != null ? asNumber(row.latitude) : undefined,
  longitude: row?.longitude != null ? asNumber(row.longitude) : undefined,
});

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

export type PartnerOnboardingPayload = {
  fullName: string;
  email: string;
  phoneNumber: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  dateOfBirth: string;
  currentCity: string;
  currentState: string;
  currentFullAddress: string;
  serviceAreas: string[];
  accountNumber: string;
  ifscCode: string;
};

export type PartnerSkillsPayload = {
  categoryIds: number[];
  subServiceIds: number[];
};

export async function getHealth() {
  const { data } = await withRetry(() => API.get("/api/health"));
  return data;
}

export async function getPartnerProfile(): Promise<PartnerProfile> {
  try {
    const { data } = await withRetry(() => API.get("/api/v1/partner/profile"));
    const source = data?.data ?? data;
    const legacyAccountStatusKey = String.fromCharCode(112, 101, 110, 97, 108, 116, 121, 83, 116, 97, 116, 117, 115);
    const profile = {
      id: source?.id != null ? String(source.id) : undefined,
      name: source?.fullName ?? source?.name,
      fullName: source?.fullName ?? source?.name,
      email: source?.email,
      mobile: source?.phone ?? source?.mobile,
      phone: source?.phone ?? source?.mobile,
      city: source?.city,
      pincode: source?.pincode,
      address: source?.address,
      serviceCategory: source?.serviceCategory,
      profileImageUrl: getProfileImageUrl(source),
      kycStatus: source?.kycStatus,
      kycRejectionReason: source?.kycRejectionReason ?? source?.rejectionReason,
      bankVerificationStatus: source?.bankVerificationStatus ?? source?.bankStatus,
      bankRejectionReason: source?.bankRejectionReason ?? source?.bankReason,
      accountStatus: source?.accountStatus ?? source?.[legacyAccountStatusKey],
    };
    if (profile.id) {
      await savePartnerProviderId(profile.id);
    }
    return profile;
  } catch {
    try {
      const { data } = await withRetry(() => API.get("/api/partner/profile"));
      const source = data?.data ?? data;
      const legacyAccountStatusKey = String.fromCharCode(112, 101, 110, 97, 108, 116, 121, 83, 116, 97, 116, 117, 115);
      return {
        id: source?.id != null ? String(source.id) : undefined,
        name: source?.fullName ?? source?.name,
        fullName: source?.fullName ?? source?.name,
        email: source?.email,
        mobile: source?.phone ?? source?.mobile,
        phone: source?.phone ?? source?.mobile,
        city: source?.city,
        pincode: source?.pincode,
        address: source?.address,
        serviceCategory: source?.serviceCategory,
        profileImageUrl: getProfileImageUrl(source),
        kycStatus: source?.kycStatus,
        kycRejectionReason: source?.kycRejectionReason ?? source?.rejectionReason,
        bankVerificationStatus: source?.bankVerificationStatus ?? source?.bankStatus,
        bankRejectionReason: source?.bankRejectionReason ?? source?.bankReason,
        accountStatus: source?.accountStatus ?? source?.[legacyAccountStatusKey],
      };
    } catch (fallbackError) {
      throw new Error(getReadableApiError(fallbackError, "Unable to fetch profile"));
    }
  }
}

export async function updatePartnerProfile(payload: {
  fullName: string;
  phone: string;
  email: string;
  city: string;
  pincode: string;
  address: string;
}) {
  try {
    const { data } = await API.put("/api/v1/partner/profile", payload);
    return data;
  } catch {
    try {
      const { data } = await API.put("/api/partner/profile", payload);
      return data;
    } catch (fallbackError) {
      throw new Error(getReadableApiError(fallbackError, "Unable to update profile"));
    }
  }
}

export async function uploadPartnerProfileImage(file: { uri: string; type?: string; name?: string }) {
  const form = new FormData();
  form.append("file", {
    uri: file.uri,
    type: file.type ?? "image/jpeg",
    name: file.name ?? "profile.jpg",
  } as any);
  try {
    const { data } = await API.post("/api/v1/partner/profile-image", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return { ...data, profileImageUrl: getProfileImageUrl(data) };
  } catch {
    try {
      const { data } = await API.post("/api/partner/profile-image", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return { ...data, profileImageUrl: getProfileImageUrl(data) };
    } catch (fallbackError) {
      throw new Error(getReadableApiError(fallbackError, "Unable to upload profile image"));
    }
  }
}

export async function uploadPartnerDocuments(files: {
  aadhaar: { uri: string; type?: string; name?: string };
  pan: { uri: string; type?: string; name?: string };
  selfie: { uri: string; type?: string; name?: string };
  certificate?: { uri: string; type?: string; name?: string } | null;
}, onProgress?: (percent: number) => void) {
  try {
    const form = new FormData();
    const appendFile = (
      field: "aadhaar" | "pan" | "selfie" | "certificate",
      file: { uri: string; type?: string; name?: string },
    ) => {
      form.append(field, {
        uri: file.uri,
        type: file.type ?? "image/jpeg",
        name: file.name ?? `${field}.jpg`,
      } as any);
    };
    appendFile("aadhaar", files.aadhaar);
    appendFile("pan", files.pan);
    appendFile("selfie", files.selfie);
    if (files.certificate) appendFile("certificate", files.certificate);

    const { data } = await API.post("/api/v1/partner/documents", form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: event => {
        if (!event.total) return;
        onProgress?.(Math.round((event.loaded * 100) / event.total));
      },
    });
    onProgress?.(100);
    return data;
  } catch (error) {
    throw new Error(getReadableApiError(error, "Unable to upload documents"));
  }
}

export async function submitPartnerOnboarding(payload: PartnerOnboardingPayload) {
  try {
    const { data } = await API.post("/api/partner/onboarding", payload);
    const providerId =
      data?.id ??
      data?.partnerId ??
      data?.providerId ??
      data?.data?.id ??
      data?.data?.partnerId ??
      data?.data?.providerId ??
      null;
    if (providerId != null) {
      await savePartnerProviderId(String(providerId));
    }
    return data;
  } catch (error) {
    throw new Error(getReadableApiError(error, "Unable to submit onboarding details"));
  }
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
  return acceptDispatchRequest(orderId);
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
  await acceptOrder(requestId);
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
      availableBalance: asNumber(source?.availableBalance ?? source?.withdrawableBalance),
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
  grossAmount: asNumber(row?.grossAmount ?? row?.grossSettlement ?? row?.amount),
  commissionAmount: asNumber(row?.commissionAmount ?? row?.commission),
  reversalAmount: asNumber(row?.reversalAmount ?? row?.refundReversal ?? row?.reversal),
  netAmount: asNumber(row?.netAmount ?? row?.settlementAmount ?? row?.payableAmount),
  status: asText(row?.status, "PENDING"),
  createdAt: row?.createdAt,
  settledAt: row?.settledAt ?? row?.processedAt,
});

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
      availableBalance: asNumber(source?.availableBalance ?? source?.withdrawableBalance),
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
    const profile = await getPartnerProfile();
    const status = String(profile.accountStatus ?? "ACTIVE").toUpperCase();
    if (status === "ACTIVE") return [];
    return [{
      id: "profile-account-status",
      type: status,
      reason: `Partner account status is ${status}.`,
      status,
      active: true,
      notificationTitle: undefined,
      notificationMessage: undefined,
    }];
  }
}

