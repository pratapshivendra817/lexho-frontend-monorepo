import AsyncStorage from "@react-native-async-storage/async-storage";
import { PermissionsAndroid, Platform } from "react-native";

const mockApi = { post: jest.fn(), delete: jest.fn() };
const mockGetToken = jest.fn();
const mockGetDeviceId = jest.fn();
const mockRecordError = jest.fn();
const mockAnalytics = jest.fn();
const mockStoreState = jest.fn();
const mockMessaging = {
  getMessaging: jest.fn(() => ({ id: "messaging" })),
  requestPermission: jest.fn(),
  registerDeviceForRemoteMessages: jest.fn(),
  getToken: jest.fn(),
  onTokenRefresh: jest.fn(),
  onMessage: jest.fn(),
  onNotificationOpenedApp: jest.fn(),
  getInitialNotification: jest.fn(),
};

jest.mock("../src/api/client", () => ({ api: mockApi }));
jest.mock("../src/utils/storage", () => ({
  getToken: () => mockGetToken(),
  getOrCreateDeviceId: () => mockGetDeviceId(),
}));
jest.mock("../src/services/firebaseCrashlytics", () => ({
  recordNonFatalError: (...args) => mockRecordError(...args),
}));
jest.mock("../src/services/firebaseAnalytics", () => ({
  trackAnalyticsEvent: (...args) => mockAnalytics(...args),
}));
jest.mock("../src/redux/store", () => ({
  store: { getState: () => mockStoreState() },
}));
jest.mock("@react-native-firebase/messaging", () => mockMessaging);

describe("notificationsService", () => {
  let service;
  const originalOS = Platform.OS;
  const originalVersion = Platform.Version;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    await AsyncStorage.clear();
    Object.defineProperty(Platform, "OS", { configurable: true, value: "android" });
    Object.defineProperty(Platform, "Version", { configurable: true, value: 34 });
    PermissionsAndroid.request = jest.fn().mockResolvedValue("granted");
    mockGetToken.mockResolvedValue("session-token");
    mockGetDeviceId.mockResolvedValue("device-1");
    mockStoreState.mockReturnValue({ auth: { user: { id: "12" } } });
    mockMessaging.requestPermission.mockResolvedValue("authorized");
    mockMessaging.registerDeviceForRemoteMessages.mockResolvedValue(undefined);
    mockMessaging.getToken.mockResolvedValue("fcm-1");
    mockMessaging.onTokenRefresh.mockReturnValue(jest.fn());
    mockMessaging.onMessage.mockReturnValue(jest.fn());
    mockMessaging.onNotificationOpenedApp.mockReturnValue(jest.fn());
    mockMessaging.getInitialNotification.mockResolvedValue(null);
    mockApi.post.mockResolvedValue({ data: { ok: true } });
    service = require("../src/services/notificationsService");
  });

  afterAll(() => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: originalOS });
    Object.defineProperty(Platform, "Version", { configurable: true, value: originalVersion });
  });

  it("requests Android permission, registers FCM token and token refresh", async () => {
    await expect(service.initializePushNotifications()).resolves.toBe(true);
    expect(PermissionsAndroid.request).toHaveBeenCalledWith(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    expect(mockApi.post).toHaveBeenCalledWith(
      "/api/notifications/devices",
      expect.objectContaining({
        deviceId: "device-1",
        fcmToken: "fcm-1",
        appType: "CUSTOMER",
        userId: "12",
      }),
      { headers: { Authorization: "Bearer session-token" } },
    );

    const refreshHandler = mockMessaging.onTokenRefresh.mock.calls[0][1];
    await refreshHandler("fcm-2");
    expect(mockApi.post).toHaveBeenCalledTimes(2);
    await refreshHandler("");
    expect(mockApi.post).toHaveBeenCalledTimes(2);
  });

  it("skips backend registration without an authenticated token", async () => {
    mockGetToken.mockResolvedValue(null);
    await expect(service.initializePushNotifications()).resolves.toBe(true);
    expect(mockApi.post).not.toHaveBeenCalled();
  });

  it("deduplicates tokens and treats 409 registration as success", async () => {
    mockApi.post.mockRejectedValueOnce({ response: { status: 409 } });
    await expect(service.initializePushNotifications()).resolves.toBe(true);
    await expect(service.initializePushNotifications()).resolves.toBe(true);
    expect(mockApi.post).toHaveBeenCalledTimes(1);
    expect(mockAnalytics).toHaveBeenCalledWith(
      "fcm_token_registered",
      expect.any(Object),
    );
  });

  it("reports initialization and token refresh failures", async () => {
    mockMessaging.getToken.mockRejectedValueOnce(new Error("firebase unavailable"));
    await expect(service.initializePushNotifications()).resolves.toBe(false);
    expect(mockRecordError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ action: "initialize" }),
    );

    mockMessaging.getToken.mockResolvedValue("fcm-next");
    mockApi.post.mockResolvedValueOnce({ data: { ok: true } });
    await service.initializePushNotifications();
    const refreshHandler = mockMessaging.onTokenRefresh.mock.calls.at(-1)[1];
    mockApi.post.mockRejectedValueOnce(new Error("backend unavailable"));
    await refreshHandler("refresh-failure");
    expect(mockRecordError).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: "token_refresh_register" }),
    );
  });

  it("unregisters device tokens and reports best-effort failures", async () => {
    mockApi.delete.mockResolvedValueOnce({ data: { ok: true } });
    await service.unregisterDeviceToken();
    expect(mockApi.delete).toHaveBeenCalledWith(
      "/api/notifications/devices/device-1",
    );

    mockApi.delete.mockRejectedValueOnce(new Error("offline"));
    await expect(service.unregisterDeviceToken()).resolves.toBeUndefined();
    expect(mockRecordError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ action: "unregister" }),
    );
  });

  it("handles foreground, background and terminated notification callbacks", async () => {
    const foreground = jest.fn();
    const opened = jest.fn();
    const unsubscribeForeground = jest.fn();
    const unsubscribeOpened = jest.fn();
    mockMessaging.onMessage.mockReturnValue(unsubscribeForeground);
    mockMessaging.onNotificationOpenedApp.mockReturnValue(unsubscribeOpened);
    mockMessaging.getInitialNotification.mockResolvedValue({
      data: { type: "PAYMENT" },
    });

    const cleanup = await service.setupPushNotificationListeners({
      onForegroundMessage: foreground,
      onNotificationOpened: opened,
    });
    await mockMessaging.onMessage.mock.calls[0][1]({
      data: { redirectType: "BOOKING" },
    });
    mockMessaging.onNotificationOpenedApp.mock.calls[0][1]({
      data: { type: "SUPPORT" },
    });

    expect(foreground).toHaveBeenCalled();
    expect(opened).toHaveBeenCalledTimes(2);
    expect(mockAnalytics).toHaveBeenCalledWith(
      "push_foreground_received",
      { redirect_type: "BOOKING" },
    );
    cleanup();
    expect(unsubscribeForeground).toHaveBeenCalled();
    expect(unsubscribeOpened).toHaveBeenCalled();
  });

  it("prevents duplicate listener attachment and recovers from setup errors", async () => {
    const firstCleanup = await service.setupPushNotificationListeners();
    const duplicateCleanup = await service.setupPushNotificationListeners();
    duplicateCleanup();
    expect(mockMessaging.onMessage).toHaveBeenCalledTimes(1);
    firstCleanup();

    mockMessaging.getMessaging.mockImplementationOnce(() => {
      throw new Error("native module unavailable");
    });
    const cleanup = await service.setupPushNotificationListeners();
    expect(mockRecordError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ action: "setup_listeners" }),
    );
    expect(cleanup()).toBeUndefined();
  });
});
