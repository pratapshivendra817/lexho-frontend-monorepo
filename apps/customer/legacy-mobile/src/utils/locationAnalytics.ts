import { trackAnalyticsEvent } from "../services/firebaseAnalytics";
import { recordNonFatalError } from "../services/firebaseCrashlytics";

type LocationAnalyticsEvent =
  | "gps_success"
  | "gps_timeout"
  | "gps_weak"
  | "gps_mock_detected"
  | "gps_permission_denied"
  | "manual_pin_selected"
  | "serviceability_failure"
  | "reverse_geocode_failure";

function normalizePayload(payload?: Record<string, unknown>) {
  if (!payload) return undefined;
  return Object.entries(payload).reduce<Record<string, string | number | boolean>>((acc, [key, value]) => {
    if (value === null || value === undefined) return acc;
    if (["string", "number", "boolean"].includes(typeof value)) {
      acc[key] = value as string | number | boolean;
    } else {
      acc[key] = JSON.stringify(value);
    }
    return acc;
  }, {});
}

export function trackLocationEvent(event: LocationAnalyticsEvent, payload?: Record<string, unknown>) {
  const normalizedPayload = normalizePayload(payload);
  void trackAnalyticsEvent(`location_${event}`, normalizedPayload);
  if (event.endsWith("_failure") || event.includes("denied") || event.includes("timeout")) {
    void recordNonFatalError(new Error(`Location event: ${event}`), {
      area: "location",
      event,
      ...(normalizedPayload ?? {}),
    });
  }
}
