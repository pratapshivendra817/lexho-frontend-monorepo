import { ENABLE_FIREBASE_PUSH } from "../utils/constants";
import { api } from "../api/client";
import { getOrCreateDeviceId, getToken } from "../utils/storage";
import { PermissionsAndroid, Platform } from "react-native";

const APP_TYPE = "customer";
const PLATFORM = "android";
type PushCallbacks = {
  onForegroundMessage?: (payload: any) => void;
  onNotificationOpened?: (payload: any) => void;
};
let lastRegisteredDeviceTokenKey: string | null = null;
let listenersAttached = false;
let tokenRefreshUnsubscribe: (() => void) | null = null;

async function registerDeviceToken(fcmToken: string) {
  const sessionToken = await getToken();
  if (!sessionToken) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log("[push:register:skip-no-auth-token]");
    }
    return;
  }
  const deviceId = await getOrCreateDeviceId();
  const nextKey = `${deviceId}:${String(fcmToken ?? "").trim()}`;
  if (lastRegisteredDeviceTokenKey === nextKey) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log("[push:register:skip-duplicate]", { deviceId });
    }
    return;
  }
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log("[push:register:start]", { deviceId, hasToken: Boolean(fcmToken) });
  }
  await api.post("/api/notifications/devices", {
    deviceId,
    fcmToken,
    platform: PLATFORM,
    appType: APP_TYPE,
  });
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log("[push:register:success]", { deviceId });
  }
  lastRegisteredDeviceTokenKey = nextKey;
}

export async function unregisterDeviceToken() {
  const deviceId = await getOrCreateDeviceId();
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log("[push:unregister:start]", { deviceId });
  }
  try {
    await api.delete(`/api/notifications/devices/${encodeURIComponent(deviceId)}`);
    lastRegisteredDeviceTokenKey = null;
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log("[push:unregister:success]", { deviceId });
    }
  } catch {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log("[push:unregister:error]", { deviceId });
    }
    // best-effort cleanup on logout
  }
}

export async function initializePushNotifications() {
  if (!ENABLE_FIREBASE_PUSH) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log("[push:init:skipped]", { ENABLE_FIREBASE_PUSH });
    }
    return false;
  }

  try {
    if (Platform.OS === "android" && Platform.Version >= 33) {
      const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log("[push:android:post_notifications]", { result });
      }
    }
    // Use modular RNFirebase API (v22-compatible) while keeping dynamic import.
    const rnfbMessaging = require("@react-native-firebase/messaging");
    const messagingInstance = rnfbMessaging.getMessaging();
    await rnfbMessaging.requestPermission(messagingInstance);
    await rnfbMessaging.registerDeviceForRemoteMessages(messagingInstance);
    const token = await rnfbMessaging.getToken(messagingInstance);
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log("[push:init:fcm-token]", { hasToken: Boolean(token) });
    }
    if (token) {
      await registerDeviceToken(token);
    }
    tokenRefreshUnsubscribe?.();
    tokenRefreshUnsubscribe = rnfbMessaging.onTokenRefresh(messagingInstance, async (nextToken: string) => {
      if (!nextToken) return;
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log("[push:token-refresh:received]", { hasToken: Boolean(nextToken) });
      }
      await registerDeviceToken(nextToken);
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log("[push:token-refresh:register:done]");
      }
    });
    return true;
  } catch (e: any) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log("[push:init:error]", { message: String(e?.message ?? "unknown") });
    }
    return false;
  }
}

export async function setupPushNotificationListeners(callbacks?: PushCallbacks) {
  if (!ENABLE_FIREBASE_PUSH) {
    return () => {};
  }
  if (listenersAttached) {
    return () => {};
  }
  try {
    const rnfbMessaging = require("@react-native-firebase/messaging");
    const messagingInstance = rnfbMessaging.getMessaging();
    listenersAttached = true;
    const unsubscribeForeground = rnfbMessaging.onMessage(messagingInstance, async (remoteMessage: any) => {
      callbacks?.onForegroundMessage?.(remoteMessage);
    });
    const unsubscribeOpened = rnfbMessaging.onNotificationOpenedApp(messagingInstance, (remoteMessage: any) => {
      callbacks?.onNotificationOpened?.(remoteMessage);
    });
    const initial = await rnfbMessaging.getInitialNotification(messagingInstance);
    if (initial) {
      callbacks?.onNotificationOpened?.(initial);
    }
    return () => {
      try {
        unsubscribeForeground?.();
      } catch {
        // noop
      }
      try {
        unsubscribeOpened?.();
      } catch {
        // noop
      }
      listenersAttached = false;
    };
  } catch {
    listenersAttached = false;
    return () => {};
  }
}
