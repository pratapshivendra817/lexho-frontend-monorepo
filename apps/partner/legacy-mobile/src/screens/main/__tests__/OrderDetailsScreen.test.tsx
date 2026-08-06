import React from "react";
import { Share } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import OrderDetailsScreen from "../OrderDetailsScreen";
import { fetchPartnerRequestById, getPartnerOrderById } from "../../../services/partnerService";

jest.mock("../../../services/partnerService", () => ({
  fetchPartnerRequestById: jest.fn(),
  getPartnerOrderById: jest.fn(),
}));

jest.mock("../../../components/common/OrderLifecycleTimeline", () => ({
  OrderLifecycleTimeline: ({ order }: any) => {
    const React = require("react");
    const { Text } = require("react-native");
    return React.createElement(Text, null, `Timeline:${order?.status ?? "NONE"}`);
  },
}));

jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" } as any);

const mockFetchPartnerRequestById = fetchPartnerRequestById as jest.MockedFunction<typeof fetchPartnerRequestById>;
const mockGetPartnerOrderById = getPartnerOrderById as jest.MockedFunction<typeof getPartnerOrderById>;

describe("OrderDetailsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchPartnerRequestById.mockReset();
    mockGetPartnerOrderById.mockReset();
  });

  it("renders loading state before order arrives", async () => {
    let resolve!: (value: any) => void;
    const promise = new Promise((res) => { resolve = res; });
    mockGetPartnerOrderById.mockReturnValueOnce(promise as any);
    const view = await render(<OrderDetailsScreen route={{ params: { orderId: 10 } }} navigation={{ navigate: jest.fn() }} />);

    expect(view.getByTestId("order-details-loading")).toBeTruthy();

    await act(async () => {
      resolve({ id: 10, status: "ACCEPTED" });
      await promise;
    });
    await waitFor(() => {
      expect(view.queryByTestId("order-details-loading")).toBeNull();
    });
  });

  it("renders error state and retries", async () => {
    mockGetPartnerOrderById
      .mockRejectedValueOnce(new Error("bad load"))
      .mockResolvedValueOnce({ id: 10, status: "COMPLETED" } as any);

    const view = await render(<OrderDetailsScreen route={{ params: { orderId: 10 } }} navigation={{ navigate: jest.fn() }} />);

    expect(await view.findByText("bad load")).toBeTruthy();
    fireEvent.press(view.getByText("Retry"));
    await waitFor(() => {
      expect(view.getByText("Order #10")).toBeTruthy();
    });
  });

  it("shows not found when order id is missing and retry stays local", async () => {
    const view = await render(<OrderDetailsScreen route={{ params: {} }} navigation={{ navigate: jest.fn() }} />);

    expect(view.getByText("Order not found")).toBeTruthy();

    fireEvent.press(view.getByText("Retry"));

    expect(mockGetPartnerOrderById).not.toHaveBeenCalled();
    expect(mockFetchPartnerRequestById).not.toHaveBeenCalled();
  });

  it("loads request details when request id is provided", async () => {
    mockFetchPartnerRequestById.mockResolvedValueOnce({ id: 88, customerName: "Neha", status: "STARTED" } as any);
    const view = await render(<OrderDetailsScreen route={{ params: { orderId: 10, requestId: 88 } }} navigation={{ navigate: jest.fn() }} />);

    expect(await view.findByText("Order #88")).toBeTruthy();
    expect(mockFetchPartnerRequestById).toHaveBeenCalledWith(88);
  });

  it("disables active-job and route-map paths when status/coordinates are unavailable", async () => {
    mockGetPartnerOrderById.mockResolvedValue({
      id: 22,
      customerName: "Riya",
      status: "COMPLETED",
    } as any);
    const navigation = { navigate: jest.fn() };
    const view = await render(<OrderDetailsScreen route={{ params: { orderId: 22 } }} navigation={navigation} />);

    expect(await view.findByText("Order #22")).toBeTruthy();
    await waitFor(() => {
      expect(view.getByText("Active job opens after acceptance")).toBeTruthy();
    });

    fireEvent.press(view.getByText("Active job opens after acceptance"));
    fireEvent.press(view.getByText("Open Route Map"));

    expect(navigation.navigate).not.toHaveBeenCalledWith("ActiveJob", expect.anything());
    expect(navigation.navigate).not.toHaveBeenCalledWith("RouteMap", expect.anything());
  });

  it("renders full order details and supports share/navigation actions", async () => {
    mockGetPartnerOrderById
      .mockResolvedValueOnce({
        id: 21,
        customerName: "Aarav",
        customerPhone: "99999",
        address: "Delhi",
        serviceType: "Cleaning",
        amount: 700,
        status: "ACCEPTED",
        latitude: 12.1,
        longitude: 77.1,
        createdAt: "2026-06-24",
      } as any)
      .mockResolvedValueOnce({
        id: 21,
        customerName: "Aarav",
        customerPhone: "99999",
        address: "Delhi",
        serviceType: "Cleaning",
        amount: 700,
        status: "ACCEPTED",
        latitude: 12.1,
        longitude: 77.1,
        createdAt: "2026-06-24",
      } as any);
    const navigation = { navigate: jest.fn() };
    const view = await render(<OrderDetailsScreen route={{ params: { orderId: 21 } }} navigation={navigation} />);

    expect(await view.findByText("Order #21")).toBeTruthy();
    expect(view.getByText("Timeline:ACCEPTED")).toBeTruthy();

    await act(async () => {
      fireEvent.press(view.getByLabelText("Share order"));
    });
    fireEvent.press(view.getByText("Chat with Customer"));
    fireEvent.press(view.getByText("Call Customer"));
    fireEvent.press(view.getByText("Open Active Job"));
    fireEvent.press(view.getByText("Open Route Map"));
    await act(async () => {
      await view.getByTestId("order-details-scroll").props.refreshControl.props.onRefresh();
    });

    expect(Share.share).toHaveBeenCalled();
    expect(navigation.navigate).toHaveBeenCalledWith("Chat", { orderId: 21, customerName: "Aarav" });
    expect(navigation.navigate).toHaveBeenCalledWith("OutgoingCall", { orderId: 21, customerName: "Aarav" });
    expect(navigation.navigate).toHaveBeenCalledWith("ActiveJob", { orderId: 21, customerLatitude: 12.1, customerLongitude: 77.1 });
    expect(navigation.navigate).toHaveBeenCalledWith("RouteMap", { orderId: 21, customerLatitude: 12.1, customerLongitude: 77.1 });
  });
});
