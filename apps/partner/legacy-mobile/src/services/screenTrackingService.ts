import { createNavigationContainerRef } from "@react-navigation/native";

import { trackScreenView } from "./firebaseAnalytics";

export const navigationTrackingRef = createNavigationContainerRef();

let lastRouteName = "";

function getActiveRouteName(state: any): string {
  const route = state?.routes?.[state.index ?? 0];
  if (!route) return "";
  if (route.state) return getActiveRouteName(route.state);
  return String(route.name ?? "");
}

export async function handleNavigationStateChange() {
  if (!navigationTrackingRef.isReady()) return;
  const rootState = navigationTrackingRef.getRootState();
  const currentRouteName = getActiveRouteName(rootState);
  if (!currentRouteName || currentRouteName === lastRouteName) return;
  lastRouteName = currentRouteName;
  await trackScreenView(currentRouteName);
}

