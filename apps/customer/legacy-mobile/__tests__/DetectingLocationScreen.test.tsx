import React from "react";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

const mockDispatch = jest.fn();
const mockPermission = jest.fn();
const mockOpenSettings = jest.fn();
const mockCoordinates = jest.fn();
const mockReverseQuick = jest.fn();
const mockReverseBackend = jest.fn();
const mockUpdateLocation = jest.fn();
const mockServiceability = jest.fn();
const mockTrack = jest.fn();
const mockNavigate = jest.fn();
const mockReplace = jest.fn();
let mockState: any;

jest.mock("react-native-paper", () => {
  const { Pressable, Text } = require("react-native");
  return {
    Button: ({ children, onPress }: any) => (
      <Pressable accessibilityRole="button" accessibilityLabel={String(children)} onPress={onPress}>
        <Text>{children}</Text>
      </Pressable>
    ),
    Text,
  };
});
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: require("react-native").View,
}));
jest.mock("../src/redux/hooks", () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: any) => unknown) => selector(mockState),
}));
jest.mock("../src/hooks/useLocationPermission", () => ({
  requestLocationPermission: () => mockPermission(),
  openLocationSettings: () => mockOpenSettings(),
}));
jest.mock("../src/hooks/useCurrentLocation", () => ({
  getBestCurrentCoordinates: (...args: unknown[]) => mockCoordinates(...args),
}));
jest.mock("../src/utils/reverseGeocode", () => ({
  reverseGeocodeCoordinates: (...args: unknown[]) => mockReverseQuick(...args),
}));
jest.mock("../src/services/locationService", () => ({
  reverseGeocode: (...args: unknown[]) => mockReverseBackend(...args),
  updateCurrentLocation: (...args: unknown[]) => mockUpdateLocation(...args),
  checkServiceability: (...args: unknown[]) => mockServiceability(...args),
}));
jest.mock("../src/utils/locationAnalytics", () => ({
  trackLocationEvent: (...args: unknown[]) => mockTrack(...args),
}));
jest.mock("../src/redux/locationSlice", () => ({
  setCurrentAddressLocal: (payload: unknown) => ({ type: "location/address", payload }),
  setCurrentLocationLocal: (payload: unknown) => ({ type: "location/coords", payload }),
  setServiceAvailable: (payload: unknown) => ({ type: "location/service", payload }),
}));

import { DetectingLocationScreen } from "../src/screens/location/DetectingLocationScreen";

function navigation(routeNames: string[] = ["Main"]) {
  return {
    navigate: mockNavigate,
    replace: mockReplace,
    getState: () => ({ routeNames }),
    getParent: () => ({ getState: () => ({ routeNames: ["Main"] }), navigate: mockNavigate }),
  };
}

async function flushDetection() {
  await jest.advanceTimersByTimeAsync(400);
  await Promise.resolve();
}

describe("DetectingLocationScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockState = {
      auth: { user: { id: "12" }, token: "" },
      location: {
        currentAddress: null,
        currentLocation: null,
        savedAddresses: [],
      },
    };
    mockPermission.mockResolvedValue("granted");
    mockCoordinates.mockResolvedValue({
      latitude: 22.7,
      longitude: 75.8,
      accuracy: 12,
      timestamp: 1000,
      mocked: false,
    });
    mockReverseQuick.mockResolvedValue({
      displayName: "Vijay Nagar, Indore, Madhya Pradesh 452010, India",
      shortName: "Vijay Nagar, Indore",
      area: "Vijay Nagar",
      city: "Indore",
      state: "Madhya Pradesh",
      country: "India",
      pincode: "452010",
    });
    mockUpdateLocation.mockResolvedValue({});
    mockReverseBackend.mockResolvedValue({
      formattedAddress: "Vijay Nagar, Indore 452010",
      city: "Indore",
      state: "Madhya Pradesh",
      pincode: "452010",
    });
    mockServiceability.mockResolvedValue({
      data: { serviceable: true, matchedPincode: "452010" },
    });
  });

  afterEach(async () => {
    await cleanup();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("uses an existing manually confirmed address without requesting GPS", async () => {
    mockState.location.currentAddress = {
      id: "saved-1",
      addressLine: "Saved",
      latitude: 22.7,
      longitude: 75.8,
    };
    await render(<DetectingLocationScreen navigation={navigation()} />);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("Main"));
    expect(mockPermission).not.toHaveBeenCalled();
  });

  it.each([
    ["denied", "Location permission denied"],
    ["blocked", "Location permission denied"],
  ])("renders %s permission errors and exposes settings/manual actions", async (permission, message) => {
    mockPermission.mockResolvedValue(permission);
    const view = await render(<DetectingLocationScreen navigation={navigation()} />);
    await waitFor(() => expect(view.getByText(new RegExp(message))).toBeTruthy());
    expect(mockTrack).toHaveBeenCalledWith(
      "gps_permission_denied",
      expect.any(Object),
    );
    await fireEvent.press(view.getByText("Open app settings"));
    expect(mockOpenSettings).toHaveBeenCalled();
    await fireEvent.press(view.getAllByText("Choose location manually")[0]);
    expect(mockReplace).toHaveBeenCalledWith("LocationSearch");
  });

  it("detects, reverse geocodes, checks serviceability, stores state, and navigates Main", async () => {
    const view = await render(<DetectingLocationScreen navigation={navigation()} />);
    expect(view.getByText("Detecting your location...")).toBeTruthy();
    await flushDetection();

    await waitFor(() => expect(mockServiceability).toHaveBeenCalled());
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "location/coords",
        payload: expect.objectContaining({ confidence: "HIGH" }),
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "location/service",
      payload: true,
    });
    expect(mockNavigate).toHaveBeenCalledWith("Main");
  });

  it("uses backend coordinates/service flag and routes unserviceable users", async () => {
    mockUpdateLocation.mockResolvedValue({
      data: {
        formattedAddress: "Remote Area 999999",
        latitude: 23,
        longitude: 77,
        pincode: "999999",
        serviceAvailable: false,
      },
    });
    const view = await render(<DetectingLocationScreen navigation={navigation()} />);
    await flushDetection();

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith(
        "ComingSoon",
        expect.objectContaining({ pincode: "999999" }),
      ),
    );
    expect(mockReverseBackend).not.toHaveBeenCalled();
    expect(mockTrack).toHaveBeenCalledWith(
      "serviceability_failure",
      expect.objectContaining({ latitude: 23, longitude: 77 }),
    );
    expect(view.getByText("Remote Area 999999")).toBeTruthy();
  });

  it("shows mocked, weak, timeout, and generic GPS errors", async () => {
    mockCoordinates.mockResolvedValueOnce({
      latitude: 1,
      longitude: 2,
      accuracy: 5,
      mocked: true,
    });
    const mockedView = await render(<DetectingLocationScreen navigation={navigation()} />);
    await waitFor(() =>
      expect(mockedView.getAllByText(/Mock location detected/)).toHaveLength(2),
    );
    await mockedView.unmount();

    mockCoordinates.mockRejectedValueOnce(new Error("Location accuracy is weak (150m)"));
    const weakView = await render(<DetectingLocationScreen navigation={navigation()} />);
    expect(await weakView.findByText(/Weak GPS detected/)).toBeTruthy();
    expect(weakView.getByText(/Move near open area/)).toBeTruthy();
    await weakView.unmount();

    mockCoordinates.mockRejectedValueOnce(new Error("Location timeout"));
    const timeoutView = await render(<DetectingLocationScreen navigation={navigation()} />);
    expect(await timeoutView.findByText(/timed out/)).toBeTruthy();
    expect(mockTrack).toHaveBeenCalledWith("gps_timeout", expect.any(Object));
  });

  it("uses saved address fallback when detection fails", async () => {
    mockState.location.savedAddresses = [{ id: "saved", addressLine: "Fallback Address" }];
    mockCoordinates.mockRejectedValue(new Error("network failure"));
    await render(<DetectingLocationScreen navigation={navigation()} />);

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "location/address",
        payload: { id: "saved", addressLine: "Fallback Address" },
      }),
    );
    expect(mockNavigate).toHaveBeenCalledWith("Main");
  });

  it("handles quick/backend reverse failures and retries location sync", async () => {
    mockReverseQuick.mockResolvedValue(null);
    mockUpdateLocation.mockRejectedValue(new Error("network"));
    mockReverseBackend.mockRejectedValue(new Error("reverse failed"));
    mockServiceability.mockResolvedValue({ message: "not serviceable" });
    const view = await render(<DetectingLocationScreen navigation={navigation([])} />);
    await flushDetection();

    await waitFor(() => expect(mockTrack).toHaveBeenCalledWith(
      "reverse_geocode_failure",
      expect.any(Object),
    ));
    expect(mockReplace).toHaveBeenCalledWith(
      "ComingSoon",
      expect.objectContaining({ addressLine: "India" }),
    );
    await jest.advanceTimersByTimeAsync(7500);
    expect(mockUpdateLocation.mock.calls.length).toBeGreaterThan(1);
    await fireEvent.press(view.getByText("Choose location manually"));
    expect(mockReplace).toHaveBeenCalledWith("LocationSearch");
  });
});
