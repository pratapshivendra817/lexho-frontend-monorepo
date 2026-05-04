import API, { getReadableApiError } from "./api";

export type PartnerRequestStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export type PartnerRequestItem = {
  id: number;
  requestId?: number;
  cartId?: number;
  serviceId?: number;
  serviceName?: string;
  distanceKm?: number;
  customerLocation?: string;
  status: PartnerRequestStatus;
  rejectionReason?: string;
  createdAt?: string;
};

function toRequestItem(row: any): PartnerRequestItem {
  return {
    id: Number(row?.id ?? row?.requestId ?? 0),
    requestId: row?.requestId != null ? Number(row.requestId) : undefined,
    cartId: row?.cartId != null ? Number(row.cartId) : undefined,
    serviceId: row?.serviceId != null ? Number(row.serviceId) : undefined,
    serviceName: row?.serviceName ? String(row.serviceName) : "Service Request",
    distanceKm: row?.distanceKm != null ? Number(row.distanceKm) : undefined,
    customerLocation: row?.customerLocation ? String(row.customerLocation) : undefined,
    status: String(row?.status ?? "PENDING").toUpperCase() as PartnerRequestStatus,
    rejectionReason: row?.rejectionReason ? String(row.rejectionReason) : undefined,
    createdAt: row?.createdAt ? String(row.createdAt) : undefined,
  };
}

function extractRows(data: any): any[] {
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data?.content)) return data.data.content;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  return [];
}

export async function updatePartnerOnlineStatus(isOnline: boolean): Promise<void> {
  try {
    await API.patch("/api/partner/me/status", { isOnline });
  } catch (error) {
    throw new Error(getReadableApiError(error, "Unable to update availability status."));
  }
}

export async function fetchPartnerRequests(params?: {
  status?: PartnerRequestStatus;
  page?: number;
  size?: number;
}): Promise<PartnerRequestItem[]> {
  try {
    const { data } = await API.get("/api/partner/requests", {
      params: {
        status: params?.status ?? "PENDING",
        page: params?.page ?? 0,
        size: params?.size ?? 20,
      },
    });
    return extractRows(data).map(toRequestItem).filter((row) => row.id > 0);
  } catch (error) {
    throw new Error(getReadableApiError(error, "Unable to load incoming requests."));
  }
}

export async function fetchPartnerRequestById(requestId: number): Promise<PartnerRequestItem> {
  try {
    const { data } = await API.get(`/api/partner/requests/${requestId}`);
    const root = data?.data && typeof data.data === "object" ? data.data : data;
    return toRequestItem(root);
  } catch (error) {
    throw new Error(getReadableApiError(error, "Unable to load request details."));
  }
}

export async function acceptPartnerRequest(requestId: number): Promise<void> {
  try {
    await API.patch(`/api/partner/requests/${requestId}/accept`);
  } catch (error) {
    throw new Error(getReadableApiError(error, "Unable to accept request."));
  }
}

export async function rejectPartnerRequest(requestId: number, reason?: string): Promise<void> {
  try {
    await API.patch(`/api/partner/requests/${requestId}/reject`, {
      reason: reason?.trim() || "Not available",
    });
  } catch (error) {
    throw new Error(getReadableApiError(error, "Unable to reject request."));
  }
}
