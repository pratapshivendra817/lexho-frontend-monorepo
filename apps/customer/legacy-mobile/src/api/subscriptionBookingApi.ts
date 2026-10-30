import { api, parseApiError, unwrapPayload } from "./client";

export type CreateSubscriptionBookingPayload = {
  serviceId?: number;
  subscriptionServiceType?: "CLEANING" | "COOK" | "VEHICLE_WASH" | "FITNESS_WELLNESS";
  frequencyDays?: string[];
  startDate?: string;
  endDate?: string;
  visits?: number;
  durationHours?: number;
  familySize?: string;
  timeSlot?: string;
  addressId?: number | string;
  latitude?: number;
  longitude?: number;
  couponCode?: string;
};

export async function createSubscriptionBooking(
  payload: CreateSubscriptionBookingPayload,
  idempotencyKey?: string,
) {
  let addressId: number | string | undefined = payload.addressId;
  // Subscription storage uses the legacy numeric address FK. Resolve the UUID returned
  // by the newer customer-location API before submitting this booking.
  if (typeof addressId === "string" && !/^\d+$/.test(addressId) && typeof (api as any).get === "function") {
    try {
      const { data } = await (api as any).get("/api/address/list");
      const raw = data?.data ?? data;
      const rows = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : Array.isArray(raw?.content) ? raw.content : [];
      const coordinateMatch = rows.find((row: any) => {
        const rowLat = Number(row?.latitude ?? row?.lat);
        const rowLng = Number(row?.longitude ?? row?.lng ?? row?.long);
        return Number.isFinite(rowLat) && Number.isFinite(rowLng) && payload.latitude != null && payload.longitude != null
          && Math.abs(rowLat - payload.latitude) < 0.001 && Math.abs(rowLng - payload.longitude) < 0.001;
      });
      const numericRow = coordinateMatch ?? rows.find((row: any) => /^\d+$/.test(String(row?.id ?? "")));
      if (numericRow?.id != null) addressId = Number(numericRow.id);
    } catch {
      // The backend still supports UUID mirroring; keep the original ID as a fallback.
    }
  }
  const body = {
    serviceId: payload.serviceId,
    bookingMode: "SUBSCRIPTION",
    serviceType: payload.subscriptionServiceType,
    frequencyDays: payload.frequencyDays,
    startDate: payload.startDate,
    endDate: payload.endDate,
    visits: payload.visits,
    durationHours: payload.durationHours,
    familySize: payload.familySize,
    timeSlot: payload.timeSlot,
    addressId,
    latitude: payload.latitude,
    longitude: payload.longitude,
    couponCode: String(payload.couponCode ?? "").trim() || undefined,
  };
  const endpoints = [
    "/api/subscription/create",
    "/api/subscription/bookings",
  ];
  let lastError: unknown = null;
  for (const endpoint of endpoints) {
    try {
      const { data } = await api.post(endpoint, body, {
        headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
      });
      return unwrapPayload<any>(data, data);
    } catch (error) {
      lastError = error;
      const status = Number((error as any)?.response?.status ?? 0);
      // Never retry a creation after a validation, payment, server or network error.
      if (status !== 404 && status !== 405) break;
    }
  }
  const errors = (lastError as any)?.response?.data?.data?.errors;
  const validationMessage = Array.isArray(errors) ? errors.filter((value: unknown) => typeof value === "string").join("\n") : "";
  throw new Error(validationMessage || parseApiError(lastError, "Unable to create subscription booking"));
}
