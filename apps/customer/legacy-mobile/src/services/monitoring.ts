import { trackAnalyticsEvent } from "./firebaseAnalytics";
import { logCrashlyticsMessage, recordNonFatalError } from "./firebaseCrashlytics";

type MonitoringContext = {
  screenName?: string;
  userAction?: string;
  apiEndpoint?: string;
  errorCode?: string;
  [key: string]: string | number | boolean | null | undefined;
};

function getSentry(): any | null {
  try {
    return require("@sentry/react-native");
  } catch {
    return null;
  }
}

function normalizeContext(context: MonitoringContext = {}) {
  return Object.entries(context).reduce<Record<string, string | number | boolean>>((acc, [key, value]) => {
    if (value === null || value === undefined || value === "") return acc;
    acc[key] = value;
    return acc;
  }, {});
}

export function captureFrontendError(error: unknown, context: MonitoringContext = {}) {
  const normalized = normalizeContext(context);
  void logCrashlyticsMessage("frontend_error", normalized);
  void recordNonFatalError(error, normalized);
  void trackAnalyticsEvent("frontend_error", normalized);
  try {
    const sentry = getSentry();
    sentry?.captureException?.(error instanceof Error ? error : new Error(String(error ?? "Unknown error")), {
      tags: {
        screen_name: String(context.screenName ?? ""),
        user_action: String(context.userAction ?? ""),
        api_endpoint: String(context.apiEndpoint ?? ""),
        error_code: String(context.errorCode ?? ""),
      },
      extra: normalized,
    });
  } catch {
    // Monitoring must never block the app.
  }
}

export function trackBusinessEvent(name: string, context: MonitoringContext = {}) {
  const normalized = normalizeContext(context);
  void trackAnalyticsEvent(name, normalized);
  void logCrashlyticsMessage(name, normalized);
}
