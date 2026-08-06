import { ENABLE_FIREBASE_PUSH } from "../utils/constants";
import { api } from "../api/client";
import { getOrCreateDeviceId, getToken } from "../utils/storage";
import { PermissionsAndroid, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { recordNonFatalError } from "./firebaseCrashlytics";
import { trackAnalyticsEvent } from "./firebaseAnalytics";
import { store } from "../redux/store";
import { notificationOpened, notificationReceived } from "../redux/notificationSlice";
import { trackNotificationClicked, trackNotificationReceived } from "./customerAnalyticsEvents";

const APP_TYPE = "CUSTOMER";
const PLATFORM = "android";
const REGISTERED_FCM_TOKEN_KEY = "@customer/registered-fcm-token";
type PushCallbacks = {
  onForegroundMessage?: (payload: any) => void;
  onNotificationOpened?: (payload: any) => void;
};
let lastRegisteredDeviceTokenKey: string | null = null;
let registeringDeviceTokenKey: string | null = null;
let listenersAttached = false;
let tokenRefreshUnsubscribe: (() => void) | null = null;

function getAuthenticatedCustomerId() {
  const id = String(store.getState()?.auth?.user?.id ?? "").trim();
  return id || undefined;
}

function normalizeNotificationPayload(remoteMessage: any, source?: "foreground" | "background" | "terminated") {
  const data = remoteMessage?.data ?? {};
  return {
    id: String(data?.notificationId ?? data?.id ?? "").trim() || undefined,
    bookingId: String(data?.bookingId ?? data?.booking_id ?? data?.referenceId ?? "").trim() || undefined,
    type: String(data?.redirectType ?? data?.referenceType ?? data?.type ?? "").trim().toUpperCase() || undefined,
    source,
    title: String(remoteMessage?.notification?.title ?? data?.title ?? "").trim() || undefined,
  };
}

async function registerDeviceToken(fcmToken: string) {
  const sessionToken = await getToken();
  if (!sessionToken) {
    return;
  }
  const deviceId = await getOrCreateDeviceId();
  const nextKey = `${deviceId}:${String(fcmToken ?? "").trim()}`;
  if (lastRegisteredDeviceTokenKey === nextKey || registeringDeviceTokenKey === nextKey) {
    return;
  }
  const customerId = getAuthenticatedCustomerId();
  registeringDeviceTokenKey = nextKey;
  try {
    try {
      await api.post(
        "/api/notifications/devices",
        {
          deviceId,
          fcmToken,
          platform: PLATFORM,
          appType: APP_TYPE,
          userType: APP_TYPE,
          targetUserType: APP_TYPE,
          userId: customerId,
          customerId,
        },
        { headers: { Authorization: `Bearer ${sessionToken}` } },
      );
    } catch (error: any) {
      if (error?.response?.status !== 409) {
        throw error;
      }
    }
    await trackAnalyticsEvent("fcm_token_registered", {
      app_type: APP_TYPE,
      platform: PLATFORM,
    });
    lastRegisteredDeviceTokenKey = nextKey;
    await AsyncStorage.setItem(REGISTERED_FCM_TOKEN_KEY, nextKey).catch(() => null);
  } finally {
    registeringDeviceTokenKey = null;
  }
}

export async function unregisterDeviceToken() {
  const deviceId = await getOrCreateDeviceId();
  try {
    await api.delete(`/api/notifications/devices/${encodeURIComponent(deviceId)}`);
    lastRegisteredDeviceTokenKey = null;
    registeringDeviceTokenKey = null;
    await AsyncStorage.removeItem(REGISTERED_FCM_TOKEN_KEY).catch(() => null);
  } catch {
    await recordNonFatalError(new Error("Unable to unregister FCM device token"), {
      area: "push",
      action: "unregister",
    });
    // best-effort cleanup on logout
  }
}

export async function initializePushNotifications() {
  if (!ENABLE_FIREBASE_PUSH) {
    return false;
  }

  try {
    if (Platform.OS === "android" && Platform.Version >= 33) {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }
    // Use modular RNFirebase API (v22-compatible) while keeping dynamic import.
    const rnfbMessaging = require("@react-native-firebase/messaging");
    const messagingInstance = rnfbMessaging.getMessaging();
    await rnfbMessaging.requestPermission(messagingInstance);
    await rnfbMessaging.registerDeviceForRemoteMessages(messagingInstance);
    const token = await rnfbMessaging.getToken(messagingInstance);
    if (token) {
      await registerDeviceToken(token);
    }
    tokenRefreshUnsubscribe?.();
    tokenRefreshUnsubscribe = rnfbMessaging.onTokenRefresh(messagingInstance, async (nextToken: string) => {
      try {
        if (!nextToken) return;
        await registerDeviceToken(nextToken);
      } catch (error) {
        await recordNonFatalError(error, {
          area: "push",
          action: "token_refresh_register",
        });
      }
    });
    return true;
  } catch (e: any) {
    await recordNonFatalError(e, {
      area: "push",
      action: "initialize",
    });
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
      const normalizedPayload = normalizeNotificationPayload(remoteMessage, "foreground");
      store.dispatch(notificationReceived(normalizedPayload));
      await trackNotificationReceived({
        notification_type: normalizedPayload.type,
        booking_id: normalizedPayload.bookingId,
        source: normalizedPayload.source,
      });
      await trackAnalyticsEvent("push_foreground_received", {
        redirect_type: String(remoteMessage?.data?.redirectType ?? remoteMessage?.data?.type ?? ""),
      });
      callbacks?.onForegroundMessage?.(remoteMessage);
    });
    const unsubscribeOpened = rnfbMessaging.onNotificationOpenedApp(messagingInstance, (remoteMessage: any) => {
      const normalizedPayload = normalizeNotificationPayload(remoteMessage, "background");
      store.dispatch(notificationOpened(normalizedPayload));
      void trackNotificationClicked({
        notification_type: normalizedPayload.type,
        booking_id: normalizedPayload.bookingId,
        source: normalizedPayload.source,
      });
      void trackAnalyticsEvent("push_opened", {
        source: "background",
        redirect_type: String(remoteMessage?.data?.redirectType ?? remoteMessage?.data?.type ?? ""),
      });
      callbacks?.onNotificationOpened?.(remoteMessage);
    });
    const initial = await rnfbMessaging.getInitialNotification(messagingInstance);
    if (initial) {
      const normalizedPayload = normalizeNotificationPayload(initial, "terminated");
      store.dispatch(notificationOpened(normalizedPayload));
      void trackNotificationClicked({
        notification_type: normalizedPayload.type,
        booking_id: normalizedPayload.bookingId,
        source: normalizedPayload.source,
      });
      void trackAnalyticsEvent("push_opened", {
        source: "terminated",
        redirect_type: String(initial?.data?.redirectType ?? initial?.data?.type ?? ""),
      });
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
  } catch (error) {
    await recordNonFatalError(error, {
      area: "push",
      action: "setup_listeners",
    });
    listenersAttached = false;
    return () => {};
  }
}
