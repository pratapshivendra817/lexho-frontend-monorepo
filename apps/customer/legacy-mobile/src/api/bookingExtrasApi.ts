import { api, toApiError } from "./client";
import type { BookingSummaryDto, LiveLocationResponse } from "../types/contracts";
import { cacheManager } from "../services/cacheManager";
import { networkService, isNetworkError } from "../services/networkService";
import { offlineQueue } from "../services/offlineQueue";

function boolValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "boolean") return value;
  }
  return undefined;
}

function normalizeLifecycleStatus(value: unknown) {
  const normalized = String(value ?? "").trim().toUpperCase();
  return normalized === "STARTED" ? "IN_PROGRESS" : normalized;
}

function numberValue(...values: unknown[]) {
  for (const value of values) {
    if (value == null || value === "") continue;
    const next = Number(value);
    if (Number.isFinite(next)) return next;
  }
  return undefined;
}

function mapStatusHistory(row: any) {
  const rows = Array.isArray(row?.statusHistory)
    ? row.statusHistory
    : Array.isArray(row?.timeline)
      ? row.timeline
      : [];
  return rows
    .map((item: any, index: number) => ({
      key: String(item?.key ?? item?.code ?? item?.status ?? index),
      label: String(item?.label ?? item?.title ?? item?.name ?? "").trim(),
      status: item?.status ?? item?.state,
      completed: item?.completed,
      active: item?.active,
      timestamp: item?.timestamp ?? item?.createdAt ?? item?.time,
    }))
    .filter((item: any) => item.label);
}

// API responses are wrapped by ApiResponse and some gateway versions add an
// additional `payload`/`result` envelope. Unwrap those envelopes before
// mapping so the confirmation screen never receives an object with only
// `success` and `message` fields.
function unwrapBookingPayload(value: any) {
  let current = value;
  for (let index = 0; index < 4; index += 1) {
    if (!current || typeof current !== "object" || Array.isArray(current)) break;
    const nested = current.data ?? current.payload ?? current.result;
    if (!nested || typeof nested !== "object" || Array.isArray(nested) || nested === current) break;
    current = nested;
  }
  return current;
}

function toBookingSummary(row: any): BookingSummaryDto {
  row = unwrapBookingPayload(row);
  const meta = row?.meta && typeof row.meta === "object" ? row.meta : {};
  const status = normalizeLifecycleStatus(row?.status ?? row?.bookingStatus ?? row?.orderStatus) || undefined;
  const assignment = normalizeLifecycleStatus(row?.assignmentStatus ?? row?.dispatchStatus ?? status) || undefined;
  const rawDate =
    row?.scheduledDate ??
    row?.date ??
    row?.bookingDate ??
    row?.slotDate ??
    "";
  const rawSlot =
    row?.slot ??
    row?.timeSlot ??
    row?.scheduledSlot ??
    "";
  const composedScheduledAt =
    typeof rawDate === "string" && rawDate.trim() && typeof rawSlot === "string" && rawSlot.trim()
      ? `${rawDate.trim()} ${rawSlot.trim()}`
      : undefined;
  return {
    id: String(row?.id ?? row?.bookingId ?? ""),
    bookingId: String(row?.bookingId ?? row?.id ?? "").trim() || undefined,
    serviceId: String(row?.serviceId ?? row?.service?.id ?? row?.serviceID ?? "").trim() || undefined,
    status,
    serviceName: row?.serviceName ?? row?.service?.name ?? row?.serviceType ?? row?.categoryName ?? row?.category ?? row?.itemName,
    createdAt:
      row?.createdAt ??
      row?.createdOn ??
      row?.createdDate ??
      row?.bookingTime ??
      row?.bookedAt ??
      row?.requestedAt ??
      row?.orderCreatedAt,
    scheduledAt:
      row?.scheduledAt ??
      row?.scheduledTime ??
      row?.startTime ??
      composedScheduledAt ??
      row?.slot ??
      row?.bookingTime ??
      row?.requestedAt,
    completedAt:
      row?.completedAt ??
      row?.finishedAt ??
      row?.completedOn ??
      row?.endTime,
    amount:
      row?.amount != null ? Number(row.amount) :
      row?.serviceAmount != null ? Number(row.serviceAmount) :
      row?.payableAmount != null ? Number(row.payableAmount) :
      row?.grandTotal != null ? Number(row.grandTotal) :
      undefined,
    totalAmount:
      row?.totalAmount != null ? Number(row.totalAmount) :
      row?.grandTotal != null ? Number(row.grandTotal) :
      row?.finalAmount != null ? Number(row.finalAmount) :
      row?.totalPrice != null ? Number(row.totalPrice) :
      undefined,
    price:
      row?.price != null ? Number(row.price) :
      row?.unitPrice != null ? Number(row.unitPrice) :
      undefined,
    address:
      row?.address ??
      row?.serviceAddress ??
      row?.customerAddress ??
      row?.addressLine ??
      row?.location?.address ??
      row?.location?.fullAddress ??
      (typeof row?.address === "object" ? row.address?.fullAddress ?? row.address?.addressLine : undefined),
    fullAddress:
      row?.fullAddress ??
      row?.address ??
      row?.serviceAddress ??
      row?.customerAddress ??
      row?.addressLine ??
      row?.location?.address ??
      row?.location?.fullAddress ??
      (typeof row?.address === "object" ? row.address?.fullAddress ?? row.address?.addressLine : undefined),
    bookingType: String(row?.bookingType ?? "").toUpperCase() as any,
    assignmentStatus: assignment as any,
    promisedStartTime: row?.promisedStartTime ?? row?.slaStartTime,
    slaMinutes: row?.slaMinutes != null ? Number(row.slaMinutes) : undefined,
    unavailableReason: row?.unavailableReason ?? row?.reasonCode,
    message: row?.message,
    etaMinutes: row?.etaMinutes != null ? Number(row.etaMinutes) : undefined,
    partnerName: row?.partnerName ?? row?.partner?.name,
    partnerPhone: row?.partnerPhone ?? row?.partner?.phone,
    partnerId: String(row?.partnerId ?? row?.partner?.id ?? "").trim() || undefined,
    partnerRating:
      row?.partnerRating != null
        ? Number(row.partnerRating)
        : row?.partner?.rating != null
          ? Number(row.partner.rating)
          : undefined,
    partnerProfileImage:
      row?.partnerProfileImage ??
      row?.partner?.profileImage ??
      row?.partner?.imageUrl ??
      row?.partner?.avatar,
    subscriptionId: String(row?.subscriptionId ?? row?.subscription?.id ?? "").trim() || undefined,
    subscriptionServiceType: row?.subscriptionServiceType ?? row?.subscription?.subscriptionServiceType ?? row?.subscription?.serviceType,
    frequencyDays: Array.isArray(row?.frequencyDays)
      ? row.frequencyDays
      : Array.isArray(row?.subscription?.frequencyDays)
        ? row.subscription.frequencyDays
        : undefined,
    frequencyLabel: row?.frequencyLabel ?? row?.subscription?.frequencyLabel ?? row?.frequency,
    startDate: row?.startDate ?? row?.subscription?.startDate,
    endDate: row?.endDate ?? row?.subscription?.endDate,
    visits:
      row?.visits != null ? Number(row.visits) :
      row?.visitCount != null ? Number(row.visitCount) :
      row?.subscription?.visits != null ? Number(row.subscription.visits) :
      undefined,
    remainingVisits:
      row?.remainingVisits != null ? Number(row.remainingVisits) :
      row?.subscription?.remainingVisits != null ? Number(row.subscription.remainingVisits) :
      undefined,
    timeSlot: row?.timeSlot ?? row?.subscription?.timeSlot,
    nextServiceDate: row?.nextServiceDate ?? row?.subscription?.nextServiceDate,
    nextVisitDate: row?.nextVisitDate ?? row?.subscription?.nextVisitDate,
    paymentStatus: row?.paymentStatus,
    trackingStatus: row?.trackingStatus ?? meta?.trackingStatus,
    map: row?.map,
    serviceStartedAt: row?.serviceStartedAt ?? row?.startedAt ?? row?.startTime,
    estimatedCompletionTime: row?.estimatedCompletionTime ?? row?.expectedCompletionTime ?? row?.estimatedEndTime,
    progressStatus: row?.progressStatus ?? row?.workStatus ?? row?.trackingStatus,
    serviceStartPin: row?.serviceStartPin != null ? String(row.serviceStartPin) : row?.startServicePin != null ? String(row.startServicePin) : meta?.serviceStartPin != null ? String(meta.serviceStartPin) : undefined,
    serviceStartPinExpiresAt: row?.serviceStartPinExpiresAt ?? row?.startServicePinExpiresAt ?? meta?.serviceStartPinExpiresAt ?? undefined,
    serviceCompletePin: row?.serviceCompletePin != null ? String(row.serviceCompletePin) : row?.endServicePin != null ? String(row.endServicePin) : row?.completePin != null ? String(row.completePin) : meta?.serviceCompletePin != null ? String(meta.serviceCompletePin) : undefined,
    serviceCompletePinExpiresAt: row?.serviceCompletePinExpiresAt ?? row?.endServicePinExpiresAt ?? row?.completePinExpiresAt ?? meta?.serviceCompletePinExpiresAt ?? undefined,
    retryPaymentAllowed: boolValue(meta?.retryPaymentAllowed, row?.retryPaymentAllowed),
    arrivalTime: meta?.arrivalTime ?? row?.arrivalTime ?? row?.arrivedAt ?? row?.partnerArrivedAt,
    meta: {
      ...meta,
      trackingScreen: meta?.trackingScreen,
      showMap: boolValue(meta?.showMap),
      canReview: boolValue(meta?.canReview),
      reviewSubmitted: boolValue(meta?.reviewSubmitted),
      canCancel: boolValue(meta?.canCancel),
      canReschedule: boolValue(meta?.canReschedule),
      canCallPartner: boolValue(meta?.canCallPartner),
      canTrackPartner: boolValue(meta?.canTrackPartner),
      canRaiseIssue: boolValue(meta?.canRaiseIssue),
      canPause: boolValue(meta?.canPause, row?.canPause, row?.subscription?.canPause),
      canResume: boolValue(meta?.canResume, row?.canResume, row?.subscription?.canResume),
      trackingRefreshSeconds: numberValue(meta?.trackingRefreshSeconds),
      retryPaymentAllowed: boolValue(meta?.retryPaymentAllowed, row?.retryPaymentAllowed),
      arrivalTime: meta?.arrivalTime ?? row?.arrivalTime ?? row?.arrivedAt ?? row?.partnerArrivedAt,
    },
    statusHistory: mapStatusHistory(row),
  };
}

export async function getBookingDetails(id: string): Promise<BookingSummaryDto> {
  try {
    const { data } = await api.get(`/api/bookings/details/${id}`);
    const mapped = toBookingSummary(data);
    await cacheManager.set(`booking-detail-${id}`, mapped);
    return mapped;
  } catch (e) {
    const cached = await cacheManager.get<BookingSummaryDto>(`booking-detail-${id}`, 15 * 60 * 1000);
    if (cached) {
      return cached;
    }
    throw toApiError(e, "Booking details failed");
  }
}
export async function cancelBooking(id: string): Promise<BookingSummaryDto> {
  try {
    if (!(await networkService.getCurrentState())) {
      await offlineQueue.enqueue({
        type: "booking:cancel",
        endpoint: `/api/bookings/cancel/${id}`,
        method: "put",
        payload: {},
      });
      throw new Error("You are offline. Cancel request has been queued.");
    }
    const { data } = await api.put(`/api/bookings/cancel/${id}`);
    return toBookingSummary(data);
  } catch (e) {
    if (isNetworkError(e)) {
      await offlineQueue.enqueue({
        type: "booking:cancel",
        endpoint: `/api/bookings/cancel/${id}`,
        method: "put",
        payload: {},
      });
      throw new Error("Network unavailable. Cancel request has been queued.");
    }
    throw toApiError(e, "Cancel booking failed");
  }
}
export async function rescheduleBooking(id: string, payload: { date: string; slot: string }): Promise<BookingSummaryDto> {
  try {
    if (!(await networkService.getCurrentState())) {
      await offlineQueue.enqueue({
        type: "booking:reschedule",
        endpoint: `/api/bookings/${id}/reschedule`,
        method: "post",
        payload: payload as Record<string, unknown>,
      });
      throw new Error("You are offline. Reschedule request has been queued.");
    }
    const { data } = await api.post(`/api/bookings/${id}/reschedule`, payload);
    return toBookingSummary(data);
  } catch (e) {
    if (isNetworkError(e)) {
      await offlineQueue.enqueue({
        type: "booking:reschedule",
        endpoint: `/api/bookings/${id}/reschedule`,
        method: "post",
        payload: payload as Record<string, unknown>,
      });
      throw new Error("Network unavailable. Reschedule request has been queued.");
    }
    throw toApiError(e, "Reschedule booking failed");
  }
}
export async function getPartnerLiveLocation(bookingId: string): Promise<LiveLocationResponse> { try { const { data } = await api.get(`/api/partner/live-location/${bookingId}`); return data as LiveLocationResponse; } catch (e) { throw toApiError(e, 'Live location failed'); } }
