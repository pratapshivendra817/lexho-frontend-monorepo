import React from "react";
import { Alert, Linking } from "react-native";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import ActiveJobScreen, {
  canArrive,
  canComplete,
  canRequestCompletePin,
  canStart,
  getCompletePinHint,
  getCompletePinValidation,
  getFallbackOrder,
  getStartPinValidation,
  normalizeLifecycleStatus,
} from "../ActiveJobScreen";
import {
  getPartnerOrderById,
  markOrderArrived,
  requestOrderCompletePin,
  verifyOrderCompletePin,
  verifyOrderStartPin,
} from "../../../services/partnerService";

const mockToast = jest.fn();
const mockShowLoader = jest.fn();
const mockHideLoader = jest.fn();
const mockDispatch = jest.fn();

jest.mock("../../../context/AppFeedbackContext", () => ({
  useAppFeedback: () => ({ toast: mockToast, showLoader: mockShowLoader, hideLoader: mockHideLoader }),
}));

jest.mock("../../../hooks/useRedux", () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock("../../../context/AppLanguageContext", () => ({
  useAppLanguage: () => ({
    t: (key: string) =>
      ({
        "chat.camera": "Camera",
        "chat.gallery": "Gallery",
        "orders.customer": "Customer",
        "orders.address_unavailable": "Address unavailable",
        "orders.active_job": "Active Job",
        "orders.mark_arrived": "Mark Arrived",
        "orders.start_service": "Start Service",
        "orders.complete_service": "Complete Service",
        "orders.request_complete_pin": "Request Complete PIN",
        "orders.open_customer_location": "Open Customer Location",
        "orders.open_in_app_navigation": "Open In-App Navigation",
        "orders.pin_placeholder": "Enter PIN",
      }[key] ?? key),
  }),
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

function mockOrder(status: string, overrides: Record<string, unknown> = {}) {
  return {
    id: 22,
    status,
    customerName: "Riya",
    address: "Dwarka",
    latitude: 28.61,
    longitude: 77.2,
    ...overrides,
  };
}

const identityTranslate = (_key: string, fallback: string) => fallback;

describe("upload and active job screens", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    (getPartnerOrderById as jest.Mock).mockResolvedValue(mockOrder("ACCEPTED"));
    (markOrderArrived as jest.Mock).mockResolvedValue(undefined);
    (requestOrderCompletePin as jest.Mock).mockResolvedValue(undefined);
    (verifyOrderStartPin as jest.Mock).mockResolvedValue(undefined);
    (verifyOrderCompletePin as jest.Mock).mockResolvedValue(undefined);
  });

  it("loads active jobs and marks arrival before start pin verification", async () => {
    const navigation = { navigate: jest.fn() };
    await render(
      <ActiveJobScreen
        route={{ params: { orderId: 22, customerLatitude: 28.61, customerLongitude: 77.2 } }}
        navigation={navigation}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("mark-arrived-button")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByText("Mark Arrived"));
    });

    expect(markOrderArrived).toHaveBeenCalledWith(22);

    fireEvent.press(screen.getByText("Open Customer Location"));
    fireEvent.press(screen.getByText("Open In-App Navigation"));

    expect(Linking.openURL).toHaveBeenCalled();
    expect(navigation.navigate).toHaveBeenCalledWith("RouteMap", {
      orderId: 22,
      customerLatitude: 28.61,
      customerLongitude: 77.2,
    });
  });

  it("renders start pin controls for arrived jobs", async () => {
    (getPartnerOrderById as jest.Mock).mockClear();
    (getPartnerOrderById as jest.Mock).mockResolvedValue(mockOrder("ARRIVED"));
    await render(
      <ActiveJobScreen
        route={{ params: { orderId: 22, customerLatitude: 28.61, customerLongitude: 77.2 } }}
        navigation={{ navigate: jest.fn() }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Active Job #22")).toBeTruthy();
    });
    expect(screen.getByText("Start Service PIN")).toBeTruthy();
    expect(screen.getByText("Ask the customer for the start PIN and verify it here.")).toBeTruthy();
    expect(screen.getByText("Start Service")).toBeTruthy();
    expect(screen.queryByTestId("mark-arrived-button")).toBeNull();
  });

  it("blocks arrival action for started and completed jobs", () => {
    expect(canArrive(mockOrder("ACCEPTED"))).toBe(true);
    expect(canArrive(mockOrder("ARRIVED"))).toBe(false);
    expect(canArrive(mockOrder("IN_PROGRESS"))).toBe(false);
    expect(canArrive(mockOrder("COMPLETED"))).toBe(false);
    expect(canArrive(mockOrder("ACCEPTED", { assignmentStatus: "COMPLETED" }))).toBe(false);
    expect(canArrive(mockOrder("COMPLETED", { assignmentStatus: "ACCEPTED" }))).toBe(false);
  });

  it("enables completion actions for in-progress jobs", () => {
    const order = mockOrder("IN_PROGRESS");

    expect(normalizeLifecycleStatus("STARTED")).toBe("IN_PROGRESS");
    expect(canRequestCompletePin(order)).toBe(true);
    expect(canComplete(order)).toBe(true);
    expect(getCompletePinHint(false, identityTranslate)).toBe(
      "Request the completion PIN first, then verify it to complete service.",
    );
    expect(getCompletePinHint(true, identityTranslate)).toBe(
      "Customer should now see the completion PIN. Enter it below to finish.",
    );
  });

  it("falls back to an accepted placeholder order when the fetch fails", () => {
    expect(getFallbackOrder(null, 22)).toEqual({ id: 22, status: "ACCEPTED" });
    expect(getFallbackOrder(mockOrder("ARRIVED"), 22)).toEqual(mockOrder("ARRIVED"));
  });

  it("does not render before or after image upload controls", async () => {
    await render(
      <ActiveJobScreen
        route={{ params: { orderId: 22, customerLatitude: 28.61, customerLongitude: 77.2 } }}
        navigation={{ navigate: jest.fn() }}
      />,
    );

    expect(screen.queryByText("Upload Before Image")).toBeNull();
    expect(screen.queryByText("Upload After Image")).toBeNull();
  });

  it("requires a start pin before service can begin", () => {
    expect(canStart(mockOrder("ARRIVED"))).toBe(true);
    expect(canStart(mockOrder("ACCEPTED"))).toBe(false);
    expect(getStartPinValidation("", identityTranslate)).toEqual({
      title: "Start PIN required",
      message: "Enter the customer start PIN to begin service.",
    });
    expect(getStartPinValidation("1234", identityTranslate)).toBeNull();
  });

  it("requires a completion pin before service can finish", () => {
    expect(getCompletePinValidation("", identityTranslate)).toEqual({
      title: "Completion PIN required",
      message: "Enter the customer completion PIN to finish service.",
    });
    expect(getCompletePinValidation("5678", identityTranslate)).toBeNull();
  });

});
