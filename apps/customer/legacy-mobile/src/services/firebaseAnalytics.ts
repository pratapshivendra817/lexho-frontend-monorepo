type AnalyticsParams = Record<string, string | number | boolean | null | undefined>;

function normalizeParams(params?: AnalyticsParams) {
  if (!params) return undefined;
  return Object.entries(params).reduce<Record<string, string | number | boolean>>((acc, [key, value]) => {
    if (value === null || value === undefined) return acc;
    acc[key] = typeof value === "boolean" ? Number(value) : value;
    return acc;
  }, {});
}

function getAnalyticsModule(): any | null {
  try {
    return require("@react-native-firebase/analytics");
  } catch {
    return null;
  }
}

function getAnalyticsInstance() {
  const rnfbAnalytics = getAnalyticsModule();
  if (!rnfbAnalytics) return null;
  return rnfbAnalytics.getAnalytics ? rnfbAnalytics.getAnalytics() : rnfbAnalytics.default?.();
}

export async function trackAnalyticsEvent(name: string, params?: AnalyticsParams) {
  const eventName = String(name ?? "").trim();
  if (!eventName) return;
  try {
    const analytics = getAnalyticsInstance();
    if (!analytics) return;
    const rnfbAnalytics = getAnalyticsModule();
    const payload = normalizeParams(params);
    if (rnfbAnalytics?.logEvent) {
      await rnfbAnalytics.logEvent(analytics, eventName, payload);
      return;
    }
    await analytics.logEvent?.(eventName, payload);
  } catch {
    // Analytics must never block user flows.
  }
}

export async function setAnalyticsUser(userId?: string | number | null) {
  const normalizedUserId = String(userId ?? "").trim();
  try {
    const analytics = getAnalyticsInstance();
    if (!analytics) return;
    const rnfbAnalytics = getAnalyticsModule();
    if (rnfbAnalytics?.setUserId) {
      await rnfbAnalytics.setUserId(analytics, normalizedUserId || null);
      return;
    }
    await analytics.setUserId?.(normalizedUserId || null);
  } catch {
    // Best-effort identity binding.
  }
}

export async function trackScreenView(screenName: string) {
  const normalized = String(screenName ?? "").trim();
  if (!normalized) return;
  await trackAnalyticsEvent("screen_view", {
    screen_name: normalized,
    screen_class: normalized,
  });
}
