import React from "react";
import { Alert, RefreshControl, Share } from "react-native";
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

describe("NewOrdersScreen branch coverage", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers();
    mockPartnerState = { profile: { serviceCategory: "" }, online: true };
    (useNetworkStatus as jest.Mock).mockReturnValue(true);
    (getPartnerDispatchConfig as jest.Mock).mockResolvedValue({ requestExpiryWarningSeconds: 30 });
    (useRealtimeDispatchRequests as jest.Mock).mockReturnValue({
      orders: [],
      loading: false,
      error: "",
      lastFetchedAt: null,
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
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("shares fallback values and refreshes manually for visible scheduled orders", async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    mockPartnerState = { profile: { serviceCategory: "cleaning, plumbing" }, online: true };
    (useNetworkStatus as jest.Mock).mockReturnValue(false);
    (useRealtimeDispatchRequests as jest.Mock).mockReturnValue({
      orders: [
        {
          id: 7,
          customerName: null,
          address: null,
          serviceType: "Plumbing",
          subService: null,
          etaMinutes: null,
          distance: 250,
          priority: "NORMAL",
          status: "PENDING",
          amount: 320,
          bookingType: "SCHEDULED",
          createdAt: new Date(Date.now()).toISOString(),
          expiresInSeconds: 600,
        },
      ],
      loading: false,
      error: "",
      lastFetchedAt: Date.parse("2026-07-10T10:05:00Z"),
      diagText: "",
      refresh,
      wsConnected: true,
    });

    const view = await render(<NewOrdersScreen />);

    expect(view.getByText("Customer")).toBeTruthy();
    expect(view.getByText("Address unavailable")).toBeTruthy();
    expect(view.getByText("Category: Plumbing")).toBeTruthy();
    expect(view.getByText("Sub-service: -")).toBeTruthy();
    expect(view.getByText("ETA: - min")).toBeTruthy();
    expect(view.getByText("Distance: 250 m")).toBeTruthy();

    fireEvent.press(view.getByLabelText("Share order"));
    await waitFor(() => {
      expect(Share.share).toHaveBeenCalledWith({
        title: "Order #7",
        message: [
          "New Dispatch Request",
          "Order ID: 7",
          "Customer: -",
          "Address: -",
          "Service: Plumbing",
          "Payout: INR 320",
          "Status: PENDING",
        ].join("\n"),
      });
    });

    const tree = view.toJSON() as any;
    await act(async () => {
      await tree.props.refreshControl.props.onRefresh();
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("shows load errors without helper hints and handles config lookup failures", async () => {
    (getPartnerDispatchConfig as jest.Mock).mockRejectedValueOnce(new Error("config failed"));
    (useRealtimeDispatchRequests as jest.Mock).mockReturnValue({
      orders: [],
      loading: false,
      error: "Fetch failed",
      lastFetchedAt: null,
      diagText: "",
      refresh: jest.fn().mockResolvedValue(undefined),
      wsConnected: false,
    });

    const view = await render(<NewOrdersScreen />);

    expect(view.getByText("Realtime: Polling")).toBeTruthy();
    expect(view.getByText("Fetch failed")).toBeTruthy();
    expect(view.queryByText("Make sure you are ONLINE and Shift is started.")).toBeNull();
  });

  it("blocks accept for impossible instant orders, rejects online requests, and hides unmatched orders", async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    mockPartnerState = { profile: { serviceCategory: "Cleaning" }, online: true };
    (useRealtimeDispatchRequests as jest.Mock).mockReturnValue({
      orders: [
        {
          id: 10,
          requestId: 50,
          customerName: "Late Slot",
          address: "Dwarka",
          serviceCategory: "CLEANING",
          status: "PENDING",
          bookingType: "INSTANT",
          etaMinutes: 30,
          promisedStartTime: new Date(Date.now() + 20 * 1000).toISOString(),
          priority: "URGENT",
          distance: 1500,
        },
        {
          id: 11,
          requestId: 51,
          customerName: "No Expiry",
          address: "Delhi",
          serviceCategory: "CLEANING",
          status: "PENDING",
          bookingType: "SCHEDULED",
          priority: "LOW",
          distance: 1200,
        },
        {
          id: 12,
          requestId: 52,
          customerName: "Wrong Skill",
          address: "Noida",
          serviceCategory: "ELECTRICAL",
          status: "PENDING",
          bookingType: "SCHEDULED",
        },
      ],
      loading: false,
      error: "",
      lastFetchedAt: Date.now(),
      diagText: "diag",
      refresh,
      wsConnected: true,
    });

    const view = await render(<NewOrdersScreen />);

    expect(view.getByText("Late Slot")).toBeTruthy();
    expect(view.getByText("No Expiry")).toBeTruthy();
    expect(view.queryByText("Wrong Skill")).toBeNull();
    expect(view.getByText("Distance: 1.5 km")).toBeTruthy();
    expect(view.getByText("Expires in --")).toBeTruthy();
    expect(view.getByText("This request is expiring soon. Accept only if you can reach on time.")).toBeTruthy();

    fireEvent.press(view.getAllByText("Reject")[1]);
    const rejectAction = (Alert.alert as jest.Mock).mock.calls[0][2][1];
    await act(async () => {
      await rejectAction.onPress();
    });

    await waitFor(() => {
      expect(rejectDispatchRequest).toHaveBeenCalledWith(51, "Not available");
    });
    expect(trackEvent).toHaveBeenCalledWith("orderRejected", { orderId: 51 });
    expect(refresh).toHaveBeenCalled();

    fireEvent.press(view.getAllByText("Accept")[0]);
    expect(acceptDispatchRequest).not.toHaveBeenCalled();
    expect(enqueueAcceptOrder).not.toHaveBeenCalledWith(50);
  });

});
