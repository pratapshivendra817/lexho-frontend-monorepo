import { useEffect, useMemo, useRef } from "react";
import { ENABLE_LIVE_TRACKING } from "../constants/env";
import type { BookingSummaryDto } from "../types/contracts";

type LifecycleRouteName =
  | "BookingProcessing"
  | "InstantBookingStatus"
  | "ScheduledBookingStatus"
  | "LiveTracking"
  | "ServiceStarted"
  | "ServiceCompleted"
  | "PaymentStatus";

type LifecycleTarget = { name: LifecycleRouteName; params?: { bookingId?: string } };

function normalized(value?: string) {
  return String(value ?? "").trim().toUpperCase();
}

const STATE_ALIASES: Record<string, string> = {
  CREATED: "BOOKING_PROCESSING",
  PLACED: "BOOKING_PROCESSING",
  CONFIRMED: "SEARCHING_PARTNER",
  ACCEPTED: "PARTNER_ASSIGNED",
  ASSIGNED: "PARTNER_ASSIGNED",
  DISPATCHED: "PARTNER_ASSIGNED",
  PARTNER_ON_THE_WAY: "PARTNER_ASSIGNED",
  ARRIVED: "PARTNER_ARRIVED",
  STARTED: "IN_PROGRESS",
  ONGOING: "IN_PROGRESS",
  DONE: "COMPLETED",
  SUCCESS: "COMPLETED",
  FAILED: "PAYMENT_FAILED",
  REJECTED: "CANCELLED",
};

function canonicalState(value?: string) {
  const base = normalized(value);
  return STATE_ALIASES[base] ?? base;
}

function getLifecycleState(details?: BookingSummaryDto) {
  const assignment = canonicalState(details?.assignmentStatus);
  const status = canonicalState(details?.status);
  return assignment || status;
}

export function resolveLifecycleTarget(details?: BookingSummaryDto): LifecycleTarget {
  const state = getLifecycleState(details);
  const bookingType = normalized(details?.bookingType);

  if (state === "PARTNER_ASSIGNED") return { name: ENABLE_LIVE_TRACKING ? "LiveTracking" : "InstantBookingStatus" };
  if (state === "PARTNER_ARRIVED") return { name: ENABLE_LIVE_TRACKING ? "LiveTracking" : "InstantBookingStatus" };
  if (state === "IN_PROGRESS" || state === "SERVICE_STARTED") return { name: "ServiceStarted" };
  if (state === "COMPLETED" || state === "SERVICE_COMPLETED") return { name: "ServiceCompleted" };
  if (bookingType === "SCHEDULED" && (state === "BOOKING_PROCESSING" || state === "SEARCHING_PARTNER" || state === "PAYMENT_PENDING" || state === "SCHEDULED")) {
    return { name: "ScheduledBookingStatus" };
  }
  if (state === "INSTANT_FAILED" || state === "CANCELLED" || state === "EXPIRED" || state === "PAYMENT_FAILED") {
    return { name: "PaymentStatus" };
  }
  if (state === "SEARCHING_PARTNER") return { name: "InstantBookingStatus" };
  return { name: "BookingProcessing" };
}

export function useBookingLifecycleNavigation(args: {
  bookingId?: string;
  details?: BookingSummaryDto;
  navigation: any;
  currentRouteName: string;
}) {
  const { bookingId, details, navigation, currentRouteName } = args;
  const lastRoute = useRef<string>("");
  const target = useMemo(() => resolveLifecycleTarget(details), [details]);

  useEffect(() => {
    if (!bookingId) return;
    if (!details) return;
    if (!target?.name) return;
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log("[booking:lifecycle:route-resolution]", {
        bookingId,
        currentRouteName,
        targetRoute: target.name,
        bookingType: String(details?.bookingType ?? ""),
        status: String(details?.status ?? ""),
        assignmentStatus: String(details?.assignmentStatus ?? ""),
      });
    }
    if (target.name === currentRouteName) return;
    if (lastRoute.current === target.name) return;

    lastRoute.current = target.name;
    navigation.replace(target.name, { bookingId });
  }, [bookingId, currentRouteName, details, navigation, target]);

  return { target };
}
