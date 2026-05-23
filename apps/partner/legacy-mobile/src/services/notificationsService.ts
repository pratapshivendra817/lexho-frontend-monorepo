import API from "./api";
import { getOrCreateDeviceId } from "../utils/storage";
import { getApp } from "@react-native-firebase/app";
import {
  getMessaging,
  getToken,
  onTokenRefresh,
  registerDeviceForRemoteMessages,
  requestPermission,
} from "@react-native-firebase/messaging";

const APP_TYPE = "PARTNER";
const PLATFORM = "ANDROID";

export type PartnerNotificationItem = {
  id: string;
  title: string;
  message: string;
  createdAt?: string;
  read?: boolean;
};

export async function fetchNotifications(): Promise<PartnerNotificationItem[]> {
  let data: any;
  try {
    ({ data } = await API.get("/api/v1/partner/notifications", { params: { page: 0, size: 20 } }));
  } catch {
    ({ data } = await API.get("/api/notifications"));
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

  return rows.map((row: any) => ({
    id: String(row?.id ?? row?.notificationId ?? ""),
    title: String(row?.title ?? "Notification"),
    message: String(row?.message ?? row?.body ?? ""),
    createdAt: row?.createdAt ? String(row.createdAt) : undefined,
    read: typeof row?.read === "boolean" ? row.read : undefined,
  }));
}

async function registerDeviceToken(fcmToken: string) {
  const deviceId = await getOrCreateDeviceId();
  await API.post("/api/notifications/devices", {
    deviceId,
    fcmToken,
    platform: PLATFORM,
    appType: APP_TYPE,
  });
}

export async function unregisterDeviceToken() {
  const deviceId = await getOrCreateDeviceId();
  try {
    await API.delete(`/api/notifications/devices/${encodeURIComponent(deviceId)}`);
  } catch {
    // best-effort cleanup
  }
}

export async function initializePushNotifications() {
  try {
    const messaging = getMessaging(getApp());
    await requestPermission(messaging);
    await registerDeviceForRemoteMessages(messaging);
    const token = await getToken(messaging);
    if (token) {
      await registerDeviceToken(token);
    }
    onTokenRefresh(messaging, async (nextToken: string) => {
      if (!nextToken) return;
      await registerDeviceToken(nextToken);
    });
    return true;
  } catch {
    // Firebase module may be absent in some local builds.
    return false;
  }
}
