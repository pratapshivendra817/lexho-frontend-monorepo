import { api, parseApiError } from "./client";
import type { BookingSummaryDto, CreateBookingRequest } from "../types/contracts";

function toBookingSummary(row: any): BookingSummaryDto {
  const status = String(row?.status ?? row?.bookingStatus ?? "").toUpperCase() || undefined;
  const assignment = String(row?.assignmentStatus ?? row?.dispatchStatus ?? status ?? "").toUpperCase() || undefined;
  return {
    id: String(row?.id ?? row?.bookingId ?? ""),
    status,
    serviceName: row?.serviceName ?? row?.service?.name ?? row?.categoryName,
    createdAt: row?.createdAt ?? row?.bookingTime,
    bookingType: String(row?.bookingType ?? "").toUpperCase() as any,
    assignmentStatus: assignment as any,
    promisedStartTime: row?.promisedStartTime ?? row?.slaStartTime,
    slaMinutes: row?.slaMinutes != null ? Number(row.slaMinutes) : undefined,
    unavailableReason: row?.unavailableReason ?? row?.reasonCode,
    message: row?.message,
    etaMinutes: row?.etaMinutes != null ? Number(row.etaMinutes) : undefined,
    partnerName: row?.partnerName ?? row?.partner?.name,
    partnerPhone: row?.partnerPhone ?? row?.partner?.phone,
  };
}

export async function getBookingsHistory(): Promise<BookingSummaryDto[]> { try { const { data } = await api.get("/api/bookings/history"); const rows = (Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []) as any[]; return rows.map(toBookingSummary); } catch (error) { throw new Error(parseApiError(error, "Failed to load bookings")); } }
export async function createBooking(payload: CreateBookingRequest) {
  const normalizedDate = String(payload.date ?? "").trim();
  const normalizedSlot = String(payload.slot ?? "").trim();
  const bookingType = normalizedDate && normalizedSlot ? "SCHEDULED" : "INSTANT";
  const body = {
    serviceId: Number(payload.serviceId ?? 0),
    addressId: Number(payload.addressId ?? 0),
    bookingType,
    date: normalizedDate || undefined,
    slot: normalizedSlot || undefined,
    note: String(payload.note ?? "").trim() || undefined,
  };
  try {
    const { data } = await api.post("/api/v1/bookings/create", body);
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log("[booking:create:success]", { path: "/api/v1/bookings/create", body });
    }
    const root = data?.data && typeof data?.data === "object" ? data.data : data;
    return toBookingSummary(root);
  } catch (error) {
    try {
      const legacyBody = {
        serviceId: body.serviceId,
        addressId: body.addressId,
        date: normalizedDate,
        slot: normalizedSlot,
        note: body.note,
      };
      const { data } = await api.post("/api/bookings/create", legacyBody);
      const root = data?.data && typeof data?.data === "object" ? data.data : data;
      return toBookingSummary(root);
    } catch (fallbackError) {
      const readable = parseApiError(fallbackError, "Booking failed");
      if (__DEV__) {
        const status = (fallbackError as any)?.response?.status ?? "NA";
        const backendMessage = (fallbackError as any)?.response?.data?.message ?? "NA";
        const reasonCode = (fallbackError as any)?.response?.data?.reasonCode ?? "NA";
        throw new Error(
          `Booking failed [status:${status}] [reason:${reasonCode}] [msg:${backendMessage}] [client:${readable}] [payload:${JSON.stringify(body)}]`,
        );
      }
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log("[booking:create:failed]", {
          path: "/api/v1/bookings/create",
          status: (fallbackError as any)?.response?.status ?? null,
          message: readable,
          body,
        });
      }
      throw new Error(readable);
    }
  }
}
