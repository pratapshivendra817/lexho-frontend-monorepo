import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import toast from "react-hot-toast";

import { api } from "@/api/axios";
import { appConfig } from "@/config";
import { getAccessToken, getOrCreateAdminDeviceId } from "@/utils/authSession";

let initialized = false;
let foregroundUnsubscribe: (() => void) | null = null;
const ADMIN_REGISTERED_FCM_TOKEN_KEY = "admin_registered_fcm_token";
type InitializeAdminPushNotificationsOptions = {
  interactive?: boolean;
};

function hasFirebaseConfig() {
  const config = appConfig.firebase;
  return Boolean(config.apiKey && config.projectId && config.messagingSenderId && config.appId && config.vapidKey);
}

function notificationPath(data: Record<string, unknown>) {
  const redirectType = String(data.redirectType ?? data.referenceType ?? data.notificationType ?? data.type ?? "").toUpperCase();
  const redirectValue = String(data.redirectValue ?? data.referenceId ?? data.notificationId ?? data.id ?? "").trim();
  const emergencyIncidentId = String(
    data.redirectValue ?? data.referenceId ?? data.eventId ?? data.incidentId ?? data.sosEventId ?? data.id ?? "",
  ).trim();

  if (redirectType === "PAYMENT" && redirectValue) return `/admin-payments?search=${encodeURIComponent(redirectValue)}`;
  if (redirectType === "BOOKING" && redirectValue) return `/bookings?search=${encodeURIComponent(redirectValue)}`;
  if (redirectType === "SUPPORT" || redirectType === "TICKET") return "/support";
  if (
    ["EMERGENCY", "EMERGENCY_SOS", "SOS", "SOS_INCIDENT"].includes(redirectType) &&
    emergencyIncidentId
  ) {
    return `/emergency-sos/${encodeURIComponent(emergencyIncidentId)}`;
  }
  if (redirectValue) return `/notifications/${encodeURIComponent(redirectValue)}`;
  return "/notifications";
}

async function registerAdminDeviceToken(fcmToken: string) {
  const cachedToken = localStorage.getItem(ADMIN_REGISTERED_FCM_TOKEN_KEY);
  if (cachedToken === fcmToken) {
    return;
  }

  const deviceId = getOrCreateAdminDeviceId();
  try {
    await api.post("/api/notifications/devices", {
      deviceId,
      fcmToken,
      platform: "web",
      appType: "ADMIN",
    });
    localStorage.setItem(ADMIN_REGISTERED_FCM_TOKEN_KEY, fcmToken);
  } catch (error: any) {
    if (error?.response?.status === 409) {
      localStorage.setItem(ADMIN_REGISTERED_FCM_TOKEN_KEY, fcmToken);
      return;
    }
    throw error;
  }
}

export async function initializeAdminPushNotifications(options?: InitializeAdminPushNotificationsOptions) {
  const interactive = options?.interactive ?? true;
  if (initialized) return true;
  if (!getAccessToken()) {
    if (!interactive) return false;
    throw new Error("Admin session token missing. Please login again.");
  }
  if (!hasFirebaseConfig()) {
    if (!interactive) return false;
    throw new Error("Firebase web push config is missing in admin .env.");
  }
  if (!("Notification" in window)) {
    if (!interactive) return false;
    throw new Error("This browser does not support notifications.");
  }
  if (!("serviceWorker" in navigator)) {
    if (!interactive) return false;
    throw new Error("This browser does not support service workers.");
  }
  if (!(await isSupported())) {
    if (!interactive) return false;
    throw new Error("Firebase messaging is not supported in this browser context.");
  }

  const currentPermission = Notification.permission;
  if (!interactive && currentPermission !== "granted") {
    return false;
  }
  const permission =
    currentPermission === "granted" ? currentPermission : await Notification.requestPermission();
  if (permission !== "granted") {
    if (!interactive) return false;
    throw new Error("Browser notification permission is not allowed.");
  }

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  registration.active?.postMessage({ type: "LEXHO_ADMIN_SW_READY" });

  const firebaseApp =
    getApps()[0] ??
    initializeApp({
      apiKey: appConfig.firebase.apiKey,
      authDomain: appConfig.firebase.authDomain,
      projectId: appConfig.firebase.projectId,
      storageBucket: appConfig.firebase.storageBucket,
      messagingSenderId: appConfig.firebase.messagingSenderId,
      appId: appConfig.firebase.appId,
    });

  const messaging = getMessaging(firebaseApp);
  const fcmToken = await getToken(messaging, {
    vapidKey: appConfig.firebase.vapidKey,
    serviceWorkerRegistration: registration,
  });
  if (!fcmToken) throw new Error("Firebase did not return an FCM token.");

  await registerAdminDeviceToken(fcmToken);
  foregroundUnsubscribe?.();
  foregroundUnsubscribe = onMessage(messaging, (payload) => {
    const title = String(payload.notification?.title ?? payload.data?.title ?? "New admin notification");
    const body = String(payload.notification?.body ?? payload.data?.message ?? payload.data?.body ?? "");
    const data = (payload.data ?? {}) as Record<string, unknown>;
    toast.success(body ? `${title}: ${body}` : title);
    if (Notification.permission === "granted") {
      const notification = new Notification(title, {
        body,
        data: { url: notificationPath(data) },
        tag: String(data.notificationId ?? data.id ?? title),
      });
      notification.onclick = () => {
        window.focus();
        window.location.assign(notificationPath(data));
      };
    }
  });

  initialized = true;
  return true;
}
