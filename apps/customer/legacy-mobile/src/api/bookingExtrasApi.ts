import { api, parseApiError } from "./client";
import type { BookingSummaryDto, LiveLocationResponse, RescheduleBookingRequest } from "../types/contracts";

function toBookingSummary(row: any): BookingSummaryDto {
  const status = String(row?.status ?? row?.bookingStatus ?? "").toUpperCase() || undefined;
  const assignment = String(row?.assignmentStatus ?? row?.dispatchStatus ?? status ?? "").toUpperCase() || undefined;
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
    serviceId: String(row?.serviceId ?? row?.service?.id ?? row?.serviceID ?? "").trim() || undefined,
    status,
    serviceName: row?.serviceName ?? row?.service?.name ?? row?.categoryName,
    createdAt:
      row?.createdAt ??
      row?.createdOn ??
      row?.createdDate ??
      row?.bookingTime ??
      row?.bookedAt,
    scheduledAt:
      row?.scheduledAt ??
      row?.scheduledTime ??
      row?.startTime ??
      composedScheduledAt ??
      row?.slot ??
      row?.bookingTime,
    completedAt:
      row?.completedAt ??
      row?.finishedAt ??
      row?.completedOn ??
      row?.endTime,
    amount:
      row?.amount != null ? Number(row.amount) :
      row?.serviceAmount != null ? Number(row.serviceAmount) :
      row?.payableAmount != null ? Number(row.payableAmount) :
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
      row?.location?.fullAddress,
    fullAddress:
      row?.fullAddress ??
      row?.address ??
      row?.serviceAddress ??
      row?.customerAddress ??
      row?.addressLine ??
      row?.location?.address ??
      row?.location?.fullAddress,
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
  };
}

export async function getBookingDetails(id: string): Promise<BookingSummaryDto> {
  try {
    const { data } = await api.get(`/api/bookings/details/${id}`);
    const root = data?.data && typeof data?.data === "object" ? data.data : data;
    const mapped = toBookingSummary(root);
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log("[booking:details:mapped]", {
        requestBookingId: id,
        rawId: String(root?.id ?? root?.bookingId ?? ""),
        bookingType: mapped?.bookingType,
        status: mapped?.status,
        assignmentStatus: mapped?.assignmentStatus,
        partnerName: mapped?.partnerName,
      });
    }
    return mapped;
  } catch (e) {
    throw new Error(parseApiError(e, "Booking details failed"));
  }
}
export async function cancelBooking(id: string): Promise<BookingSummaryDto> { try { const { data } = await api.put(`/api/bookings/cancel/${id}`); const root = data?.data && typeof data?.data === "object" ? data.data : data; return toBookingSummary(root); } catch (e) { throw new Error(parseApiError(e, 'Cancel booking failed')); } }
export async function rescheduleBooking(id: string, payload: RescheduleBookingRequest): Promise<BookingSummaryDto> { try { const { data } = await api.put(`/api/bookings/reschedule/${id}`, payload); const root = data?.data && typeof data?.data === "object" ? data.data : data; return toBookingSummary(root); } catch (e) { throw new Error(parseApiError(e, 'Reschedule booking failed')); } }
export async function getPartnerLiveLocation(bookingId: string): Promise<LiveLocationResponse> { try { const { data } = await api.get(`/api/partner/live-location/${bookingId}`); return data as LiveLocationResponse; } catch (e) { throw new Error(parseApiError(e, 'Live location failed')); } }

