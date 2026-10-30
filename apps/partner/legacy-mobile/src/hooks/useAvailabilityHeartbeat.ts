import { useEffect } from "react";
import { AppState } from "react-native";
import { useAppSelector } from "./useRedux";
import { detectAndSyncCurrentLocation } from "../services/locationTrackingService";

// Keep availability alive on every screen, including while standing still.
export function useAvailabilityHeartbeat() {
  const online = useAppSelector((state) => state.partner.online);
  useEffect(() => {
    if (!online) return;
    let cancelled = false;
    let running = false;
    const refresh = async () => {
      if (cancelled || running) return;
      running = true;
      try {
        await detectAndSyncCurrentLocation(true);
      } catch {
        // Do not auto-force the partner offline here. The user should remain online
        // until they explicitly tap the toggle to go offline.
      } finally {
        running = false;
      }
    };
    const timer = setInterval(() => { void refresh(); }, 30000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => {
      cancelled = true;
      clearInterval(timer);
      subscription.remove();
    };
  }, [online]);
}
