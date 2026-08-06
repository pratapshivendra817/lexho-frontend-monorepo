import AsyncStorage from "@react-native-async-storage/async-storage";

export const PARTNER_ANALYTICS_EVENTS = {
  loginSuccess: "login_success",
  loginFailed: "login_failed",
  logout: "logout",
  orderReceived: "order_received",
  orderAccepted: "order_accepted",
  orderRejected: "order_rejected",
  orderStarted: "order_started",
  orderCompleted: "order_completed",
  shiftStarted: "shift_started",
  shiftEnded: "shift_ended",
  partnerOnline: "partner_online",
  partnerOffline: "partner_offline",
  notificationReceived: "notification_received",
  notificationClicked: "notification_clicked",
  screenView: "screen_view",
  acceptanceRateUpdated: "acceptance_rate_updated",
  onlineHoursSynced: "online_hours_synced",
  securityBlocked: "security_blocked",
} as const;

const LAST_SCREEN_KEY = "partner_last_screen_tracked";

let lastTrackedScreenName = "";

function getAnalyticsInstance() {
  try {
    const analyticsModule = require("@react-native-firebase/analytics");
    if (analyticsModule.getAnalytics) {
      return analyticsModule.getAnalytics();
    }
    return analyticsModule.default?.();
  } catch {
    return null;
  }
}

async function logToFirebase(name: string, params?: Record<string, unknown>) {
  const instance = getAnalyticsInstance();
  if (!instance) return;
  if (typeof instance.logEvent === "function") {
    await instance.logEvent(name, params);
  }
}

export async function trackEvent(name: string, params?: Record<string, unknown>) {
  await logToFirebase(name, params);
}

export async function trackScreenView(screenName: string, screenClass = screenName) {
  const normalized = String(screenName ?? "").trim();
  if (!normalized || normalized === lastTrackedScreenName) return;
  lastTrackedScreenName = normalized;
  await AsyncStorage.setItem(LAST_SCREEN_KEY, normalized).catch(() => null);
  const instance = getAnalyticsInstance();
  if (!instance) return;
  if (typeof instance.logScreenView === "function") {
    await instance.logScreenView({ screen_name: normalized, screen_class: screenClass });
    return;
  }
  await logToFirebase(PARTNER_ANALYTICS_EVENTS.screenView, {
    screen_name: normalized,
    screen_class: screenClass,
  });
}

export async function identifyPartnerAnalytics(partnerId: string | null | undefined) {
  const normalized = partnerId == null ? "" : String(partnerId).trim();
  const instance = getAnalyticsInstance();
  if (!instance) return;
  if (typeof instance.setUserId === "function") {
    await instance.setUserId(normalized || null);
  }
  if (normalized && typeof instance.setUserProperty === "function") {
    await instance.setUserProperty("partner_id", normalized);
  }
}

export async function setAnalyticsUserProperty(name: string, value: string) {
  const instance = getAnalyticsInstance();
  if (!instance || typeof instance.setUserProperty !== "function") return;
  await instance.setUserProperty(name, value);
}

export async function trackAuthenticationEvent(success: boolean, params?: Record<string, unknown>) {
  await trackEvent(success ? PARTNER_ANALYTICS_EVENTS.loginSuccess : PARTNER_ANALYTICS_EVENTS.loginFailed, params);
}

