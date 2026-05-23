import API, { getReadableApiError } from "./api";
import { isAxiosError } from "axios";
import type { PartnerNotification } from "../types/notification";
import type { PartnerOrder } from "../types/order";
import type { PartnerDashboardStats, PartnerProfile } from "../types/partner";
import { withRetry } from "../utils/retry";
import { getPartnerProviderId, savePartnerProviderId } from "../utils/storage";

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
  if (Array.isArray(payload?.data?.content)) return payload.data.content;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data?.rows)) return payload.data.rows;
  if (Array.isArray(payload?.data?.requests)) return payload.data.requests;
  if (Array.isArray(payload?.data?.orders)) return payload.data.orders;
  if (Array.isArray(payload?.data?.dispatchRequests)) return payload.data.dispatchRequests;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.requests)) return payload.requests;
  if (Array.isArray(payload?.orders)) return payload.orders;
  if (Array.isArray(payload?.dispatchRequests)) return payload.dispatchRequests;
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

const toOrder = (row: any): PartnerOrder => ({
  id: asNumber(row?.id ?? row?.orderId ?? row?.dispatchId ?? row?.requestId),
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
  latitude: row?.latitude != null ? asNumber(row.latitude) : undefined,
  longitude: row?.longitude != null ? asNumber(row.longitude) : undefined,
});

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

export type PartnerUploadDocumentType = "AADHAAR_FRONT" | "AADHAAR_BACK" | "PAN" | "PROFILE_PHOTO";
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
    const profile = {
      id: source?.id != null ? String(source.id) : undefined,
      name: source?.name,
      email: source?.email,
      mobile: source?.mobile,
      city: source?.city,
      address: source?.address,
      serviceCategory: source?.serviceCategory,
      profileImageUrl: source?.profileImageUrl,
      kycStatus: source?.kycStatus,
    };
    if (profile.id) {
      await savePartnerProviderId(profile.id);
    }
    return profile;
  } catch (error) {
    try {
      const { data } = await withRetry(() => API.get("/api/partner/profile"));
      const source = data?.data ?? data;
      return {
        id: source?.id != null ? String(source.id) : undefined,
        name: source?.name,
        email: source?.email,
        mobile: source?.mobile,
        city: source?.city,
        address: source?.address,
        serviceCategory: source?.serviceCategory,
        profileImageUrl: source?.profileImageUrl,
        kycStatus: source?.kycStatus,
      };
    } catch (fallbackError) {
      throw new Error(getReadableApiError(fallbackError, "Unable to fetch profile"));
    }
  }
}

export async function updatePartnerProfile(payload: {
  name: string;
  email: string;
  city: string;
  address: string;
  serviceCategory: string;
}) {
  try {
    const { data } = await API.put("/api/v1/partner/profile", payload);
    return data;
  } catch (error) {
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
    return data;
  } catch (error) {
    try {
      const { data } = await API.post("/api/partner/profile-image", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    } catch (fallbackError) {
      throw new Error(getReadableApiError(fallbackError, "Unable to upload profile image"));
    }
  }
}

export async function uploadPartnerDocuments(files: {
  aadhaarFront: { uri: string; type?: string; name?: string };
  aadhaarBack: { uri: string; type?: string; name?: string };
  pan: { uri: string; type?: string; name?: string };
  profilePhoto: { uri: string; type?: string; name?: string };
}, onProgress?: (percent: number) => void) {
  try {
    const cachedProviderId = await getPartnerProviderId();
    let providerId = cachedProviderId ? Number(cachedProviderId) : NaN;

    if (!Number.isFinite(providerId) || providerId <= 0) {
      const profile = await getPartnerProfile();
      providerId = profile?.id ? Number(profile.id) : NaN;
    }

    if (!Number.isFinite(providerId) || providerId <= 0) {
      throw new Error("Provider ID not found. Please complete onboarding details first.");
    }

    const docs: Array<{ type: PartnerUploadDocumentType; file: { uri: string; type?: string; name?: string } }> = [
      { type: "AADHAAR_FRONT", file: files.aadhaarFront },
      { type: "AADHAAR_BACK", file: files.aadhaarBack },
      { type: "PAN", file: files.pan },
      { type: "PROFILE_PHOTO", file: files.profilePhoto },
    ];

    const total = docs.length;
    let completed = 0;
    const responses: any[] = [];

    for (const doc of docs) {
      const form = new FormData();
      form.append("providerId", String(providerId));
      form.append("documentType", doc.type);
      form.append("file", {
        uri: doc.file.uri,
        type: doc.file.type ?? (doc.type === "PROFILE_PHOTO" ? "image/jpeg" : "application/pdf"),
        name: doc.file.name ?? `${doc.type.toLowerCase()}.${doc.type === "PROFILE_PHOTO" ? "jpg" : "pdf"}`,
      } as any);

      let data: any;
      try {
        ({ data } = await API.post("/api/v1/partner/documents", form, {
          headers: { "Content-Type": "multipart/form-data" },
        }));
      } catch {
        ({ data } = await API.post("/api/partner/documents/upload", form, {
          headers: { "Content-Type": "multipart/form-data" },
        }));
      }
      responses.push(data);
      completed += 1;
      onProgress?.(Math.round((completed * 100) / total));
    }

    return responses;
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
  } catch (error) {
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
  } catch (error) {
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
    throw new Error(getReadableApiError(lastNon404Error, "Unable to fetch new orders"));
  }
  return [];
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

export async function rejectDispatchRequest(requestId: number) {
  try {
    const { data } = await API.patch(`/api/v1/partner/requests/${requestId}/reject`);
    return data;
  } catch {
    try {
      const { data } = await API.patch(`/api/partner/requests/${requestId}/reject`);
      return data;
    } catch {
      try {
        const { data } = await API.post(`/api/v1/orders/${requestId}/reject`);
        return data;
      } catch {
        try {
        const { data } = await API.post(`/api/partner/dispatch/${requestId}/reject`);
        return data;
        } catch {
          const { data } = await API.post(`/api/orders/${requestId}/reject`);
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
    const { data } = await API.post("/api/v1/partner/dispatch/shift/end");
    return data;
  } catch {
    const { data } = await API.post("/api/partner/dispatch/shift/end");
    return data;
  }
}

export async function patchDispatchAvailability(payload: { online: boolean }) {
  try {
    const { data } = await API.patch("/api/v1/partner/dispatch/availability", payload);
    return data;
  } catch {
    const { data } = await API.patch("/api/partner/dispatch/availability", payload);
    return data;
  }
}

export async function sendDispatchLocation(payload: { latitude: number; longitude: number; accuracy?: number }) {
  try {
    const { data } = await API.post("/api/v1/partner/dispatch/location", {
      latitude: payload.latitude,
      longitude: payload.longitude,
      source: "GPS",
    });
    return data;
  } catch {
    const { data } = await API.post("/api/partner/dispatch/location", payload);
    return data;
  }
}

export async function getPartnerOrderById(id: number): Promise<PartnerOrder> {
  try {
    const { data } = await withRetry(() => API.get(`/api/v1/orders/${id}`));
    const root = asRecord(data);
    const nested = asRecord(root.data);
    const source = Object.keys(nested).length > 0 ? nested : root;
    return toOrder(source);
  } catch {
    const { data } = await withRetry(() => API.get(`/api/partner/orders/${id}`));
    const root = asRecord(data);
    const nested = asRecord(root.data);
    const source = Object.keys(nested).length > 0 ? nested : root;
    return toOrder(source);
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
  return rejectDispatchRequest(orderId);
}

export async function startOrder(orderId: number, beforeImage: { uri: string; type?: string; name?: string }) {
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

export async function completeOrder(orderId: number, afterImage: { uri: string; type?: string; name?: string }) {
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
    return parseArray(data).map(toOrder);
  } catch (error) {
    throw new Error(getReadableApiError(error, "Unable to fetch order history"));
  }
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
      ({ data } = await withRetry(() => API.get("/api/partner/notifications", {
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
export type PartnerRequestStatus = "PENDING" | "ACCEPTED" | "REJECTED";
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
  const list = await getNewOrders();
  const found = list.find((o) => o.id === requestId);
  if (found) return found;
  const history = await getOrderHistory();
  const fallback = history.find((o) => o.id === requestId);
  if (!fallback) throw new Error("Request not found");
  return fallback;
}

export async function acceptPartnerRequest(requestId: number) {
  await acceptOrder(requestId);
}

export async function rejectPartnerRequest(requestId: number) {
  await rejectOrder(requestId);
}

