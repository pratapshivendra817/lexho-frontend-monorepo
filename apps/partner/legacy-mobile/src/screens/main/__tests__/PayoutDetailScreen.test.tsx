import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import PayoutDetailScreen from "../PayoutDetailScreen";
import { getPartnerPayoutById } from "../../../services/partnerService";

const mockToast = jest.fn();

jest.mock("../../../services/partnerService", () => ({
  getPartnerPayoutById: jest.fn(),
}));

jest.mock("../../../context/AppFeedbackContext", () => ({
  useAppFeedback: () => ({ toast: mockToast }),
}));

jest.mock("../../../components/payments/PaymentHeader", () => {
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");
  return function MockPaymentHeader({ title, onBack }: { title: string; onBack: () => void }) {
    return React.createElement(View, null,
      React.createElement(TouchableOpacity, { onPress: onBack, accessibilityLabel: "Go back" }, React.createElement(Text, null, "Back")),
      React.createElement(Text, null, title),
    );
  };
});

const mockedGetPartnerPayoutById = getPartnerPayoutById as jest.MockedFunction<typeof getPartnerPayoutById>;

describe("PayoutDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state before payout details arrive", async () => {
    let resolve!: (value: any) => void;
    const promise = new Promise((res) => { resolve = res; });
    mockedGetPartnerPayoutById.mockReturnValueOnce(promise as any);

    const view = await render(<PayoutDetailScreen route={{ params: { payoutId: "p1" } }} navigation={{ goBack: jest.fn() }} />);

    expect(view.getByTestId("payout-detail-loading")).toBeTruthy();

    await act(async () => {
      resolve({ id: "p1", grossAmount: 100, commissionAmount: 10, reversalAmount: 0, netAmount: 90, status: "SETTLED" });
      await promise;
    });
  });

  it("renders empty state when payout id is missing", async () => {
    const view = await render(<PayoutDetailScreen route={{ params: {} }} navigation={{ goBack: jest.fn() }} />);

    expect(view.getByText("Payout not found.")).toBeTruthy();
    expect(mockedGetPartnerPayoutById).not.toHaveBeenCalled();
  });

  it("renders payout details after successful fetch", async () => {
    mockedGetPartnerPayoutById.mockResolvedValueOnce({
      id: "42",
      grossAmount: 500,
      commissionAmount: 50,
      reversalAmount: 10,
      netAmount: 440,
      status: "SETTLED",
      createdAt: "2026-06-20T10:00:00Z",
      settledAt: "2026-06-21T10:00:00Z",
    });

    const navigation = { goBack: jest.fn() };
    const view = await render(<PayoutDetailScreen route={{ params: { payoutId: "42" } }} navigation={navigation} />);

    expect(await view.findByText("Payout #42")).toBeTruthy();
    expect(view.getByText("SETTLED")).toBeTruthy();
    expect(view.getByText("INR 440.00")).toBeTruthy();

    fireEvent.press(view.getByLabelText("Go back"));

    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  it("shows toast and empty state when payout fetch fails", async () => {
    mockedGetPartnerPayoutById.mockRejectedValueOnce(new Error("boom"));

    const view = await render(<PayoutDetailScreen route={{ params: { payoutId: "11" } }} navigation={{ goBack: jest.fn() }} />);

    expect(await view.findByText("Payout not found.")).toBeTruthy();
    expect(mockToast).toHaveBeenCalledWith("boom");
  });

  it("refreshes payout details on pull-to-refresh", async () => {
    mockedGetPartnerPayoutById
      .mockResolvedValueOnce({ id: "9", grossAmount: 100, commissionAmount: 10, reversalAmount: 0, netAmount: 90, status: "PENDING" })
      .mockResolvedValueOnce({ id: "9", grossAmount: 100, commissionAmount: 10, reversalAmount: 0, netAmount: 95, status: "SETTLED" });

    const view = await render(<PayoutDetailScreen route={{ params: { payoutId: "9" } }} navigation={{ goBack: jest.fn() }} />);
    expect(await view.findByText("PENDING")).toBeTruthy();

    await act(async () => {
      await view.getByTestId("payout-detail-scroll").props.refreshControl.props.onRefresh();
    });

    await waitFor(() => {
      expect(view.getByText("SETTLED")).toBeTruthy();
    });
    expect(mockedGetPartnerPayoutById).toHaveBeenCalledTimes(2);
  });
});
