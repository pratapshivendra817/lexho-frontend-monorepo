import { api, parseApiError, unwrapPayload } from "./client";

export type CreateSubscriptionBookingPayload = {
  serviceId?: number;
  subscriptionServiceType?: "CLEANING" | "COOK";
  frequencyDays?: string[];
  startDate?: string;
  endDate?: string;
  visits?: number;
  durationHours?: number;
  familySize?: string;
  timeSlot?: string;
  addressId?: number;
  latitude?: number;
  longitude?: number;
};

export async function createSubscriptionBooking(payload: CreateSubscriptionBookingPayload) {
  const body = {
    serviceId: payload.serviceId,
    subscriptionServiceType: payload.subscriptionServiceType,
    frequencyDays: payload.frequencyDays,
    startDate: payload.startDate,
    endDate: payload.endDate,
    visits: payload.visits,
    durationHours: payload.durationHours,
    familySize: payload.familySize,
    timeSlot: payload.timeSlot,
    addressId: payload.addressId,
    latitude: payload.latitude,
    longitude: payload.longitude,
  };
  const endpoints = [
    "/api/subscription/bookings",
    "/api/customer/subscription/bookings",
    "/api/customer/subscriptions/book",
  ];
  let lastError: unknown = null;
  for (const endpoint of endpoints) {
    try {
      const { data } = await api.post(endpoint, body);
      return unwrapPayload<any>(data, data);
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(parseApiError(lastError, "Unable to create subscription booking"));
}
