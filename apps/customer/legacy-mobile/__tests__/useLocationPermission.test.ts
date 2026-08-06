import { Linking, PermissionsAndroid, Platform } from "react-native";

const mockCheck = jest.fn();
const mockRequest = jest.fn();
const mockPermissionsModule = {
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
  check: (...args: unknown[]) => mockCheck(...args),
  request: (...args: unknown[]) => mockRequest(...args),
};

jest.mock("react-native-permissions", () => mockPermissionsModule, {
  virtual: true,
});

import {
  openLocationSettings,
  requestLocationPermission,
} from "../src/hooks/useLocationPermission";

describe("useLocationPermission utilities", () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "android",
    });
    mockPermissionsModule.PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION = undefined;
    PermissionsAndroid.check = jest.fn().mockResolvedValue(false);
    PermissionsAndroid.requestMultiple = jest.fn().mockResolvedValue({});
    Linking.openSettings = jest.fn().mockResolvedValue(undefined);
  });

  afterAll(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: originalOS,
    });
  });

  it("returns denied without requesting permission outside Android", async () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "ios",
    });

    await expect(requestLocationPermission()).resolves.toBe("denied");
    expect(PermissionsAndroid.check).not.toHaveBeenCalled();
  });

  it.each([
    ["granted", undefined, "granted"],
    ["denied", "granted", "granted"],
    ["denied", "blocked", "blocked"],
    ["denied", "denied", "denied"],
  ])(
    "maps react-native-permissions %s/%s",
    async (current, requested, expected) => {
      mockPermissionsModule.PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION =
        "android.permission.ACCESS_FINE_LOCATION";
      mockCheck.mockResolvedValue(current);
      mockRequest.mockResolvedValue(requested);

      await expect(requestLocationPermission()).resolves.toBe(expected);
      if (current === "granted") {
        expect(mockRequest).not.toHaveBeenCalled();
      }
    },
  );

  it.each([
    [true, false, "granted"],
    [false, true, "granted"],
    [false, false, "denied"],
  ])("maps existing Android grants", async (fine, coarse, expected) => {
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
    [
      PermissionsAndroid.RESULTS.GRANTED,
      PermissionsAndroid.RESULTS.DENIED,
      "granted",
    ],
    [
      PermissionsAndroid.RESULTS.DENIED,
      PermissionsAndroid.RESULTS.GRANTED,
      "granted",
    ],
    [
      PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
      PermissionsAndroid.RESULTS.DENIED,
      "blocked",
    ],
    [
      PermissionsAndroid.RESULTS.DENIED,
      PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
      "blocked",
    ],
    [
      PermissionsAndroid.RESULTS.DENIED,
      PermissionsAndroid.RESULTS.DENIED,
      "denied",
    ],
  ])("maps requested Android results", async (fine, coarse, expected) => {
    (PermissionsAndroid.requestMultiple as jest.Mock).mockResolvedValue({
      [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]: fine,
      [PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION]: coarse,
    });

    await expect(requestLocationPermission()).resolves.toBe(expected);
  });

  it("opens settings and propagates failures", async () => {
    await expect(openLocationSettings()).resolves.toBeUndefined();
    expect(Linking.openSettings).toHaveBeenCalled();

    (Linking.openSettings as jest.Mock).mockRejectedValue(
      new Error("settings unavailable"),
    );
    await expect(openLocationSettings()).rejects.toThrow(
      "settings unavailable",
    );
  });
});
