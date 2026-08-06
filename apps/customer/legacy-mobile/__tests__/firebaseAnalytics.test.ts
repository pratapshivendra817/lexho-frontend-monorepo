type AnalyticsModule = Record<string, unknown> | null;

function loadAnalytics(module: AnalyticsModule) {
  jest.resetModules();
  jest.unmock("../src/services/firebaseAnalytics");
  let loaded!: typeof import("../src/services/firebaseAnalytics");
  jest.isolateModules(() => {
    if (module === null) {
      jest.doMock(
        "@react-native-firebase/analytics",
        () => {
          throw new Error("Analytics module unavailable");
        },
        { virtual: true },
      );
    } else {
      jest.setMock("@react-native-firebase/analytics", module);
    }
    loaded = jest.requireActual("../src/services/firebaseAnalytics");
  });
  return loaded;
}

describe("firebaseAnalytics", () => {
  it("initializes the modular SDK and logs a normalized event payload", async () => {
    const instance = { id: "analytics-instance" };
    const getAnalytics = jest.fn(() => instance);
    const logEvent = jest.fn().mockResolvedValue(undefined);
    const { trackAnalyticsEvent } = loadAnalytics({
      getAnalytics,
      logEvent,
    });

    await trackAnalyticsEvent("  booking_confirmed  ", {
      bookingId: "booking-1",
      amount: 499,
      prepaid: true,
      retrying: false,
      nullable: null,
      missing: undefined,
      empty: "",
    });

    expect(getAnalytics).toHaveBeenCalled();
    expect(logEvent).toHaveBeenCalledWith(instance, "booking_confirmed", {
      bookingId: "booking-1",
      amount: 499,
      prepaid: 1,
      retrying: 0,
      empty: "",
    });
  });

  it.each([
    ["empty", ""],
    ["whitespace", "   "],
    ["null", null],
    ["undefined", undefined],
  ])("ignores an %s event name", async (_label, name) => {
    const getAnalytics = jest.fn(() => ({}));
    const { trackAnalyticsEvent } = loadAnalytics({
      getAnalytics,
    });

    await trackAnalyticsEvent(name as string);

    expect(getAnalytics).not.toHaveBeenCalled();
  });

  it("passes undefined when event parameters are omitted", async () => {
    const instance = {};
    const logEvent = jest.fn().mockResolvedValue(undefined);
    const { trackAnalyticsEvent } = loadAnalytics({
      getAnalytics: jest.fn(() => instance),
      logEvent,
    });

    await trackAnalyticsEvent("app_started");

    expect(logEvent).toHaveBeenCalledWith(instance, "app_started", undefined);
  });

  it("uses the legacy namespaced instance logEvent method", async () => {
    const instance = {
      logEvent: jest.fn().mockResolvedValue(undefined),
    };
    const defaultFactory = jest.fn(() => instance);
    const { trackAnalyticsEvent } = loadAnalytics({
      default: defaultFactory,
    });

    await trackAnalyticsEvent("legacy_event", {
      active: true,
    });

    expect(defaultFactory).toHaveBeenCalled();
    expect(instance.logEvent).toHaveBeenCalledWith("legacy_event", {
      active: 1,
    });
  });

  it("returns safely when the SDK, instance, or event method is unavailable", async () => {
    const missingSdk = loadAnalytics(null);
    await expect(
      missingSdk.trackAnalyticsEvent("offline_event"),
    ).resolves.toBeUndefined();

    const missingInstance = loadAnalytics({});
    await expect(
      missingInstance.trackAnalyticsEvent("missing_instance"),
    ).resolves.toBeUndefined();

    const missingMethod = loadAnalytics({
      getAnalytics: jest.fn(() => ({})),
    });
    await expect(
      missingMethod.trackAnalyticsEvent("missing_method"),
    ).resolves.toBeUndefined();
  });

  it("swallows analytics initialization and event failures", async () => {
    const initializationFailure = loadAnalytics({
      getAnalytics: jest.fn(() => {
        throw new Error("initialization failed");
      }),
    });
    await expect(
      initializationFailure.trackAnalyticsEvent("event"),
    ).resolves.toBeUndefined();

    const logEvent = jest.fn().mockRejectedValue(new Error("event failed"));
    const eventFailure = loadAnalytics({
      getAnalytics: jest.fn(() => ({})),
      logEvent,
    });
    await expect(
      eventFailure.trackAnalyticsEvent("event"),
    ).resolves.toBeUndefined();
  });

  it("sets a normalized user ID through the modular SDK", async () => {
    const instance = {};
    const setUserId = jest.fn().mockResolvedValue(undefined);
    const { setAnalyticsUser } = loadAnalytics({
      getAnalytics: jest.fn(() => instance),
      setUserId,
    });

    await setAnalyticsUser("  customer-1  ");

    expect(setUserId).toHaveBeenCalledWith(instance, "customer-1");
  });

  it.each([
    ["number", 42, "42"],
    ["null", null, null],
    ["undefined", undefined, null],
    ["empty", "", null],
    ["whitespace", "   ", null],
  ])("normalizes a %s analytics user ID", async (_label, input, expected) => {
    const instance = {};
    const setUserId = jest.fn().mockResolvedValue(undefined);
    const { setAnalyticsUser } = loadAnalytics({
      getAnalytics: jest.fn(() => instance),
      setUserId,
    });

    await setAnalyticsUser(input);

    expect(setUserId).toHaveBeenCalledWith(instance, expected);
  });

  it("uses the legacy instance setUserId method", async () => {
    const instance = {
      setUserId: jest.fn().mockResolvedValue(undefined),
    };
    const { setAnalyticsUser } = loadAnalytics({
      default: jest.fn(() => instance),
    });

    await setAnalyticsUser("legacy-user");

    expect(instance.setUserId).toHaveBeenCalledWith("legacy-user");
  });

  it("clears the legacy instance user ID with null", async () => {
    const instance = {
      setUserId: jest.fn().mockResolvedValue(undefined),
    };
    const { setAnalyticsUser } = loadAnalytics({
      default: jest.fn(() => instance),
    });

    await setAnalyticsUser("   ");

    expect(instance.setUserId).toHaveBeenCalledWith(null);
  });

  it("returns safely when user binding cannot access an SDK method", async () => {
    const missingSdk = loadAnalytics(null);
    await expect(missingSdk.setAnalyticsUser("user")).resolves.toBeUndefined();

    const missingInstance = loadAnalytics({});
    await expect(
      missingInstance.setAnalyticsUser("user"),
    ).resolves.toBeUndefined();

    const missingMethod = loadAnalytics({
      getAnalytics: jest.fn(() => ({})),
    });
    await expect(
      missingMethod.setAnalyticsUser("user"),
    ).resolves.toBeUndefined();
  });

  it("swallows user-binding initialization and SDK failures", async () => {
    const initializationFailure = loadAnalytics({
      getAnalytics: jest.fn(() => {
        throw new Error("initialization failed");
      }),
    });
    await expect(
      initializationFailure.setAnalyticsUser("user"),
    ).resolves.toBeUndefined();

    const setUserId = jest.fn().mockRejectedValue(new Error("binding failed"));
    const bindingFailure = loadAnalytics({
      getAnalytics: jest.fn(() => ({})),
      setUserId,
    });
    await expect(
      bindingFailure.setAnalyticsUser("user"),
    ).resolves.toBeUndefined();
  });

  it("tracks a trimmed screen view with the expected Firebase payload", async () => {
    const instance = {};
    const logEvent = jest.fn().mockResolvedValue(undefined);
    const { trackScreenView } = loadAnalytics({
      getAnalytics: jest.fn(() => instance),
      logEvent,
    });

    await trackScreenView("  PaymentScreen  ");

    expect(logEvent).toHaveBeenCalledWith(instance, "screen_view", {
      screen_name: "PaymentScreen",
      screen_class: "PaymentScreen",
    });
  });

  it.each([
    ["empty", ""],
    ["whitespace", "   "],
    ["null", null],
    ["undefined", undefined],
  ])("ignores an %s screen name", async (_label, screenName) => {
    const getAnalytics = jest.fn(() => ({}));
    const { trackScreenView } = loadAnalytics({
      getAnalytics,
    });

    await trackScreenView(screenName as string);

    expect(getAnalytics).not.toHaveBeenCalled();
  });

  it("inherits non-blocking SDK failure behavior for screen views", async () => {
    const logEvent = jest.fn().mockRejectedValue(new Error("screen failed"));
    const { trackScreenView } = loadAnalytics({
      getAnalytics: jest.fn(() => ({})),
      logEvent,
    });

    await expect(trackScreenView("HomeScreen")).resolves.toBeUndefined();
  });
});
