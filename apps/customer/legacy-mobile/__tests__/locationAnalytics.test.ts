import * as firebaseAnalytics from "../src/services/firebaseAnalytics";
import * as firebaseCrashlytics from "../src/services/firebaseCrashlytics";
import { trackLocationEvent } from "../src/utils/locationAnalytics";

describe("utils/locationAnalytics", () => {
  const runtime = globalThis as typeof globalThis & { __DEV__: boolean };
  const originalDev = runtime.__DEV__;
  const analyticsSpy = jest
    .spyOn(firebaseAnalytics, "trackAnalyticsEvent")
    .mockResolvedValue(undefined);
  const errorSpy = jest
    .spyOn(firebaseCrashlytics, "recordNonFatalError")
    .mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    runtime.__DEV__ = false;
  });

  afterAll(() => {
    runtime.__DEV__ = originalDev;
    jest.restoreAllMocks();
  });

  it("tracks an event without a payload", () => {
    trackLocationEvent("gps_success");

    expect(analyticsSpy).toHaveBeenCalledWith(
      "location_gps_success",
      undefined,
    );
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("normalizes primitive and structured payload values", () => {
    trackLocationEvent("manual_pin_selected", {
      label: "Home",
      accuracy: 0,
      mocked: false,
      details: { source: "map" },
      values: [1, 2],
      ignoredNull: null,
      ignoredUndefined: undefined,
    });

    expect(analyticsSpy).toHaveBeenCalledWith(
      "location_manual_pin_selected",
      {
        label: "Home",
        accuracy: 0,
        mocked: false,
        details: '{"source":"map"}',
        values: "[1,2]",
      },
    );
  });

  it.each([
    "serviceability_failure",
    "reverse_geocode_failure",
    "gps_permission_denied",
    "gps_timeout",
  ] as const)("records reliability event %s as non-fatal", (event) => {
    trackLocationEvent(event, { reason: "test" });

    expect(errorSpy).toHaveBeenCalledWith(expect.any(Error), {
      area: "location",
      event,
      reason: "test",
    });
    expect((errorSpy.mock.calls[0][0] as Error).message).toBe(
      `Location event: ${event}`,
    );
  });

  it("does not record weak GPS as a non-fatal error", () => {
    trackLocationEvent("gps_weak", { accuracy: 150 });

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("writes a development diagnostic with the original payload", () => {
    runtime.__DEV__ = true;
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    trackLocationEvent("gps_mock_detected", { mocked: true });

    expect(logSpy).toHaveBeenCalledWith("[location:analytics]", {
      event: "gps_mock_detected",
      mocked: true,
    });
    logSpy.mockRestore();
  });

  it("propagates payload serialization errors before side effects", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(() =>
      trackLocationEvent("gps_success", { circular }),
    ).toThrow();
    expect(analyticsSpy).not.toHaveBeenCalled();
  });
});
