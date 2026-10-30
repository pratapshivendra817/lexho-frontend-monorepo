import type { PartnerOrder } from "../types/order";

const ACTIVE_ORDER_STATUSES = ["ASSIGNED", "PARTNER_ASSIGNED", "PARTNER_ACCEPTED", "ACCEPTED", "ARRIVED", "STARTED", "IN_PROGRESS"] as const;
const APPROVED_PARTNER_STATUSES = ["APPROVED", "ACTIVE"] as const;
const SERVICE_AVAILABLE_STATUSES = ["SERVICE_AVAILABLE", "AVAILABLE", "ACTIVE", "ONLINE"] as const;

export function isActiveOrderStatus(status: string | undefined) {
  return ACTIVE_ORDER_STATUSES.includes(String(status ?? "").trim().toUpperCase() as (typeof ACTIVE_ORDER_STATUSES)[number]);
}

export function isPartnerApproved(accountStatus: string | undefined) {
  if (!accountStatus) return true;
  return APPROVED_PARTNER_STATUSES.includes(
    String(accountStatus).trim().toUpperCase() as (typeof APPROVED_PARTNER_STATUSES)[number],
  );
}

export function isServiceAvailable(serviceAvailability: string | boolean | undefined) {
  if (typeof serviceAvailability === "boolean") return serviceAvailability;
  if (!serviceAvailability) return true;
  return SERVICE_AVAILABLE_STATUSES.includes(
    String(serviceAvailability).trim().toUpperCase() as (typeof SERVICE_AVAILABLE_STATUSES)[number],
  );
}

export function canReceiveNewBookings(params: {
  accountStatus?: string;
  shiftStarted: boolean;
  online: boolean;
  serviceAvailability?: string | boolean;
}) {
  return (
    isPartnerApproved(params.accountStatus) &&
    params.shiftStarted &&
    params.online &&
    isServiceAvailable(params.serviceAvailability)
  );
}

export function getDispatchAvailabilityMessage(params: {
  accountStatus?: string;
  shiftStarted: boolean;
  online: boolean;
  serviceAvailability?: string | boolean;
}) {
  if (!params.online) {
    return {
      title: "You are offline.",
      detail: "You will not receive new bookings.",
    };
  }

  if (!params.shiftStarted) {
    return {
      title: "Shift ended.",
      detail: "You will not receive new bookings.",
    };
  }

  if (canReceiveNewBookings(params)) {
    return {
      title: "You are available to receive new bookings.",
      detail: "",
    };
  }

  return {
    title: "You will not receive new bookings.",
    detail: "",
  };
}

export function getAssignedActiveOrder(
  orders: PartnerOrder[],
  fallback?: PartnerOrder | null,
): PartnerOrder | null {
  const active = orders.find((order) => isActiveOrderStatus(order.status));
  return active ?? fallback ?? null;
}
