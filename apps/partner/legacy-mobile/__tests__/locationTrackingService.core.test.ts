function loadLocationTrackingService({
  platform = "android",
}: {
  platform?: "android" | "ios";
} = {}) {
  jest.resetModules();

  const mockPermissionRequest = jest.fn(async () => "granted");
  const mockRequestAuthorization = jest.fn(async () => "granted");
  const mockGetCurrentPosition = jest.fn();
  const mockSendDispatchLocation = jest.fn(async () => ({
    data: { city: "Gurugram", state: "Haryana", pincode: "122002" },
  }));

  jest.doMock("react-native", () => ({
    __esModule: true,
    PermissionsAndroid: {
      PERMISSIONS: {
        ACCESS_FINE_LOCATION: "ACCESS_FINE_LOCATION",
        ACCESS_COARSE_LOCATION: "ACCESS_COARSE_LOCATION",
      },
      RESULTS: { GRANTED: "granted", DENIED: "denied" },
      request: mockPermissionRequest,
    },
    Platform: { OS: platform },
  }));
  jest.doMock("react-native-geolocation-service", () => ({
    __esModule: true,
    default: {
      requestAuthorization: mockRequestAuthorization,
      getCurrentPosition: mockGetCurrentPosition,
    },
  }));
  jest.doMock("../src/services/partnerService", () => ({
    __esModule: true,
    sendDispatchLocation: mockSendDispatchLocation,
  }));

  const mod = require("../src/services/locationTrackingService");
  return {
    mod,
    mockPermissionRequest,
    mockRequestAuthorization,
    mockGetCurrentPosition,
    mockSendDispatchLocation,
  };
}

function queuePoints(
  mockGetCurrentPosition: jest.Mock,
  ...points: Array<{ latitude: number; longitude: number; accuracy?: number | null; timestamp?: number }>
) {
  points.forEach((point) => {
    mockGetCurrentPosition.mockImplementationOnce((success: Function) => {
      success({
        coords: {
          latitude: point.latitude,
          longitude: point.longitude,
          accuracy: point.accuracy ?? 10,
        },
        timestamp: point.timestamp ?? Date.now(),
      });
    });
  });
}

describe("locationTrackingService core flows", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("handles android and ios permission requests", async () => {
    const androidLoaded = loadLocationTrackingService();
    androidLoaded.mockPermissionRequest.mockResolvedValueOnce("granted");
    await expect(androidLoaded.mod.requestLocationPermission()).resolves.toBe(true);

    androidLoaded.mockPermissionRequest.mockResolvedValueOnce("denied").mockResolvedValueOnce("granted");
    await expect(androidLoaded.mod.requestLocationPermission()).resolves.toBe(true);

    const iosLoaded = loadLocationTrackingService({ platform: "ios" });
    iosLoaded.mockRequestAuthorization.mockResolvedValueOnce("granted");
    await expect(iosLoaded.mod.requestLocationPermission()).resolves.toBe(true);
  });

  it("reads current location with high-accuracy fallback", async () => {
    const { mod, mockGetCurrentPosition } = loadLocationTrackingService();

    queuePoints(mockGetCurrentPosition, {
      latitude: 28.61,
      longitude: 77.2,
      accuracy: 18,
      timestamp: 1000,
    });
    await expect(mod.getCurrentLocation()).resolves.toEqual({
      latitude: 28.61,
      longitude: 77.2,
      accuracy: 18,
      timestamp: 1000,
    });

    mockGetCurrentPosition
      .mockImplementationOnce((_success: Function, failure: Function) => failure(new Error("gps unavailable")))
      .mockImplementationOnce((success: Function) => {
        success({
          coords: { latitude: 28.62, longitude: 77.21, accuracy: 25 },
          timestamp: 2000,
        });
      });
    await expect(mod.getCurrentLocation()).resolves.toEqual({
      latitude: 28.62,
      longitude: 77.21,
      accuracy: 25,
      timestamp: 2000,
    });

    mockGetCurrentPosition
      .mockImplementationOnce((success: Function) => {
        success({
          coords: { latitude: 28.63, longitude: 77.22, accuracy: 120 },
          timestamp: 3000,
        });
      })
      .mockImplementationOnce((success: Function) => {
        success({
          coords: { latitude: 28.631, longitude: 77.221, accuracy: 30 },
          timestamp: 3200,
        });
      });
    await expect(mod.getCurrentLocation()).resolves.toEqual({
      latitude: 28.631,
      longitude: 77.221,
      accuracy: 30,
      timestamp: 3200,
    });
  });

  it("starts interval tracking, posts location, and stops cleanly", async () => {
    const { mod, mockPermissionRequest, mockGetCurrentPosition, mockSendDispatchLocation } = loadLocationTrackingService();

    mockPermissionRequest.mockResolvedValueOnce("granted");
    queuePoints(
      mockGetCurrentPosition,
      { latitude: 28.61, longitude: 77.2, accuracy: 18, timestamp: 1000 },
      { latitude: 28.615, longitude: 77.205, accuracy: 15, timestamp: 2000 },
    );

    await mod.startLocationTracking(5000);
    expect(mockSendDispatchLocation).toHaveBeenCalledWith(expect.objectContaining({
      latitude: 28.61,
      longitude: 77.2,
      accuracy: 18,
      accuracyMeters: 18,
      trackingState: "AVAILABLE",
    }));
    expect(mod.isLocationTrackingRunning()).toBe(true);

    await jest.advanceTimersByTimeAsync(5000);
    expect(mockSendDispatchLocation).toHaveBeenCalledTimes(2);

    mod.stopLocationTracking();
    expect(mod.isLocationTrackingRunning()).toBe(false);
  });

  it("detects and syncs trusted location using backend metadata", async () => {
    const { mod, mockPermissionRequest, mockGetCurrentPosition, mockSendDispatchLocation } = loadLocationTrackingService();

    mockPermissionRequest.mockResolvedValueOnce("granted");
    queuePoints(
      mockGetCurrentPosition,
      { latitude: 28.61, longitude: 77.2, accuracy: 40, timestamp: 1000 },
      { latitude: 28.611, longitude: 77.201, accuracy: 18, timestamp: 1200 },
      { latitude: 28.611, longitude: 77.201, accuracy: 18, timestamp: 1200 },
    );

    const promise = mod.detectAndSyncCurrentLocation();
    await jest.advanceTimersByTimeAsync(3500);
    const result = await promise;

    expect(result).toEqual(expect.objectContaining({
      latitude: 28.611,
      longitude: 77.201,
      label: "Gurugram, Haryana",
      pincode: "122002",
      provider: "backend",
      confidence: "HIGH",
      boundaryVerifying: false,
    }));
    expect(mockSendDispatchLocation).toHaveBeenCalledWith(expect.objectContaining({
      latitude: 28.611,
      longitude: 77.201,
    }));
  });

  it("falls back to reverse geocoding when backend metadata is unavailable", async () => {
    const { mod, mockPermissionRequest, mockGetCurrentPosition, mockSendDispatchLocation } = loadLocationTrackingService();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn(async () => ({
        localityInfo: { administrative: [{ name: "Sector 42" }] },
        locality: "Gurugram",
      })),
    }) as any;

    mockPermissionRequest.mockResolvedValueOnce("granted");
    mockSendDispatchLocation.mockRejectedValueOnce(new Error("backend down"));
    queuePoints(
      mockGetCurrentPosition,
      { latitude: 28.7, longitude: 77.3, accuracy: 70, timestamp: 5000 },
      { latitude: 28.7, longitude: 77.3, accuracy: 30, timestamp: 5200 },
      { latitude: 28.7002, longitude: 77.3002, accuracy: 55, timestamp: 9000 },
    );

    const promise = mod.detectAndSyncCurrentLocation();
    await jest.advanceTimersByTimeAsync(3500);
    const result = await promise;

    expect(result.label).toBe("Sector 42, Gurugram");
    expect(result.provider).toBe("bigdatacloud");
    expect(result.confidence).toBe("MEDIUM");
  });

  it("falls through to nominatim when bigdatacloud fails", async () => {
    const { mod, mockPermissionRequest, mockGetCurrentPosition, mockSendDispatchLocation } = loadLocationTrackingService();
    global.fetch = jest.fn()
      .mockRejectedValueOnce(new Error("bdc down"))
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn(async () => ({
          address: {
            suburb: "DLF Phase 4",
            city: "Gurugram",
          },
        })),
      }) as any;

    mockPermissionRequest.mockResolvedValueOnce("granted");
    mockSendDispatchLocation.mockRejectedValueOnce(new Error("backend down"));
    queuePoints(
      mockGetCurrentPosition,
      { latitude: 28.5, longitude: 77.09, accuracy: 30, timestamp: 6000 },
      { latitude: 28.5, longitude: 77.09, accuracy: 30, timestamp: 6200 },
    );

    const promise = mod.detectAndSyncCurrentLocation();
    await jest.advanceTimersByTimeAsync(3500);
    const result = await promise;

    expect(result.label).toBe("DLF Phase 4, Gurugram");
    expect(result.provider).toBe("nominatim");
  });

  it("reuses cached meta, stabilizes pincode switches, and flags boundary verification", async () => {
    const { mod, mockPermissionRequest, mockGetCurrentPosition, mockSendDispatchLocation } = loadLocationTrackingService();

    mockPermissionRequest.mockResolvedValueOnce("granted");
    queuePoints(
      mockGetCurrentPosition,
      { latitude: 28.61, longitude: 77.2, accuracy: 20, timestamp: 1000 },
      { latitude: 28.61, longitude: 77.2, accuracy: 20, timestamp: 1200 },
    );
    mockSendDispatchLocation.mockResolvedValueOnce({
      data: { city: "Gurugram", state: "Haryana", pincode: "122002" },
    });
    const first = mod.detectAndSyncCurrentLocation();
    await jest.advanceTimersByTimeAsync(3500);
    await first;

    global.fetch = jest.fn() as any;
    mockPermissionRequest.mockResolvedValueOnce("granted");
    queuePoints(
      mockGetCurrentPosition,
      { latitude: 28.6105, longitude: 77.2005, accuracy: 30, timestamp: 4000 },
      { latitude: 28.6105, longitude: 77.2005, accuracy: 30, timestamp: 4200 },
    );
    mockSendDispatchLocation.mockRejectedValueOnce(new Error("backend down"));
    const reused = mod.detectAndSyncCurrentLocation();
    await jest.advanceTimersByTimeAsync(3500);
    const reusedResult = await reused;
    expect(reusedResult.label).toBe("Gurugram, Haryana");
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(0);

    mockPermissionRequest.mockResolvedValueOnce("granted");
    queuePoints(
      mockGetCurrentPosition,
      { latitude: 28.6108, longitude: 77.2008, accuracy: 20, timestamp: 5000 },
      { latitude: 28.6108, longitude: 77.2008, accuracy: 20, timestamp: 5200 },
    );
    mockSendDispatchLocation.mockResolvedValueOnce({
      data: { city: "Gurugram", state: "Haryana", pincode: "122003" },
    });
    const verifying = mod.detectAndSyncCurrentLocation();
    await jest.advanceTimersByTimeAsync(3500);
    const verifyingResult = await verifying;

    expect(verifyingResult.pincode).toBe("122002");
    expect(verifyingResult.boundaryVerifying).toBe(true);
  });
});
