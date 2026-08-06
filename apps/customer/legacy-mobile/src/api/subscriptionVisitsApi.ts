import { api, parseApiError } from "./client";
import type { SubscriptionVisitDto } from "../types/contracts";

function toVisit(row: any, index: number): SubscriptionVisitDto {
  const history = Array.isArray(row?.statusHistory) ? row.statusHistory : Array.isArray(row?.timeline) ? row.timeline : [];
  return {
    id: String(row?.id ?? row?.visitId ?? row?.bookingId ?? `visit-${index}`),
    bookingId: String(row?.bookingId ?? row?.booking?.id ?? "").trim() || undefined,
    serviceName: row?.serviceName ?? row?.service?.name,
    scheduledAt: row?.scheduledAt ?? row?.scheduledTime ?? row?.date ?? row?.slot,
    status: String(row?.status ?? row?.visitStatus ?? "").toUpperCase() || undefined,
    partnerName: row?.partnerName ?? row?.partner?.name,
    amount: row?.amount != null ? Number(row.amount) : row?.totalAmount != null ? Number(row.totalAmount) : undefined,
    section: String(row?.section ?? row?.historySection ?? row?.visitSection ?? "").trim() || undefined,
    statusHistory: history
      .map((item: any, idx: number) => ({
        key: String(item?.key ?? item?.code ?? item?.status ?? idx),
        label: String(item?.label ?? item?.title ?? item?.name ?? "").trim(),
        status: item?.status ?? item?.state,
        completed: item?.completed,
        active: item?.active,
        timestamp: item?.timestamp ?? item?.createdAt ?? item?.time,
      }))
      .filter((item: any) => item.label),
  };
}

export async function getSubscriptionVisits(subscriptionId: string): Promise<SubscriptionVisitDto[]> {
  try {
    const { data } = await api.get(`/api/subscriptions/${subscriptionId}/visits`);
    const root = data?.data && typeof data.data === "object" ? data.data : data;
    if (Array.isArray(root?.upcomingVisits) || Array.isArray(root?.completedVisits) || Array.isArray(root?.cancelledVisits)) {
      return [
        ...(root?.upcomingVisits ?? []).map((row: any) => ({ ...row, section: "Upcoming Visits" })),
        ...(root?.completedVisits ?? []).map((row: any) => ({ ...row, section: "Completed Visits" })),
        ...(root?.cancelledVisits ?? []).map((row: any) => ({ ...row, section: "Cancelled Visits" })),
      ].map((row, index) => toVisit(row, index));
    }
    const rows = Array.isArray(root?.items)
      ? root.items
      : Array.isArray(root?.content)
        ? root.content
        : Array.isArray(root)
          ? root
          : [];
    return rows.map((row: any, index: number) => toVisit(row, index));
  } catch (error) {
    throw new Error(parseApiError(error, "Failed to load subscription visits"));
  }
}
