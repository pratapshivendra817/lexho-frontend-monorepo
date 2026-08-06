import { trackAnalyticsEvent } from "../../../services/firebaseAnalytics";
export const trackCallEvent = (name: "call_started" | "call_answered" | "call_rejected" | "call_missed" | "call_ended" | "call_duration", params: Record<string, string | number> = {}) => trackAnalyticsEvent(name, params);
