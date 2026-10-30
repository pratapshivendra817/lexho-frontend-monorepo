import React from "react";
import { Share } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import OrderHistoryScreen from "../OrderHistoryScreen";
import { getCanonicalPartnerOrderId, getOrderHistory } from "../../../services/partnerService";

jest.mock("react-native/Libraries/Lists/FlatList", () => {
  const React = require("react");
  const { View } = require("react-native");

  return {
    __esModule: true,
    default: ({ data = [], renderItem, ListEmptyComponent, testID = "order-history-list", ...props }: any) =>
      React.createElement(
        View,
        { testID, ...props },
        data.length === 0
          ? typeof ListEmptyComponent === "function"
            ? React.createElement(ListEmptyComponent)
            : ListEmptyComponent
          : data.map((item: any, index: number) =>
              React.createElement(View, { key: `${item.id ?? index}` }, renderItem({ item, index })),
            ),
      ),
  };
});

const mockNavigation = { navigate: jest.fn() };

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => mockNavigation,
}));

jest.mock("../../../services/partnerService", () => ({
  getCanonicalPartnerOrderId: jest.fn((item) => item.requestId ?? item.id),
  getOrderHistory: jest.fn(),
}));

jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" } as any);

const mockedGetOrderHistory = getOrderHistory as jest.MockedFunction<typeof getOrderHistory>;
const mockedGetCanonicalPartnerOrderId = getCanonicalPartnerOrderId as jest.MockedFunction<typeof getCanonicalPartnerOrderId>;

describe("OrderHistoryScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetCanonicalPartnerOrderId.mockImplementation((item) => item.requestId ?? item.id);
  });

  it("loads and renders filtered completed orders", async () => {
    mockedGetOrderHistory.mockResolvedValueOnce([
      { id: 1, customerName: "Aarav", serviceType: "Cleaning", amount: 500, status: "COMPLETED" },
      { id: 2, customerName: "Neha", serviceType: "Plumbing", amount: 300, status: "CANCELLED" },
    ] as any);

    const view = await render(<OrderHistoryScreen />);

    expect(await view.findByText("Aarav")).toBeTruthy();
    expect(view.queryByText("Neha")).toBeNull();
  });

  it("switches tabs and applies search filter", async () => {
    mockedGetOrderHistory.mockResolvedValueOnce([
      { id: 1, customerName: "Aarav", serviceType: "Cleaning", amount: 500, status: "COMPLETED" },
      { id: 2, customerName: "Neha", serviceType: "Plumbing", amount: 300, status: "CANCELLED" },
      { id: 3, customerName: "Kabir", serviceType: "AC", amount: 700, status: "STARTED" },
    ] as any);

    const view = await render(<OrderHistoryScreen />);
    expect(await view.findByText("Aarav")).toBeTruthy();

    fireEvent.press(view.getByText("Cancelled"));
    await waitFor(() => {
      expect(view.getByText("Neha")).toBeTruthy();
    });

    fireEvent.press(view.getByText("Pending"));
    await waitFor(() => {
      expect(view.getByText("Kabir")).toBeTruthy();
    });

    fireEvent.changeText(view.getByPlaceholderText("Search by customer/order id"), "3");
    await waitFor(() => {
      expect(view.getByText("Kabir")).toBeTruthy();
      expect(view.queryByText("Aarav")).toBeNull();
    });
  });

  it("refreshes, paginates, navigates, and shares", async () => {
    mockedGetOrderHistory
      .mockResolvedValueOnce([{ id: 1, customerName: "Aarav", serviceType: "Cleaning", amount: 500, status: "COMPLETED" }] as any)
      .mockResolvedValueOnce([{ id: 2, customerName: "Riya", serviceType: "AC", amount: 900, status: "COMPLETED" }] as any)
      .mockResolvedValueOnce([{ id: 3, customerName: "Kabir", serviceType: "Paint", amount: 400, status: "COMPLETED" }] as any);

    const view = await render(<OrderHistoryScreen />);
    expect(await view.findByText("Aarav")).toBeTruthy();

    await act(async () => {
      await view.getByTestId("order-history-list").props.refreshControl.props.onRefresh();
    });
    expect(await view.findByText("Riya")).toBeTruthy();

    await act(async () => {
      await view.getByTestId("order-history-list").props.onEndReached();
    });

    await waitFor(() => {
      expect(view.getByText("Kabir")).toBeTruthy();
    });

    fireEvent.press(view.getAllByText("View Details")[0]);
    fireEvent.press(view.getAllByLabelText("Share order")[0]);

    expect(mockNavigation.navigate).toHaveBeenCalled();
    expect(Share.share).toHaveBeenCalled();
  });
});
