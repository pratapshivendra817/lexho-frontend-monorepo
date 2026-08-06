import { analyticsScreenTracked } from "../redux/analyticsSlice";
import { trackScreenView } from "./firebaseAnalytics";

const TRACKED_SCREENS = new Set([
  "Login",
  "Home",
  "ServiceList",
  "BookingDetail",
  "LiveTracking",
  "Payment",
  "Notifications",
  "Profile",
]);

let lastScreenName = "";

export async function trackNavigationScreen(screenName?: string | null, dispatch?: (action: unknown) => void) {
  const normalized = String(screenName ?? "").trim();
  if (!normalized || !TRACKED_SCREENS.has(normalized) || normalized === lastScreenName) {
    return;
  }
  lastScreenName = normalized;
  dispatch?.(analyticsScreenTracked(normalized));
  await trackScreenView(normalized);
}

export function getActiveRouteName(state: any): string {
  const route = state?.routes?.[state.index ?? 0];
  if (!route) return "";
  if (route.state) return getActiveRouteName(route.state);
  return String(route.name ?? "");
}

export function resetTrackedScreen() {
  lastScreenName = "";
}
