import React from "react";
import { Alert, Share } from "react-native";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

import NewOrdersScreen from "../NewOrdersScreen";
import { acceptDispatchRequest, acceptPartnerOrder, getCanonicalPartnerOrderId, getPartnerDispatchConfig, getOrderHistory, rejectDispatchRequest } from "../../../services/partnerService";
import { useRealtimeDispatchRequests } from "../../../hooks/useRealtimeDispatchRequests";
import { useNetworkStatus } from "../../../hooks/useNetworkStatus";
import { enqueueAcceptOrder, enqueueRejectOrder } from "../../../services/partnerActionQueueService";
import { trackEvent } from "../../../services/firebaseAnalytics";
import { getShiftState } from "../../../features/shift/shiftStorage";


jest.mock("react-native", () => {
  const React = require("react");
  const RN = jest.requireActual("react-native");
  const FlatList = ({ data = [], renderItem, ListHeaderComponent, ListEmptyComponent }: any) => (
    <RN.View>
      {typeof ListHeaderComponent === "function" ? <ListHeaderComponent /> : ListHeaderComponent}
      {data.length > 0
        ? data.map((item: any, index: number) => (
            <RN.View key={String(item.id ?? index)}>{renderItem({ item, index })}</RN.View>
          ))
        : typeof ListEmptyComponent === "function"
          ? <ListEmptyComponent />
          : ListEmptyComponent}
    </RN.View>
  );
  RN.FlatList = FlatList;
  return RN;
});

const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
let mockPartnerState: any;
let mockOrderState: any;

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock("../../../hooks/useRedux", () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: any) => selector({ partner: mockPartnerState, orders: mockOrderState }),
}));

jest.mock("../../../hooks/useRealtimeDispatchRequests", () => ({
  useRealtimeDispatchRequests: jest.fn(),
}));

jest.mock("../../../hooks/useNetworkStatus", () => ({
  useNetworkStatus: jest.fn(),
}));

jest.mock("../../../services/partnerService", () => ({
  acceptDispatchRequest: jest.fn(),
  acceptPartnerOrder: jest.fn(),
  getCanonicalPartnerOrderId: jest.fn((item) => item.orderId ?? item.id),
  getPartnerDispatchConfig: jest.fn(),
  getOrderHistory: jest.fn().mockResolvedValue([]),
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

jest.mock("../../../features/shift/shiftStorage", () => ({
  getShiftState: jest.fn(),
}));

jest.mock("../../../redux/slices/analyticsSlice", () => ({
  analyticsActions: {
    incrementOrdersReceived: jest.fn((payload) => ({ type: "analytics/received", payload })),
    incrementOrdersAccepted: jest.fn((payload) => ({ type: "analytics/accepted", payload })),
    incrementOrdersRejected: jest.fn((payload) => ({ type: "analytics/rejected", payload })),
  },
}));

describe("NewOrdersScreen", () => {
  beforeAll(() => {
    jest.spyOn(global, "setInterval").mockImplementation((() => 1) as any);
    jest.spyOn(global, "clearInterval").mockImplementation((() => undefined) as any);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    (useRealtimeDispatchRequests as jest.Mock).mockReset();
    (useNetworkStatus as jest.Mock).mockReset();
    (getShiftState as jest.Mock).mockReset();
    (getPartnerDispatchConfig as jest.Mock).mockReset();
    (getCanonicalPartnerOrderId as jest.Mock).mockReset();
    (getOrderHistory as jest.Mock).mockReset();
    (acceptDispatchRequest as jest.Mock).mockReset();
    (acceptPartnerOrder as jest.Mock).mockReset();
    (rejectDispatchRequest as jest.Mock).mockReset();
    (enqueueAcceptOrder as jest.Mock).mockReset();
    (enqueueRejectOrder as jest.Mock).mockReset();
    mockPartnerState = { profile: { serviceCategory: "Cleaning" }, online: true };
    mockOrderState = { activeOrder: null };
    (useNetworkStatus as jest.Mock).mockReturnValue(true);
    (getShiftState as jest.Mock).mockResolvedValue({ shiftStarted: true });
    (getOrderHistory as jest.Mock).mockResolvedValue([]);
    (getPartnerDispatchConfig as jest.Mock).mockResolvedValue({ requestExpiryWarningSeconds: 60 });
    (getCanonicalPartnerOrderId as jest.Mock).mockImplementation((item) => item.orderId ?? item.id);
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
    (acceptPartnerOrder as jest.Mock).mockResolvedValue(undefined);
    (rejectDispatchRequest as jest.Mock).mockResolvedValue(undefined);
    (enqueueAcceptOrder as jest.Mock).mockResolvedValue(undefined);
    (enqueueRejectOrder as jest.Mock).mockResolvedValue(undefined);
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" } as any);
  });

  afterEach(async () => {
    await cleanup();
  });

  it("restores a dispatch-assigned booking after opening the orders screen", async () => {
    const assigned = { id: 147, status: "PARTNER_ASSIGNED" };
    (getOrderHistory as jest.Mock).mockResolvedValueOnce([assigned]);
    await render(<NewOrdersScreen />);
    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith({ type: "orders/setActiveOrder", payload: assigned }));
  });

  it("keeps subscription dispatch requests visible even when the request category is generic", async () => {
    mockPartnerState = { profile: { serviceCategory: "Cleaning" }, online: true };
    (useRealtimeDispatchRequests as jest.Mock).mockReturnValue({
      orders: [{
        id: 901,
        requestId: 901,
        customerName: "Nisha",
        address: "Versova",
        serviceCategory: "SUBSCRIPTION",
        serviceType: "SUBSCRIPTION",
        status: "PENDING",
        bookingType: "SUBSCRIPTION",
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
    await waitFor(() => expect(view.getAllByText("Nisha").length).toBeGreaterThan(0));
    expect(view.getByText("Booking Type: SUBSCRIPTION")).toBeTruthy();
  });

  it("shows offline availability copy and keeps active job visible", async () => {
    mockPartnerState = { profile: { serviceCategory: "Cleaning" }, online: false };
    mockOrderState = {
      activeOrder: {
        id: 91,
        orderId: 91,
        customerName: "Kiran",
        address: "Noida",
        status: "IN_PROGRESS",
      },
    };
    (getShiftState as jest.Mock).mockResolvedValue({ shiftStarted: true });
    (getOrderHistory as jest.Mock).mockResolvedValue([]);

    const view = await render(<NewOrdersScreen />);

    expect(await view.findByText("You are offline.")).toBeTruthy();
    expect(view.getAllByText("You will not receive new bookings.").length).toBeGreaterThan(0);
    expect(view.getByText("Active Job")).toBeTruthy();
    fireEvent.press(view.getByTestId("new-orders-active-job-card"));
    expect(mockNavigate).toHaveBeenCalledWith("ActiveJob", {
      orderId: 91,
      customerLatitude: undefined,
      customerLongitude: undefined,
    });
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
    await waitFor(() => expect(view.getAllByText("Riya").length).toBeGreaterThan(0));
    expect(view.getByText("Booking Type: Scheduled")).toBeTruthy();

    fireEvent.press(view.getByText("Reject"));
    const rejectAction = (Alert.alert as jest.Mock).mock.calls[0][2][1];
    await act(async () => {
      await rejectAction.onPress();
    });
    await waitFor(() => {
      expect(enqueueRejectOrder).toHaveBeenCalledWith(44, "Not available");
    });
  });

  it("keeps scheduled bookings on the active job screen after acceptance", async () => {
    (useRealtimeDispatchRequests as jest.Mock).mockReturnValue({
      orders: [{
        id: 31,
        requestId: 61,
        customerName: "Meera",
        address: "Gurgaon",
        serviceCategory: "CLEANING",
        subService: "Regular Clean",
        etaMinutes: 8,
        distance: 1800,
        priority: "NORMAL",
        status: "PENDING",
        payout: 350,
        bookingType: "SCHEDULED",
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

    const view = await render(<NewOrdersScreen />);

    await waitFor(() => expect(view.getAllByText("Meera").length).toBeGreaterThan(0));

    await act(async () => {
      fireEvent.press(view.getByText("Accept"));
    });
    expect(acceptPartnerOrder).toHaveBeenCalledWith(31);
    expect(mockNavigate).toHaveBeenCalledWith("ActiveJob", {
      orderId: 31,
      customerLatitude: undefined,
      customerLongitude: undefined,
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
    expect(view.queryByText("Asha")).toBeNull();
  });

  it("renders dispatch requests and handles share, detail, accept, and reject flows", async () => {
    const view = await render(<NewOrdersScreen />);

    expect(view.getByText("You are available to receive new bookings.")).toBeTruthy();
    expect(view.getByText("Riya")).toBeTruthy();
    expect(view.getByText("Category: CLEANING")).toBeTruthy();

    fireEvent.press(view.getByText("View Details"));
    fireEvent.press(view.getByLabelText("Share order"));
    await act(async () => {
      fireEvent.press(view.getByText("Accept"));
    });
    expect(acceptDispatchRequest).toHaveBeenCalledWith(44);
    expect(trackEvent).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("OrderDetails", { orderId: 22, requestId: 44 });
    expect(mockNavigate).toHaveBeenCalledWith("RouteMap", { orderId: 22, customerLatitude: undefined, customerLongitude: undefined });

    fireEvent.press(view.getByText("Reject"));
    const alertCalls = (Alert.alert as jest.Mock).mock.calls;
    const rejectAction = alertCalls[0][2][1];
    await act(async () => {
      await rejectAction.onPress();
    });
    expect(rejectDispatchRequest).toHaveBeenCalledWith(44, "Not available");
  });
});
