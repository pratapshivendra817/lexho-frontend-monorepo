type Params = Record<string, string | number>;
export async function trackCallEvent(name: "call_started" | "call_answered" | "call_rejected" | "call_missed" | "call_ended" | "call_duration", params: Params = {}) {
  try {
    const analyticsModule = require("@react-native-firebase/analytics");
    const instance = analyticsModule.getAnalytics ? analyticsModule.getAnalytics() : analyticsModule.default?.();
    if (analyticsModule.logEvent) await analyticsModule.logEvent(instance, name, params);
    else await instance?.logEvent?.(name, params);
  } catch { /* Analytics never blocks calling. */ }
}
