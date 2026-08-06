import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  postMock: vi.fn(),
  getAppsMock: vi.fn(),
  initializeAppMock: vi.fn(),
  getMessagingMock: vi.fn(),
  getTokenMock: vi.fn(),
  isSupportedMock: vi.fn(),
  onMessageMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  getAccessTokenMock: vi.fn(),
  getOrCreateAdminDeviceIdMock: vi.fn(),
  appConfig: {
    firebase: {
      apiKey: "api-key",
      authDomain: "auth.lexho.test",
      projectId: "lexho-test",
      storageBucket: "bucket.lexho.test",
      messagingSenderId: "sender-1",
      appId: "app-1",
      vapidKey: "vapid-1",
    },
  },
}));

vi.mock("@/api/axios", () => ({
  api: {
    post: mocks.postMock,
  },
}));

vi.mock("@/config", () => ({
  appConfig: mocks.appConfig,
}));

vi.mock("@/utils/authSession", () => ({
  getAccessToken: mocks.getAccessTokenMock,
  getOrCreateAdminDeviceId: mocks.getOrCreateAdminDeviceIdMock,
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: mocks.toastSuccessMock,
  },
}));

vi.mock("firebase/app", () => ({
  getApps: mocks.getAppsMock,
  initializeApp: mocks.initializeAppMock,
}));

vi.mock("firebase/messaging", () => ({
  getMessaging: mocks.getMessagingMock,
  getToken: mocks.getTokenMock,
  isSupported: mocks.isSupportedMock,
  onMessage: mocks.onMessageMock,
}));

type NotificationMockInstance = {
  title: string;
  options: NotificationOptions;
  onclick: null | (() => void);
};

function installNotificationMock(permission = "granted") {
  const instances: NotificationMockInstance[] = [];
  const NotificationMock = vi.fn(function (this: NotificationMockInstance, title: string, options: NotificationOptions) {
    this.title = title;
    this.options = options;
    this.onclick = null;
    instances.push(this);
  }) as unknown as typeof Notification & { instances: NotificationMockInstance[]; requestPermission: ReturnType<typeof vi.fn> };

  Object.assign(NotificationMock, {
    permission,
    requestPermission: vi.fn().mockResolvedValue(permission),
    instances,
  });

  Object.defineProperty(window, "Notification", {
    configurable: true,
    value: NotificationMock,
  });

  return NotificationMock;
}

function installServiceWorkerMock() {
  const registration = {
    active: {
      postMessage: vi.fn(),
    },
  };
  const register = vi.fn().mockResolvedValue(registration);

  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { register },
  });

  return { registration, register };
}

async function loadModule() {
  return import("@/services/adminPushNotifications");
}

describe("adminPushNotifications", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    localStorage.clear();

    mocks.getAccessTokenMock.mockReturnValue("token-1");
    mocks.getOrCreateAdminDeviceIdMock.mockReturnValue("admin-device-1");
    mocks.getAppsMock.mockReturnValue([]);
    mocks.initializeAppMock.mockReturnValue({ name: "firebase-app" });
    mocks.getMessagingMock.mockReturnValue({ name: "messaging" });
    mocks.getTokenMock.mockResolvedValue("fcm-token-1");
    mocks.isSupportedMock.mockResolvedValue(true);
    mocks.postMock.mockResolvedValue({});
    mocks.onMessageMock.mockImplementation((_messaging, callback) => {
      (mocks.onMessageMock as unknown as { callback?: (payload: Record<string, unknown>) => void }).callback = callback;
      return vi.fn();
    });

    mocks.appConfig.firebase = {
      apiKey: "api-key",
      authDomain: "auth.lexho.test",
      projectId: "lexho-test",
      storageBucket: "bucket.lexho.test",
      messagingSenderId: "sender-1",
      appId: "app-1",
      vapidKey: "vapid-1",
    };

    installNotificationMock("granted");
    installServiceWorkerMock();
    vi.stubGlobal("focus", vi.fn());
    Object.defineProperty(window, "focus", {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        origin: "http://admin.lexho.test",
        assign: vi.fn(),
      },
    });
  });

  it("initializes push notifications, registers the device token, and handles foreground messages", async () => {
    const unsubscribe = vi.fn();
    mocks.onMessageMock.mockImplementation((_messaging, callback) => {
      (mocks.onMessageMock as unknown as { callback?: (payload: Record<string, unknown>) => void }).callback = callback;
      return unsubscribe;
    });

    const { initializeAdminPushNotifications } = await loadModule();

    await expect(initializeAdminPushNotifications()).resolves.toBe(true);

    expect(mocks.initializeAppMock).toHaveBeenCalledWith({
      apiKey: "api-key",
      authDomain: "auth.lexho.test",
      projectId: "lexho-test",
      storageBucket: "bucket.lexho.test",
      messagingSenderId: "sender-1",
      appId: "app-1",
    });
    expect(mocks.getTokenMock).toHaveBeenCalledWith(
      { name: "messaging" },
      expect.objectContaining({
        vapidKey: "vapid-1",
      }),
    );
    expect(mocks.postMock).toHaveBeenCalledWith("/api/notifications/devices", {
      deviceId: "admin-device-1",
      fcmToken: "fcm-token-1",
      platform: "web",
      appType: "ADMIN",
    });
    expect(localStorage.getItem("admin_registered_fcm_token")).toBe("fcm-token-1");

    const callback = (mocks.onMessageMock as unknown as { callback?: (payload: Record<string, unknown>) => void }).callback;
    callback?.({
      notification: { title: "Booking update", body: "Partner arrived" },
      data: { redirectType: "BOOKING", redirectValue: "BK-1", notificationId: "notif-1" },
    });

    expect(mocks.toastSuccessMock).toHaveBeenCalledWith("Booking update: Partner arrived");
    const notificationMock = window.Notification as unknown as { instances: NotificationMockInstance[] };
    expect(notificationMock.instances[0]?.options.data).toEqual({ url: "/bookings?search=BK-1" });

    notificationMock.instances[0]?.onclick?.();
    expect(window.focus).toHaveBeenCalled();
    expect(window.location.assign).toHaveBeenCalledWith("/bookings?search=BK-1");

    await expect(initializeAdminPushNotifications()).resolves.toBe(true);
    expect(mocks.postMock).toHaveBeenCalledTimes(1);
    expect(unsubscribe).not.toHaveBeenCalled();
  });

  it("returns false during non-interactive bootstrap when permission has not already been granted", async () => {
    installNotificationMock("default");

    const { initializeAdminPushNotifications } = await loadModule();
    await expect(initializeAdminPushNotifications({ interactive: false })).resolves.toBe(false);

    expect(mocks.getTokenMock).not.toHaveBeenCalled();
    const notificationMock = window.Notification as unknown as { requestPermission: ReturnType<typeof vi.fn> };
    expect(notificationMock.requestPermission).not.toHaveBeenCalled();
  });

  it("reuses an existing firebase app and skips device registration for cached tokens", async () => {
    localStorage.setItem("admin_registered_fcm_token", "fcm-token-1");
    mocks.getAppsMock.mockReturnValue([{ name: "existing-app" }]);

    const { initializeAdminPushNotifications } = await loadModule();
    await initializeAdminPushNotifications();

    expect(mocks.initializeAppMock).not.toHaveBeenCalled();
    expect(mocks.getMessagingMock).toHaveBeenCalledWith({ name: "existing-app" });
    expect(mocks.postMock).not.toHaveBeenCalled();
  });

  it("treats 409 registration conflicts as success", async () => {
    mocks.postMock.mockRejectedValue(createPushError(409));

    const { initializeAdminPushNotifications } = await loadModule();
    await expect(initializeAdminPushNotifications()).resolves.toBe(true);

    expect(localStorage.getItem("admin_registered_fcm_token")).toBe("fcm-token-1");
  });

  it.each([
    ["missing admin token", () => mocks.getAccessTokenMock.mockReturnValue(""), "Admin session token missing. Please login again."],
    [
      "missing firebase config",
      () => {
        mocks.appConfig.firebase = {
          apiKey: "",
          authDomain: "",
          projectId: "",
          storageBucket: "",
          messagingSenderId: "",
          appId: "",
          vapidKey: "",
        };
      },
      "Firebase web push config is missing in admin .env.",
    ],
    [
      "unsupported messaging context",
      () => mocks.isSupportedMock.mockResolvedValue(false),
      "Firebase messaging is not supported in this browser context.",
    ],
    [
      "permission denied",
      () => installNotificationMock("denied"),
      "Browser notification permission is not allowed.",
    ],
  ])("rejects initialization for %s", async (_label, arrange, message) => {
    arrange();
    const { initializeAdminPushNotifications } = await loadModule();

    await expect(initializeAdminPushNotifications()).rejects.toThrow(message);
  });

  it("rejects when Notification support is unavailable", async () => {
    delete (window as Window & { Notification?: unknown }).Notification;

    const { initializeAdminPushNotifications } = await loadModule();
    await expect(initializeAdminPushNotifications()).rejects.toThrow("This browser does not support notifications.");
  });

  it("rejects when service workers are unavailable", async () => {
    delete (navigator as Navigator & { serviceWorker?: unknown }).serviceWorker;

    const { initializeAdminPushNotifications } = await loadModule();
    await expect(initializeAdminPushNotifications()).rejects.toThrow("This browser does not support service workers.");
  });

  it.each([
    ["missing token", () => mocks.getTokenMock.mockResolvedValue(""), "Firebase did not return an FCM token."],
    ["network error", () => mocks.postMock.mockRejectedValue(new Error("network failed")), "network failed"],
    ["timeout", () => mocks.postMock.mockRejectedValue(new Error("timeout exceeded")), "timeout exceeded"],
  ])("surfaces %s during setup", async (_label, arrange, message) => {
    arrange();
    const { initializeAdminPushNotifications } = await loadModule();

    await expect(initializeAdminPushNotifications()).rejects.toThrow(message);
  });

  it("uses default foreground values and routes support notifications correctly", async () => {
    const { initializeAdminPushNotifications } = await loadModule();
    await initializeAdminPushNotifications();

    const callback = (mocks.onMessageMock as unknown as { callback?: (payload: Record<string, unknown>) => void }).callback;
    callback?.({
      data: { redirectType: "support" },
    });

    expect(mocks.toastSuccessMock).toHaveBeenCalledWith("New admin notification");
    const notificationMock = window.Notification as unknown as { instances: NotificationMockInstance[] };
    expect(notificationMock.instances[0]?.title).toBe("New admin notification");
    expect(notificationMock.instances[0]?.options.data).toEqual({ url: "/support" });
  });

  it("routes fallback notification paths for id-only and empty payload messages", async () => {
    const { initializeAdminPushNotifications } = await loadModule();
    await initializeAdminPushNotifications();

    const callback = (mocks.onMessageMock as unknown as { callback?: (payload: Record<string, unknown>) => void }).callback;
    callback?.({
      data: { id: "note-42" },
    });
    callback?.({
      data: {},
    });

    const notificationMock = window.Notification as unknown as { instances: NotificationMockInstance[] };
    expect(notificationMock.instances[0]?.options.data).toEqual({ url: "/notifications/note-42" });
    expect(notificationMock.instances[1]?.options.data).toEqual({ url: "/notifications" });
  });

  it("routes emergency sos notifications to the incident details page", async () => {
    const { initializeAdminPushNotifications } = await loadModule();
    await initializeAdminPushNotifications();

    const callback = (mocks.onMessageMock as unknown as { callback?: (payload: Record<string, unknown>) => void }).callback;
    callback?.({
      notification: { title: "Emergency SOS", body: "Admin action required" },
      data: { redirectType: "EMERGENCY_SOS", eventId: "evt-77", notificationId: "notif-77" },
    });

    const notificationMock = window.Notification as unknown as { instances: NotificationMockInstance[] };
    expect(notificationMock.instances[0]?.options.data).toEqual({ url: "/emergency-sos/evt-77" });

    notificationMock.instances[0]?.onclick?.();
    expect(window.location.assign).toHaveBeenCalledWith("/emergency-sos/evt-77");
  });

  it("falls back to notification detail routes and skips browser notifications when permission is not granted at display time", async () => {
    const notificationMock = installNotificationMock("granted");
    const { initializeAdminPushNotifications } = await loadModule();
    await initializeAdminPushNotifications();

    Object.assign(notificationMock, { permission: "default" });
    const callback = (mocks.onMessageMock as unknown as { callback?: (payload: Record<string, unknown>) => void }).callback;
    callback?.({
      data: { id: "note-99" },
    });

    expect(mocks.toastSuccessMock).toHaveBeenCalledWith("New admin notification");
    expect(notificationMock.instances).toHaveLength(0);
  });
});

function createPushError(status: number) {
  return {
    response: {
      status,
    },
  };
}
