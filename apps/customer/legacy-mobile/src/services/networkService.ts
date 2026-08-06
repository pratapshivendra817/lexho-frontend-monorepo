import NetInfo from "@react-native-community/netinfo";
import type { Store } from "@reduxjs/toolkit";
import { offlineQueueSynced, offlineStatusChanged } from "../redux/offlineSlice";
import { offlineQueue } from "./offlineQueue";

let unsubscribe: (() => void) | null = null;
let online = true;

export function isNetworkError(error: unknown) {
  const code = String((error as any)?.code ?? "").toUpperCase();
  const status = Number((error as any)?.response?.status ?? 0);
  const message = String((error as any)?.message ?? "").toLowerCase();
  return (
    code === "ERR_NETWORK" ||
    code === "ECONNABORTED" ||
    status >= 500 ||
    message.includes("network error") ||
    message.includes("timeout")
  );
}

export const networkService = {
  isOnline() {
    return online;
  },

  async getCurrentState() {
    const state = await NetInfo.fetch();
    online = Boolean(state.isConnected && state.isInternetReachable !== false);
    return online;
  },

  start(store: Store) {
    if (unsubscribe) return unsubscribe;
    unsubscribe = NetInfo.addEventListener((state) => {
      online = Boolean(state.isConnected && state.isInternetReachable !== false);
      store.dispatch(
        offlineStatusChanged({
          isOffline: !online,
          serverUnavailable: false,
        }),
      );
      if (online) {
        void offlineQueue.flush().then((items) => {
          store.dispatch(offlineQueueSynced(items));
        });
      }
    });
    void offlineQueue.getItems().then((items) => {
      store.dispatch(offlineQueueSynced(items));
    });
    return unsubscribe;
  },

  stop() {
    unsubscribe?.();
    unsubscribe = null;
  },
};
