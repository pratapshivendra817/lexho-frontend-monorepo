const mockTrackAnalyticsEvent = jest.fn();
const mockLogCrashlyticsMessage = jest.fn();
const mockRecordNonFatalError = jest.fn();

type SentryMock =
  | {
      captureException?: jest.Mock;
    }
  | null;

function loadMonitoring(sentry: SentryMock) {
  jest.resetModules();
  jest.doMock("../src/services/firebaseAnalytics", () => ({
    trackAnalyticsEvent: (...args: unknown[]) =>
      mockTrackAnalyticsEvent(...args),
  }));
  jest.doMock("../src/services/firebaseCrashlytics", () => ({
    logCrashlyticsMessage: (...args: unknown[]) =>
      mockLogCrashlyticsMessage(...args),
    recordNonFatalError: (...args: unknown[]) =>
      mockRecordNonFatalError(...args),
  }));

  if (sentry === null) {
    jest.dontMock("@sentry/react-native");
  } else {
    jest.doMock("@sentry/react-native", () => sentry, { virtual: true });
  }

  return require("../src/services/monitoring") as typeof import("../src/services/monitoring");
}

describe("monitoring", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTrackAnalyticsEvent.mockResolvedValue(undefined);
    mockLogCrashlyticsMessage.mockResolvedValue(undefined);
    mockRecordNonFatalError.mockResolvedValue(undefined);
  });

  it("reports an Error to Crashlytics, analytics, and Sentry with normalized context", () => {
    const captureException = jest.fn();
    const { captureFrontendError } = loadMonitoring({ captureException });
    const error = new Error("checkout failed");

    captureFrontendError(error, {
      screenName: "PaymentScreen",
      userAction: "confirm_payment",
      apiEndpoint: "/api/payments/confirm",
      errorCode: "PAYMENT_FAILED",
      bookingId: "booking-1",
      retryCount: 0,
      recoverable: false,
      nullable: null,
      missing: undefined,
      empty: "",
    });

    const normalized = {
      screenName: "PaymentScreen",
      userAction: "confirm_payment",
      apiEndpoint: "/api/payments/confirm",
      errorCode: "PAYMENT_FAILED",
      bookingId: "booking-1",
      retryCount: 0,
      recoverable: false,
    };
    expect(mockLogCrashlyticsMessage).toHaveBeenCalledWith(
      "frontend_error",
      normalized,
    );
    expect(mockRecordNonFatalError).toHaveBeenCalledWith(error, normalized);
    expect(mockTrackAnalyticsEvent).toHaveBeenCalledWith(
      "frontend_error",
      normalized,
    );
    expect(captureException).toHaveBeenCalledWith(error, {
      tags: {
        screen_name: "PaymentScreen",
        user_action: "confirm_payment",
        api_endpoint: "/api/payments/confirm",
        error_code: "PAYMENT_FAILED",
      },
      extra: normalized,
    });
  });

  it.each([
    ["string", "network unavailable", "network unavailable"],
    ["number", 503, "503"],
    ["null", null, "Unknown error"],
    ["undefined", undefined, "Unknown error"],
  ])(
    "converts a %s failure into an Error before sending it to Sentry",
    (_label, input, expectedMessage) => {
      const captureException = jest.fn();
      const { captureFrontendError } = loadMonitoring({ captureException });

      captureFrontendError(input);

      expect(captureException).toHaveBeenCalledTimes(1);
      const reportedError = captureException.mock.calls[0][0];
      expect(reportedError).toBeInstanceOf(Error);
      expect(reportedError.message).toBe(expectedMessage);
      expect(captureException).toHaveBeenCalledWith(
        reportedError,
        {
          tags: {
            screen_name: "",
            user_action: "",
            api_endpoint: "",
            error_code: "",
          },
          extra: {},
        },
      );
    },
  );

  it("continues reporting when Sentry is not installed", () => {
    const { captureFrontendError } = loadMonitoring(null);
    const error = new Error("offline");

    expect(() =>
      captureFrontendError(error, { screenName: "HomeScreen" }),
    ).not.toThrow();

    expect(mockLogCrashlyticsMessage).toHaveBeenCalledWith(
      "frontend_error",
      { screenName: "HomeScreen" },
    );
    expect(mockRecordNonFatalError).toHaveBeenCalledWith(error, {
      screenName: "HomeScreen",
    });
    expect(mockTrackAnalyticsEvent).toHaveBeenCalledWith("frontend_error", {
      screenName: "HomeScreen",
    });
  });

  it("handles an installed Sentry module without captureException", () => {
    const { captureFrontendError } = loadMonitoring({});

    expect(() =>
      captureFrontendError(new Error("no capture method")),
    ).not.toThrow();

    expect(mockRecordNonFatalError).toHaveBeenCalledTimes(1);
  });

  it("swallows synchronous Sentry reporting failures", () => {
    const captureException = jest.fn(() => {
      throw new Error("Sentry unavailable");
    });
    const { captureFrontendError } = loadMonitoring({ captureException });

    expect(() =>
      captureFrontendError(new Error("app failure"), {
        screenName: "BookingScreen",
      }),
    ).not.toThrow();

    expect(captureException).toHaveBeenCalledTimes(1);
    expect(mockTrackAnalyticsEvent).toHaveBeenCalledTimes(1);
    expect(mockLogCrashlyticsMessage).toHaveBeenCalledTimes(1);
    expect(mockRecordNonFatalError).toHaveBeenCalledTimes(1);
  });

  it("tracks a business event through analytics and Crashlytics", () => {
    const { trackBusinessEvent } = loadMonitoring({});

    trackBusinessEvent("booking_confirmed", {
      bookingId: "booking-2",
      amount: 499,
      prepaid: true,
      attempts: 0,
      nullValue: null,
      missingValue: undefined,
      emptyValue: "",
    });

    const normalized = {
      bookingId: "booking-2",
      amount: 499,
      prepaid: true,
      attempts: 0,
    };
    expect(mockTrackAnalyticsEvent).toHaveBeenCalledWith(
      "booking_confirmed",
      normalized,
    );
    expect(mockLogCrashlyticsMessage).toHaveBeenCalledWith(
      "booking_confirmed",
      normalized,
    );
    expect(mockRecordNonFatalError).not.toHaveBeenCalled();
  });

  it.each([
    ["empty context", "app_started", undefined],
    ["empty event name", "", { source: "test" }],
    ["whitespace event name", "   ", {}],
  ])("forwards %s without inventing validation", (_label, name, context) => {
    const { trackBusinessEvent } = loadMonitoring({});

    trackBusinessEvent(name, context);

    expect(mockTrackAnalyticsEvent).toHaveBeenCalledWith(name, context ?? {});
    expect(mockLogCrashlyticsMessage).toHaveBeenCalledWith(
      name,
      context ?? {},
    );
  });
});
