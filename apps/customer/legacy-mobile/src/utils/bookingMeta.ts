import type { BookingMetaDto, BookingSummaryDto } from "../types/contracts";

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

function stringValue(...values: unknown[]) {
  for (const value of values) {
    const next = String(value ?? "").trim();
    if (next) return next;
  }
  return undefined;
}

export function getBookingMeta(booking?: BookingSummaryDto | null): BookingMetaDto {
  const rawMeta = booking?.meta && typeof booking.meta === "object" ? booking.meta : {};
  return {
    ...rawMeta,
    trackingScreen: stringValue(rawMeta.trackingScreen) as BookingMetaDto["trackingScreen"],
    showMap: boolValue(rawMeta.showMap),
    canCancel: boolValue(rawMeta.canCancel),
    canReschedule: boolValue(rawMeta.canReschedule),
    canCallPartner: boolValue(rawMeta.canCallPartner),
    canTrackPartner: boolValue(rawMeta.canTrackPartner),
    canRaiseIssue: boolValue(rawMeta.canRaiseIssue),
    canPause: boolValue(rawMeta.canPause),
    canResume: boolValue(rawMeta.canResume),
    trackingRefreshSeconds: numberValue(rawMeta.trackingRefreshSeconds),
    retryPaymentAllowed: boolValue(rawMeta.retryPaymentAllowed),
    arrivalTime: stringValue(rawMeta.arrivalTime),
  };
}

export function shouldShowBookingMap(booking?: BookingSummaryDto | null) {
  const meta = getBookingMeta(booking);
  return meta.showMap === true && booking?.map?.enabled === true;
}
