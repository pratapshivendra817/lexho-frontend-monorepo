import React from "react";
import { Linking } from "react-native";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

import { LiveTrackingScreen } from "../src/screens/booking/LiveTrackingScreen";

const mockRefetch = jest.fn();
const mockLifecycleNavigation = jest.fn();
const mockCaptureError = jest.fn();
let mockBookingQuery: any;
let mockShowMap = true;
let mockMeta: any;
let mockState: any;

jest.mock("../src/components/booking/BookingStageShell", () => ({
  BookingStageShell: ({ title, subtitle, children }: any) => {
    const { Text, View } = require("react-native");
    return <View><Text>{title}</Text><Text>{subtitle}</Text>{children}</View>;
  },
}));

jest.mock("../src/components/booking/StatusBadge", () => ({
  StatusBadge: ({ status }: any) => {
    const { Text } = require("react-native");
    return <Text>{`Status ${status}`}</Text>;
  },
}));

jest.mock("../src/hooks/useInstantBookingLifecycle", () => ({
  useInstantBookingLifecycle: () => mockBookingQuery,
}));

jest.mock("../src/hooks/useBookingLifecycleNavigation", () => ({
  useBookingLifecycleNavigation: (...args: any[]) => mockLifecycleNavigation(...args),
}));

jest.mock("../src/redux/hooks", () => ({
  useAppSelector: (selector: any) => selector(mockState),
}));

jest.mock("../src/utils/bookingMeta", () => ({
  getBookingMeta: () => mockMeta,
  shouldShowBookingMap: () => mockShowMap,
}));

jest.mock("../src/services/monitoring", () => ({
  captureFrontendError: (...args: any[]) => mockCaptureError(...args),
}));

jest.mock("@rnmapbox/maps", () => {
  const { Text, View } = require("react-native");
  return {
    __esModule: true,
    default: {
      setAccessToken: jest.fn(),
      StyleURL: { Dark: "dark" },
      MapView: ({ children }: any) => <View><Text>Tracking map</Text>{children}</View>,
      Camera: View,
      PointAnnotation: View,
      ShapeSource: View,
      LineLayer: View,
    },
  };
});

describe("LiveTrackingScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRefetch.mockResolvedValue({});
    mockShowMap = true;
    mockMeta = { canTrackPartner: true };
    mockState = {
      location: {
        currentAddress: { latitude: 28.6, longitude: 77.2 },
      },
    };
    mockBookingQuery = {
      data: {
        id: "B1",
        status: "PARTNER_ASSIGNED",
        partnerName: "Amit",
        etaMinutes: 12,
        map: {
          partner: {
            latitude: 28.61,
            longitude: 77.21,
            updatedAt: "2026-06-13T10:00:00",
          },
          customer: { latitude: 28.6, longitude: 77.2 },
        },
      },
      isFetching: false,
      isError: false,
      refetch: mockRefetch,
    };
    jest.spyOn(Linking, "openURL").mockResolvedValue(undefined as never);
  });

  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it("renders coordinates, toggles follow, refreshes, edits ID, and opens the map", async () => {
    const view = await render(
      <LiveTrackingScreen
        route={{ params: { bookingId: "B1" } }}
        navigation={{ navigate: jest.fn() }}
      />,
    );

    expect(view.getByText("Tracking map")).toBeTruthy();
    expect(view.getByText("Partner: Amit")).toBeTruthy();
    expect(view.getByText("ETA: 12 mins")).toBeTruthy();
    expect(view.getByText("Latitude: 28.61")).toBeTruthy();

    await fireEvent.press(view.getByText("Auto-Follow ON"));
    expect(view.getByText("Auto-Follow OFF")).toBeTruthy();

    await fireEvent.changeText(view.getByDisplayValue("B1"), "B2");
    expect(mockLifecycleNavigation).toHaveBeenLastCalledWith(
      expect.objectContaining({ bookingId: "B2" }),
    );

    await fireEvent.press(view.getByText("Refresh location"));
    expect(mockRefetch).toHaveBeenCalled();

    await fireEvent.press(view.getByText("Open in Google Maps"));
    await waitFor(() =>
      expect(Linking.openURL).toHaveBeenCalledWith(
        "https://www.openstreetmap.org/?mlat=28.61&mlon=77.21#map=16/28.61/77.21",
      ),
    );
  });

  it("renders placeholder, N/A values, error, and disabled open-map state", async () => {
    mockShowMap = false;
    mockMeta = { canTrackPartner: false };
    mockBookingQuery = {
      data: { status: "SEARCHING" },
      isFetching: true,
      isError: true,
      refetch: mockRefetch,
    };
    const view = await render(
      <LiveTrackingScreen route={{ params: {} }} navigation={{}} />,
    );

    expect(view.getByText("Live tracking unavailable")).toBeTruthy();
    expect(view.getByText("Partner: N/A")).toBeTruthy();
    expect(view.getByText("Latitude: N/A")).toBeTruthy();
    expect(view.getByText("Unable to fetch live location.")).toBeTruthy();

    await fireEvent.press(view.getByText("Open in Google Maps"));
    expect(Linking.openURL).not.toHaveBeenCalled();
  });
});
