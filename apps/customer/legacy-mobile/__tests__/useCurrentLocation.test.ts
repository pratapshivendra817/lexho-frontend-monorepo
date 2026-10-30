const mockGeo = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
};

jest.mock("react-native-geolocation-service", () => ({
  __esModule: true,
  default: {
    getCurrentPosition: (...args: unknown[]) =>
      mockGeo.getCurrentPosition(...args),
    watchPosition: (...args: unknown[]) => mockGeo.watchPosition(...args),
    clearWatch: (...args: unknown[]) => mockGeo.clearWatch(...args),
  },
}));

import {
  getBestCurrentCoordinates,
  getCurrentCoordinates,
} from "../src/hooks/useCurrentLocation";

const position = (
  latitude: unknown,
  longitude: unknown,
  accuracy: unknown = 10,
  extra: Record<string, unknown> = {},
) => ({
  coords: { latitude, longitude, accuracy, ...extra },
  timestamp: Date.now(),
});

describe("useCurrentLocation utilities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("getCurrentCoordinates", () => {
    it("maps coordinates and forwards custom timeout options", async () => {
      mockGeo.getCurrentPosition.mockImplementation((success, _failure, options) => {
        expect(options).toEqual(
          expect.objectContaining({
            enableHighAccuracy: true,
            timeout: 1234,
            maximumAge: 0,
          }),
        );
        success({
          coords: {
            latitude: 22.7,
            longitude: 75.8,
            accuracy: undefined,
            mocked: true,
          },
          timestamp: undefined,
        });
      });
      jest.spyOn(Date, "now").mockReturnValueOnce(99);

      await expect(getCurrentCoordinates(1234)).resolves.toEqual({
        latitude: 22.7,
        longitude: 75.8,
        accuracy: 0,
        timestamp: 99,
        mocked: true,
      });
    });

    it.each([
      [{ message: "permission denied" }, "permission denied"],
      [{ message: "" }, "Unable to fetch GPS location"],
    ])("rejects provider error %#", async (error, expected) => {
      mockGeo.getCurrentPosition.mockImplementation((_success, failure) =>
        failure(error),
      );
      await expect(getCurrentCoordinates()).rejects.toThrow(expected);
    });

    it("defaults optional metadata when the provider omits it", async () => {
      mockGeo.getCurrentPosition.mockImplementation(success =>
        success({
          coords: { latitude: 1, longitude: 2 },
        }),
      );
      jest.spyOn(Date, "now").mockReturnValueOnce(500);

      await expect(getCurrentCoordinates()).resolves.toEqual({
        latitude: 1,
        longitude: 2,
        accuracy: 0,
        timestamp: 500,
        mocked: false,
      });
    });
  });

  describe("getBestCurrentCoordinates", () => {
    it("accepts the most accurate fresh sample and clears resources", async () => {
      mockGeo.watchPosition.mockImplementation(success => {
        (globalThis as any).queueMicrotask(() => {
          success(position(22.7, 75.8, 40));
          success(position(22.7001, 75.8001, 12));
        });
        return 7;
      });

      await expect(
        getBestCurrentCoordinates({ desiredAccuracyMeters: 15 }),
      ).resolves.toMatchObject({ accuracy: 12 });
      expect(mockGeo.clearWatch).toHaveBeenCalledWith(7);
    });

    it("ignores stale and large-jump outlier samples", async () => {
      mockGeo.watchPosition.mockImplementation(success => {
        success({
          ...position(22.7, 75.8, 5),
          timestamp: Date.now() - 31000,
        });
        success(position(22.7, 75.8, 60));
        success(position(40, 90, 1));
        success(position(22.7001, 75.8001, 50));
        return 8;
      });

      await expect(
        getBestCurrentCoordinates({
          samples: 2,
          desiredAccuracyMeters: 10,
          maxAcceptedAccuracyMeters: 100,
        }),
      ).resolves.toMatchObject({
        latitude: 22.7001,
        accuracy: 50,
      });
    });

    it("keeps the better sample when a later accepted sample is worse", async () => {
      mockGeo.watchPosition.mockImplementation(success => {
        success(position(22.7, 75.8, 40));
        success(position(22.7001, 75.8001, 70));
        return 12;
      });

      await expect(
        getBestCurrentCoordinates({
          samples: 2,
          desiredAccuracyMeters: 10,
          maxAcceptedAccuracyMeters: 100,
        }),
      ).resolves.toMatchObject({ accuracy: 40 });
    });

    it("ignores callbacks after a result has settled", async () => {
      let successCallback!: (value: unknown) => void;
      let failureCallback!: (value: unknown) => void;
      mockGeo.watchPosition.mockImplementation((success, failure) => {
        successCallback = success;
        failureCallback = failure;
        (globalThis as any).queueMicrotask(() =>
          success(position(1, 2, 5)),
        );
        return 13;
      });

      await expect(getBestCurrentCoordinates()).resolves.toMatchObject({
        accuracy: 5,
      });
      successCallback(position(3, 4, 1));
      failureCallback({ code: 1, message: "late failure" });
    });

    it("rejects mocked samples and accepts approximate location accuracy", async () => {
      mockGeo.watchPosition
        .mockImplementationOnce(success => {
          success({ ...position(1, 2), mocked: true });
          return 1;
        })
        .mockImplementationOnce(success => {
          success(position(1, 2, 180));
          return 2;
        });

      await expect(getBestCurrentCoordinates()).rejects.toThrow(
        "Mock location",
      );
      await expect(
        getBestCurrentCoordinates({
          samples: 1,
          maxAcceptedAccuracyMeters: 100,
        }),
      ).resolves.toMatchObject({ accuracy: 180 });
    });

    it.each([
      [{ code: 2, message: "unavailable" }, "GPS disabled"],
      [{ code: 1, message: "provider disabled" }, "GPS disabled"],
      [{ code: 1, message: "location service off" }, "GPS disabled"],
      [{ code: 1, message: "GPS disabled" }, "GPS disabled"],
    ])("maps unavailable watch error %#", async (error, expected) => {
      mockGeo.watchPosition.mockImplementation((_success, failure) => {
        failure(error);
        return 3;
      });

      await expect(getBestCurrentCoordinates()).rejects.toThrow(expected);
    });

    it("falls back from timeout to balanced single-position mode", async () => {
      mockGeo.watchPosition.mockImplementation((_success, failure) => {
        failure({ code: 3, message: "timeout" });
        return 4;
      });
      mockGeo.getCurrentPosition
        .mockImplementationOnce((_success, failure) =>
          failure({ code: 3, message: "timeout" }),
        )
        .mockImplementationOnce((success, _failure, options) => {
          expect(options.enableHighAccuracy).toBe(false);
          success(position(23, 77, 50));
        });

      await expect(
        getBestCurrentCoordinates({ timeoutMs: 4000 }),
      ).resolves.toMatchObject({ latitude: 23, longitude: 77 });
    });

  it("uses high-accuracy fallback for a generic watch error", async () => {
      mockGeo.watchPosition.mockImplementation((_success, failure) => {
        failure({ code: 1, message: "temporary error" });
        return 5;
      });
      mockGeo.getCurrentPosition.mockImplementation(
        (success, _failure, options) => {
          expect(options.enableHighAccuracy).toBe(true);
          expect(options.timeout).toBe(6000);
          success(position(10, 20, 25));
        },
      );

      await expect(
        getBestCurrentCoordinates({ timeoutMs: 1000 }),
      ).resolves.toMatchObject({ latitude: 10 });
    });

    it("uses balanced mode when high-accuracy GPS is disabled", async () => {
      mockGeo.watchPosition.mockImplementation((_success, failure) => {
        failure({ code: 1, message: "temporary watch failure" });
        return 15;
      });
      mockGeo.getCurrentPosition
        .mockImplementationOnce((_success, failure) =>
          failure({ code: 2, message: "provider unavailable" }),
        )
        .mockImplementationOnce(success =>
          success(position(7, 8, 40)),
        );

      await expect(getBestCurrentCoordinates()).resolves.toMatchObject({
        latitude: 7,
        longitude: 8,
      });
    });

    it("rejects unknown fallback accuracy instead of reporting zero-meter accuracy", async () => {
      mockGeo.watchPosition.mockImplementation((_success, failure) => {
        failure({});
        return 14;
      });
      mockGeo.getCurrentPosition.mockImplementation(success =>
        success({
          coords: { latitude: 5, longitude: 6 },
        }),
      );
      jest.spyOn(Date, "now").mockReturnValue(700);

      await expect(getBestCurrentCoordinates()).rejects.toThrow("accuracy is too weak");
    });

    it("does not accept unusable GPS just because the watch timed out", async () => {
      jest.useFakeTimers();
      mockGeo.watchPosition.mockImplementation(success => {
        success(position(19.14, 72.80, 500));
        return 16;
      });
      const pending = getBestCurrentCoordinates({ timeoutMs: 100, maxAcceptedAccuracyMeters: 50 });
      const assertion = expect(pending).rejects.toThrow("accuracy is too weak");
      await jest.advanceTimersByTimeAsync(100);
      await assertion;
    });

    it.each([500, 0])("rejects inaccurate fallback readings (%sm)", async accuracy => {
      mockGeo.watchPosition.mockImplementation((_success, failure) => {
        failure({ code: 3, message: "timeout" });
        return 17;
      });
      mockGeo.getCurrentPosition.mockImplementation(success => success(position(19.14, 72.80, accuracy)));
      await expect(getBestCurrentCoordinates({ maxAcceptedAccuracyMeters: 50 })).rejects.toThrow("accuracy is too weak");
    });

    it.each([
      [position(Number.NaN, 2), "Unable to fetch GPS location"],
      [
        { ...position(1, 2), mocked: true },
        "Mock location detected",
      ],
    ])("rejects invalid fallback position %#", async (value, expected) => {
      mockGeo.watchPosition.mockImplementation((_success, failure) => {
        failure({ code: 1, message: "watch failed" });
        return 6;
      });
      mockGeo.getCurrentPosition
        .mockImplementationOnce(success => success(value))
        .mockImplementationOnce((_success, failure) =>
          failure({ code: 1, message: expected }),
        );

      await expect(getBestCurrentCoordinates()).rejects.toThrow(
        "watch failed",
      );
    });

    it("returns the best watch sample when both fallbacks fail", async () => {
      jest.useFakeTimers();
      mockGeo.watchPosition.mockImplementation(success => {
        success(position(1, 2, 80));
        return 9;
      });
      mockGeo.getCurrentPosition.mockImplementation((_success, failure) =>
        failure({ code: 1, message: "fallback failed" }),
      );

      const pending = getBestCurrentCoordinates({
        timeoutMs: 100,
        desiredAccuracyMeters: 10,
        samples: 5,
      });
      await jest.advanceTimersByTimeAsync(100);

      await expect(pending).resolves.toMatchObject({ accuracy: 80 });
    });

    it("falls back after timeout when no watch sample exists", async () => {
      jest.useFakeTimers();
      mockGeo.watchPosition.mockReturnValue(10);
      mockGeo.getCurrentPosition.mockImplementation(success =>
        success(position(3, 4, 20)),
      );

      const pending = getBestCurrentCoordinates({ timeoutMs: 100 });
      await jest.advanceTimersByTimeAsync(100);

      await expect(pending).resolves.toMatchObject({
        latitude: 3,
        longitude: 4,
      });
    });

    it("supports abort before and during location detection", async () => {
      const alreadyAborted = new AbortController();
      alreadyAborted.abort();
      await expect(
        getBestCurrentCoordinates({ signal: alreadyAborted.signal }),
      ).rejects.toThrow("cancelled");
      expect(mockGeo.watchPosition).not.toHaveBeenCalled();

      const controller = new AbortController();
      mockGeo.watchPosition.mockReturnValue(11);
      const pending = getBestCurrentCoordinates({
        signal: controller.signal,
      });
      controller.abort();

      await expect(pending).rejects.toThrow("cancelled");
      expect(mockGeo.clearWatch).toHaveBeenCalledWith(11);
    });
  });
});
