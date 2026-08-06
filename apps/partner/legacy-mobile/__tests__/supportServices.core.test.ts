import AsyncStorage from "@react-native-async-storage/async-storage";

jest.mock("../src/services/api", () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

jest.mock("../src/services/firebaseAnalytics", () => ({
  __esModule: true,
  PARTNER_ANALYTICS_EVENTS: {
    onlineHoursSynced: "partner_online_hours_synced",
  },
  trackEvent: jest.fn(async () => undefined),
}));

describe("support services core", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-21T10:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("covers storage save, load, cleanup, extraction, and device id creation", async () => {
    const storage = require("../src/utils/storage");

    await storage.saveToken("jwt-1");
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("admin_jwt_token", "jwt-1");

    await storage.saveToken("");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("admin_jwt_token");

    await storage.saveRefreshToken("refresh-1");
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("partner_refresh_token", "refresh-1");

    await storage.saveRefreshToken(null);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("partner_refresh_token");

    await storage.saveAdminProfile({ email: "partner@example.com" });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "admin_profile",
      JSON.stringify({ email: "partner@example.com" }),
    );

    await storage.saveAdminProfile(null);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("admin_profile");

    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("saved-token");
    await expect(storage.getToken()).resolves.toBe("saved-token");

    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("saved-refresh");
    await expect(storage.getRefreshToken()).resolves.toBe("saved-refresh");

    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify({ email: "valid@example.com" }));
    await expect(storage.getAdminProfile()).resolves.toEqual({ email: "valid@example.com" });

    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("{bad json");
    await expect(storage.getAdminProfile()).resolves.toBeNull();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("admin_profile");

    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("provider-8");
    await expect(storage.getPartnerProviderId()).resolves.toBe("provider-8");

    await storage.savePartnerProviderId(123);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("partner_provider_id", "123");

    await storage.savePartnerProviderId(undefined);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("partner_provider_id");

    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("existing-device");
    await expect(storage.getOrCreateDeviceId()).resolves.toBe("existing-device");

    const originalCrypto = globalThis.crypto;
    (globalThis as any).crypto = {
      randomUUID: jest.fn(() => "uuid-123"),
    };
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("");
    await expect(storage.getOrCreateDeviceId()).resolves.toBe("partner-uuid-123");

    (globalThis as any).crypto = {
      getRandomValues: jest.fn((values: Uint8Array) => {
        values.set(Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]));
        return values;
      }),
    };
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    await expect(storage.getOrCreateDeviceId()).resolves.toBe("partner-0102030405060708");

    (globalThis as any).crypto = undefined;
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("   ");
    await expect(storage.getOrCreateDeviceId()).resolves.toMatch(/^partner-/);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "partner_device_id",
      expect.stringMatching(/^partner-/),
    );
    (globalThis as any).crypto = originalCrypto;

    await storage.clearSession();
    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
      "admin_jwt_token",
      "partner_refresh_token",
      "admin_profile",
      "partner_provider_id",
    ]);

    expect(storage.extractJwtToken({ token: "top-level" })).toBe("top-level");
    expect(storage.extractJwtToken({ accessToken: "top-level-access" })).toBe("top-level-access");
    expect(storage.extractJwtToken({ result: { accessToken: "nested-result" } })).toBe("nested-result");
    expect(storage.extractJwtToken({ data: { jwt: "nested-data" } })).toBe("nested-data");
    expect(storage.extractJwtToken({ jwtToken: "jwt-token" })).toBe("jwt-token");
    expect(storage.extractJwtToken({ authToken: "auth-token" })).toBe("auth-token");
    expect(storage.extractJwtToken({})).toBeNull();
  });

  it("ignores invalid storage payloads and empty profile/provider values safely", async () => {
    const storage = require("../src/utils/storage");

    await storage.saveAdminProfile(undefined);
    await storage.savePartnerProviderId("");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("admin_profile");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("partner_provider_id");

    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    await expect(storage.getAdminProfile()).resolves.toBeNull();
  });

  it("tracks online hours snapshots, backend sync, and lifecycle listener cleanup", async () => {
    const appStateListeners: Array<(state: string) => void> = [];
    const remove = jest.fn();

    jest.doMock("react-native", () => ({
      __esModule: true,
      AppState: {
        addEventListener: jest.fn((_event: string, listener: (state: string) => void) => {
          appStateListeners.push(listener);
          return { remove };
        }),
      },
    }));

    jest.resetModules();
    const freshAsyncStorage = require("@react-native-async-storage/async-storage");
    const freshApi = require("../src/services/api").default;
    const freshAnalytics = require("../src/services/firebaseAnalytics");
    const onlineHoursService = require("../src/services/onlineHoursService");

    (freshAsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    const emptySnapshot = await onlineHoursService.getOnlineHoursSnapshot();
    expect(emptySnapshot.activeSessionStartedAt).toBeNull();
    expect(emptySnapshot.totalForegroundMsToday).toBe(0);

    (freshAsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("{bad");
    const invalidSnapshot = await onlineHoursService.getOnlineHoursSnapshot();
    expect(invalidSnapshot.totalForegroundMsWeek).toBe(0);

    (freshAsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({
        activeSessionStartedAt: null,
        totalForegroundMsToday: 1000,
        totalForegroundMsWeek: 2000,
        dayBucket: "2026-06-20",
        weekBucket: "2026-W24",
        lastBackgroundAt: 10,
      }),
    );
    const started = await onlineHoursService.beginOnlineSession(Date.parse("2026-06-21T09:00:00.000Z"));
    expect(started.activeSessionStartedAt).toBe(Date.parse("2026-06-21T09:00:00.000Z"));
    expect(started.totalForegroundMsToday).toBe(0);
    expect(freshAsyncStorage.setItem).toHaveBeenCalledWith(
      "partner_online_hours_v1",
      expect.stringContaining("\"activeSessionStartedAt\":1782032400000"),
    );

    (freshAsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({
        activeSessionStartedAt: Date.parse("2026-06-21T09:00:00.000Z"),
        totalForegroundMsToday: 1000,
        totalForegroundMsWeek: 2000,
        dayBucket: "2026-06-21",
        weekBucket: "2026-W25",
        lastBackgroundAt: null,
      }),
    );
    const ended = await onlineHoursService.endOnlineSession(Date.parse("2026-06-21T09:30:00.000Z"));
    expect(ended.activeSessionStartedAt).toBeNull();
    expect(ended.totalForegroundMsToday).toBe(1801000);
    expect(ended.totalForegroundMsWeek).toBe(1802000);

    (freshAsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({
        activeSessionStartedAt: null,
        totalForegroundMsToday: 5000,
        totalForegroundMsWeek: 8000,
        dayBucket: "2026-06-21",
        weekBucket: "2026-W25",
        lastBackgroundAt: null,
      }),
    );
    const endedWithoutSession = await onlineHoursService.endOnlineSession();
    expect(endedWithoutSession.totalForegroundMsToday).toBe(5000);

    (freshAsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({
        activeSessionStartedAt: null,
        totalForegroundMsToday: 7200000,
        totalForegroundMsWeek: 18000000,
        dayBucket: "2026-06-21",
        weekBucket: "2026-W25",
        lastBackgroundAt: null,
      }),
    );
    freshApi.post.mockRejectedValueOnce(new Error("v1 down")).mockResolvedValueOnce({ ok: true });
    const syncedViaFallback = await onlineHoursService.syncOnlineHoursToBackend();
    expect(freshApi.post).toHaveBeenNthCalledWith(1, "/api/v1/partner/online-hours", {
      dayBucket: "2026-06-21",
      weekBucket: "2026-W25",
      dailyOnlineHours: 2,
      weeklyOnlineHours: 5,
    });
    expect(freshApi.post).toHaveBeenNthCalledWith(2, "/api/partner/online-hours", {
      dayBucket: "2026-06-21",
      weekBucket: "2026-W25",
      dailyOnlineHours: 2,
      weeklyOnlineHours: 5,
    });
    expect(freshAnalytics.trackEvent).toHaveBeenCalledWith(
      "partner_online_hours_synced",
      syncedViaFallback,
    );

    (freshAsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({
        activeSessionStartedAt: null,
        totalForegroundMsToday: 3600000,
        totalForegroundMsWeek: 7200000,
        dayBucket: "2026-06-21",
        weekBucket: "2026-W25",
        lastBackgroundAt: null,
      }),
    );
    freshApi.post.mockRejectedValueOnce(new Error("v1 down again")).mockRejectedValueOnce(new Error("fallback down"));
    const unsyncedPayload = await onlineHoursService.syncOnlineHoursToBackend();
    expect(unsyncedPayload).toEqual({
      dayBucket: "2026-06-21",
      weekBucket: "2026-W25",
      dailyOnlineHours: 1,
      weeklyOnlineHours: 2,
    });

    const detach = onlineHoursService.attachOnlineHoursLifecycle(() => true);
    await appStateListeners[0]?.("active");
    await appStateListeners[0]?.("background");
    expect(freshAsyncStorage.setItem).toHaveBeenCalled();
    detach();
    expect(remove).toHaveBeenCalled();

    const disabledDetach = onlineHoursService.attachOnlineHoursLifecycle(() => false);
    await appStateListeners[1]?.("active");
    disabledDetach();
    expect(remove).toHaveBeenCalledTimes(2);
  });

  it("tracks navigation screens only when route changes and navigator is ready", async () => {
    const trackScreenView = jest.fn(async () => undefined);
    const navigationRef = {
      isReady: jest.fn(),
      getRootState: jest.fn(),
    };

    jest.resetModules();
    jest.doMock("@react-navigation/native", () => ({
      __esModule: true,
      createNavigationContainerRef: () => navigationRef,
    }));
    jest.doMock("../src/services/firebaseAnalytics", () => ({
      __esModule: true,
      trackScreenView,
    }));

    const screenTrackingService = require("../src/services/screenTrackingService");

    navigationRef.isReady.mockReturnValue(false);
    await screenTrackingService.handleNavigationStateChange();
    expect(trackScreenView).not.toHaveBeenCalled();

    navigationRef.isReady.mockReturnValue(true);
    navigationRef.getRootState.mockReturnValue({
      index: 0,
      routes: [
        {
          name: "Root",
          state: {
            index: 1,
            routes: [{ name: "Orders" }, { name: "PartnerHome" }],
          },
        },
      ],
    });
    await screenTrackingService.handleNavigationStateChange();
    expect(trackScreenView).toHaveBeenCalledWith("PartnerHome");

    await screenTrackingService.handleNavigationStateChange();
    expect(trackScreenView).toHaveBeenCalledTimes(1);

    navigationRef.getRootState.mockReturnValue({
      index: 0,
      routes: [{ name: "Notifications" }],
    });
    await screenTrackingService.handleNavigationStateChange();
    expect(trackScreenView).toHaveBeenLastCalledWith("Notifications");
  });
});
