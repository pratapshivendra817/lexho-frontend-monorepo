import React from "react";
import ReactTestRenderer from "react-test-renderer";

import RouteMapScreen from "../src/modules/navigation/screens/RouteMapScreen";
import LiveTrackingScreen from "../src/modules/navigation/screens/LiveTrackingScreen";

jest.mock("../src/modules/navigation/hooks/usePartnerNavigation", () => ({
  usePartnerNavigation: jest.fn(),
}));

const { usePartnerNavigation } = require("../src/modules/navigation/hooks/usePartnerNavigation");

describe("partner navigation screens", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePartnerNavigation.mockReturnValue({
      navigation: {
        activeRoute: {
          bookingId: 22,
          partnerLocation: { latitude: 28.61, longitude: 77.2 },
          customerLocation: { latitude: 28.62, longitude: 77.21 },
          coordinates: [
            { latitude: 28.61, longitude: 77.2 },
            { latitude: 28.62, longitude: 77.21 },
          ],
          etaSeconds: 780,
          distanceMeters: 4200,
          trafficDelaySeconds: 120,
          deviationThresholdMeters: 100,
          instructions: [
            {
              id: "step-1",
              text: "Turn left in 120 meters",
              distanceMeters: 120,
              durationSeconds: 45,
              coordinate: { latitude: 28.615, longitude: 77.205 },
            },
          ],
          fetchedAt: Date.now(),
          source: "backend",
        },
        eta: 780,
        distance: 4200,
        routeStatus: "ready",
        navigationState: "navigating",
        trafficDelaySeconds: 120,
        nextInstruction: {
          id: "step-1",
          text: "Turn left in 120 meters",
          distanceMeters: 120,
          durationSeconds: 45,
        },
        lastError: null,
      },
      tracking: {
        currentLocation: {
          latitude: 28.611,
          longitude: 77.201,
          accuracy: 18,
          speedKmh: 24,
          headingDegrees: 90,
          timestamp: Date.now(),
        },
        trackingEnabled: true,
        accuracyValid: true,
      },
      refreshRoute: jest.fn(async () => undefined),
      startTracking: jest.fn(async () => undefined),
      stopTracking: jest.fn(),
    });
  });

  it("renders route preview screen", () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <RouteMapScreen
          route={{ params: { orderId: 22, customerLatitude: 28.62, customerLongitude: 77.21 } }}
          navigation={{ navigate: jest.fn() }}
        />,
      );
    });

    const textNodes = tree!.root.findAll((node) => typeof node.props?.children === "string");
    const textDump = textNodes.map((node) => node.props.children).join(" ");
    expect(textDump).toContain("Route Preview");
    expect(textDump).toContain("Start Navigation");
    expect(textDump).toContain("Customer Details");
  });

  it("renders live tracking metrics and instruction", () => {
    let tree: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <LiveTrackingScreen
          route={{ params: { orderId: 22, customerLatitude: 28.62, customerLongitude: 77.21 } }}
        />,
      );
    });

    const textNodes = tree!.root.findAll((node) => typeof node.props?.children === "string");
    const textDump = textNodes.map((node) => node.props.children).join(" ");
    expect(textDump).toContain("Live Tracking");
    expect(textDump).toContain("Remaining ETA");
    expect(textDump).toContain("Turn left in 120 meters");
    expect(textDump).toContain("Refresh Route & ETA");
  });
});
