describe("locationTrackingService", () => {
  const permissionsRequest = jest.fn();
  const sendDispatchLocation = jest.fn();
  const requestAuthorization = jest.fn();
  const getCurrentPosition = jest.fn();
  let clearIntervalSpy: jest.SpyInstance;

  const loadService = async (platform = "android") => {
    jest.resetModules();
    jest.doMock("react-native", () => ({
      PermissionsAndroid: {
        PERMISSIONS: {
          ACCESS_FINE_LOCATION: "ACCESS_FINE_LOCATION",
          ACCESS_COARSE_LOCATION: "ACCESS_COARSE_LOCATION",
        },
        RESULTS: {
          GRANTED: "granted",
        },
        request: permissionsRequest,
      },
      Platform: {
        OS: platform,
      },
    }));
    jest.doMock("react-native-geolocation-service", () => ({
      requestAuthorization,
      getCurrentPosition,
    }));
    jest.doMock("./partnerService", () => ({
      sendDispatchLocation,
    }));
    return require("./locationTrackingService");
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    clearIntervalSpy = jest.spyOn(global, "clearInterval");
    jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    permissionsRequest.mockResolvedValue("granted");
    requestAuthorization.mockResolvedValue("granted");
    sendDispatchLocation.mockResolvedValue({ data: { city: "Noida", state: "UP", pincode: "201301" } });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    delete (global as { fetch?: typeof fetch }).fetch;
    jest.restoreAllMocks();
  });

  const makePosition = (
    latitude: number,
    longitude: number,
    accuracy?: number | null,
    timestamp?: number,
  ) => ({
    coords: {
      latitude,
      longitude,
      accuracy,
    },
    timestamp,
  });

  const queueLocations = (...responses: Array<any>) => {
    let index = 0;
    getCurrentPosition.mockImplementation((success, failure) => {
      const next = responses[index++];
      if (next instanceof Error) {
        failure(next);
        return;
      }
      if (next?.coords?.accuracy && next.coords.accuracy > 80) {
        success(next);
        return;
      }
      success(next);
    });
  };

  const jsonResponse = (payload: unknown, ok = true) => ({
    ok,
    json: jest.fn(async () => payload),
  });

  const queueFetchResponses = (...responses: Array<Error | ReturnType<typeof jsonResponse>>) => {
    const fetchMock = jest.fn();
    responses.forEach((response) => {
      if (response instanceof Error) {
        fetchMock.mockRejectedValueOnce(response);
        return;
      }
      fetchMock.mockResolvedValueOnce(response);
    });
    (global as { fetch?: jest.Mock }).fetch = fetchMock;
    return fetchMock;
  };

  describe("requestLocationPermission", () => {
    it("returns true for ios granted permission", async () => {
      const service = await loadService("ios");
      requestAuthorization.mockResolvedValueOnce("granted");

      await expect(service.requestLocationPermission()).resolves.toBe(true);
    });

    it("returns false for ios denied permission", async () => {
      const service = await loadService("ios");
      requestAuthorization.mockResolvedValueOnce("denied");

      await expect(service.requestLocationPermission()).resolves.toBe(false);
    });

    it("returns true for android fine permission and falls back to coarse permission", async () => {
      let service = await loadService("android");
      permissionsRequest.mockResolvedValueOnce("granted");
      await expect(service.requestLocationPermission()).resolves.toBe(true);

      service = await loadService("android");
      permissionsRequest.mockResolvedValueOnce("denied").mockResolvedValueOnce("granted");
      await expect(service.requestLocationPermission()).resolves.toBe(true);

      service = await loadService("android");
      permissionsRequest.mockResolvedValueOnce("denied").mockResolvedValueOnce("denied");
      await expect(service.requestLocationPermission()).resolves.toBe(false);
    });
  });

  describe("getCurrentLocation", () => {
    it("returns a high-accuracy location immediately", async () => {
      const service = await loadService();
      queueLocations({
        coords: { latitude: 28.6, longitude: 77.2, accuracy: 20 },
        timestamp: 123,
      });

      await expect(service.getCurrentLocation()).resolves.toEqual({
        latitude: 28.6,
        longitude: 77.2,
        accuracy: 20,
        timestamp: 123,
      });
    });

    it("falls back to balanced accuracy when the first attempt fails", async () => {
      const service = await loadService();
      queueLocations(
        new Error("timeout"),
        makePosition(28.61, 77.21, 30, 456),
      );

      await expect(service.getCurrentLocation()).resolves.toEqual({
        latitude: 28.61,
        longitude: 77.21,
        accuracy: 30,
        timestamp: 456,
      });
    });

    it("rejects when both location attempts fail", async () => {
      const service = await loadService();
      queueLocations(new Error("timeout"), new Error("gps unavailable"));

      await expect(service.getCurrentLocation()).rejects.toThrow("gps unavailable");
    });

    it("retries with balanced accuracy when the high-accuracy fix is too imprecise", async () => {
      const service = await loadService();
      queueLocations(
        makePosition(28.6, 77.2, 120, 0),
        makePosition(28.61, 77.21, undefined, 0),
      );

      await expect(service.getCurrentLocation()).resolves.toEqual({
        latitude: 28.61,
        longitude: 77.21,
        accuracy: null,
        timestamp: 1_700_000_000_000,
      });
      expect(getCurrentPosition).toHaveBeenNthCalledWith(
        1,
        expect.any(Function),
        expect.any(Function),
        expect.objectContaining({
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0,
        }),
      );
      expect(getCurrentPosition).toHaveBeenNthCalledWith(
        2,
        expect.any(Function),
        expect.any(Function),
        expect.objectContaining({
          enableHighAccuracy: false,
          timeout: 25000,
          maximumAge: 0,
        }),
      );
    });
  });

  describe("startLocationTracking, stopLocationTracking, and isLocationTrackingRunning", () => {
    it("starts tracking, posts locations, and clears the previous interval on restart", async () => {
      const service = await loadService();
      queueLocations(
        { coords: { latitude: 10, longitude: 20, accuracy: 10 }, timestamp: 1 },
        { coords: { latitude: 11, longitude: 21, accuracy: 12 }, timestamp: 2 },
        { coords: { latitude: 12, longitude: 22, accuracy: 14 }, timestamp: 3 },
      );

      await service.startLocationTracking(1000);
      expect(service.isLocationTrackingRunning()).toBe(true);
      expect(sendDispatchLocation).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: 10,
          longitude: 20,
          trackingState: "AVAILABLE",
        }),
      );

      await jest.advanceTimersByTimeAsync(1000);
      expect(sendDispatchLocation).toHaveBeenCalledWith(expect.objectContaining({ latitude: 11, longitude: 21 }));

      await service.startLocationTracking(500);
      expect(clearIntervalSpy).toHaveBeenCalled();

      service.stopLocationTracking();
      expect(service.isLocationTrackingRunning()).toBe(false);
    });

    it("throws when permission is denied", async () => {
      const service = await loadService();
      permissionsRequest.mockResolvedValueOnce("denied").mockResolvedValueOnce("denied");

      await expect(service.startLocationTracking()).rejects.toThrow("Location permission denied.");
    });
  });

  describe("detectAndSyncCurrentLocation", () => {
    it("uses backend metadata when available and returns high confidence", async () => {
      const service = await loadService();
      queueLocations(
        makePosition(28.6, 77.2, 40, 1000),
        makePosition(28.6, 77.2, 20, 1001),
      );

      const promise = service.detectAndSyncCurrentLocation();
      await jest.advanceTimersByTimeAsync(3500);
      await expect(promise).resolves.toMatchObject({
        latitude: 28.6,
        longitude: 77.2,
        label: "Noida, UP",
        pincode: "201301",
        provider: "backend",
        confidence: "HIGH",
        boundaryVerifying: false,
      });
    });

    it("falls back to reverse geocoding and reuses a sticky pincode during boundary verification", async () => {
      queueFetchResponses(
        jsonResponse({
          localityInfo: { administrative: [{ name: "Sector 62" }] },
          locality: "Noida",
        }),
        jsonResponse({
          localityInfo: { administrative: [{ name: "Sector 62" }] },
          locality: "Noida",
        }),
      );

      let service = await loadService();
      sendDispatchLocation
        .mockRejectedValueOnce(new Error("backend down"))
        .mockResolvedValueOnce({ data: { city: "Noida", state: "UP", pincode: "222222" } });
      queueLocations(
        makePosition(28.6, 77.2, 20, 1000),
        makePosition(28.6, 77.2, 18, 1001),
        makePosition(28.6005, 77.2005, 25, 1010),
        makePosition(28.6005, 77.2005, 24, 1011),
      );

      let promise = service.detectAndSyncCurrentLocation();
      await jest.advanceTimersByTimeAsync(3500);
      await expect(promise).resolves.toMatchObject({
        label: "Sector 62, Noida",
        provider: "bigdatacloud",
        pincode: null,
        confidence: "MEDIUM",
      });

      jest.spyOn(Date, "now").mockReturnValue(1_700_000_010_000);
      promise = service.detectAndSyncCurrentLocation();
      await jest.advanceTimersByTimeAsync(3500);
      await expect(promise).resolves.toMatchObject({
        label: "Noida, UP",
        pincode: "222222",
        boundaryVerifying: false,
      });

      sendDispatchLocation.mockResolvedValueOnce({ data: { city: "Noida", state: "UP", pincode: "333333" } });
      queueLocations(
        makePosition(28.6006, 77.2006, 25, 1012),
        makePosition(28.6006, 77.2006, 24, 1013),
      );
      jest.spyOn(Date, "now").mockReturnValue(1_700_000_020_000);

      promise = service.detectAndSyncCurrentLocation();
      await jest.advanceTimersByTimeAsync(3500);
      await expect(promise).resolves.toMatchObject({
        pincode: "222222",
        boundaryVerifying: true,
      });
    });

    it("reuses recent cached metadata and ignores outlier GPS jumps", async () => {
      const service = await loadService();
      queueFetchResponses();
      queueLocations(
        makePosition(12.9716, 77.5946, 25, 1000),
        makePosition(12.9716, 77.5946, 20, 1001),
      );

      let promise = service.detectAndSyncCurrentLocation();
      await jest.advanceTimersByTimeAsync(3500);
      await promise;

      sendDispatchLocation.mockRejectedValueOnce(new Error("backend down"));
      queueLocations(
        makePosition(13.5, 78.5, 22, 1002),
        makePosition(13.5, 78.5, 18, 1003),
        makePosition(13.5, 78.5, 18, 1004),
      );
      jest.spyOn(Date, "now").mockReturnValue(1_700_000_001_000);

      promise = service.detectAndSyncCurrentLocation();
      await jest.advanceTimersByTimeAsync(3500);
      await expect(promise).resolves.toMatchObject({
        latitude: 12.9716,
        longitude: 77.5946,
        label: "Noida, UP",
        provider: "backend",
      });
    });

    it("keeps the previous pincode until the new backend pincode stays stable long enough", async () => {
      const service = await loadService();
      queueLocations(
        makePosition(28.6, 77.2, 20, 1000),
        makePosition(28.6, 77.2, 18, 1001),
      );

      let promise = service.detectAndSyncCurrentLocation();
      await jest.advanceTimersByTimeAsync(3500);
      await expect(promise).resolves.toMatchObject({ pincode: "201301" });

      sendDispatchLocation.mockResolvedValueOnce({ data: { city: "Noida", state: "UP", pincode: "201302" } });
      queueLocations(
        makePosition(28.6002, 77.2002, 24, 1010),
        makePosition(28.6002, 77.2002, 22, 1011),
      );
      jest.spyOn(Date, "now").mockReturnValue(1_700_000_010_000);

      promise = service.detectAndSyncCurrentLocation();
      await jest.advanceTimersByTimeAsync(3500);
      await expect(promise).resolves.toMatchObject({
        pincode: "201301",
        boundaryVerifying: true,
      });

      sendDispatchLocation.mockResolvedValueOnce({ data: { city: "Noida", state: "UP", pincode: "201302" } });
      queueLocations(
        makePosition(28.6003, 77.2003, 24, 1012),
        makePosition(28.6003, 77.2003, 21, 1013),
      );
      jest.spyOn(Date, "now").mockReturnValue(1_700_000_020_000);

      promise = service.detectAndSyncCurrentLocation();
      await jest.advanceTimersByTimeAsync(3500);
      await expect(promise).resolves.toMatchObject({
        pincode: "201301",
        boundaryVerifying: true,
      });
    });

    it("returns the first settled reading when the follow-up reading fails", async () => {
      const service = await loadService();
      sendDispatchLocation.mockResolvedValueOnce({ data: { city: "Noida" } });
      queueLocations(
        makePosition(19.1, 72.8, 25, 1000),
        new Error("follow-up GPS failure"),
      );

      const promise = service.detectAndSyncCurrentLocation();
      await jest.advanceTimersByTimeAsync(3500);
      await expect(promise).resolves.toMatchObject({
        latitude: 19.1,
        longitude: 72.8,
        label: "Noida",
        provider: "backend",
        confidence: "HIGH",
      });
    });

    it("retries settled reads and picks the most accurate trusted location", async () => {
      const service = await loadService();
      sendDispatchLocation.mockResolvedValueOnce({ data: { state: "UP" } });
      queueLocations(
        makePosition(28.5, 77.1, 75, 1000),
        makePosition(28.5, 77.1, 70, 1001),
        makePosition(28.55, 77.15, 65, 1002),
        makePosition(28.55, 77.15, 60, 1003),
        makePosition(28.6, 77.2, 45, 1004),
        makePosition(28.6, 77.2, 40, 1005),
      );

      const promise = service.detectAndSyncCurrentLocation();
      await jest.advanceTimersByTimeAsync(20_500);
      await expect(promise).resolves.toMatchObject({
        latitude: 28.6,
        longitude: 77.2,
        accuracy: 40,
        label: "UP",
        provider: "backend",
        confidence: "MEDIUM",
      });
    });

    it.each([
      {
        name: "a sector-only BigDataCloud response",
        payload: { localityInfo: { administrative: [{ name: "Sector 62" }] } },
        expectedLabel: "Sector 62",
      },
      {
        name: "a city-and-state BigDataCloud response",
        payload: { locality: "Noida", principalSubdivision: "UP" },
        expectedLabel: "Noida, UP",
      },
      {
        name: "a city-only BigDataCloud response",
        payload: { city: "Noida" },
        expectedLabel: "Noida",
      },
      {
        name: "a state-only BigDataCloud response",
        payload: { principalSubdivision: "UP" },
        expectedLabel: "UP",
      },
    ])("uses $name when backend metadata is unavailable", async ({ payload, expectedLabel }) => {
      const service = await loadService();
      sendDispatchLocation.mockRejectedValueOnce(new Error("backend down"));
      queueFetchResponses(jsonResponse(payload));
      queueLocations(
        makePosition(28.6, 77.2, 30, 1000),
        makePosition(28.6, 77.2, 28, 1001),
      );

      const promise = service.detectAndSyncCurrentLocation();
      await jest.advanceTimersByTimeAsync(3500);
      await expect(promise).resolves.toMatchObject({
        label: expectedLabel,
        provider: "bigdatacloud",
        confidence: "MEDIUM",
      });
    });

    it.each([
      {
        name: "sector and locality from Nominatim",
        payload: { address: { suburb: "Sector 18", city_district: "Noida" } },
        expectedLabel: "Sector 18, Noida",
      },
      {
        name: "sector and region from Nominatim",
        payload: { address: { suburb: "Sector 18", state: "UP" } },
        expectedLabel: "Sector 18, UP",
      },
      {
        name: "sector only from Nominatim",
        payload: { address: { neighbourhood: "Sector 18" } },
        expectedLabel: "Sector 18",
      },
      {
        name: "locality and region from Nominatim",
        payload: { address: { city: "Noida", state: "UP" } },
        expectedLabel: "Noida, UP",
      },
      {
        name: "locality only from Nominatim",
        payload: { address: { town: "Noida" } },
        expectedLabel: "Noida",
      },
      {
        name: "region only from Nominatim",
        payload: { address: { county: "Gautam Buddha Nagar" } },
        expectedLabel: "Gautam Buddha Nagar",
      },
      {
        name: "display_name from Nominatim",
        payload: { display_name: "Block A, Noida, Uttar Pradesh, India" },
        expectedLabel: "Block A, Noida",
      },
    ])("uses $name when BigDataCloud cannot resolve a label", async ({ payload, expectedLabel }) => {
      const service = await loadService();
      sendDispatchLocation.mockRejectedValueOnce(new Error("backend down"));
      queueFetchResponses(jsonResponse({}), jsonResponse(payload));
      queueLocations(
        makePosition(28.6, 77.2, 30, 1000),
        makePosition(28.6, 77.2, 28, 1001),
      );

      const promise = service.detectAndSyncCurrentLocation();
      await jest.advanceTimersByTimeAsync(3500);
      await expect(promise).resolves.toMatchObject({
        label: expectedLabel,
        provider: "nominatim",
        confidence: "MEDIUM",
      });
    });

    it("returns null label metadata when both reverse-geocoding providers fail", async () => {
      const service = await loadService();
      sendDispatchLocation.mockRejectedValueOnce(new Error("backend down"));
      queueFetchResponses(new Error("bdc down"), new Error("nominatim down"));
      queueLocations(
        makePosition(28.7, 77.3, 30, 1000),
        makePosition(28.7, 77.3, 28, 1001),
      );

      const promise = service.detectAndSyncCurrentLocation();
      await jest.advanceTimersByTimeAsync(3500);
      await expect(promise).resolves.toMatchObject({
        label: null,
        provider: null,
        pincode: null,
        confidence: "MEDIUM",
      });
    });

    it("returns null label metadata when Nominatim responds without usable address fields", async () => {
      const service = await loadService();
      sendDispatchLocation.mockRejectedValueOnce(new Error("backend down"));
      queueFetchResponses(jsonResponse({}), jsonResponse({}));
      queueLocations(
        makePosition(28.71, 77.31, 30, 1000),
        makePosition(28.71, 77.31, 28, 1001),
      );

      const promise = service.detectAndSyncCurrentLocation();
      await jest.advanceTimersByTimeAsync(3500);
      await expect(promise).resolves.toMatchObject({
        label: null,
        provider: null,
        pincode: null,
      });
    });

    it("drops the cached pincode when the device moves beyond the sticky distance", async () => {
      const service = await loadService();
      queueLocations(
        makePosition(28.6, 77.2, 20, 1000),
        makePosition(28.6, 77.2, 18, 1001),
      );

      let promise = service.detectAndSyncCurrentLocation();
      await jest.advanceTimersByTimeAsync(3500);
      await expect(promise).resolves.toMatchObject({
        pincode: "201301",
      });

      sendDispatchLocation.mockRejectedValueOnce(new Error("backend down"));
      queueFetchResponses(jsonResponse({}, false), jsonResponse({}, false));
      queueLocations(
        makePosition(28.62, 77.22, 30, 20_500),
        makePosition(28.62, 77.22, 28, 20_501),
      );
      jest.spyOn(Date, "now").mockReturnValue(1_700_000_010_000);

      promise = service.detectAndSyncCurrentLocation();
      await jest.advanceTimersByTimeAsync(3500);
      await expect(promise).resolves.toMatchObject({
        label: null,
        provider: null,
        pincode: null,
        confidence: "MEDIUM",
      });
    });

    it("formats backend label fallbacks for city-only, state-only, and pincode-only responses", async () => {
      const service = await loadService();
      const backendResponses = [
        { data: { city: "Noida" }, expectedLabel: "Noida" },
        { data: { state: "UP" }, expectedLabel: "UP" },
        { data: { postalCode: "201301" }, expectedLabel: "Pincode 201301" },
      ];

      for (const [index, response] of backendResponses.entries()) {
        sendDispatchLocation.mockResolvedValueOnce(response.data);
        queueLocations(
          makePosition(28.6 + index * 0.0001, 77.2 + index * 0.0001, 30, 1000 + index * 10),
          makePosition(28.6 + index * 0.0001, 77.2 + index * 0.0001, 28, 1001 + index * 10),
        );

        const promise = service.detectAndSyncCurrentLocation();
        await jest.advanceTimersByTimeAsync(3500);
        const result = await promise;

        expect(result.label).toBe(response.expectedLabel);
        expect(result.provider).toBe("backend");
        expect(result.confidence).toBe("MEDIUM");
      }
    });

    it("marks backend responses as low confidence when the trusted accuracy stays above 50 meters", async () => {
      const service = await loadService();
      sendDispatchLocation.mockResolvedValueOnce({ data: { city: "Noida" } });
      queueLocations(
        makePosition(28.5, 77.1, 75, 1000),
        makePosition(28.5, 77.1, 70, 1001),
        makePosition(28.55, 77.15, 65, 1002),
        makePosition(28.55, 77.15, 60, 1003),
        makePosition(28.6, 77.2, 58, 1004),
        makePosition(28.6, 77.2, 55, 1005),
      );

      const promise = service.detectAndSyncCurrentLocation();
      await jest.advanceTimersByTimeAsync(20_500);
      await expect(promise).resolves.toMatchObject({
        label: "Noida",
        provider: "backend",
        confidence: "LOW",
      });
    });

    it("rejects when permission is denied", async () => {
      const service = await loadService();
      permissionsRequest.mockResolvedValueOnce("denied").mockResolvedValueOnce("denied");

      await expect(service.detectAndSyncCurrentLocation()).rejects.toThrow("Location permission denied.");
    });
  });
});
