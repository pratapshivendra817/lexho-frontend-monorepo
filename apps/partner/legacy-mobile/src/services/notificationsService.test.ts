jest.mock("./api", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock("../utils/storage", () => ({
  getOrCreateDeviceId: jest.fn(),
  getPartnerProviderId: jest.fn(),
  getToken: jest.fn(),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock("react-native", () => ({
  PermissionsAndroid: {
    PERMISSIONS: {
      POST_NOTIFICATIONS: "POST_NOTIFICATIONS",
    },
    request: jest.fn(),
  },
  Platform: {
    OS: "android",
    Version: 34,
  },
}));

jest.mock("@react-native-firebase/app", () => ({
  getApp: jest.fn(() => ({ name: "partner-app" })),
}));

jest.mock("@react-native-firebase/messaging", () => ({
  getMessaging: jest.fn(() => ({ messaging: true })),
  getToken: jest.fn(),
  getInitialNotification: jest.fn(),
  onMessage: jest.fn(),
  onNotificationOpenedApp: jest.fn(),
  onTokenRefresh: jest.fn(),
  registerDeviceForRemoteMessages: jest.fn(),
  requestPermission: jest.fn(),
}));

jest.mock("./crashlyticsService", () => ({
  logNotificationFailure: jest.fn(),
}));

jest.mock("./firebaseAnalytics", () => ({
  PARTNER_ANALYTICS_EVENTS: {
    notificationReceived: "notification_received",
    notificationClicked: "notification_clicked",
  },
  trackEvent: jest.fn(),
}));

jest.mock("./partnerService", () => ({
  getPartnerWarnings: jest.fn(),
}));

describe("notificationsService", () => {
  const unsubscribeRefresh = jest.fn();
  const unsubscribeForeground = jest.fn();
  const unsubscribeOpened = jest.fn();

  const loadService = async () => {
    jest.resetModules();
    const api = require("./api").default;
    const asyncStorage = require("@react-native-async-storage/async-storage");
    const { PermissionsAndroid } = require("react-native");
    const messaging = require("@react-native-firebase/messaging");
    const crashlytics = require("./crashlyticsService");
    const analytics = require("./firebaseAnalytics");
    const partnerService = require("./partnerService");
    const storage = require("../utils/storage");

    (PermissionsAndroid.request as jest.Mock).mockResolvedValue("granted");
    (storage.getOrCreateDeviceId as jest.Mock).mockResolvedValue("device-1");
    (storage.getPartnerProviderId as jest.Mock).mockResolvedValue("partner-1");
    (storage.getToken as jest.Mock).mockResolvedValue("access-1");
    (asyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (asyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (asyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
    (messaging.requestPermission as jest.Mock).mockResolvedValue(true);
    (messaging.registerDeviceForRemoteMessages as jest.Mock).mockResolvedValue(undefined);
    (messaging.getToken as jest.Mock).mockResolvedValue("token-1");
    (messaging.onTokenRefresh as jest.Mock).mockImplementation((_value: unknown, callback: unknown) => {
      (messaging.onTokenRefresh as any).callback = callback;
      return unsubscribeRefresh;
    });
    (messaging.onMessage as jest.Mock).mockImplementation((_value: unknown, callback: unknown) => {
      (messaging.onMessage as any).callback = callback;
      return unsubscribeForeground;
    });
    (messaging.onNotificationOpenedApp as jest.Mock).mockImplementation(
      (_value: unknown, callback: unknown) => {
        (messaging.onNotificationOpenedApp as any).callback = callback;
        return unsubscribeOpened;
      },
    );
    (messaging.getInitialNotification as jest.Mock).mockResolvedValue(null);
    (partnerService.getPartnerWarnings as jest.Mock).mockResolvedValue([]);

    const service = require("./notificationsService");
    return { service, api, asyncStorage, PermissionsAndroid, messaging, crashlytics, analytics, partnerService };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("maps partner notification content from the primary endpoint", async () => {
    const { service, api } = await loadService();
    (api.get as jest.Mock).mockResolvedValueOnce({
      data: {
        data: {
          content: [
            {
              id: 10,
              title: "Hello",
              message: "World",
              createdAt: "2026-07-07T10:00:00Z",
              read: true,
            },
          ],
        },
      },
    });

    await expect(service.fetchNotifications()).resolves.toEqual([
      {
        id: "10",
        title: "Hello",
        message: "World",
        createdAt: "2026-07-07T10:00:00Z",
        read: true,
        source: "system",
        redirectType: undefined,
        redirectValue: undefined,
        warningId: undefined,
      },
    ]);
    expect(api.get).toHaveBeenCalledWith("/api/v1/partner/notifications", {
      params: { page: 0, size: 20 },
    });
  });

  it("falls back across endpoints and normalizes default values", async () => {
    const { service, api } = await loadService();
    (api.get as jest.Mock)
      .mockRejectedValueOnce(new Error("primary failed"))
      .mockResolvedValueOnce({
        data: {
          items: [
            {
              notificationId: 22,
              body: "Fallback body",
            },
          ],
        },
      });

    await expect(service.fetchNotifications()).resolves.toEqual([
      {
        id: "22",
        title: "Notification",
        message: "Fallback body",
        createdAt: undefined,
        read: undefined,
        source: "system",
        redirectType: undefined,
        redirectValue: undefined,
        warningId: undefined,
      },
    ]);
    expect(api.get).toHaveBeenNthCalledWith(2, "/api/provider/notifications", {
      params: { page: 0, size: 20 },
    });
  });

  it("uses the final fallback endpoint when both preferred endpoints fail", async () => {
    const { service, api } = await loadService();
    (api.get as jest.Mock)
      .mockRejectedValueOnce(new Error("partner failed"))
      .mockRejectedValueOnce(new Error("provider failed"))
      .mockResolvedValueOnce({
        data: [{ id: "raw-id", title: "Raw", message: "Payload" }],
      });

    await expect(service.fetchNotifications()).resolves.toEqual([
      {
        id: "raw-id",
        title: "Raw",
        message: "Payload",
        createdAt: undefined,
        read: undefined,
        source: "system",
        redirectType: undefined,
        redirectValue: undefined,
        warningId: undefined,
      },
    ]);
    expect(api.get).toHaveBeenNthCalledWith(3, "/api/notifications");
  });

  it("merges warning notifications with defaults or custom copy and stores warning read state locally", async () => {
    const { service, api, asyncStorage, partnerService } = await loadService();
    (api.get as jest.Mock).mockResolvedValueOnce({ data: { data: { content: [] } } });
    (asyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(["w-2"]));
    (partnerService.getPartnerWarnings as jest.Mock).mockResolvedValueOnce([
      { id: "w-1", createdAt: "2026-07-19T09:30:00Z" },
      { id: "w-2", notificationTitle: "Custom Warning", notificationMessage: "Open now", createdAt: "2026-07-19T08:00:00Z" },
    ]);

    await expect(service.fetchNotifications()).resolves.toEqual([
      {
        id: "warning:w-1",
        title: "New Warning Issued",
        message: "A new warning has been issued to your account. Tap to view the details.",
        createdAt: "2026-07-19T09:30:00Z",
        read: false,
        source: "warning",
        redirectType: "WARNING",
        redirectValue: "w-1",
        warningId: "w-1",
      },
      {
        id: "warning:w-2",
        title: "Custom Warning",
        message: "Open now",
        createdAt: "2026-07-19T08:00:00Z",
        read: true,
        source: "warning",
        redirectType: "WARNING",
        redirectValue: "w-2",
        warningId: "w-2",
      },
    ]);

    await service.markWarningNotificationRead("w-9");
    expect(asyncStorage.setItem).toHaveBeenCalledWith(
      "partner_read_warning_notifications",
      JSON.stringify(["w-9"]),
    );
  });

  it("calls the correct notification mutation endpoints", async () => {
    const { service, api } = await loadService();

    await service.markNotificationRead("abc 1");
    await service.deleteNotification("xyz/2");

    expect(api.patch).toHaveBeenCalledWith("/api/v1/partner/notifications/abc%201/read");
    expect(api.delete).toHaveBeenCalledWith("/api/provider/notifications/xyz%2F2");
  });

  it("reads unreadCount from nested data and returns 0 for invalid values", async () => {
    let loaded = await loadService();
    (loaded.api.get as jest.Mock).mockResolvedValueOnce({ data: { data: { unreadCount: "7" } } });
    await expect(loaded.service.fetchUnreadNotificationCount()).resolves.toBe(7);

    loaded = await loadService();
    (loaded.api.get as jest.Mock).mockResolvedValueOnce({ data: { count: "oops" } });
    await expect(loaded.service.fetchUnreadNotificationCount()).resolves.toBe(0);
  });

  it("requests permission, registers the token, and handles token refresh", async () => {
    const { service, api, asyncStorage, PermissionsAndroid, messaging } = await loadService();
    (api.post as jest.Mock).mockResolvedValue(undefined);

    await expect(service.initializePushNotifications()).resolves.toBe(true);

    expect(PermissionsAndroid.request).toHaveBeenCalledWith("POST_NOTIFICATIONS");
    expect(messaging.requestPermission).toHaveBeenCalled();
    expect(messaging.registerDeviceForRemoteMessages).toHaveBeenCalled();
    expect(api.post).toHaveBeenCalledWith(
      "/api/notifications/devices",
      {
        deviceId: "device-1",
        fcmToken: "token-1",
        platform: "android",
        appType: "PARTNER",
        userType: "PARTNER",
        targetUserType: "PARTNER",
        userId: "partner-1",
        partnerId: "partner-1",
        providerId: "partner-1",
      },
      { headers: { Authorization: "Bearer access-1" } },
    );

    await (messaging.onTokenRefresh as any).callback("token-2");
    expect(api.post).toHaveBeenLastCalledWith(
      "/api/notifications/devices",
      expect.objectContaining({
        deviceId: "device-1",
        fcmToken: "token-2",
        platform: "android",
        appType: "PARTNER",
      }),
      { headers: { Authorization: "Bearer access-1" } },
    );
    expect(asyncStorage.setItem).toHaveBeenLastCalledWith(
      "partner_registered_fcm_token",
      "device-1:token-2",
    );
  });

  it("skips duplicate device-token registration from persisted storage", async () => {
    const { service, api, asyncStorage } = await loadService();
    (asyncStorage.getItem as jest.Mock).mockResolvedValue("device-1:token-1");

    await expect(service.initializePushNotifications()).resolves.toBe(true);
    expect(api.post).not.toHaveBeenCalled();
  });

  it("treats conflict responses as success and returns false on fatal setup errors", async () => {
    let loaded = await loadService();
    (loaded.api.post as jest.Mock).mockRejectedValueOnce({ response: { status: 409 } });
    await expect(loaded.service.initializePushNotifications()).resolves.toBe(true);

    loaded = await loadService();
    (loaded.messaging.requestPermission as jest.Mock).mockRejectedValueOnce(new Error("firebase missing"));
    await expect(loaded.service.initializePushNotifications()).resolves.toBe(false);
    expect(loaded.crashlytics.logNotificationFailure).toHaveBeenCalledWith(expect.any(Error));
  });

  it("skips token registration when the partner session token is unavailable", async () => {
    const { service, api } = await loadService();
    const storage = require("../utils/storage");
    (storage.getToken as jest.Mock).mockResolvedValueOnce(null);

    await expect(service.initializePushNotifications()).resolves.toBe(true);
    expect(api.post).not.toHaveBeenCalled();
  });

  it("unsubscribes token refresh and deletes the stored device token", async () => {
    const { service, api, asyncStorage } = await loadService();
    (api.post as jest.Mock).mockResolvedValue(undefined);
    await service.initializePushNotifications();
    (asyncStorage.getItem as jest.Mock).mockResolvedValue("device-1:token-1");

    await service.unregisterDeviceToken();

    expect(unsubscribeRefresh).toHaveBeenCalled();
    expect(api.delete).toHaveBeenCalledWith("/api/notifications/devices/device-1");
    expect(asyncStorage.removeItem).toHaveBeenCalledWith("partner_registered_fcm_token");
  });

  it("swallows cleanup failures", async () => {
    const { service, asyncStorage } = await loadService();
    (asyncStorage.getItem as jest.Mock).mockRejectedValue(new Error("storage failed"));
    await expect(service.unregisterDeviceToken()).resolves.toBeUndefined();
  });

  it("attaches listeners, tracks notification events, and cleans them up", async () => {
    const { service, messaging, analytics } = await loadService();
    const opened = jest.fn();
    const foreground = jest.fn();
    const initial = { data: { type: "initial" } };
    (messaging.getInitialNotification as jest.Mock).mockResolvedValue(initial);

    const cleanup = await service.setupPushNotificationListeners({
      onForegroundMessage: foreground,
      onNotificationOpened: opened,
    });

    const foregroundPayload = { data: { redirectType: "chat" } };
    await (messaging.onMessage as any).callback(foregroundPayload);
    expect(analytics.trackEvent).toHaveBeenCalledWith(analytics.PARTNER_ANALYTICS_EVENTS.notificationReceived, {
      type: "chat",
    });
    expect(foreground).toHaveBeenCalledWith(foregroundPayload);

    const openedPayload = { data: { type: "orders" } };
    await (messaging.onNotificationOpenedApp as any).callback(openedPayload);
    expect(analytics.trackEvent).toHaveBeenCalledWith(analytics.PARTNER_ANALYTICS_EVENTS.notificationClicked, {
      type: "orders",
    });
    expect(opened).toHaveBeenCalledWith(openedPayload);
    expect(opened).toHaveBeenCalledWith(initial);

    cleanup();
    expect(unsubscribeForeground).toHaveBeenCalled();
    expect(unsubscribeOpened).toHaveBeenCalled();
  });

  it("prevents duplicate listener attachment and recovers after cleanup", async () => {
    const { service, messaging } = await loadService();

    const cleanup = await service.setupPushNotificationListeners();
    const secondCleanup = await service.setupPushNotificationListeners();

    expect(messaging.onMessage).toHaveBeenCalledTimes(1);
    secondCleanup();
    cleanup();

    await service.setupPushNotificationListeners();
    expect(messaging.onMessage).toHaveBeenCalledTimes(2);
  });

  it("logs setup failures and returns a noop cleanup", async () => {
    const { service, messaging, crashlytics } = await loadService();
    (messaging.onMessage as jest.Mock).mockImplementationOnce(() => {
      throw new Error("listener failed");
    });

    const cleanup = await service.setupPushNotificationListeners();
    expect(crashlytics.logNotificationFailure).toHaveBeenCalledWith(expect.any(Error));
    expect(() => cleanup()).not.toThrow();
  });
});
