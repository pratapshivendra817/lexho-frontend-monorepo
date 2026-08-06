describe("crashlyticsService", () => {
  const setUserId = jest.fn();
  const setAttribute = jest.fn();
  const log = jest.fn();
  const recordError = jest.fn();
  const moduleSetUserId = jest.fn();
  const moduleSetAttribute = jest.fn();
  const moduleLog = jest.fn();
  const moduleRecordError = jest.fn();
  const getPartnerProviderId = jest.fn();

  const loadService = async ({
    crashlyticsAvailable = true,
    modularAvailable = true,
    deviceInfoAvailable = true,
  }: {
    crashlyticsAvailable?: boolean;
    modularAvailable?: boolean;
    deviceInfoAvailable?: boolean;
  } = {}) => {
    jest.resetModules();
    jest.doMock("react-native", () => ({
      Platform: { OS: "android" },
    }));
    jest.doMock("../utils/storage", () => ({
      getPartnerProviderId,
    }));
    if (crashlyticsAvailable) {
      const crashlyticsInstance = {
          setUserId,
          setAttribute,
          log,
          recordError,
      };
      jest.doMock("@react-native-firebase/crashlytics", () => ({
        getCrashlytics: () => crashlyticsInstance,
        ...(modularAvailable
          ? {
              setUserId: moduleSetUserId,
              setAttribute: moduleSetAttribute,
              log: moduleLog,
              recordError: moduleRecordError,
            }
          : {}),
      }));
    } else {
      jest.doMock("@react-native-firebase/crashlytics", () => {
        throw new Error("missing module");
      });
    }
    if (deviceInfoAvailable) {
      jest.doMock("react-native-device-info", () => ({
        getModel: () => "Pixel",
        getSystemVersion: () => "15",
        getVersion: () => "1.2.3",
        getBuildNumber: () => "45",
      }));
    } else {
      jest.doMock("react-native-device-info", () => {
        throw new Error("missing device info");
      });
    }
    return require("./crashlyticsService");
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getPartnerProviderId.mockResolvedValue("partner-9");
    delete (globalThis as any).__PARTNER_UNHANDLED_REJECTION__;
    (globalThis as any).ErrorUtils = undefined;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const flushAsyncWork = async () => {
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
  };

  it("applies crash context using storage and device metadata", async () => {
    const service = await loadService();

    await service.applyCrashContext({ region: "north" });

    expect(moduleSetUserId).toHaveBeenCalledWith(expect.any(Object), "partner-9");
    expect(setUserId).not.toHaveBeenCalled();
    expect(moduleSetAttribute).toHaveBeenCalledWith(expect.any(Object), "partner_id", "partner-9");
    expect(moduleSetAttribute).toHaveBeenCalledWith(expect.any(Object), "app_version", "1.2.3+45");
    expect(moduleSetAttribute).toHaveBeenCalledWith(expect.any(Object), "device_info", "android:Pixel:15");
    expect(moduleSetAttribute).toHaveBeenCalledWith(expect.any(Object), "region", "north");
  });

  it("prefers explicit context values and ignores null extras", async () => {
    const service = await loadService();

    await service.applyCrashContext({
      partnerId: "override-id",
      appVersion: "9.9.9",
      deviceInfo: "custom-device",
      ignored: null,
    });

    expect(moduleSetUserId).toHaveBeenCalledWith(expect.any(Object), "override-id");
    expect(moduleSetAttribute).toHaveBeenCalledWith(expect.any(Object), "partner_id", "override-id");
    expect(moduleSetAttribute).toHaveBeenCalledWith(expect.any(Object), "app_version", "9.9.9");
    expect(moduleSetAttribute).toHaveBeenCalledWith(expect.any(Object), "device_info", "custom-device");
    expect(moduleSetAttribute).not.toHaveBeenCalledWith(expect.any(Object), "ignored", "null");
  });

  it("logs breadcrumbs and records normalized errors", async () => {
    const service = await loadService();

    await service.logCrashBreadcrumb("api_failure", { status: 500 });
    await service.recordCrash("plain string error", { screen: "Home" });

    expect(moduleLog).toHaveBeenCalledWith(expect.any(Object), 'api_failure {"status":500}');
    expect(moduleRecordError).toHaveBeenCalledWith(expect.any(Object), expect.any(Error));
    expect(moduleRecordError.mock.calls[0][1].message).toBe("plain string error");
    expect(moduleSetAttribute).toHaveBeenCalledWith(expect.any(Object), "screen", "Home");
  });

  it("logs api, location, and notification failures through the shared helpers", async () => {
    const service = await loadService();

    await service.logApiFailure(new Error("api down"), { method: "GET", url: "/v1/orders", status: 503 });
    await service.logLocationFailure(new Error("gps missing"), { source: "gps" });
    await service.logNotificationFailure(new Error("token missing"), { token: null });

    expect(moduleLog).toHaveBeenCalledWith(expect.any(Object), 'api_failure {"method":"GET","url":"/v1/orders","status":503}');
    expect(moduleLog).toHaveBeenCalledWith(expect.any(Object), 'location_failure {"source":"gps"}');
    expect(moduleLog).toHaveBeenCalledWith(expect.any(Object), 'notification_failure {"token":null}');
    expect(moduleRecordError).toHaveBeenCalledTimes(3);
  });

  it("returns safely when crashlytics or device-info modules are unavailable", async () => {
    let service = await loadService({ crashlyticsAvailable: false });
    await expect(service.applyCrashContext()).resolves.toBeUndefined();
    await expect(service.initializeCrashlytics()).resolves.toBe(false);

    service = await loadService({ deviceInfoAvailable: false });
    await expect(service.applyCrashContext()).resolves.toBeUndefined();
    expect(moduleSetAttribute).toHaveBeenCalledWith(expect.any(Object), "device_info", "android:unknown");
  });

  it("falls back to instance crashlytics methods when modular functions are unavailable", async () => {
    const service = await loadService({ modularAvailable: false });

    await service.applyCrashContext({ screen: "Profile" });
    await service.logCrashBreadcrumb("profile_loaded");
    await service.recordCrash(new Error("fallback error"));

    expect(setUserId).toHaveBeenCalledWith("partner-9");
    expect(setAttribute).toHaveBeenCalledWith("screen", "Profile");
    expect(log).toHaveBeenCalledWith("profile_loaded");
    expect(recordError).toHaveBeenCalledWith(expect.objectContaining({ message: "fallback error" }));
  });

  it("initializes global error handlers and forwards fatal errors", async () => {
    const service = await loadService();
    const originalHandler = jest.fn();
    const originalConsoleError = console.error;
    const consoleSpy = jest.fn();
    console.error = consoleSpy;
    (globalThis as any).ErrorUtils = {
      getGlobalHandler: () => originalHandler,
      setGlobalHandler: jest.fn(),
    };

    await expect(service.initializeCrashlytics()).resolves.toBe(true);

    const installedHandler = (globalThis as any).ErrorUtils.setGlobalHandler.mock.calls[0][0];
    installedHandler(new Error("fatal crash"), true);
    await flushAsyncWork();
    expect(moduleRecordError).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ message: "fatal crash" }));
    expect(originalHandler).toHaveBeenCalledWith(expect.any(Error), true);

    console.error("Unhandled Promise Rejection: boom");
    await flushAsyncWork();
    expect(moduleRecordError).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ message: "Unhandled Promise Rejection: boom" }));

    console.error = originalConsoleError;
  });
});
