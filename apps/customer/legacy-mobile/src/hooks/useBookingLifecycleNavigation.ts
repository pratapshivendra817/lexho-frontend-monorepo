import { useEffect, useMemo, useRef } from "react";
import type { BookingSummaryDto } from "../types/contracts";
import { getBookingMeta } from "../utils/bookingMeta";

type LifecycleRouteName =
  | "BookingProcessing"
  | "InstantBookingStatus"
  | "ScheduledBookingStatus"
  | "LiveTracking"
  | "ServiceStarted"
  | "ServiceInProgress"
  | "ServiceCompleted"
  | "PartnerArrived"
  | "PaymentStatus"
  | "SubscriptionPlan"
  | "BookingDetail"
  | "BookingStatusFallback";

type LifecycleTarget = { name?: LifecycleRouteName; params?: { bookingId?: string } };

function normalized(value?: string) {
  return String(value ?? "").trim().toUpperCase();
}

function isScheduledBooking(details?: BookingSummaryDto) {
  return normalized(details?.bookingType) === "SCHEDULED";
}

function isLiveScheduledState(details?: BookingSummaryDto) {
  const status = normalized(details?.status);
  const assignmentStatus = normalized(details?.assignmentStatus);
  const state = assignmentStatus || status;

  return [
    "PARTNER_ASSIGNED",
    "PARTNER_ON_THE_WAY",
    "PARTNER_ACCEPTED",
    "ARRIVED",
    "PARTNER_ARRIVED",
    "SERVICE_STARTED",
    "IN_PROGRESS",
    "SERVICE_IN_PROGRESS",
    "COMPLETED",
    "SERVICE_COMPLETED",
  ].includes(state);
}

export function resolveLifecycleTarget(details?: BookingSummaryDto): LifecycleTarget {
  const meta = getBookingMeta(details);
  const screen = normalized(meta.trackingScreen);
  const scheduledBooking = isScheduledBooking(details);

  if (scheduledBooking && !isLiveScheduledState(details)) {
    if (!screen || screen === "INSTANT_STATUS") {
      return { name: "ScheduledBookingStatus" };
    }
  }

  if (!screen) return {};
  switch (screen) {
    case "INSTANT_STATUS":
      return { name: "InstantBookingStatus" };
    case "LIVE_TRACKING":
      return { name: "LiveTracking" };
    case "PARTNER_ARRIVED":
      return { name: "PartnerArrived" };
    case "SERVICE_STARTED":
      return { name: "ServiceStarted" };
    case "SERVICE_IN_PROGRESS":
      return { name: "ServiceInProgress" };
    case "SERVICE_COMPLETED":
      return { name: "ServiceCompleted" };
    case "SCHEDULED_STATUS":
      return { name: "ScheduledBookingStatus" };
    case "SUBSCRIPTION_DETAILS":
      return { name: "SubscriptionPlan" };
    case "PAYMENT_STATUS":
      return { name: "PaymentStatus" };
    case "BOOKING_PROCESSING":
      return { name: "BookingProcessing" };
    case "BOOKING_DETAIL":
      return { name: "BookingDetail" };
    default:
      return { name: "BookingStatusFallback" };
  }
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
    if (target.name === currentRouteName) return;
    if (lastRoute.current === target.name) return;

    lastRoute.current = target.name;
    navigation.replace(target.name, { bookingId });
  }, [bookingId, currentRouteName, details, navigation, target]);

  return { target };
}
