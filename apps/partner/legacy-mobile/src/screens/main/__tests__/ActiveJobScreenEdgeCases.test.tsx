import React from "react";
import { Alert } from "react-native";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

import ActiveJobScreen from "../ActiveJobScreen";
import {
  getPartnerOrderById,
  markOrderArrived,
  verifyOrderStartPin,
} from "../../../services/partnerService";

const mockDispatch = jest.fn();

jest.mock("../../../hooks/useRedux", () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock("../../../services/partnerService", () => ({
  getPartnerOrderById: jest.fn(),
  markOrderArrived: jest.fn(),
  requestOrderCompletePin: jest.fn(),
  verifyOrderCompletePin: jest.fn(),
  verifyOrderStartPin: jest.fn(),
}));

jest.mock("../../../features/shift/locationTrackingManager", () => ({
  setTrackingContext: jest.fn(),
}));

jest.mock("../../../components/common/OrderLifecycleTimeline", () => ({
  OrderLifecycleTimeline: () => null,
}));

jest.mock("../../../services/firebaseAnalytics", () => ({
  PARTNER_ANALYTICS_EVENTS: { orderStarted: "orderStarted", orderCompleted: "orderCompleted" },
  trackEvent: jest.fn(),
}));

function mockOrder(status: string) {
  return {
    id: 22,
    status,
    customerName: "Riya",
    address: "Dwarka",
    latitude: 28.61,
    longitude: 77.2,
  };
}

describe("active job edge cases", () => {
  jest.setTimeout(15000);
  afterEach(() => cleanup());

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    (getPartnerOrderById as jest.Mock).mockResolvedValue(mockOrder("ACCEPTED"));
    (markOrderArrived as jest.Mock).mockResolvedValue(undefined);
    (verifyOrderStartPin as jest.Mock).mockResolvedValue(undefined);
  });

  it("shows backend PIN verification errors without advancing lifecycle", async () => {
    (getPartnerOrderById as jest.Mock).mockResolvedValue(mockOrder("ARRIVED"));
    (verifyOrderStartPin as jest.Mock).mockRejectedValue(new Error("Invalid or expired start PIN"));
    const view = await render(
      <ActiveJobScreen
        route={{ params: { orderId: 22, customerLatitude: 28.61, customerLongitude: 77.2 } }}
        navigation={{ navigate: jest.fn() }}
      />,
    );

    await waitFor(() => {
      expect(view.getByTestId("start-service-button").props.disabled).not.toBe(true);
    });
    await act(async () => {
      fireEvent.changeText(view.getByTestId("start-pin-input"), "0000");
    });
    await waitFor(() => {
      expect(view.getByTestId("start-pin-input").props.value).toBe("0000");
    });
    await act(async () => {
      fireEvent.press(view.getByTestId("start-service-button"));
    });

    expect(verifyOrderStartPin).toHaveBeenCalledWith(22, "0000");
    expect(Alert.alert).toHaveBeenCalledWith("Unable to start service", "Invalid or expired start PIN");
  });

});
