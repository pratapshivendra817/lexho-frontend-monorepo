import * as firebaseAnalytics from "../src/services/firebaseAnalytics";
import * as firebaseCrashlytics from "../src/services/firebaseCrashlytics";

import {
  trackAppOpen,
  trackBookingCancelled,
  trackBookingCreated,
  trackBookingRescheduled,
  trackPaymentFailed,
  trackPaymentInitiated,
  trackPaymentSuccess,
  trackServiceAddedToCart,
  trackServiceViewed,
  trackSubscriptionCancelled,
  trackSubscriptionPaused,
  trackSubscriptionPurchased,
  trackUserLogin,
  trackUserRegistration,
} from "../src/services/customerAnalyticsEvents";

describe("customerAnalyticsEvents", () => {
  const mockTrackAnalyticsEvent = jest.spyOn(
    firebaseAnalytics,
    "trackAnalyticsEvent",
  );
  const mockLogCrashlyticsMessage = jest.spyOn(
    firebaseCrashlytics,
    "logCrashlyticsMessage",
  );
  const mockRecordNonFatalError = jest.spyOn(
    firebaseCrashlytics,
    "recordNonFatalError",
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockTrackAnalyticsEvent.mockResolvedValue(undefined);
    mockLogCrashlyticsMessage.mockResolvedValue(undefined);
    mockRecordNonFatalError.mockResolvedValue(undefined);
  });

  it.each([
    ["trackAppOpen", trackAppOpen, "app_open"],
    ["trackUserLogin", trackUserLogin, "user_login"],
    ["trackUserRegistration", trackUserRegistration, "user_registration"],
    ["trackServiceViewed", trackServiceViewed, "service_viewed"],
    [
      "trackServiceAddedToCart",
      trackServiceAddedToCart,
      "service_added_to_cart",
    ],
    ["trackBookingCreated", trackBookingCreated, "booking_created"],
    ["trackPaymentInitiated", trackPaymentInitiated, "payment_started"],
    ["trackPaymentSuccess", trackPaymentSuccess, "payment_success"],
    ["trackPaymentFailed", trackPaymentFailed, "payment_failed"],
    [
      "trackSubscriptionPurchased",
      trackSubscriptionPurchased,
      "subscription_purchased",
    ],
    ["trackBookingCancelled", trackBookingCancelled, "booking_cancelled"],
    ["trackBookingRescheduled", trackBookingRescheduled, "booking_rescheduled"],
    ["trackSubscriptionPaused", trackSubscriptionPaused, "subscription_paused"],
    [
      "trackSubscriptionCancelled",
      trackSubscriptionCancelled,
      "subscription_cancelled",
    ],
  ])("%s sends the expected event name", async (_label, builder, eventName) => {
    const params = {
      id: "entity-1",
      amount: 499,
      active: true,
    };

    await expect(builder(params)).resolves.toBeUndefined();

    expect(mockTrackAnalyticsEvent).toHaveBeenCalledWith(eventName, params);
  });

  it("cleans null, undefined, empty, and non-finite values from payloads", async () => {
    await trackServiceViewed({
      service_id: "service-1",
      service_name: "Cleaning",
      price: 499,
      recurring: false,
      zero: 0,
      empty: "",
      nullValue: null,
      missingValue: undefined,
      nan: Number.NaN,
      positiveInfinity: Number.POSITIVE_INFINITY,
      negativeInfinity: Number.NEGATIVE_INFINITY,
    });

    expect(mockTrackAnalyticsEvent).toHaveBeenCalledWith("service_viewed", {
      service_id: "service-1",
      service_name: "Cleaning",
      price: 499,
      recurring: false,
      zero: 0,
    });
  });

  it.each([
    ["omitted", undefined],
    ["empty object", {}],
  ])("supports %s optional parameters", async (_label, params) => {
    await trackAppOpen(params);
    await trackUserLogin(params);
    await trackUserRegistration(params);

    expect(mockTrackAnalyticsEvent).toHaveBeenNthCalledWith(1, "app_open", {});
    expect(mockTrackAnalyticsEvent).toHaveBeenNthCalledWith(
      2,
      "user_login",
      {},
    );
    expect(mockTrackAnalyticsEvent).toHaveBeenNthCalledWith(
      3,
      "user_registration",
      {},
    );
  });

  it("returns the analytics promise from every event builder", async () => {
    const result = { accepted: true };
    mockTrackAnalyticsEvent.mockResolvedValueOnce(result as any);

    await expect(
      trackSubscriptionPurchased({ subscription_id: "sub-1" }),
    ).resolves.toBe(result);
  });

  it("propagates analytics rejections to the caller", async () => {
    mockTrackAnalyticsEvent.mockRejectedValueOnce(
      new Error("analytics unavailable"),
    );

    await expect(
      trackBookingCancelled({ booking_id: "booking-1" }),
    ).rejects.toThrow("analytics unavailable");
  });

  it("creates a cleaned Crashlytics breadcrumb for booking creation", async () => {
    await trackBookingCreated({
      booking_id: "booking-2",
      amount: 750,
      prepaid: true,
      empty: "",
      invalid: Number.NaN,
      nullValue: null,
    });

    expect(mockLogCrashlyticsMessage).toHaveBeenCalledWith(
      'booking_created {"booking_id":"booking-2","amount":750,"prepaid":true}',
    );
    expect(mockTrackAnalyticsEvent).toHaveBeenCalledWith("booking_created", {
      booking_id: "booking-2",
      amount: 750,
      prepaid: true,
    });
  });

  it("creates a cleaned Crashlytics breadcrumb for payment initiation", async () => {
    await trackPaymentInitiated({
      booking_id: "booking-3",
      order_id: "order-3",
      amount: 999,
      method: "upi",
      empty: "",
      invalid: Number.POSITIVE_INFINITY,
    });

    expect(mockLogCrashlyticsMessage).toHaveBeenCalledWith(
      'payment_started {"booking_id":"booking-3","order_id":"order-3","amount":999,"method":"upi"}',
    );
    expect(mockTrackAnalyticsEvent).toHaveBeenCalledWith("payment_started", {
      booking_id: "booking-3",
      order_id: "order-3",
      amount: 999,
      method: "upi",
    });
  });

  it("records payment failures with the payment area and cleaned attributes", async () => {
    const error = new Error("Payment declined");

    await trackPaymentFailed(
      {
        booking_id: "booking-4",
        order_id: "order-4",
        amount: 400,
        retry_count: 0,
        recoverable: false,
        empty: "",
        invalid: Number.NaN,
        nullValue: null,
      },
      error,
    );

    expect(mockRecordNonFatalError).toHaveBeenCalledWith(error, {
      area: "payment",
      booking_id: "booking-4",
      order_id: "order-4",
      amount: 400,
      retry_count: 0,
      recoverable: false,
    });
    expect(mockTrackAnalyticsEvent).toHaveBeenCalledWith("payment_failed", {
      booking_id: "booking-4",
      order_id: "order-4",
      amount: 400,
      retry_count: 0,
      recoverable: false,
    });
  });

  it.each([
    ["omitted", undefined],
    ["null", null],
    ["false", false],
    ["zero", 0],
    ["empty string", ""],
  ])("does not record a non-fatal error for a %s error", async (_label, error) => {
    await trackPaymentFailed({ booking_id: "booking-5" }, error);

    expect(mockRecordNonFatalError).not.toHaveBeenCalled();
    expect(mockTrackAnalyticsEvent).toHaveBeenCalledWith("payment_failed", {
      booking_id: "booking-5",
    });
  });

  it("reports truthy non-Error payment failures unchanged", async () => {
    const failure = { code: "PAYMENT_FAILED", reason: "declined" };

    await trackPaymentFailed({ booking_id: "booking-6" }, failure);

    expect(mockRecordNonFatalError).toHaveBeenCalledWith(failure, {
      area: "payment",
      booking_id: "booking-6",
    });
  });

});
