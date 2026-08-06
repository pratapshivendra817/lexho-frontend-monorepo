import React from "react";
import { Alert, Share } from "react-native";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

import NewOrdersScreen from "../NewOrdersScreen";
import { acceptDispatchRequest, getPartnerDispatchConfig, rejectDispatchRequest } from "../../../services/partnerService";
import { useRealtimeDispatchRequests } from "../../../hooks/useRealtimeDispatchRequests";
import { useNetworkStatus } from "../../../hooks/useNetworkStatus";
import { enqueueAcceptOrder, enqueueRejectOrder } from "../../../services/partnerActionQueueService";
import { trackEvent } from "../../../services/firebaseAnalytics";

const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
let mockPartnerState: any;

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock("../../../hooks/useRedux", () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: any) => selector({ partner: mockPartnerState }),
}));

jest.mock("../../../hooks/useRealtimeDispatchRequests", () => ({
  useRealtimeDispatchRequests: jest.fn(),
}));

jest.mock("../../../hooks/useNetworkStatus", () => ({
  useNetworkStatus: jest.fn(),
}));

jest.mock("../../../services/partnerService", () => ({
  acceptDispatchRequest: jest.fn(),
  getPartnerDispatchConfig: jest.fn(),
  rejectDispatchRequest: jest.fn(),
}));

jest.mock("../../../services/partnerActionQueueService", () => ({
  enqueueAcceptOrder: jest.fn(),
  enqueueRejectOrder: jest.fn(),
}));

jest.mock("../../../services/firebaseAnalytics", () => ({
  PARTNER_ANALYTICS_EVENTS: { orderAccepted: "orderAccepted", orderRejected: "orderRejected" },
  trackEvent: jest.fn(),
}));

jest.mock("../../../redux/slices/analyticsSlice", () => ({
  analyticsActions: {
    incrementOrdersReceived: jest.fn((payload) => ({ type: "analytics/received", payload })),
    incrementOrdersAccepted: jest.fn((payload) => ({ type: "analytics/accepted", payload })),
    incrementOrdersRejected: jest.fn((payload) => ({ type: "analytics/rejected", payload })),
  },
}));

describe("NewOrdersScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockPartnerState = { profile: { serviceCategory: "Cleaning" }, online: true };
    (useNetworkStatus as jest.Mock).mockReturnValue(true);
    (getPartnerDispatchConfig as jest.Mock).mockResolvedValue({ requestExpiryWarningSeconds: 60 });
    (useRealtimeDispatchRequests as jest.Mock).mockReturnValue({
      orders: [{
        id: 22,
        requestId: 44,
        customerName: "Riya",
        address: "Dwarka",
        serviceCategory: "CLEANING",
        subService: "Deep Clean",
        etaMinutes: 10,
        distance: 2200,
        priority: "HIGH",
        status: "PENDING",
        payout: 450,
        bookingType: "INSTANT",
        promisedStartTime: new Date(Date.now() + 3600_000).toISOString(),
        expiresAt: new Date(Date.now() + 600_000).toISOString(),
      }],
      loading: false,
      error: "",
      lastFetchedAt: Date.now(),
      diagText: "",
      refresh: jest.fn().mockResolvedValue(undefined),
      wsConnected: true,
    });
    (acceptDispatchRequest as jest.Mock).mockResolvedValue(undefined);
    (rejectDispatchRequest as jest.Mock).mockResolvedValue(undefined);
    (enqueueAcceptOrder as jest.Mock).mockResolvedValue(undefined);
    (enqueueRejectOrder as jest.Mock).mockResolvedValue(undefined);
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" } as any);
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  it("renders dispatch requests and handles share, detail, accept, and reject flows", async () => {
    const view = await render(<NewOrdersScreen />);

    expect(view.getByText("Riya")).toBeTruthy();
    expect(view.getByText("Category: CLEANING")).toBeTruthy();

    fireEvent.press(view.getByText("View Details"));
    fireEvent.press(view.getByLabelText("Share order"));
    fireEvent.press(view.getByText("Accept"));

    await waitFor(() => {
      expect(acceptDispatchRequest).toHaveBeenCalledWith(44);
    });
    expect(trackEvent).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("OrderDetails", { orderId: 22, requestId: 44 });
    expect(mockNavigate).toHaveBeenCalledWith("ActiveJob", { orderId: 44, customerLatitude: undefined, customerLongitude: undefined });

    fireEvent.press(view.getByText("Reject"));
    const alertCalls = (Alert.alert as jest.Mock).mock.calls;
    const rejectAction = alertCalls[0][2][1];
    await rejectAction.onPress();

    await waitFor(() => {
      expect(rejectDispatchRequest).toHaveBeenCalledWith(44, "Not available");
    });
  });

  it("shows empty diagnostics, filters expired orders, and queues offline actions", async () => {
    mockPartnerState = { profile: { serviceCategory: "Plumbing" }, online: true };
    (useNetworkStatus as jest.Mock).mockReturnValue(false);
    (useRealtimeDispatchRequests as jest.Mock).mockReturnValue({
      orders: [{
        id: 88,
        requestId: 99,
        customerName: "Asha",
        address: "Noida",
        serviceCategory: "PLUMBING",
        serviceType: "Plumbing",
        status: "PENDING",
        bookingType: "INSTANT",
        promisedStartTime: new Date(Date.now() - 1000).toISOString(),
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      }],
      loading: false,
      error: "",
      lastFetchedAt: Date.now(),
      diagText: "WS reconnect pending",
      refresh: jest.fn().mockResolvedValue(undefined),
      wsConnected: false,
    });

    const view = await render(<NewOrdersScreen />);
    expect(await view.findByText("Realtime: Polling")).toBeTruthy();
    expect(view.getByText("No new orders")).toBeTruthy();
    expect(view.getByText("WS reconnect pending")).toBeTruthy();
  });

  it("queues accept and reject when offline and disables accept for unavailable requests", async () => {
    (useNetworkStatus as jest.Mock).mockReturnValue(false);
    (useRealtimeDispatchRequests as jest.Mock).mockReturnValue({
      orders: [{
        id: 22,
        requestId: 44,
        customerName: "Riya",
        address: "Dwarka",
        serviceCategory: "CLEANING",
        subService: "Deep Clean",
        etaMinutes: 10,
        distance: 2200,
        priority: "HIGH",
        status: "PENDING",
        payout: 450,
        bookingType: "SCHEDULED",
        available: true,
        promisedStartTime: null,
        expiresAt: new Date(Date.now() + 600_000).toISOString(),
      }],
      loading: false,
      error: "",
      lastFetchedAt: Date.now(),
      diagText: "",
      refresh: jest.fn().mockResolvedValue(undefined),
      wsConnected: true,
    });

    const view = await render(<NewOrdersScreen />);
    expect(await view.findByText("Riya")).toBeTruthy();

    fireEvent.press(view.getByText("Reject"));
    const rejectAction = (Alert.alert as jest.Mock).mock.calls[0][2][1];
    await act(async () => {
      await rejectAction.onPress();
    });
    await waitFor(() => {
      expect(enqueueRejectOrder).toHaveBeenCalledWith(44, "Not available");
    });
  });
});
