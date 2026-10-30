import { api, parseApiError } from "./client";
import type { BookingHistoryPageDto, BookingSummaryDto, CreateBookingRequest } from "../types/contracts";
import { cacheManager } from "../services/cacheManager";
import { networkService, isNetworkError } from "../services/networkService";
import { offlineQueue } from "../services/offlineQueue";

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

function toBookingSummary(row: any): BookingSummaryDto {
  row = row?.data && typeof row.data === "object" ? row.data : row;
  const service = row?.service && typeof row.service === "object" ? row.service : {};
  const address = row?.address && typeof row.address === "object" ? row.address : {};
  const partner = row?.partner && typeof row.partner === "object" ? row.partner : {};
  const meta = row?.meta && typeof row.meta === "object" ? row.meta : {};
  const status = String(row?.status ?? row?.bookingStatus ?? "").toUpperCase() || undefined;
  const assignment = String(row?.assignmentStatus ?? row?.dispatchStatus ?? status ?? "").toUpperCase() || undefined;
  return {
    id: String(row?.id ?? row?.bookingId ?? row?.orderId ?? ""),
    bookingId: String(row?.bookingId ?? row?.id ?? row?.orderId ?? "").trim() || undefined,
    serviceId: String(row?.serviceId ?? service?.id ?? "").trim() || undefined,
    status,
    serviceName: row?.serviceName ?? service?.serviceName ?? service?.name ?? row?.serviceType ?? row?.categoryName ?? row?.itemName,
    createdAt: row?.createdAt ?? row?.bookingTime,
    scheduledAt: row?.scheduledAt ?? row?.scheduledDateTime ?? row?.bookingDateTime ?? (row?.date && row?.slot ? `${row.date}T${row.slot}` : undefined),
    completedAt: row?.completedAt,
    amount: row?.amount != null ? Number(row.amount) : row?.payableAmount != null ? Number(row.payableAmount) : undefined,
    totalAmount: row?.totalAmount != null ? Number(row.totalAmount) : row?.finalAmount != null ? Number(row.finalAmount) : undefined,
    price: row?.price != null ? Number(row.price) : service?.price != null ? Number(service.price) : undefined,
    address: typeof row?.address === "string" ? row.address : row?.customerAddress ?? row?.serviceAddress ?? address?.addressLine ?? address?.line1,
    fullAddress: row?.fullAddress ?? address?.fullAddress ?? address?.formattedAddress,
    bookingType: String(row?.bookingType ?? "").toUpperCase() as any,
    assignmentStatus: assignment as any,
    promisedStartTime: row?.promisedStartTime ?? row?.slaStartTime ?? row?.scheduledAt,
    slaMinutes: row?.slaMinutes != null ? Number(row.slaMinutes) : undefined,
    unavailableReason: row?.unavailableReason ?? row?.reasonCode,
    message: row?.message,
    etaMinutes: row?.etaMinutes != null ? Number(row.etaMinutes) : undefined,
    partnerName: row?.partnerName ?? partner?.name ?? partner?.fullName,
    partnerPhone: row?.partnerPhone ?? partner?.phone ?? partner?.mobile,
    partnerId: String(row?.partnerId ?? partner?.id ?? "").trim() || undefined,
    partnerRating: row?.partnerRating != null ? Number(row.partnerRating) : partner?.rating != null ? Number(partner.rating) : undefined,
    partnerProfileImage: row?.partnerProfileImage ?? partner?.profileImage ?? partner?.imageUrl,
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
    retryPaymentAllowed: boolValue(meta?.retryPaymentAllowed, row?.retryPaymentAllowed),
    arrivalTime: meta?.arrivalTime ?? row?.arrivalTime ?? row?.arrivedAt ?? row?.partnerArrivedAt,
    meta: {
      ...meta,
      trackingScreen: meta?.trackingScreen,
      showMap: boolValue(meta?.showMap),
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

export async function getBookingsHistoryPage(params: { page?: number; size?: number } = {}): Promise<BookingHistoryPageDto> {
  const cacheKey = `booking-history-${Number(params.page ?? 0)}-${Number(params.size ?? 12)}`;
  try {
    const page = Math.max(0, Number(params.page ?? 0));
    const size = Math.max(1, Number(params.size ?? 12));
    const { data } = await api.get("/api/bookings/history", { params: { page, size } });
    const root = data?.data && typeof data.data === "object" ? data.data : data;
    const rows = Array.isArray(root?.items)
      ? root.items
      : Array.isArray(root?.content)
        ? root.content
        : Array.isArray(root)
          ? root
          : Array.isArray(data?.data)
            ? data.data
            : [];
    const instantRows = Array.isArray(root?.instantBookings?.items)
      ? root.instantBookings.items
      : Array.isArray(root?.instantBookings)
        ? root.instantBookings
        : undefined;
    const scheduledRows = Array.isArray(root?.scheduledBookings?.items)
      ? root.scheduledBookings.items
      : Array.isArray(root?.scheduledBookings)
        ? root.scheduledBookings
        : undefined;
    const subscriptionRows = Array.isArray(root?.subscriptions?.items)
      ? root.subscriptions.items
      : Array.isArray(root?.subscriptions)
        ? root.subscriptions
        : undefined;
    const instantBookings = instantRows?.map(toBookingSummary);
    const scheduledBookings = scheduledRows?.map(toBookingSummary);
    const subscriptions = subscriptionRows?.map(toBookingSummary);
    const hasMore =
      typeof root?.hasMore === "boolean"
        ? root.hasMore
        : root?.instantBookings?.hasMore || root?.scheduledBookings?.hasMore || root?.subscriptions?.hasMore
          ? true
        : typeof root?.last === "boolean"
          ? !root.last
          : Array.isArray(rows) && rows.length >= size;
    const result = { items: rows.map(toBookingSummary), instantBookings, scheduledBookings, subscriptions, hasMore, page, size };
    await cacheManager.set(cacheKey, result);
    return result;
  } catch (error) {
    const cached = await cacheManager.get<BookingHistoryPageDto>(cacheKey, 15 * 60 * 1000);
    if (cached) {
      return cached;
    }
    throw new Error(parseApiError(error, "Failed to load bookings"));
  }
}
export async function getBookingsHistory(): Promise<BookingSummaryDto[]> {
  const page = await getBookingsHistoryPage({ page: 0, size: 100 });
  return page.items;
}
export async function createBooking(payload: CreateBookingRequest) {
  const normalizedDate = String(payload.date ?? "").trim();
  const normalizedSlot = String(payload.slot ?? "").trim();
  const bookingType = payload.bookingType ?? (normalizedDate && normalizedSlot ? "SCHEDULED" : "INSTANT");
  const latitude = Number(payload.latitude);
  const longitude = Number(payload.longitude);
  const hasCoordinates =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude !== 0 &&
    longitude !== 0;
  const body = {
    serviceId: Number(payload.serviceId ?? 0),
    addressId: /^\d+$/.test(String(payload.addressId ?? "")) ? Number(payload.addressId) : payload.addressId,
    latitude: hasCoordinates ? latitude : undefined,
    longitude: hasCoordinates ? longitude : undefined,
    coordinates: hasCoordinates ? { lat: latitude, lng: longitude } : undefined,
    bookingType,
    date: normalizedDate || undefined,
    slot: normalizedSlot || undefined,
    note: String(payload.note ?? "").trim() || undefined,
    couponCode: String(payload.couponCode ?? "").trim() || undefined,
  };
  const throwCreateError = (error: unknown) => {
    const readable = parseApiError(error, "Booking failed");
    if (__DEV__) {
      const status = (error as any)?.response?.status ?? "NA";
      const backendMessage = (error as any)?.response?.data?.message ?? "NA";
      const reasonCode = (error as any)?.response?.data?.reasonCode ?? "NA";
      throw new Error(
        `Booking failed [status:${status}] [reason:${reasonCode}] [msg:${backendMessage}] [client:${readable}] [payload:${JSON.stringify(body)}]`,
      );
    }
    throw new Error(readable);
  };
  const shouldTryLegacyCreate = (error: unknown) => {
    const status = Number((error as any)?.response?.status ?? 0);
    return status === 404 || status === 405;
  };

  try {
    if (!(await networkService.getCurrentState())) {
      await offlineQueue.enqueue({
        type: "booking:create",
        endpoint: "/api/v1/bookings/create",
        method: "post",
        payload: body,
      });
      throw new Error("You are offline. Booking request has been queued and will retry automatically.");
    }
    const { data } = await api.post("/api/v1/bookings/create", body);
    const root = data?.data && typeof data?.data === "object" ? data.data : data;
    return toBookingSummary(root);
  } catch (primaryError) {
    if (isNetworkError(primaryError)) {
      await offlineQueue.enqueue({
        type: "booking:create",
        endpoint: "/api/v1/bookings/create",
        method: "post",
        payload: body,
      });
      throw new Error("Network unavailable. Booking request has been queued and will retry automatically.");
    }
    if (!shouldTryLegacyCreate(primaryError)) {
      throwCreateError(primaryError);
    }
    try {
      const legacyBody = {
        serviceId: body.serviceId,
        addressId: body.addressId,
        latitude: body.latitude,
        longitude: body.longitude,
        coordinates: body.coordinates,
        bookingType: body.bookingType,
        date: normalizedDate,
        slot: normalizedSlot,
        note: body.note,
        couponCode: body.couponCode,
      };
      const { data } = await api.post("/api/bookings/create", legacyBody);
      const root = data?.data && typeof data?.data === "object" ? data.data : data;
      return toBookingSummary(root);
    } catch (fallbackError) {
      throwCreateError(fallbackError);
    }
  }
}
