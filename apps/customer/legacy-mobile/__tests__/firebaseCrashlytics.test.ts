type CrashlyticsModule = Record<string, unknown> | null;

function loadCrashlytics(module: CrashlyticsModule) {
  jest.resetModules();
  jest.unmock("../src/services/firebaseCrashlytics");
  let loaded!: typeof import("../src/services/firebaseCrashlytics");
  jest.isolateModules(() => {
    if (module === null) {
      jest.doMock(
        "@react-native-firebase/crashlytics",
        () => {
          throw new Error("Crashlytics module unavailable");
        },
        { virtual: true },
      );
    } else {
      jest.setMock("@react-native-firebase/crashlytics", module);
    }
    loaded = jest.requireActual("../src/services/firebaseCrashlytics.ts");
  });
  return loaded;
}

describe("firebaseCrashlytics", () => {
  it("initializes the modular SDK and sets a normalized user ID", async () => {
    const instance = { id: "crashlytics-instance" };
    const getCrashlytics = jest.fn(() => instance);
    const setUserId = jest.fn().mockResolvedValue(undefined);
    const { setCrashlyticsUser } = loadCrashlytics({
      getCrashlytics,
      setUserId,
    });

    await setCrashlyticsUser("  customer-1  ");

    expect(getCrashlytics).toHaveBeenCalled();
    expect(setUserId).toHaveBeenCalledWith(instance, "customer-1");
  });

  it.each([
    ["number", 42, "42"],
    ["null", null, ""],
    ["undefined", undefined, ""],
    ["empty", "", ""],
  ])("normalizes a %s user ID", async (_label, input, expected) => {
    const instance = {};
    const setUserId = jest.fn().mockResolvedValue(undefined);
    const { setCrashlyticsUser } = loadCrashlytics({
      getCrashlytics: jest.fn(() => instance),
      setUserId,
    });

    await setCrashlyticsUser(input);

    expect(setUserId).toHaveBeenCalledWith(instance, expected);
  });

  it("uses the default namespaced instance setUserId method", async () => {
    const instance = {
      setUserId: jest.fn().mockResolvedValue(undefined),
    };
    const defaultFactory = jest.fn(() => instance);
    const { setCrashlyticsUser } = loadCrashlytics({
      default: defaultFactory,
    });

    await setCrashlyticsUser("legacy-user");

    expect(defaultFactory).toHaveBeenCalled();
    expect(instance.setUserId).toHaveBeenCalledWith("legacy-user");
  });

  it("uses a function exposed on the default export when available", async () => {
    const instance = {};
    const setUserId = jest.fn().mockResolvedValue(undefined);
    const { setCrashlyticsUser } = loadCrashlytics({
      default: Object.assign(jest.fn(() => instance), {
        setUserId,
      }),
    });

    await setCrashlyticsUser("default-function-user");

    expect(setUserId).toHaveBeenCalledWith(
      instance,
      "default-function-user",
    );
  });

  it("returns safely when the SDK or instance is unavailable", async () => {
    const missingSdk = loadCrashlytics(null);
    await expect(
      missingSdk.setCrashlyticsUser("user"),
    ).resolves.toBeUndefined();

    const missingInstance = loadCrashlytics({});
    await expect(
      missingInstance.setCrashlyticsUser("user"),
    ).resolves.toBeUndefined();
  });

  it("swallows user binding initialization and SDK failures", async () => {
    const instanceFailure = loadCrashlytics({
      getCrashlytics: jest.fn(() => {
        throw new Error("initialization failed");
      }),
    });
    await expect(
      instanceFailure.setCrashlyticsUser("user"),
    ).resolves.toBeUndefined();

    const setUserId = jest.fn().mockRejectedValue(new Error("SDK failed"));
    const sdkFailure = loadCrashlytics({
      getCrashlytics: jest.fn(() => ({})),
      setUserId,
    });
    await expect(
      sdkFailure.setCrashlyticsUser("user"),
    ).resolves.toBeUndefined();
  });

  it("logs a message with normalized attributes through modular functions", async () => {
    const instance = {};
    const setAttributes = jest.fn().mockResolvedValue(undefined);
    const log = jest.fn().mockResolvedValue(undefined);
    const { logCrashlyticsMessage } = loadCrashlytics({
      getCrashlytics: jest.fn(() => instance),
      setAttributes,
      log,
    });

    await logCrashlyticsMessage("  checkout started  ", {
      bookingId: "booking-1",
      amount: 499,
      prepaid: false,
      nullValue: null,
      missingValue: undefined,
    });

    expect(setAttributes).toHaveBeenCalledWith(instance, {
      bookingId: "booking-1",
      amount: "499",
      prepaid: "false",
    });
    expect(log).toHaveBeenCalledWith(instance, "checkout started");
  });

  it("uses namespaced setAttributes and log methods", async () => {
    const instance = {
      setAttributes: jest.fn().mockResolvedValue(undefined),
      log: jest.fn().mockResolvedValue(undefined),
    };
    const { logCrashlyticsMessage } = loadCrashlytics({
      default: jest.fn(() => instance),
    });

    await logCrashlyticsMessage("legacy log", {
      active: true,
    });

    expect(instance.setAttributes).toHaveBeenCalledWith({
      active: "true",
    });
    expect(instance.log).toHaveBeenCalledWith("legacy log");
  });

  it.each([
    ["empty", ""],
    ["whitespace", "   "],
    ["null", null],
    ["undefined", undefined],
  ])("ignores a %s log message", async (_label, message) => {
    const getCrashlytics = jest.fn(() => ({}));
    const { logCrashlyticsMessage } = loadCrashlytics({
      getCrashlytics,
    });

    await logCrashlyticsMessage(message as string);

    expect(getCrashlytics).not.toHaveBeenCalled();
  });

  it("logs without attributes and tolerates missing log functions", async () => {
    const instance = {};
    const { logCrashlyticsMessage } = loadCrashlytics({
      getCrashlytics: jest.fn(() => instance),
    });

    await expect(
      logCrashlyticsMessage("message without SDK methods"),
    ).resolves.toBeUndefined();
  });

  it("returns safely when logging has no SDK instance", async () => {
    const { logCrashlyticsMessage } = loadCrashlytics(null);

    await expect(
      logCrashlyticsMessage("offline breadcrumb", { source: "test" }),
    ).resolves.toBeUndefined();
  });

  it("swallows attribute and log failures", async () => {
    const attributeFailure = loadCrashlytics({
      getCrashlytics: jest.fn(() => ({})),
      setAttributes: jest
        .fn()
        .mockRejectedValue(new Error("attributes failed")),
      log: jest.fn(),
    });
    await expect(
      attributeFailure.logCrashlyticsMessage("message", { key: "value" }),
    ).resolves.toBeUndefined();

    const logFailure = loadCrashlytics({
      getCrashlytics: jest.fn(() => ({})),
      log: jest.fn().mockRejectedValue(new Error("log failed")),
    });
    await expect(
      logFailure.logCrashlyticsMessage("message"),
    ).resolves.toBeUndefined();
  });

  it("records an Error with normalized attributes through modular functions", async () => {
    const instance = {};
    const setAttributes = jest.fn().mockResolvedValue(undefined);
    const recordError = jest.fn().mockResolvedValue(undefined);
    const { recordNonFatalError } = loadCrashlytics({
      getCrashlytics: jest.fn(() => instance),
      setAttributes,
      recordError,
    });
    const error = new Error("booking failed");

    await recordNonFatalError(error, {
      bookingId: "booking-2",
      retryCount: 0,
      recoverable: true,
      nullValue: null,
    });

    expect(setAttributes).toHaveBeenCalledWith(instance, {
      bookingId: "booking-2",
      retryCount: "0",
      recoverable: "true",
    });
    expect(recordError).toHaveBeenCalledWith(instance, error);
  });

  it.each([
    ["string", "network failure", "network failure"],
    ["object", { code: "NETWORK_ERROR" }, '{"code":"NETWORK_ERROR"}'],
    ["number", 503, "503"],
    ["null", null, '"Unknown non-fatal error"'],
    ["undefined", undefined, '"Unknown non-fatal error"'],
  ])("normalizes a %s non-fatal error", async (_label, input, expected) => {
    const recordError = jest.fn().mockResolvedValue(undefined);
    const { recordNonFatalError } = loadCrashlytics({
      getCrashlytics: jest.fn(() => ({})),
      recordError,
    });

    await recordNonFatalError(input);

    const normalized = recordError.mock.calls[0][1];
    expect(normalized).toBeInstanceOf(Error);
    expect(normalized.message).toBe(expected);
  });

  it("uses namespaced setAttributes and recordError methods", async () => {
    const instance = {
      setAttributes: jest.fn().mockResolvedValue(undefined),
      recordError: jest.fn().mockResolvedValue(undefined),
    };
    const { recordNonFatalError } = loadCrashlytics({
      default: jest.fn(() => instance),
    });

    await recordNonFatalError("legacy failure", { source: "legacy" });

    expect(instance.setAttributes).toHaveBeenCalledWith({
      source: "legacy",
    });
    expect(instance.recordError).toHaveBeenCalledWith(expect.any(Error));
  });

  it("records without attributes and tolerates missing recordError functions", async () => {
    const { recordNonFatalError } = loadCrashlytics({
      getCrashlytics: jest.fn(() => ({})),
    });

    await expect(
      recordNonFatalError(new Error("no record method")),
    ).resolves.toBeUndefined();
  });

  it("returns safely when recording has no SDK instance", async () => {
    const { recordNonFatalError } = loadCrashlytics(null);

    await expect(
      recordNonFatalError(new Error("offline")),
    ).resolves.toBeUndefined();
  });

  it("swallows serialization, attribute, and recordError failures", async () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const serializationFailure = loadCrashlytics({
      getCrashlytics: jest.fn(() => ({})),
      recordError: jest.fn(),
    });
    await expect(
      serializationFailure.recordNonFatalError(circular),
    ).resolves.toBeUndefined();

    const attributeFailure = loadCrashlytics({
      getCrashlytics: jest.fn(() => ({})),
      setAttributes: jest
        .fn()
        .mockRejectedValue(new Error("attributes failed")),
      recordError: jest.fn(),
    });
    await expect(
      attributeFailure.recordNonFatalError(new Error("failure"), {
        key: "value",
      }),
    ).resolves.toBeUndefined();

    const recordFailure = loadCrashlytics({
      getCrashlytics: jest.fn(() => ({})),
      recordError: jest.fn().mockRejectedValue(new Error("record failed")),
    });
    await expect(
      recordFailure.recordNonFatalError(new Error("failure")),
    ).resolves.toBeUndefined();
  });
});
