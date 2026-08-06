import { renderHook } from "@testing-library/react-native";
import {
  resolveLifecycleTarget,
  useBookingLifecycleNavigation,
} from "../src/hooks/useBookingLifecycleNavigation";

const booking = (trackingScreen?: string) =>
  ({
    id: "booking-1",
    meta: trackingScreen ? { trackingScreen } : {},
  }) as never;

describe("resolveLifecycleTarget", () => {
  it.each([
    [undefined, undefined],
    ["", undefined],
    ["INSTANT_STATUS", "InstantBookingStatus"],
    [" live_tracking ", "LiveTracking"],
    ["PARTNER_ARRIVED", "PartnerArrived"],
    ["SERVICE_STARTED", "ServiceStarted"],
    ["SERVICE_IN_PROGRESS", "ServiceInProgress"],
    ["SERVICE_COMPLETED", "ServiceCompleted"],
    ["SCHEDULED_STATUS", "ScheduledBookingStatus"],
    ["SUBSCRIPTION_DETAILS", "SubscriptionPlan"],
    ["PAYMENT_STATUS", "PaymentStatus"],
    ["BOOKING_PROCESSING", "BookingProcessing"],
    ["BOOKING_DETAIL", "BookingDetail"],
    ["UNKNOWN_SCREEN", "BookingStatusFallback"],
  ])("maps %s to %s", (screen, expected) => {
    expect(resolveLifecycleTarget(booking(screen)).name).toBe(expected);
  });
});

describe("useBookingLifecycleNavigation", () => {
  it("replaces the current route when a target becomes available", async () => {
    const navigation = { replace: jest.fn() };
    const { result } = await renderHook(() =>
      useBookingLifecycleNavigation({
        bookingId: "booking-1",
        details: booking("LIVE_TRACKING"),
        navigation,
        currentRouteName: "BookingProcessing",
      }),
    );

    expect(result.current.target).toEqual({ name: "LiveTracking" });
    expect(navigation.replace).toHaveBeenCalledWith("LiveTracking", {
      bookingId: "booking-1",
    });
  });

  it.each([
    {
      bookingId: undefined,
      details: booking("LIVE_TRACKING"),
      currentRouteName: "Other",
    },
    {
      bookingId: "booking-1",
      details: undefined,
      currentRouteName: "Other",
    },
    {
      bookingId: "booking-1",
      details: booking(),
      currentRouteName: "Other",
    },
    {
      bookingId: "booking-1",
      details: booking("LIVE_TRACKING"),
      currentRouteName: "LiveTracking",
    },
  ])("does not navigate for incomplete or current target %#", async args => {
    const navigation = { replace: jest.fn() };
    await renderHook(() =>
      useBookingLifecycleNavigation({ ...(args as any), navigation }),
    );
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("memoizes the target and avoids duplicate navigation", async () => {
    const navigation = { replace: jest.fn() };
    const details = booking("SERVICE_STARTED");
    const { result, rerender } = await renderHook(
      (props: any) => useBookingLifecycleNavigation(props),
      {
        initialProps: {
          bookingId: "booking-1",
          details,
          navigation,
          currentRouteName: "Other",
        },
      },
    );
    const firstTarget = result.current.target;

    await rerender({
      bookingId: "booking-1",
      details,
      navigation,
      currentRouteName: "StillOther",
    });

    expect(result.current.target).toBe(firstTarget);
    expect(navigation.replace).toHaveBeenCalledTimes(1);
  });

  it("re-executes when details change to a new lifecycle route", async () => {
    const navigation = { replace: jest.fn() };
    const { rerender } = await renderHook(
      (props: any) => useBookingLifecycleNavigation(props),
      {
        initialProps: {
          bookingId: "booking-1",
          details: booking("BOOKING_PROCESSING"),
          navigation,
          currentRouteName: "Other",
        },
      },
    );

    await rerender({
      bookingId: "booking-1",
      details: booking("PAYMENT_STATUS"),
      navigation,
      currentRouteName: "BookingProcessing",
    });
    expect(navigation.replace).toHaveBeenLastCalledWith("PaymentStatus", {
      bookingId: "booking-1",
    });
  });
});
