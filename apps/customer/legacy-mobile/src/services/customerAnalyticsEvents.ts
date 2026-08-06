import { trackAnalyticsEvent } from "./firebaseAnalytics";
import { logCrashlyticsMessage, recordNonFatalError } from "./firebaseCrashlytics";

type AnalyticsValue = string | number | boolean | null | undefined;
type AnalyticsParams = Record<string, AnalyticsValue>;

function cleanParams(params: AnalyticsParams = {}) {
  return Object.entries(params).reduce<Record<string, string | number | boolean>>((acc, [key, value]) => {
    if (value === null || value === undefined || value === "") return acc;
    if (typeof value === "number" && !Number.isFinite(value)) return acc;
    acc[key] = value;
    return acc;
  }, {});
}

function track(name: string, params?: AnalyticsParams) {
  return trackAnalyticsEvent(name, cleanParams(params));
}

export function trackAppOpen(params?: AnalyticsParams) {
  return track("app_open", params);
}

export function trackUserLogin(params?: AnalyticsParams) {
  return track("login_success", params);
}

export function trackUserLoginFailed(params?: AnalyticsParams) {
  return track("login_failed", params);
}

export function trackUserRegistration(params?: AnalyticsParams) {
  return track("signup_success", params);
}

export function trackUserLogout(params?: AnalyticsParams) {
  return track("logout", params);
}

export function trackServiceViewed(params: AnalyticsParams) {
  return track("service_viewed", params);
}

export function trackServiceAddedToCart(params: AnalyticsParams) {
  return track("service_added_to_cart", params);
}

export function trackBookingCreated(params: AnalyticsParams) {
  void logCrashlyticsMessage(`booking_created ${JSON.stringify(cleanParams(params))}`);
  return track("booking_created", params);
}

export function trackPaymentInitiated(params: AnalyticsParams) {
  void logCrashlyticsMessage(`payment_started ${JSON.stringify(cleanParams(params))}`);
  return track("payment_started", params);
}

export function trackPaymentSuccess(params: AnalyticsParams) {
  return track("payment_success", params);
}

export function trackPaymentFailed(params: AnalyticsParams, error?: unknown) {
  if (error) {
    void recordNonFatalError(error, {
      area: "payment",
      ...cleanParams(params),
    });
  }
  return track("payment_failed", params);
}

export function trackSubscriptionPurchased(params: AnalyticsParams) {
  return track("subscription_purchased", params);
}

export function trackBookingCancelled(params: AnalyticsParams) {
  return track("booking_cancelled", params);
}

export function trackBookingRescheduled(params: AnalyticsParams) {
  return track("booking_rescheduled", params);
}

export function trackBookingCompleted(params: AnalyticsParams) {
  return track("booking_completed", params);
}

export function trackTrackPartnerClicked(params: AnalyticsParams) {
  return track("track_partner_clicked", params);
}

export function trackLiveTrackingOpened(params: AnalyticsParams) {
  return track("live_tracking_opened", params);
}

export function trackNotificationReceived(params: AnalyticsParams) {
  return track("notification_received", params);
}

export function trackNotificationClicked(params: AnalyticsParams) {
  return track("notification_clicked", params);
}

export function trackRefundRequested(params: AnalyticsParams) {
  return track("refund_request", params);
}

export function trackRefundCompleted(params: AnalyticsParams) {
  return track("refund_completed", params);
}

export function trackSubscriptionPaused(params: AnalyticsParams) {
  return track("subscription_paused", params);
}

export function trackSubscriptionCancelled(params: AnalyticsParams) {
  return track("subscription_cancelled", params);
}
