import API from "./api";
import { getOrCreateDeviceId, getPartnerProviderId, getToken as getSessionToken } from "../utils/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PermissionsAndroid, Platform } from "react-native";
import { getApp } from "@react-native-firebase/app";
import {
  getMessaging,
  getToken as getMessagingToken,
  getInitialNotification,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  registerDeviceForRemoteMessages,
  requestPermission,
} from "@react-native-firebase/messaging";
import { logNotificationFailure } from "./crashlyticsService";
import { PARTNER_ANALYTICS_EVENTS, trackEvent } from "./firebaseAnalytics";
import { getPartnerWarnings } from "./partnerService";

const PLATFORM = "android";
const APP_TYPE = "PARTNER";
const REGISTERED_FCM_TOKEN_KEY = "partner_registered_fcm_token";
const READ_WARNING_NOTIFICATIONS_KEY = "partner_read_warning_notifications";
const DEFAULT_WARNING_NOTIFICATION_TITLE = "New Warning Issued";
const DEFAULT_WARNING_NOTIFICATION_MESSAGE = "A new warning has been issued to your account. Tap to view the details.";
type PushCallbacks = {
  onForegroundMessage?: (payload: any) => void;
  onNotificationOpened?: (payload: any) => void;
};
let tokenRefreshUnsubscribe: (() => void) | null = null;
let listenersAttached = false;
let lastRegisteredDeviceTokenKey: string | null = null;

export type PartnerNotificationItem = {
  id: string;
  title: string;
  message: string;
  createdAt?: string;
  read?: boolean;
  source?: "system" | "warning";
  redirectType?: string;
  redirectValue?: string;
  warningId?: string;
};

async function getReadWarningIds(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(READ_WARNING_NOTIFICATIONS_KEY).catch(() => null);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((item) => String(item)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

async function saveReadWarningIds(ids: string[]) {
  await AsyncStorage.setItem(READ_WARNING_NOTIFICATIONS_KEY, JSON.stringify(ids.slice(-100))).catch(() => null);
}

function buildWarningNotificationTitle(row: { notificationTitle?: string }) {
  const title = String(row.notificationTitle ?? "").trim();
  return title || DEFAULT_WARNING_NOTIFICATION_TITLE;
}

function buildWarningNotificationMessage(row: { notificationMessage?: string }) {
  const message = String(row.notificationMessage ?? "").trim();
  return message || DEFAULT_WARNING_NOTIFICATION_MESSAGE;
}

export async function fetchNotifications(): Promise<PartnerNotificationItem[]> {
  let data: any;
  try {
    ({ data } = await API.get("/api/v1/partner/notifications", { params: { page: 0, size: 20 } }));
  } catch {
    try {
      ({ data } = await API.get("/api/provider/notifications", { params: { page: 0, size: 20 } }));
    } catch {
      ({ data } = await API.get("/api/notifications"));
    }
  }
  const root = data?.data && typeof data.data === "object" ? data.data : data;
  const rows = Array.isArray(root?.content)
    ? root.content
    : Array.isArray(root?.items)
      ? root.items
      : Array.isArray(root?.notifications)
        ? root.notifications
        : Array.isArray(data)
          ? data
          : [];

  const notifications = rows.map((row: any) => ({
    id: String(row?.id ?? row?.notificationId ?? ""),
    title: String(row?.title ?? "Notification"),
    message: String(row?.message ?? row?.body ?? ""),
    createdAt: row?.createdAt ? String(row.createdAt) : undefined,
    read: typeof row?.read === "boolean" ? row.read : undefined,
    source: "system" as const,
    redirectType: row?.redirectType != null ? String(row.redirectType).toUpperCase() : row?.referenceType != null ? String(row.referenceType).toUpperCase() : row?.notificationType != null ? String(row.notificationType).toUpperCase() : undefined,
    redirectValue: row?.redirectValue != null ? String(row.redirectValue) : row?.referenceId != null ? String(row.referenceId) : row?.orderId != null ? String(row.orderId) : row?.bookingId != null ? String(row.bookingId) : undefined,
    warningId: row?.warningId != null ? String(row.warningId) : undefined,
  }));

  const [warnings, readWarningIds] = await Promise.all([
    getPartnerWarnings().catch(() => []),
    getReadWarningIds(),
  ]);

  const warningNotifications = warnings.map((warning) => ({
    id: `warning:${warning.id}`,
    title: buildWarningNotificationTitle(warning),
    message: buildWarningNotificationMessage(warning),
    createdAt: warning.createdAt,
    read: readWarningIds.includes(String(warning.id)),
    source: "warning" as const,
    redirectType: "WARNING",
    redirectValue: String(warning.id),
    warningId: String(warning.id),
  }));

  return [...warningNotifications, ...notifications].sort((left, right) => {
    const leftTime = left.createdAt ? Date.parse(left.createdAt) : 0;
    const rightTime = right.createdAt ? Date.parse(right.createdAt) : 0;
    return rightTime - leftTime;
  });
}

export async function markNotificationRead(id: string) {
  await API.patch(`/api/v1/partner/notifications/${encodeURIComponent(id)}/read`);
}

export async function markWarningNotificationRead(id: string) {
  const nextId = String(id).trim();
  if (!nextId) return;
  const existing = await getReadWarningIds();
  if (existing.includes(nextId)) return;
  await saveReadWarningIds([...existing, nextId]);
}

export async function deleteNotification(id: string) {
  await API.delete(`/api/provider/notifications/${encodeURIComponent(id)}`);
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const { data } = await API.get("/api/v1/partner/notifications/unread-count");
  const root = data?.data ?? data ?? {};
  const value = root?.unreadCount ?? root?.count ?? 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function registerDeviceToken(fcmToken: string) {
  const sessionToken = await getSessionToken();
  if (!sessionToken) {
    return;
  }
  const deviceId = await getOrCreateDeviceId();
  const partnerId = await getPartnerProviderId();
  const nextKey = `${deviceId}:${String(fcmToken ?? "").trim()}`;
  const storedRegisteredKey = await AsyncStorage.getItem(REGISTERED_FCM_TOKEN_KEY).catch(() => null);
  if (lastRegisteredDeviceTokenKey === nextKey || storedRegisteredKey === nextKey) {
    return;
  }
  try {
    await API.post(
      "/api/notifications/devices",
      {
        deviceId,
        fcmToken,
        platform: PLATFORM,
        appType: APP_TYPE,
        userType: APP_TYPE,
        targetUserType: APP_TYPE,
        userId: partnerId ?? undefined,
        partnerId: partnerId ?? undefined,
        providerId: partnerId ?? undefined,
      },
      { headers: { Authorization: `Bearer ${sessionToken}` } },
    );
  } catch (error: any) {
    if (error?.response?.status !== 409) {
      throw error;
    }
  }
  lastRegisteredDeviceTokenKey = nextKey;
  await AsyncStorage.setItem(REGISTERED_FCM_TOKEN_KEY, nextKey).catch(() => null);
}

export async function unregisterDeviceToken() {
  tokenRefreshUnsubscribe?.();
  tokenRefreshUnsubscribe = null;
  try {
    const deviceId = await getOrCreateDeviceId();
    const storedRegisteredKey = await AsyncStorage.getItem(REGISTERED_FCM_TOKEN_KEY).catch(() => null);
    if (storedRegisteredKey || lastRegisteredDeviceTokenKey) {
      await API.delete(`/api/notifications/devices/${encodeURIComponent(deviceId)}`);
    }
    lastRegisteredDeviceTokenKey = null;
    await AsyncStorage.removeItem(REGISTERED_FCM_TOKEN_KEY).catch(() => null);
  } catch {
    // best-effort cleanup
  }
}

export async function initializePushNotifications() {
  try {
    if (Platform.OS === "android" && Platform.Version >= 33) {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }
    const messaging = getMessaging(getApp());
    await requestPermission(messaging);
    await registerDeviceForRemoteMessages(messaging);
    const token = await getMessagingToken(messaging);
    if (token) {
      await registerDeviceToken(token);
    }
    tokenRefreshUnsubscribe?.();
    tokenRefreshUnsubscribe = onTokenRefresh(messaging, async (nextToken: string) => {
      if (!nextToken) return;
      await registerDeviceToken(nextToken);
    });
    return true;
  } catch (error) {
    await logNotificationFailure(error);
    // Firebase module may be absent in some local builds.
    return false;
  }
}

export async function setupPushNotificationListeners(callbacks?: PushCallbacks) {
  if (listenersAttached) {
    return () => {};
  }
  try {
    const messaging = getMessaging(getApp());
    listenersAttached = true;
    const unsubscribeForeground = onMessage(messaging, async (remoteMessage: any) => {
      await trackEvent(PARTNER_ANALYTICS_EVENTS.notificationReceived, {
        type: remoteMessage?.data?.type ?? remoteMessage?.data?.redirectType ?? "unknown",
      });
      callbacks?.onForegroundMessage?.(remoteMessage);
    });
    const unsubscribeOpened = onNotificationOpenedApp(messaging, (remoteMessage: any) => {
      void trackEvent(PARTNER_ANALYTICS_EVENTS.notificationClicked, {
        type: remoteMessage?.data?.type ?? remoteMessage?.data?.redirectType ?? "unknown",
      });
      callbacks?.onNotificationOpened?.(remoteMessage);
    });
    const initial = await getInitialNotification(messaging);
    if (initial) {
      await trackEvent(PARTNER_ANALYTICS_EVENTS.notificationClicked, {
        type: initial?.data?.type ?? initial?.data?.redirectType ?? "unknown",
      });
      callbacks?.onNotificationOpened?.(initial);
    }

    return () => {
      unsubscribeForeground?.();
      unsubscribeOpened?.();
      listenersAttached = false;
    };
  } catch (error) {
    await logNotificationFailure(error);
    listenersAttached = false;
    return () => {};
  }
}
