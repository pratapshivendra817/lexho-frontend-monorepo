import { Linking, PermissionsAndroid, Platform } from "react-native";

const mockGeo = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
};
const mockTrackAnalytics = jest.fn();
const mockRecordError = jest.fn();
const mockRnPermissionCheck = jest.fn();
const mockRnPermissionRequest = jest.fn();
const mockRnPermissions = {
  RESULTS: {
    GRANTED: "granted",
    BLOCKED: "blocked",
    DENIED: "denied",
  },
  PERMISSIONS: {
    ANDROID: {
      ACCESS_FINE_LOCATION: undefined as string | undefined,
    },
  },
  check: (...args: unknown[]) => mockRnPermissionCheck(...args),
  request: (...args: unknown[]) => mockRnPermissionRequest(...args),
};

jest.mock("react-native-geolocation-service", () => ({
  __esModule: true,
  default: {
    getCurrentPosition: (...args: any[]) => mockGeo.getCurrentPosition(...args),
    watchPosition: (...args: any[]) => mockGeo.watchPosition(...args),
    clearWatch: (...args: any[]) => mockGeo.clearWatch(...args),
  },
}));
jest.mock("../src/services/firebaseAnalytics", () => ({
  trackAnalyticsEvent: (...args: unknown[]) => mockTrackAnalytics(...args),
}));
jest.mock("../src/services/firebaseCrashlytics", () => ({
  recordNonFatalError: (...args: unknown[]) => mockRecordError(...args),
}));
jest.mock("react-native-permissions", () => mockRnPermissions, { virtual: true });

import {
  getBestCurrentCoordinates,
  getCurrentCoordinates,
} from "../src/hooks/useCurrentLocation";
import {
  openLocationSettings,
  requestLocationPermission,
} from "../src/hooks/useLocationPermission";
import { formatAddressLine } from "../src/utils/addressFormatter";
import { trackLocationEvent } from "../src/utils/locationAnalytics";
import { reverseGeocodeCoordinates } from "../src/utils/reverseGeocode";

describe("location permissions", () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, "OS", { configurable: true, value: "android" });
    PermissionsAndroid.check = jest.fn();
    PermissionsAndroid.requestMultiple = jest.fn();
    Linking.openSettings = jest.fn();
    mockRnPermissions.PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION = undefined;
  });

  afterAll(() => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: originalOS });
  });

  it("returns denied outside Android", async () => {
    Object.defineProperty(Platform, "OS", { configurable: true, value: "ios" });
    await expect(requestLocationPermission()).resolves.toBe("denied");
  });

  it.each([
    [true, false, "granted"],
    [false, true, "granted"],
    [false, false, "denied"],
  ])("handles Android fallback checks", async (fine, coarse, expected) => {
    (PermissionsAndroid.check as jest.Mock)
      .mockResolvedValueOnce(fine)
      .mockResolvedValueOnce(coarse);
    (PermissionsAndroid.requestMultiple as jest.Mock).mockResolvedValue({
      [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]:
        PermissionsAndroid.RESULTS.DENIED,
      [PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION]:
        PermissionsAndroid.RESULTS.DENIED,
    });
    await expect(requestLocationPermission()).resolves.toBe(expected);
  });

  it.each([
    [PermissionsAndroid.RESULTS.GRANTED, PermissionsAndroid.RESULTS.DENIED, "granted"],
    [PermissionsAndroid.RESULTS.DENIED, PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN, "blocked"],
    [PermissionsAndroid.RESULTS.DENIED, PermissionsAndroid.RESULTS.DENIED, "denied"],
  ])("maps permission request results", async (fine, coarse, expected) => {
    (PermissionsAndroid.check as jest.Mock).mockResolvedValue(false);
    (PermissionsAndroid.requestMultiple as jest.Mock).mockResolvedValue({
      [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]: fine,
      [PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION]: coarse,
    });
    await expect(requestLocationPermission()).resolves.toBe(expected);
  });

  it("opens application settings", async () => {
    (Linking.openSettings as jest.Mock).mockResolvedValue(undefined);
    await openLocationSettings();
    expect(Linking.openSettings).toHaveBeenCalled();
  });

  it("uses react-native-permissions when fine location is configured", async () => {
    mockRnPermissions.PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION =
      "android.permission.ACCESS_FINE_LOCATION";
    mockRnPermissionCheck.mockResolvedValue("granted");
    await expect(requestLocationPermission()).resolves.toBe("granted");
    expect(mockRnPermissionRequest).not.toHaveBeenCalled();

    mockRnPermissionCheck.mockResolvedValue("denied");
    mockRnPermissionRequest.mockResolvedValueOnce("blocked");
    await expect(requestLocationPermission()).resolves.toBe("blocked");

    mockRnPermissionRequest.mockResolvedValueOnce("denied");
    await expect(requestLocationPermission()).resolves.toBe("denied");
  });
});

describe("GPS helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it("returns current coordinates and normalizes metadata", async () => {
    mockGeo.getCurrentPosition.mockImplementation((success: (...args: any[]) => void) =>
      success({
        coords: { latitude: 22.7, longitude: 75.8, accuracy: 8, mocked: true },
        timestamp: 123,
      }),
    );
    await expect(getCurrentCoordinates(5000)).resolves.toEqual({
      latitude: 22.7,
      longitude: 75.8,
      accuracy: 8,
      timestamp: 123,
      mocked: true,
    });
  });

  it("rejects current position errors", async () => {
    mockGeo.getCurrentPosition.mockImplementation((_success: (...args: any[]) => void, failure: (...args: any[]) => void) =>
      failure({ message: "" }),
    );
    await expect(getCurrentCoordinates()).rejects.toThrow(
      "Unable to fetch GPS location",
    );
  });

  it("accepts a desired-accuracy watch sample and cleans up", async () => {
    mockGeo.watchPosition.mockImplementation((success: (...args: any[]) => void) => {
      success({
        coords: { latitude: 22.7, longitude: 75.8, accuracy: 10 },
        timestamp: Date.now(),
      });
      return 9;
    });
    await expect(
      getBestCurrentCoordinates({ desiredAccuracyMeters: 15 }),
    ).resolves.toMatchObject({ latitude: 22.7, accuracy: 10 });
  });

  it("rejects mocked, disabled, and weak GPS samples", async () => {
    mockGeo.watchPosition.mockImplementationOnce((success: (...args: any[]) => void) => {
      success({
        coords: { latitude: 22, longitude: 75, accuracy: 10, mocked: true },
        timestamp: Date.now(),
      });
      return 1;
    });
    await expect(getBestCurrentCoordinates()).rejects.toThrow("Mock location");

    mockGeo.watchPosition.mockImplementationOnce((_success: (...args: any[]) => void, failure: (...args: any[]) => void) => {
      failure({ code: 2, message: "provider disabled" });
      return 2;
    });
    await expect(getBestCurrentCoordinates()).rejects.toThrow("GPS disabled");

    mockGeo.watchPosition.mockImplementationOnce((success: (...args: any[]) => void) => {
      success({ coords: { latitude: 22, longitude: 75, accuracy: 180 }, timestamp: Date.now() });
      success({ coords: { latitude: 22.0001, longitude: 75.0001, accuracy: 170 }, timestamp: Date.now() });
      return 3;
    });
    await expect(
      getBestCurrentCoordinates({ samples: 2, maxAcceptedAccuracyMeters: 100 }),
    ).rejects.toThrow("accuracy is weak");
  });

  it("falls back from watch timeout to a balanced single position", async () => {
    mockGeo.watchPosition.mockImplementation((_success: (...args: any[]) => void, failure: (...args: any[]) => void) => {
      failure({ code: 3, message: "timeout" });
      return 4;
    });
    mockGeo.getCurrentPosition
      .mockImplementationOnce((_success: (...args: any[]) => void, failure: (...args: any[]) => void) =>
        failure({ code: 3, message: "timeout" }),
      )
      .mockImplementationOnce((success: (...args: any[]) => void) =>
        success({ coords: { latitude: 23, longitude: 77, accuracy: 50 }, timestamp: 10 }),
      );
    await expect(getBestCurrentCoordinates()).resolves.toMatchObject({
      latitude: 23,
      longitude: 77,
    });
  });

  it("supports cancellation before watching starts", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      getBestCurrentCoordinates({ signal: controller.signal }),
    ).rejects.toThrow("cancelled");
    expect(mockGeo.watchPosition).not.toHaveBeenCalled();
  });
});

describe("location utility functions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis.fetch as jest.Mock | undefined)?.mockReset?.();
  });

  it("formats unique address parts and fallback text", () => {
    expect(
      formatAddressLine({
        flatNo: "12",
        floor: "3",
        buildingName: "Lexho Tower",
        landmark: "Central Mall",
        addressLine: "Vijay Nagar, Indore",
        city: "Indore",
        state: "Madhya Pradesh",
        pincode: "452010",
      }),
    ).toBe(
      "12, Floor 3, Lexho Tower, Near Central Mall, Vijay Nagar, Indore, Madhya Pradesh, 452010",
    );
    expect(formatAddressLine(null, "Missing")).toBe("Missing");
  });

  it("normalizes analytics payloads and reports failure-class events", () => {
    trackLocationEvent("gps_success", {
      accuracy: 10,
      nested: { confidence: "HIGH" },
      ignored: null,
    });
    expect(mockTrackAnalytics).toHaveBeenCalledWith("location_gps_success", {
      accuracy: 10,
      nested: JSON.stringify({ confidence: "HIGH" }),
    });
    expect(mockRecordError).not.toHaveBeenCalled();

    trackLocationEvent("gps_permission_denied", { reason: "blocked" });
    expect(mockRecordError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ event: "gps_permission_denied" }),
    );
  });

  it("reverse geocodes valid coordinates and maps address fields", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        display_name: "Sector 10, Indore, India",
        address: {
          suburb: "Vijay Nagar",
          city: "Indore",
          state: "Madhya Pradesh",
          country: "India",
          postcode: "452010",
        },
      }),
    }) as jest.Mock;
    await expect(reverseGeocodeCoordinates(22.7, 75.8)).resolves.toEqual(
      expect.objectContaining({
        shortName: "Vijay Nagar, Indore, Madhya Pradesh",
        sector: "Sector 10",
        city: "Indore",
        pincode: "452010",
      }),
    );
  });

  it.each([
    [Number.NaN, 75],
    [22, Number.POSITIVE_INFINITY],
  ])("rejects invalid reverse-geocode coordinates", async (lat, lng) => {
    await expect(reverseGeocodeCoordinates(lat, lng)).resolves.toBeNull();
  });

  it("returns null for failed, empty, and exceptional reverse geocoding", async () => {
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true, json: jest.fn().mockResolvedValue({}) })
      .mockRejectedValueOnce(new Error("offline")) as jest.Mock;
    await expect(reverseGeocodeCoordinates(1, 2)).resolves.toBeNull();
    await expect(reverseGeocodeCoordinates(1, 2)).resolves.toBeNull();
    await expect(reverseGeocodeCoordinates(1, 2)).resolves.toBeNull();
  });
});
