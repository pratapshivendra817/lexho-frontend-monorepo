// noinspection HttpUrlsUsage
describe("partner api service", () => {
  const DEV_SCHEME = "http";
  const buildUrl = (host: string, port: string) => `${DEV_SCHEME}://${host}:${port}`;
  const buildBundleUrl = (host: string) => `${buildUrl(host, "8081")}/index.bundle`;
  const buildApiUrl = (host: string) => buildUrl(host, "8082");

  const loadApiModule = ({
    platform = "android",
    fingerprint = "generic",
    model = "sdk_gphone64",
    brand = "google",
    manufacturer = "google",
    scriptURL = buildBundleUrl("192.168.0.15"),
    configuredApiBaseUrl = "",
  }: {
    platform?: string;
    fingerprint?: string;
    model?: string;
    brand?: string;
    manufacturer?: string;
    scriptURL?: string | null;
    configuredApiBaseUrl?: string;
  } = {}) => {
    jest.resetModules();

    const requestUse = jest.fn();
    const responseUse = jest.fn();
    const apiClient = Object.assign(jest.fn(), {
      interceptors: {
        request: { use: requestUse },
        response: { use: responseUse },
      },
    });
    const refreshClient = Object.assign(jest.fn(), {
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
      post: jest.fn(),
    });
    const create = jest.fn()
      .mockReturnValueOnce(apiClient)
      .mockReturnValueOnce(refreshClient);

    const storage = {
      clearSession: jest.fn(async () => undefined),
      getOrCreateDeviceId: jest.fn(async () => "device-1"),
      getRefreshToken: jest.fn(async () => "refresh-1"),
      getToken: jest.fn(async () => "access-1"),
      saveRefreshToken: jest.fn(async () => undefined),
      saveToken: jest.fn(async () => undefined),
    };
    const logApiFailure = jest.fn();

    jest.doMock("axios", () => ({
      __esModule: true,
      default: { create },
      create,
    }));
    jest.doMock("../src/utils/storage", () => storage);
    jest.doMock("../src/services/crashlyticsService", () => ({ logApiFailure }));
    jest.doMock("react-native-config", () => ({
      API_BASE_URL: configuredApiBaseUrl,
    }));
    jest.doMock("react-native", () => ({
      Platform: { OS: platform },
      NativeModules: {
        PlatformConstants: {
          Fingerprint: fingerprint,
          Model: model,
          Brand: brand,
          Manufacturer: manufacturer,
        },
        SourceCode: { scriptURL },
      },
    }));

    const mod = require("../src/services/api");
    return {
      ...mod,
      apiClient,
      refreshClient,
      create,
      requestInterceptor: requestUse.mock.calls[0][0],
      responseRejected: responseUse.mock.calls[0][1],
      storage,
      logApiFailure,
    };
  };

  it("builds emulator base url and wires axios clients", () => {
    const { API_BASE_URL, create } = loadApiModule();
    const emulatorApiUrl = buildApiUrl("10.0.2.2");

    expect(API_BASE_URL).toBe(emulatorApiUrl);
    expect(create).toHaveBeenNthCalledWith(1, expect.objectContaining({
      baseURL: emulatorApiUrl,
      timeout: 15000,
    }));
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("prefers a configured api base url when provided", () => {
    const { API_BASE_URL } = loadApiModule({
      configuredApiBaseUrl: " https://partner-api.lexho.test/ ",
    });

    expect(API_BASE_URL).toBe("https://partner-api.lexho.test");
  });

  it("uses localhost for real android devices when adb reverse is enabled", () => {
    const { API_BASE_URL } = loadApiModule({
      fingerprint: "samsung/device",
      model: "sm-a54",
      brand: "samsung",
      manufacturer: "samsung",
    });

    expect(API_BASE_URL).toBe(buildApiUrl("localhost"));
  });

  it("falls back to metro host on ios", () => {
    const { API_BASE_URL } = loadApiModule({
      platform: "ios",
      fingerprint: "iphone",
      model: "iphone",
      brand: "apple",
      manufacturer: "apple",
      scriptURL: buildBundleUrl("172.16.0.8"),
    });

    expect(API_BASE_URL).toBe(buildApiUrl("172.16.0.8"));
  });

  it("falls back to the default LAN ip when metro host is unavailable on ios", () => {
    const { API_BASE_URL } = loadApiModule({
      platform: "ios",
      fingerprint: "iphone",
      model: "iphone",
      brand: "apple",
      manufacturer: "apple",
      scriptURL: null,
    });

    expect(API_BASE_URL).toBe(buildApiUrl("192.168.31.38"));
  });

  it("adds bearer token in the request interceptor", async () => {
    const { requestInterceptor } = loadApiModule();
    const config = { headers: {} as Record<string, string> };

    await expect(requestInterceptor(config)).resolves.toBe(config);
    expect(config.headers.Authorization).toBe("Bearer access-1");
  });

  it("keeps request config unchanged when no token exists", async () => {
    const loaded = loadApiModule();
    loaded.storage.getToken.mockResolvedValueOnce(null);
    const config = { headers: {} as Record<string, string> };

    await loaded.requestInterceptor(config);
    expect(config.headers.Authorization).toBeUndefined();
  });

  it("creates request headers when the original config does not have them", async () => {
    const loaded = loadApiModule();
    const config: any = {};

    await loaded.requestInterceptor(config);
    expect(config.headers.Authorization).toBe("Bearer access-1");
  });

  it("refreshes an expired token, retries the original request, and stores new tokens", async () => {
    const loaded = loadApiModule();
    loaded.refreshClient.post.mockResolvedValueOnce({
      data: {
        data: {
          accessToken: "next-access",
          refreshToken: "next-refresh",
        },
      },
    });
    loaded.apiClient.mockResolvedValueOnce({ data: { ok: true } });

    const result = await loaded.responseRejected({
      config: { url: "/secure", headers: {} },
      response: { status: 401 },
    });

    expect(loaded.refreshClient.post).toHaveBeenCalledWith("/api/v1/auth/refresh", {
      refreshToken: "refresh-1",
      deviceId: "device-1",
    });
    expect(loaded.storage.saveToken).toHaveBeenCalledWith("next-access");
    expect(loaded.storage.saveRefreshToken).toHaveBeenCalledWith("next-refresh");
    expect(loaded.apiClient).toHaveBeenCalledWith(expect.objectContaining({
      _retry: true,
      headers: { Authorization: "Bearer next-access" },
    }));
    expect(result).toEqual({ data: { ok: true } });
  });

  it("falls back to legacy refresh endpoint when v1 refresh fails", async () => {
    const loaded = loadApiModule();
    loaded.refreshClient.post
      .mockRejectedValueOnce(new Error("v1 missing"))
      .mockResolvedValueOnce({ data: { token: "legacy-access" } });
    loaded.apiClient.mockResolvedValueOnce({ data: { ok: true } });

    await loaded.responseRejected({
      config: { url: "/secure", headers: {} },
      response: { status: 401 },
    });

    expect(loaded.refreshClient.post).toHaveBeenNthCalledWith(2, "/api/auth/refresh", {
      refreshToken: "refresh-1",
      deviceId: "device-1",
    });
    expect(loaded.storage.saveToken).toHaveBeenCalledWith("legacy-access");
  });

  it("retries with a refreshed access token even when refresh token rotation is absent", async () => {
    const loaded = loadApiModule();
    loaded.refreshClient.post.mockResolvedValueOnce({
      data: {
        accessToken: "access-only",
      },
    });
    loaded.apiClient.mockResolvedValueOnce({ data: { ok: "access-only" } });

    const result = await loaded.responseRejected({
      config: { url: "/secure", headers: {} },
      response: { status: 401 },
    });

    expect(loaded.storage.saveToken).toHaveBeenCalledWith("access-only");
    expect(loaded.storage.saveRefreshToken).not.toHaveBeenCalled();
    expect(result).toEqual({ data: { ok: "access-only" } });
  });

  it("clears session when the refresh response does not contain a usable access token", async () => {
    const loaded = loadApiModule();
    const unauthorized = jest.fn(async () => undefined);
    loaded.setUnauthorizedHandler(unauthorized);
    loaded.refreshClient.post.mockResolvedValueOnce({ data: { message: "no token" } });

    await expect(
      loaded.responseRejected({
        config: { url: "/secure", headers: {} },
        response: { status: 401 },
      }),
    ).rejects.toMatchObject({ response: { status: 401 } });

    expect(loaded.storage.clearSession).toHaveBeenCalled();
    expect(unauthorized).toHaveBeenCalled();
  });

  it("clears session and calls unauthorized handler when refresh cannot recover", async () => {
    const loaded = loadApiModule();
    const unauthorized = jest.fn(async () => undefined);
    loaded.setUnauthorizedHandler(unauthorized);
    loaded.storage.getRefreshToken.mockResolvedValueOnce(null);

    await expect(
      loaded.responseRejected({
        config: { url: "/secure", headers: {} },
        response: { status: 401 },
      }),
    ).rejects.toMatchObject({ response: { status: 401 } });

    expect(loaded.storage.clearSession).toHaveBeenCalled();
    expect(unauthorized).toHaveBeenCalled();
  });

  it("does not invoke the unauthorized handler when a 401 request is already marked as retried", async () => {
    const loaded = loadApiModule();
    const unauthorized = jest.fn(async () => undefined);
    loaded.setUnauthorizedHandler(unauthorized);

    await expect(
      loaded.responseRejected({
        config: { url: "/secure", headers: {}, _retry: true },
        response: { status: 401 },
      }),
    ).rejects.toMatchObject({ response: { status: 401 } });

    expect(loaded.storage.clearSession).toHaveBeenCalled();
    expect(unauthorized).toHaveBeenCalled();
    expect(loaded.refreshClient.post).not.toHaveBeenCalled();
  });

  it("notifies server offline handler and logs failures for network errors", async () => {
    const loaded = loadApiModule();
    const offline = jest.fn();
    const emulatorApiUrl = buildApiUrl("10.0.2.2");
    loaded.setServerOfflineHandler(offline);
    const error = {
      config: { method: "get", url: "/health" },
      message: "Network Error",
      code: "ERR_NETWORK",
    };

    await expect(loaded.responseRejected(error)).rejects.toBe(error);
    expect(offline).toHaveBeenCalledWith(`Cannot reach backend at ${emulatorApiUrl}.`);
    expect(loaded.logApiFailure).toHaveBeenCalledWith(error, {
      method: "get",
      url: "/health",
      status: null,
    });
  });

  it("treats connection aborts as offline signals and keeps logging status codes", async () => {
    const loaded = loadApiModule();
    const offline = jest.fn();
    loaded.setServerOfflineHandler(offline);
    const error = {
      config: { method: "post", url: "/sync" },
      message: "timeout",
      code: "ECONNABORTED",
      response: { status: 503 },
    };

    await expect(loaded.responseRejected(error)).rejects.toBe(error);
    expect(offline).toHaveBeenCalledWith("Request timed out. Please try again.");
    expect(loaded.logApiFailure).toHaveBeenCalledWith(error, {
      method: "post",
      url: "/sync",
      status: 503,
    });
  });

  it("normalizes readable api errors", () => {
    const { getReadableApiError } = loadApiModule();

    expect(getReadableApiError({ response: { status: 429 } }, "fallback")).toBe(
      "Too many requests, please try again shortly",
    );
    expect(getReadableApiError({ response: { data: { message: "Bad payload" } } }, "fallback")).toBe(
      "Bad payload",
    );
    expect(getReadableApiError({ code: "ECONNABORTED" }, "fallback")).toBe(
      "Request timed out. Please try again.",
    );
    expect(getReadableApiError({ code: "ECONNREFUSED" }, "fallback")).toBe(
      `Cannot reach backend at ${buildApiUrl("10.0.2.2")}.`,
    );
    expect(getReadableApiError({}, "fallback")).toBe("fallback");
  });
});

describe("partner firebase analytics", () => {
  const loadAnalyticsModule = (factory?: () => any) => {
    jest.resetModules();
    const asyncStorage = { setItem: jest.fn(async () => undefined) };
    jest.doMock("@react-native-async-storage/async-storage", () => ({
      __esModule: true,
      default: asyncStorage,
    }));
    if (factory) {
      jest.doMock("@react-native-firebase/analytics", factory, { virtual: true });
    } else {
      jest.doMock(
        "@react-native-firebase/analytics",
        () => {
          throw new Error("analytics unavailable");
        },
        { virtual: true },
      );
    }

    return {
      mod: require("../src/services/firebaseAnalytics"),
      asyncStorage,
    };
  };

  it("tracks events through logEvent when analytics is available", async () => {
    const logEvent = jest.fn(async () => undefined);
    const { mod } = loadAnalyticsModule(() => ({
      getAnalytics: jest.fn(() => ({ logEvent })),
    }));

    await mod.trackEvent("custom_event", { step: 1 });
    expect(logEvent).toHaveBeenCalledWith("custom_event", { step: 1 });
  });

  it("tracks screen views once, persists the last screen, and skips duplicates", async () => {
    const logScreenView = jest.fn(async () => undefined);
    const { mod, asyncStorage } = loadAnalyticsModule(() => ({
      getAnalytics: jest.fn(() => ({ logScreenView })),
    }));

    await mod.trackScreenView("Orders", "OrdersScreen");
    await mod.trackScreenView("Orders", "OrdersScreen");

    expect(asyncStorage.setItem).toHaveBeenCalledWith("partner_last_screen_tracked", "Orders");
    expect(logScreenView).toHaveBeenCalledTimes(1);
    expect(logScreenView).toHaveBeenCalledWith({
      screen_name: "Orders",
      screen_class: "OrdersScreen",
    });
  });

  it("falls back to screen_view event logging when logScreenView is absent", async () => {
    const logEvent = jest.fn(async () => undefined);
    const { mod } = loadAnalyticsModule(() => ({
      default: jest.fn(() => ({ logEvent })),
    }));

    await mod.trackScreenView("Home");
    expect(logEvent).toHaveBeenCalledWith("screen_view", {
      screen_name: "Home",
      screen_class: "Home",
    });
  });

  it("identifies partner analytics and writes partner_id only for non-empty ids", async () => {
    const setUserId = jest.fn(async () => undefined);
    const setUserProperty = jest.fn(async () => undefined);
    const { mod } = loadAnalyticsModule(() => ({
      getAnalytics: jest.fn(() => ({ setUserId, setUserProperty })),
    }));

    await mod.identifyPartnerAnalytics("  p-22  ");
    await mod.identifyPartnerAnalytics("   ");
    await mod.setAnalyticsUserProperty("city", "Delhi");
    await mod.trackAuthenticationEvent(true, { via: "otp" });
    await mod.trackAuthenticationEvent(false);

    expect(setUserId).toHaveBeenNthCalledWith(1, "p-22");
    expect(setUserId).toHaveBeenNthCalledWith(2, null);
    expect(setUserProperty).toHaveBeenNthCalledWith(1, "partner_id", "p-22");
    expect(setUserProperty).toHaveBeenNthCalledWith(2, "city", "Delhi");
  });

  it("fails safely when analytics cannot be loaded", async () => {
    const { mod, asyncStorage } = loadAnalyticsModule();

    await expect(mod.trackEvent("ignored")).resolves.toBeUndefined();
    await expect(mod.trackScreenView("Safe")).resolves.toBeUndefined();
    await expect(mod.identifyPartnerAnalytics("p-1")).resolves.toBeUndefined();
    expect(asyncStorage.setItem).toHaveBeenCalledWith("partner_last_screen_tracked", "Safe");
  });
});
