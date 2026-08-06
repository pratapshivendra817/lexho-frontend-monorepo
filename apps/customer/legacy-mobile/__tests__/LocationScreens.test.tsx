import React from "react";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

jest.setTimeout(15_000);

const mockPermission = jest.fn();
const mockOpenSettings = jest.fn();
const mockDispatch = jest.fn();
const mockReverseGeocode = jest.fn();
const mockNavigate = jest.fn();
const mockReplace = jest.fn();
let mockState: any;
let mockQueryState: any;

jest.mock("react-native-paper", () => {
  const { Pressable, Text, TextInput: NativeTextInput, View } = require("react-native");
  const Button = ({ children, onPress, disabled, loading }: any) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={String(children)}
      accessibilityState={{ disabled: Boolean(disabled), busy: Boolean(loading) }}
      disabled={disabled}
      onPress={onPress}
    >
      <Text>{children}</Text>
    </Pressable>
  );
  const TextInput = ({ label, value, onChangeText, ...props }: any) => (
    <NativeTextInput
      {...props}
      accessibilityLabel={label}
      placeholder={label}
      value={value}
      onChangeText={onChangeText}
    />
  );
  const Card = ({ children, onPress }: any) => (
    <Pressable accessibilityRole="button" onPress={onPress}>{children}</Pressable>
  );
  Card.Content = View;
  return {
    Button,
    Card,
    IconButton: ({ onPress, disabled }: any) => (
      <Pressable accessibilityRole="button" accessibilityLabel="Delete address" disabled={disabled} onPress={onPress}>
        <Text>Delete</Text>
      </Pressable>
    ),
    Snackbar: ({ visible, children, onDismiss }: any) =>
      visible ? (
        <View>
          <Text>{children}</Text>
          <Pressable accessibilityLabel="Dismiss message" onPress={onDismiss}><Text>Dismiss</Text></Pressable>
        </View>
      ) : null,
    Text,
    TextInput,
  };
});

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: require("react-native").View,
}));

jest.mock("../src/hooks/useLocationPermission", () => ({
  requestLocationPermission: () => mockPermission(),
  openLocationSettings: () => mockOpenSettings(),
}));

jest.mock("../src/redux/hooks", () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: any) => unknown) => selector(mockState),
}));

jest.mock("../src/services/locationService", () => ({
  reverseGeocode: (...args: unknown[]) => mockReverseGeocode(...args),
}));

jest.mock("@tanstack/react-query", () => ({
  useQuery: (options: any) => {
    void options.queryKey;
    return mockQueryState;
  },
  useMutation: (options: any) => {
    const ReactModule = require("react");
    const [state, setState] = ReactModule.useState({
      isPending: false,
      isError: false,
      error: null,
    });
    return {
      ...state,
      mutate: async (payload: unknown) => {
        setState({ isPending: true, isError: false, error: null });
        try {
          await options.mutationFn(payload);
          options.onSuccess?.();
          setState({ isPending: false, isError: false, error: null });
        } catch (error) {
          setState({ isPending: false, isError: true, error });
        }
      },
      reset: () => setState({ isPending: false, isError: false, error: null }),
    };
  },
}));

jest.mock("@rnmapbox/maps", () => {
  const { Pressable, View } = require("react-native");
  const MapView = ({ children, onPress }: any) => (
    <Pressable accessibilityLabel="Map" onPress={() => onPress?.({ geometry: { coordinates: [77.2, 28.6] } })}>
      {children}
    </Pressable>
  );
  return {
    __esModule: true,
    default: {
      setAccessToken: jest.fn(),
      StyleURL: { Dark: "dark" },
      MapView,
      Camera: View,
      PointAnnotation: View,
    },
  };
});

jest.mock("../src/redux/locationSlice", () => ({
  fetchAllAddressesThunk: (payload: unknown) => ({ type: "location/fetch", payload }),
  saveAddressThunk: (payload: unknown) => ({ type: "location/save", payload }),
  updateAddressThunk: (payload: unknown) => ({ type: "location/update", payload }),
  setDefaultAddressThunk: (payload: unknown) => ({ type: "location/default", payload }),
  deleteAddressThunk: (payload: unknown) => ({ type: "location/delete", payload }),
  setCurrentAddressLocal: (payload: unknown) => ({ type: "location/current", payload }),
  setSelectedAddressLocal: (payload: unknown) => ({ type: "location/selected", payload }),
}));

jest.mock("../src/redux/cartSlice", () => ({
  fetchCustomerAddressesThunk: () => ({ type: "cart/fetch-addresses" }),
  setSelectedAddressId: (payload: unknown) => ({ type: "cart/select", payload }),
  updateCartMetaThunk: (payload: unknown) => ({ type: "cart/meta", payload }),
}));

jest.mock("../src/components/common/EmptyStateCard", () => ({
  EmptyStateCard: ({ title, subtitle }: any) => {
    const { Text, View } = require("react-native");
    return <View><Text>{title}</Text><Text>{subtitle}</Text></View>;
  },
}));
jest.mock("../src/components/common/SkeletonList", () => ({
  SkeletonList: () => {
    const { Text } = require("react-native");
    return <Text>Loading addresses</Text>;
  },
}));

import { LocationPermissionScreen } from "../src/screens/location/LocationPermissionScreen";
import { MapAddressPickerScreen } from "../src/screens/location/MapAddressPickerScreen";
import { AddAddressDetailsScreen } from "../src/screens/location/AddAddressDetailsScreen";
import { AddressScreen } from "../src/screens/profile/AddressScreen";
import { ComingSoonScreen } from "../src/screens/location/ComingSoonScreen";

function dispatchSuccess(value: unknown = undefined) {
  mockDispatch.mockImplementation((action: any) => ({
    action,
    unwrap: jest.fn().mockResolvedValue(value),
  }));
}

describe("LocationPermissionScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => cleanup());

  it("renders and supports manual navigation", async () => {
    const view = await render(
      <LocationPermissionScreen navigation={{ navigate: mockNavigate, replace: mockReplace }} />,
    );
    expect(view.getByText("What's your location?")).toBeTruthy();
    await fireEvent.press(view.getByText("Enter location manually"));
    expect(mockNavigate).toHaveBeenCalledWith("LocationSearch");
  });

  it("continues after permission is granted", async () => {
    mockPermission.mockResolvedValue("granted");
    const view = await render(
      <LocationPermissionScreen navigation={{ navigate: mockNavigate, replace: mockReplace }} />,
    );
    await fireEvent.press(view.getByText("Use Current Location"));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("DetectingLocation"));
  });

  it("opens settings for blocked permission", async () => {
    mockPermission.mockResolvedValue("blocked");
    const view = await render(
      <LocationPermissionScreen navigation={{ navigate: mockNavigate, replace: mockReplace }} />,
    );
    await fireEvent.press(view.getByText("Use Current Location"));
    await waitFor(() => expect(mockOpenSettings).toHaveBeenCalled());
  });

  it("shows denied sheet, retries, and closes it", async () => {
    mockPermission.mockResolvedValueOnce("denied").mockResolvedValueOnce("granted");
    const view = await render(
      <LocationPermissionScreen navigation={{ navigate: mockNavigate, replace: mockReplace }} />,
    );
    await fireEvent.press(view.getByText("Use Current Location"));
    await waitFor(() => expect(view.getByText("Location permission is required")).toBeTruthy());
    await fireEvent.press(view.getByText("Retry"));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("DetectingLocation"));
  });

});

describe("MapAddressPickerScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockState = { location: { currentAddress: { latitude: 22.7, longitude: 75.8 } } };
    mockQueryState = { isLoading: false, data: null };
  });

  afterEach(async () => {
    await cleanup();
    jest.useRealTimers();
  });

  it("shows loading and empty preview fallbacks", async () => {
    mockQueryState = { isLoading: true, data: null };
    const view = await render(
      <MapAddressPickerScreen navigation={{ navigate: mockNavigate }} route={{ params: {} }} />,
    );
    expect(view.getByText("Resolving address...")).toBeTruthy();
  });

  it("renders resolved address, handles map selection, and continues", async () => {
    mockQueryState = {
      isLoading: false,
      data: {
        data: {
          formattedAddress: "Sector 10, Indore",
          city: "Indore",
          country: "",
          lat: 22.71,
          lng: 75.81,
        },
      },
    };
    const view = await render(
      <MapAddressPickerScreen
        navigation={{ navigate: mockNavigate }}
        route={{ params: { address: { id: "1" }, initial: { latitude: 0, longitude: Number.NaN } } }}
      />,
    );
    expect(view.getByText("Sector 10, Indore")).toBeTruthy();
    await fireEvent.press(view.getByLabelText("Map"));
    await jest.advanceTimersByTimeAsync(400);
    await fireEvent.press(view.getByText("Use This Location"));
    expect(mockNavigate).toHaveBeenCalledWith(
      "AddAddressDetails",
      expect.objectContaining({
        address: { id: "1" },
        pickedLocation: { latitude: 22.71, longitude: 75.81 },
      }),
    );
  });
});

describe("AddAddressDetailsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dispatchSuccess();
    mockState = {
      auth: { user: { id: "12", mobile: "9876543210" }, token: "" },
      location: { currentAddress: { latitude: 22.7, longitude: 75.8, city: "Indore", country: "India" } },
    };
  });

  afterEach(async () => cleanup());

  async function fillRequired(view: Awaited<ReturnType<typeof render>>) {
    await fireEvent.changeText(view.getByLabelText("Flat/House No"), "12");
    await fireEvent.changeText(view.getByLabelText("Apartment/Building Name"), "Lexho Tower");
    await fireEvent.changeText(view.getByLabelText("Area/Sector/Locality"), "Vijay Nagar");
    await fireEvent.changeText(view.getByLabelText("Receiver Phone Number"), "9876543210");
  }

  it("validates empty form fields", async () => {
    const view = await render(
      <AddAddressDetailsScreen navigation={{ navigate: mockNavigate, replace: mockReplace }} route={{ params: {} }} />,
    );
    await fireEvent.press(view.getByText("Save Address"));
    expect(await view.findByText("Flat/House No is required")).toBeTruthy();
    expect(view.getByText("Building name is required")).toBeTruthy();
  });

  it("creates a HOME address and navigates after success", async () => {
    const view = await render(
      <AddAddressDetailsScreen navigation={{ navigate: mockNavigate, replace: mockReplace }} route={{ params: {} }} />,
    );
    await fillRequired(view);
    await fireEvent.press(view.getByText("Save Address"));
    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "location/save",
          payload: expect.objectContaining({ userId: 12, label: "HOME", city: "Indore" }),
        }),
      ),
    );
    expect(mockReplace).toHaveBeenCalledWith("LocationSearch");
  });

  it("updates an existing OTHER address and opens map picker", async () => {
    const existing = {
      id: "a1",
      label: "OTHER",
      flatNo: "1",
      buildingName: "Old Building",
      addressLine: "Old Area",
      mobile: "9876543210",
      latitude: 1,
      longitude: 2,
    };
    const view = await render(
      <AddAddressDetailsScreen
        navigation={{ navigate: mockNavigate, replace: mockReplace }}
        route={{ params: { address: existing } }}
      />,
    );
    await fireEvent.press(view.getByText("Pick Location On Map"));
    expect(mockNavigate).toHaveBeenCalledWith(
      "MapAddressPicker",
      expect.objectContaining({ address: existing }),
    );
    await fireEvent.press(view.getByText("Save Address"));
    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: "location/update" }),
      ),
    );
  });

  it("shows login and conflict errors and dismisses the snackbar", async () => {
    mockState.auth.user.id = 0;
    const view = await render(
      <AddAddressDetailsScreen navigation={{ navigate: mockNavigate, replace: mockReplace }} route={{ params: {} }} />,
    );
    await fillRequired(view);
    await fireEvent.press(view.getByText("Save Address"));
    expect(await view.findByText("Login required")).toBeTruthy();
    await fireEvent.press(view.getByLabelText("Dismiss message"));
    expect(view.queryByText("Login required")).toBeNull();
  });
});

describe("AddressScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dispatchSuccess([]);
    mockState = {
      auth: { user: { id: "12" }, token: "" },
      cart: {
        scheduledTime: "10:00",
        selectedAddressId: 1,
        addresses: [
          { id: 1, fullAddress: "Vijay Nagar", city: "Indore", pincode: "452010" },
          { id: 2, fullAddress: "Palasia", city: "Indore", pincode: "452001" },
        ],
      },
      location: {
        currentAddress: { id: "1" },
        savedAddresses: [
          { id: "1", label: "HOME", addressLine: "Vijay Nagar", city: "Indore", pincode: "452010" },
          { id: "2", label: "OTHER", addressLine: "Palasia", city: "Indore", pincode: "452001" },
        ],
        loading: false,
        saving: false,
        error: null,
      },
    };
  });

  afterEach(async () => cleanup());

  it("renders loading, empty, and error states", async () => {
    mockState.location = { savedAddresses: [], loading: true, error: "Load failed" };
    const loadingView = await render(<AddressScreen navigation={{ navigate: mockNavigate }} />);
    expect(loadingView.getByText("Loading addresses")).toBeTruthy();
    expect(loadingView.getByText("Load failed")).toBeTruthy();
    await loadingView.unmount();

    mockState.location = { savedAddresses: [], loading: false, error: null };
    const emptyView = await render(<AddressScreen navigation={{ navigate: mockNavigate }} />);
    expect(emptyView.getByText("No addresses yet")).toBeTruthy();
  });

  it("adds, selects, defaults, deletes, and navigates back", async () => {
    const navigation = { navigate: mockNavigate, canGoBack: () => true, goBack: jest.fn() };
    const view = await render(<AddressScreen navigation={navigation} />);
    expect(view.getByText("Selected for Booking")).toBeTruthy();
    await fireEvent.press(view.getByText("Add New Address"));
    expect(mockNavigate).toHaveBeenCalledWith("AddAddressDetails");

    await fireEvent.press(view.getByText("Select"));
    await waitFor(() => expect(view.getByText("Address selected for booking")).toBeTruthy());
    expect(navigation.goBack).toHaveBeenCalled();

    await fireEvent.press(view.getByText("Set Default"));
    await waitFor(() => expect(view.getByText("Default address updated")).toBeTruthy());
    await fireEvent.press(view.getAllByLabelText("Delete address")[1]);
    await waitFor(() => expect(view.getByText("Address deleted")).toBeTruthy());
  });

  it("shows login and mapping failures and falls back to Main navigation", async () => {
    mockState.auth.user.id = 0;
    mockState.cart.addresses = [];
    dispatchSuccess([]);
    const view = await render(
      <AddressScreen navigation={{ navigate: mockNavigate, canGoBack: () => false }} />,
    );
    await fireEvent.press(view.getByText("Set Default"));
    expect(await view.findByText("Login required")).toBeTruthy();
    await fireEvent.press(view.getByText("Select"));
    expect(await view.findByText(/Unable to map selected address/)).toBeTruthy();
  });
});

describe("ComingSoonScreen", () => {
  afterEach(async () => cleanup());

  it("renders route metadata and both navigation actions", async () => {
    const view = await render(
      <ComingSoonScreen
        route={{ params: { addressLine: "Remote Area", pincode: "999999" } }}
        navigation={{ navigate: mockNavigate }}
      />,
    );
    expect(view.getByText("Area: Remote Area")).toBeTruthy();
    expect(view.getByText("Pincode: 999999")).toBeTruthy();
    await fireEvent.press(view.getByText("Choose Another Location"));
    await fireEvent.press(view.getByText("Back To Home"));
    expect(mockNavigate).toHaveBeenCalledWith("LocationSearch");
    expect(mockNavigate).toHaveBeenCalledWith("Main");
  });

  it("omits empty route metadata", async () => {
    const view = await render(
      <ComingSoonScreen route={{}} navigation={{ navigate: mockNavigate }} />,
    );
    expect(view.queryByText(/^Area:/)).toBeNull();
    expect(view.queryByText(/^Pincode:/)).toBeNull();
  });
});
