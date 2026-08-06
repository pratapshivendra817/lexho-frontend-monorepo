import { api, toApiError } from "./client";

export type SubscriptionDto = {
  id: string;
  serviceType?: string;
  serviceName?: string;
  planName?: string;
  frequencyLabel?: string;
  frequencyDays?: string[];
  startDate?: string;
  endDate?: string;
  visits?: number;
  remainingVisits?: number;
  timeSlot?: string;
  address?: string;
  fullAddress?: string;
  amount?: number;
  totalAmount?: number;
  nextServiceDate?: string;
  nextVisitDate?: string;
  canPause?: boolean;
  canResume?: boolean;
  canCancel?: boolean;
};

function boolValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "boolean") return value;
  }
  return undefined;
}

function numberValue(...values: unknown[]) {
  for (const value of values) {
    if (value == null || value === "") continue;
    const next = Number(value);
    if (Number.isFinite(next)) return next;
  }
  return undefined;
}

function toSubscription(row: any): SubscriptionDto {
  return {
    id: String(row?.id ?? row?.subscriptionId ?? ""),
    serviceType: row?.serviceType ?? row?.subscriptionServiceType,
    serviceName: row?.serviceName ?? row?.service?.name,
    planName: row?.planName ?? row?.subscriptionPlan ?? row?.frequency,
    frequencyLabel: row?.frequencyLabel ?? row?.frequency,
    frequencyDays: Array.isArray(row?.frequencyDays) ? row.frequencyDays : undefined,
    startDate: row?.startDate,
    endDate: row?.endDate,
    visits: numberValue(row?.visits, row?.visitCount),
    remainingVisits: numberValue(row?.remainingVisits),
    timeSlot: row?.timeSlot,
    address: row?.address,
    fullAddress: row?.fullAddress ?? row?.address,
    amount: numberValue(row?.amount),
    totalAmount: numberValue(row?.totalAmount, row?.totalPrice),
    nextServiceDate: row?.nextServiceDate,
    nextVisitDate: row?.nextVisitDate,
    canPause: boolValue(row?.canPause),
    canResume: boolValue(row?.canResume),
    canCancel: boolValue(row?.canCancel),
  };
}

export async function getSubscriptions(params: { page?: number; size?: number } = {}) {
  try {
    const { data } = await api.get("/api/subscriptions", { params });
    const root = data?.data && typeof data.data === "object" ? data.data : data;
    const rows = Array.isArray(root?.items) ? root.items : Array.isArray(root?.content) ? root.content : Array.isArray(root) ? root : [];
    return {
      items: rows.map(toSubscription),
      hasMore: typeof root?.hasMore === "boolean" ? root.hasMore : typeof root?.last === "boolean" ? !root.last : false,
    };
  } catch (error) {
    throw toApiError(error, "Failed to load subscriptions");
  }
}

export async function getSubscriptionDetails(id: string): Promise<SubscriptionDto> {
  try {
    const { data } = await api.get(`/api/subscriptions/${id}`);
    const root = data?.data && typeof data.data === "object" ? data.data : data;
    return toSubscription(root);
  } catch (error) {
    throw toApiError(error, "Failed to load subscription");
  }
}

export async function pauseSubscription(id: string) {
  try {
    const { data } = await api.post(`/api/subscriptions/${id}/pause`);
    return data;
  } catch (error) {
    throw toApiError(error, "Failed to pause subscription");
  }
}

export async function resumeSubscription(id: string) {
  try {
    const { data } = await api.post(`/api/subscriptions/${id}/resume`);
    return data;
  } catch (error) {
    throw toApiError(error, "Failed to resume subscription");
  }
}

export async function cancelSubscription(id: string) {
  try {
    const { data } = await api.post(`/api/subscriptions/${id}/cancel`);
    return data;
  } catch (error) {
    throw toApiError(error, "Failed to cancel subscription");
  }
}
