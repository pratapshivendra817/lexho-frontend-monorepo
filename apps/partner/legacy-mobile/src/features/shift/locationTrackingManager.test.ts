describe("locationTrackingManager", () => {
  const loadModule = () => {
    jest.resetModules();

    const appStateListenerRef: { current: ((state: string) => void) | null } = { current: null };
    const netInfoListenerRef: { current: ((state: { isConnected: boolean | null }) => void) | null } = { current: null };
    const clearWatch = jest.fn();
    const getCurrentPosition = jest.fn();
    const watchPosition = jest.fn();
    const ensureLocationPermissions = jest.fn();
    const enqueueLocation = jest.fn();
    const flushLocationQueue = jest.fn();
    const sendPartnerLocationApi = jest.fn();
    const logLocationFailure = jest.fn();
    const appStateRemove = jest.fn();
    const netInfoUnsub = jest.fn();

    jest.doMock("react-native", () => ({
      AppState: {
        currentState: "active",
        addEventListener: jest.fn((_event, listener) => {
          appStateListenerRef.current = listener;
          return { remove: appStateRemove };
        }),
      },
    }));

    jest.doMock("@react-native-community/netinfo", () => ({
      __esModule: true,
      default: {
        addEventListener: jest.fn((listener) => {
          netInfoListenerRef.current = listener;
          return netInfoUnsub;
        }),
      },
    }));

    jest.doMock("react-native-geolocation-service", () => ({
      __esModule: true,
      default: {
        getCurrentPosition,
        watchPosition,
        clearWatch,
      },
    }));

    jest.doMock("./locationQueue", () => ({
      enqueueLocation,
      flushLocationQueue,
    }));

    jest.doMock("./locationPermissionManager", () => ({
      ensureLocationPermissions,
    }));

    jest.doMock("./shiftApi", () => ({
      sendPartnerLocationApi,
    }));

    jest.doMock("../../services/crashlyticsService", () => ({
      logLocationFailure,
    }));

    const mod = require("./locationTrackingManager");
    return {
      mod,
      refs: { appStateListenerRef, netInfoListenerRef },
      mocks: {
        clearWatch,
        getCurrentPosition,
        watchPosition,
        ensureLocationPermissions,
        enqueueLocation,
        flushLocationQueue,
        sendPartnerLocationApi,
        logLocationFailure,
        appStateRemove,
        netInfoUnsub,
      },
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.spyOn(Date, "now").mockReturnValue(1_000_000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe("syncTrackingByCondition", () => {
    it("stops tracking when conditions do not allow tracking", async () => {
      const { mod, mocks } = loadModule();

      await mod.syncTrackingByCondition({ shiftStarted: false, online: true, locationEnabled: true });

      expect(mocks.watchPosition).not.toHaveBeenCalled();
      expect(mod.isTrackingActive()).toBe(false);
    });

    it("starts tracking when permissions and gps are available", async () => {
      const { mod, mocks } = loadModule();
      mocks.ensureLocationPermissions.mockResolvedValue(true);
      mocks.getCurrentPosition.mockImplementation((success: () => void) => success());
      mocks.watchPosition.mockReturnValue(17);

      await mod.syncTrackingByCondition({ shiftStarted: true, online: true, locationEnabled: true });

      expect(mocks.ensureLocationPermissions).toHaveBeenCalled();
      expect(mocks.getCurrentPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        expect.objectContaining({ enableHighAccuracy: true, timeout: 8000 }),
      );
      expect(mocks.watchPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        expect.objectContaining({
          distanceFilter: 50,
          interval: 25_000,
        }),
      );
      expect(mod.isTrackingActive()).toBe(true);
    });

    it("prevents stale duplicate watches by clearing the previous watch before restarting", async () => {
      const { mod, mocks } = loadModule();
      mocks.ensureLocationPermissions.mockResolvedValue(true);
      mocks.getCurrentPosition.mockImplementation((success: () => void) => success());
      mocks.watchPosition.mockReturnValueOnce(11).mockReturnValueOnce(22);

      await mod.syncTrackingByCondition({ shiftStarted: true, online: true, locationEnabled: true });
      await mod.syncTrackingByCondition({ shiftStarted: true, online: true, locationEnabled: true });

      expect(mocks.clearWatch).toHaveBeenCalledWith(11);
      expect(mod.isTrackingActive()).toBe(true);
    });

    it("throws when permission is denied", async () => {
      const { mod, mocks } = loadModule();
      mocks.ensureLocationPermissions.mockResolvedValue(false);

      await expect(
        mod.syncTrackingByCondition({ shiftStarted: true, online: true, locationEnabled: true }),
      ).rejects.toThrow("Location permission denied.");
    });

    it("throws when gps is unavailable", async () => {
      const { mod, mocks } = loadModule();
      mocks.ensureLocationPermissions.mockResolvedValue(true);
      mocks.getCurrentPosition.mockImplementation((_success: unknown, error: (value: any) => void) =>
        error({ code: 2, message: "position unavailable" }),
      );

      await expect(
        mod.syncTrackingByCondition({ shiftStarted: true, online: true, locationEnabled: true }),
      ).rejects.toThrow("GPS is turned off. Please enable device location services.");
    });

    it("throws a generic gps error when current position fails without code 2", async () => {
      const { mod, mocks } = loadModule();
      mocks.ensureLocationPermissions.mockResolvedValue(true);
      mocks.getCurrentPosition.mockImplementation((_success: unknown, error: (value: any) => void) =>
        error({ code: 3, message: "timeout" }),
      );

      await expect(
        mod.syncTrackingByCondition({ shiftStarted: true, online: true, locationEnabled: true }),
      ).rejects.toThrow("timeout");
    });

    it("throws the fallback gps error message when the native error has no message", async () => {
      const { mod, mocks } = loadModule();
      mocks.ensureLocationPermissions.mockResolvedValue(true);
      mocks.getCurrentPosition.mockImplementation((_success: unknown, error: (value: any) => void) =>
        error({ code: 3 }),
      );

      await expect(
        mod.syncTrackingByCondition({ shiftStarted: true, online: true, locationEnabled: true }),
      ).rejects.toThrow("Unable to access current location.");
    });
  });

  describe("watch lifecycle", () => {
    it("sends normalized payloads, flushes the queue, and invokes the sent handler", async () => {
      const { mod, mocks } = loadModule();
      let watchSuccess: ((position: any) => void) | undefined;
      const onSent = jest.fn();

      mocks.ensureLocationPermissions.mockResolvedValue(true);
      mocks.getCurrentPosition.mockImplementation((success: () => void) => success());
      mocks.watchPosition.mockImplementation((success: (position: any) => void) => {
        watchSuccess = success;
        return 33;
      });
      mocks.sendPartnerLocationApi.mockResolvedValue(undefined);
      mocks.flushLocationQueue.mockResolvedValue(undefined);

      mod.setLocationSentHandler(onSent);
      mod.setTrackingContext({ bookingId: 55, customerLatitude: 12.4, customerLongitude: 77.8 });

      await mod.syncTrackingByCondition({ shiftStarted: true, online: true, locationEnabled: true });

      expect(watchSuccess).toBeDefined();

      actCall(() =>
        watchSuccess?.({
          coords: {
            latitude: 12.9,
            longitude: 77.5,
            accuracy: 4,
            speed: 2,
            heading: 90,
            mocked: true,
          },
          mocked: true,
        }),
      );

      await flushPromises();

      expect(mocks.sendPartnerLocationApi).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: 12.9,
          longitude: 77.5,
          accuracy: 4,
          accuracyMeters: 4,
          speedKmh: 7.2,
          headingDegrees: 90,
          mockLocation: true,
          rootedDevice: false,
          gpsEnabled: true,
          trackingState: "AVAILABLE",
          bookingId: 55,
          customerLatitude: 12.4,
          customerLongitude: 77.8,
          capturedAt: 1_000_000,
        }),
      );
      expect(mocks.flushLocationQueue).toHaveBeenCalled();
      expect(onSent).toHaveBeenCalledWith(1_000_000);
    });

    it("throttles watch updates within the foreground interval", async () => {
      const { mod, mocks } = loadModule();
      let watchSuccess: ((position: any) => void) | undefined;
      let now = 2_000_000;
      jest.spyOn(Date, "now").mockImplementation(() => now);

      mocks.ensureLocationPermissions.mockResolvedValue(true);
      mocks.getCurrentPosition.mockImplementation((success: () => void) => success());
      mocks.watchPosition.mockImplementation((success: (position: any) => void) => {
        watchSuccess = success;
        return 44;
      });
      mocks.sendPartnerLocationApi.mockResolvedValue(undefined);
      mocks.flushLocationQueue.mockResolvedValue(undefined);

      await mod.syncTrackingByCondition({ shiftStarted: true, online: true, locationEnabled: true });

      watchSuccess?.({ coords: { latitude: 1, longitude: 2, accuracy: 3, speed: -1, heading: -1 } });
      await flushPromises();

      now += 1_000;
      watchSuccess?.({ coords: { latitude: 4, longitude: 5, accuracy: 6, speed: -1, heading: -1 } });
      await flushPromises();

      expect(mocks.sendPartnerLocationApi).toHaveBeenCalledTimes(1);
    });

    it("logs and enqueues locations when push fails", async () => {
      const { mod, mocks } = loadModule();
      let watchSuccess: ((position: any) => void) | undefined;

      mocks.ensureLocationPermissions.mockResolvedValue(true);
      mocks.getCurrentPosition.mockImplementation((success: () => void) => success());
      mocks.watchPosition.mockImplementation((success: (position: any) => void) => {
        watchSuccess = success;
        return 45;
      });
      mocks.sendPartnerLocationApi.mockRejectedValue(new Error("network unavailable"));
      mocks.enqueueLocation.mockResolvedValue(undefined);
      mocks.logLocationFailure.mockResolvedValue(undefined);

      await mod.syncTrackingByCondition({ shiftStarted: true, online: true, locationEnabled: true });

      watchSuccess?.({ coords: { latitude: 9, longitude: 8, accuracy: 7, speed: -1, heading: -1 } });
      await flushPromises();

      expect(mocks.logLocationFailure).toHaveBeenCalledWith(expect.any(Error), {
        source: "locationTrackingManager.pushLocation",
      });
      expect(mocks.enqueueLocation).toHaveBeenCalled();
    });

    it("logs watch errors and flushes the queue when network returns", async () => {
      const { mod, mocks, refs } = loadModule();
      let watchError: (() => Promise<void>) | undefined;

      mocks.ensureLocationPermissions.mockResolvedValue(true);
      mocks.getCurrentPosition.mockImplementation((success: () => void) => success());
      mocks.watchPosition.mockImplementation((_success: unknown, error: () => Promise<void>) => {
        watchError = error;
        return 46;
      });
      mocks.logLocationFailure.mockResolvedValue(undefined);
      mocks.flushLocationQueue.mockResolvedValue(undefined);

      await mod.syncTrackingByCondition({ shiftStarted: true, online: true, locationEnabled: true });

      await watchError?.();
      expect(mocks.logLocationFailure).toHaveBeenCalledWith(expect.any(Error), {
        source: "locationTrackingManager.watchPosition",
      });

      refs.netInfoListenerRef.current?.({ isConnected: true });
      await flushPromises();

      expect(mocks.flushLocationQueue).toHaveBeenCalled();
    });

    it("updates app state without forcing extra work when entering background", async () => {
      const { mod, mocks, refs } = loadModule();
      mocks.ensureLocationPermissions.mockResolvedValue(true);
      mocks.getCurrentPosition.mockImplementation((success: () => void) => success());
      mocks.watchPosition.mockReturnValue(47);

      await mod.syncTrackingByCondition({ shiftStarted: true, online: true, locationEnabled: true });

      refs.appStateListenerRef.current?.("background");
      refs.netInfoListenerRef.current?.({ isConnected: false });
      await flushPromises();

      expect(mocks.flushLocationQueue).not.toHaveBeenCalled();
      expect(mod.isTrackingActive()).toBe(true);
    });

    it("returns early when app state changes back to active", async () => {
      const { mod, mocks, refs } = loadModule();
      mocks.ensureLocationPermissions.mockResolvedValue(true);
      mocks.getCurrentPosition.mockImplementation((success: () => void) => success());
      mocks.watchPosition.mockReturnValue(49);

      await mod.syncTrackingByCondition({ shiftStarted: true, online: true, locationEnabled: true });

      refs.appStateListenerRef.current?.("active");
      await flushPromises();

      expect(mocks.flushLocationQueue).not.toHaveBeenCalled();
      expect(mod.isTrackingActive()).toBe(true);
    });

    it("marks payloads as offline and uses the background interval outside the active state", async () => {
      const { mod, mocks, refs } = loadModule();
      let watchSuccess: ((position: any) => void) | undefined;
      let now = 3_000_000;
      jest.spyOn(Date, "now").mockImplementation(() => now);

      mocks.ensureLocationPermissions.mockResolvedValue(true);
      mocks.getCurrentPosition.mockImplementation((success: () => void) => success());
      mocks.watchPosition.mockImplementation((success: (position: any) => void) => {
        watchSuccess = success;
        return 48;
      });
      mocks.sendPartnerLocationApi.mockResolvedValue(undefined);
      mocks.flushLocationQueue.mockResolvedValue(undefined);

      await mod.syncTrackingByCondition({ shiftStarted: true, online: true, locationEnabled: true });
      refs.appStateListenerRef.current?.("background");
      await mod.syncTrackingByCondition({ shiftStarted: true, online: false, locationEnabled: true });

      watchSuccess?.({ coords: { latitude: 1, longitude: 2, accuracy: 3, speed: -1, heading: -1 } });
      await flushPromises();

      now += 30_000;
      watchSuccess?.({ coords: { latitude: 4, longitude: 5, accuracy: 6, speed: -1, heading: -1 } });
      await flushPromises();

      expect(mocks.sendPartnerLocationApi).toHaveBeenCalledTimes(1);
      expect(mocks.sendPartnerLocationApi).toHaveBeenCalledWith(
        expect.objectContaining({
          trackingState: "OFFLINE",
          capturedAt: 3_000_000,
        }),
      );
    });
  });

  describe("cleanup helpers", () => {
    it("stops tracking and removes lifecycle subscriptions", async () => {
      const { mod, mocks } = loadModule();
      mocks.ensureLocationPermissions.mockResolvedValue(true);
      mocks.getCurrentPosition.mockImplementation((success: () => void) => success());
      mocks.watchPosition.mockReturnValue(77);

      await mod.syncTrackingByCondition({ shiftStarted: true, online: true, locationEnabled: true });
      mod.stopTrackingAndCleanup();

      expect(mocks.clearWatch).toHaveBeenCalledWith(77);
      expect(mocks.appStateRemove).toHaveBeenCalled();
      expect(mocks.netInfoUnsub).toHaveBeenCalled();
      expect(mod.isTrackingActive()).toBe(false);
    });

    it("can clean up safely even when no watch or subscriptions were created", () => {
      const { mod, mocks } = loadModule();

      mod.stopTrackingAndCleanup();

      expect(mocks.clearWatch).not.toHaveBeenCalled();
      expect(mocks.appStateRemove).not.toHaveBeenCalled();
      expect(mocks.netInfoUnsub).not.toHaveBeenCalled();
      expect(mod.isTrackingActive()).toBe(false);
    });

    it("updates tracking config only for valid positive values", async () => {
      const { mod, mocks } = loadModule();
      mocks.ensureLocationPermissions.mockResolvedValue(true);
      mocks.getCurrentPosition.mockImplementation((success: () => void) => success());
      mocks.watchPosition.mockReturnValue(88);

      mod.setTrackingConfig({
        foregroundTrackingIntervalSeconds: 40,
        backgroundTrackingIntervalSeconds: 120,
        minDistanceMeters: 75,
      });

      await mod.syncTrackingByCondition({ shiftStarted: true, online: true, locationEnabled: true });

      expect(mocks.watchPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        expect.objectContaining({
          interval: 40_000,
          distanceFilter: 75,
        }),
      );

      mod.setTrackingConfig({
        foregroundTrackingIntervalSeconds: 0,
        backgroundTrackingIntervalSeconds: -1,
        minDistanceMeters: Number.NaN,
      });

      await mod.syncTrackingByCondition({ shiftStarted: true, online: true, locationEnabled: true });
      expect(mocks.watchPosition).toHaveBeenLastCalledWith(
        expect.any(Function),
        expect.any(Function),
        expect.objectContaining({
          interval: 40_000,
          distanceFilter: 75,
        }),
      );
    });
  });
});

function actCall(callback: () => void) {
  callback();
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}
