import React from "react";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

const mockDispatch = jest.fn();
const mockSearchLocations = jest.fn();
const mockCheckServiceability = jest.fn();
const mockNavigate = jest.fn();
let mockState: any;

jest.mock("react-native-paper", () => {
  const { Pressable, Text, TextInput, View } = require("react-native");
  return {
    Button: ({ children, onPress, disabled }: any) => (
      <Pressable accessibilityRole="button" accessibilityLabel={String(children)} disabled={disabled} onPress={onPress}>
        <Text>{children}</Text>
      </Pressable>
    ),
    Searchbar: ({ placeholder, value, onChangeText }: any) => (
      <TextInput accessibilityLabel={placeholder} placeholder={placeholder} value={value} onChangeText={onChangeText} />
    ),
    Snackbar: ({ visible, children, onDismiss }: any) =>
      visible ? <View><Text>{children}</Text><Pressable accessibilityLabel="Dismiss message" onPress={onDismiss}><Text>Dismiss</Text></Pressable></View> : null,
    Text,
  };
});

jest.mock("../src/components/AddressCard", () => ({
  AddressCard: ({ label, addressLine, onPress, onDelete }: any) => {
    const { Pressable, Text, View } = require("react-native");
    return (
      <View>
        <Pressable accessibilityLabel={`Address ${label}`} onPress={onPress}><Text>{addressLine}</Text></Pressable>
        <Pressable accessibilityLabel={`Delete ${label}`} onPress={onDelete}><Text>Delete saved</Text></Pressable>
      </View>
    );
  },
}));
jest.mock("../src/components/location/LocationAddressShimmer", () => ({
  LocationAddressShimmer: () => {
    const { Text } = require("react-native");
    return <Text>Address shimmer</Text>;
  },
}));
jest.mock("../src/redux/hooks", () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: any) => unknown) => selector(mockState),
}));
jest.mock("../src/services/locationService", () => ({
  searchLocations: (...args: unknown[]) => mockSearchLocations(...args),
  checkServiceability: (...args: unknown[]) => mockCheckServiceability(...args),
}));
jest.mock("../src/redux/locationSlice", () => ({
  deleteAddressThunk: (payload: unknown) => ({ type: "location/delete", payload }),
  fetchAllAddressesThunk: (payload: unknown) => ({ type: "location/fetch", payload }),
  setCurrentAddressLocal: (payload: unknown) => ({ type: "location/current", payload }),
  setDefaultAddressThunk: (payload: unknown) => ({ type: "location/default", payload }),
  setServiceAvailable: (payload: unknown) => ({ type: "location/service", payload }),
  updateLocationAndSyncThunk: (payload: unknown) => ({ type: "location/update-sync", payload }),
}));
jest.mock("../src/redux/cartSlice", () => ({
  setSelectedAddressId: (payload: unknown) => ({ type: "cart/select", payload }),
}));

import { LocationSearchScreen } from "../src/screens/location/LocationSearchScreen";

function setDispatchSuccess(value: unknown = undefined) {
  mockDispatch.mockImplementation((action: any) => ({
    action,
    unwrap: jest.fn().mockResolvedValue(value),
  }));
}

describe("LocationSearchScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    setDispatchSuccess([]);
    mockSearchLocations.mockResolvedValue([]);
    mockCheckServiceability.mockResolvedValue({ serviceable: true });
    mockState = {
      auth: { user: { id: "12" }, token: "" },
      location: {
        currentAddress: {
          id: "1",
          label: "HOME",
          addressLine: "Vijay Nagar 452001",
          city: "Indore",
          pincode: "452001",
          latitude: 22.7,
          longitude: 75.8,
        },
        savedAddresses: [
          { id: "1", label: "HOME", addressLine: "Vijay Nagar", city: "Indore", pincode: "452001", latitude: 22.7, longitude: 75.8 },
          { id: "2", label: "OTHER", addressLine: "Palasia", city: "Indore", pincode: "452010", latitude: 22.71, longitude: 75.81 },
        ],
        loading: false,
        error: null,
        serviceAvailable: null,
      },
    };
  });

  afterEach(async () => {
    await cleanup();
    jest.useRealTimers();
  });

  it("renders saved/current locations and checks current serviceability", async () => {
    mockCheckServiceability.mockResolvedValue({
      data: { serviceable: true, matchedPincode: "452010" },
    });
    const view = await render(<LocationSearchScreen navigation={{ navigate: mockNavigate }} />);

    expect(view.getByText("Use current location")).toBeTruthy();
    expect(view.getByText("Saved address")).toBeTruthy();
    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "location/service",
        payload: true,
      }),
    );
    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({
        type: "location/current",
        payload: expect.objectContaining({ pincode: "452010" }),
      }),
    );
  });

  it("does not infer coverage from a generic available-areas message", async () => {
    mockCheckServiceability.mockResolvedValue({ message: "Available service areas fetched successfully" });
    await render(<LocationSearchScreen navigation={{ navigate: mockNavigate }} />);
    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith({ type: "location/service", payload: false }));
  });

  it("searches, renders serviceability, selects a result, and navigates Main", async () => {
    mockSearchLocations.mockResolvedValue([
      { id: "7", addressLine: "Scheme 54", city: "Indore", pincode: "452010", latitude: 22.72, longitude: 75.88 },
      { id: "bad", addressLine: "Invalid", latitude: 0, longitude: 0 },
    ]);
    mockCheckServiceability.mockResolvedValue({ status: "ACTIVE" });
    const view = await render(<LocationSearchScreen navigation={{ navigate: mockNavigate }} />);

    await fireEvent.changeText(view.getByLabelText("Search locality or area"), "scheme");
    await jest.advanceTimersByTimeAsync(120);
    await waitFor(() => expect(mockSearchLocations).toHaveBeenCalledWith("scheme"));
    expect(await view.findByText("Search results")).toBeTruthy();
    expect(view.getAllByText("Scheme 54, Indore, 452010")).toHaveLength(2);
    await waitFor(() => expect(view.getByText("Service available")).toBeTruthy());

    await fireEvent.press(view.getAllByText("Select")[0]);
    await waitFor(() => expect(view.getByText("Location selected")).toBeTruthy());
    await jest.runOnlyPendingTimersAsync();
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "location/update-sync" }),
    );
    expect(mockNavigate).toHaveBeenCalledWith("Main", { screen: "Home" });
  });

  it("shows API failure fallback suggestions and rejects invalid selection", async () => {
    mockSearchLocations.mockRejectedValue(new Error("search offline"));
    const view = await render(<LocationSearchScreen navigation={{ navigate: mockNavigate }} />);
    await fireEvent.changeText(view.getByLabelText("Search locality or area"), "Delhi");
    await jest.advanceTimersByTimeAsync(120);

    expect(await view.findByText("Search service unavailable, showing fallback suggestions.")).toBeTruthy();
    expect(view.getByText("Delhi, India, 110001")).toBeTruthy();

    await fireEvent.changeText(view.getByLabelText("Search locality or area"), "unknown");
    await jest.advanceTimersByTimeAsync(120);
    expect(await view.findByText("No suggestions found")).toBeTruthy();
  });

  it("renders loading, empty and API error states and retries", async () => {
    mockState.location = {
      currentAddress: null,
      savedAddresses: [],
      loading: true,
      error: "Address API failed",
      serviceAvailable: false,
    };
    const view = await render(<LocationSearchScreen navigation={{ navigate: mockNavigate }} />);
    expect(view.getAllByText("Address shimmer")).toHaveLength(3);
    expect(view.getByText("Address API failed")).toBeTruthy();
    expect(view.getByText("Not serviceable")).toBeTruthy();

    await fireEvent.press(view.getByText("Retry API"));
    await waitFor(() => expect(view.getByText("Addresses refreshed")).toBeTruthy());
    await fireEvent.press(view.getByText("Add New"));
    expect(mockNavigate).toHaveBeenCalledWith("AddAddressDetails");
    await fireEvent.press(view.getByText("Use current location"));
    expect(mockNavigate).toHaveBeenCalledWith("DetectingLocation");
  });

  it("selects, edits and deletes saved addresses", async () => {
    const view = await render(<LocationSearchScreen navigation={{ navigate: mockNavigate }} />);
    await fireEvent.press(view.getByLabelText("Address OTHER"));
    expect(await view.findByText("Address selected")).toBeTruthy();
    await jest.runOnlyPendingTimersAsync();

    await fireEvent.press(view.getAllByText("Edit address")[1]);
    expect(mockNavigate).toHaveBeenCalledWith(
      "AddAddressDetails",
      { address: expect.objectContaining({ id: "2" }) },
    );
    await fireEvent.press(view.getByLabelText("Delete OTHER"));
    expect(await view.findByText("Address deleted")).toBeTruthy();
  });

  it("handles login-required actions and serviceability failures", async () => {
    mockState.auth.user.id = 0;
    mockState.location.error = "Address API failed";
    mockCheckServiceability.mockRejectedValue(new Error("service network"));
    setDispatchSuccess([]);
    const view = await render(<LocationSearchScreen navigation={{ navigate: mockNavigate }} />);

    await waitFor(() => expect(view.getByText("service network")).toBeTruthy());
    await fireEvent.press(view.getByText("Retry API"));
    expect(await view.findByText("Login required")).toBeTruthy();
    await fireEvent.press(view.getAllByText("Select")[0]);
    expect(await view.findByText("Login required")).toBeTruthy();
    await fireEvent.press(view.getByLabelText("Delete OTHER"));
    expect(await view.findByText("Login required")).toBeTruthy();
  });
});
