import React from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

import EarningsStatsScreen from "../EarningsStatsScreen";
import {
  getPartnerEarningsSummary,
  getPartnerEarningsTransactions,
  getPartnerWithdrawalBalance,
} from "../../../services/partnerService";

const mockToast = jest.fn();

jest.mock("../../../services/partnerService", () => ({
  getPartnerEarningsSummary: jest.fn(),
  getPartnerEarningsTransactions: jest.fn(),
  getPartnerWithdrawalBalance: jest.fn(),
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

const mockGetPartnerEarningsSummary = getPartnerEarningsSummary as jest.MockedFunction<typeof getPartnerEarningsSummary>;
const mockGetPartnerEarningsTransactions = getPartnerEarningsTransactions as jest.MockedFunction<typeof getPartnerEarningsTransactions>;
const mockGetPartnerWithdrawalBalance = getPartnerWithdrawalBalance as jest.MockedFunction<typeof getPartnerWithdrawalBalance>;

describe("EarningsStatsScreen", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPartnerEarningsSummary.mockReset();
    mockGetPartnerEarningsTransactions.mockReset();
    mockGetPartnerWithdrawalBalance.mockReset();
  });

  it("renders loading, summary, transactions, and navigation actions", async () => {
    let resolveSummary!: (value: any) => void;
    const summaryPromise = new Promise((res) => { resolveSummary = res; });
    mockGetPartnerEarningsSummary.mockReturnValueOnce(summaryPromise as any);
    mockGetPartnerEarningsTransactions.mockResolvedValueOnce([
      { id: "t1", description: "Settlement", amount: 250, bookingId: "9", status: "DONE", createdAt: "2026-06-24" },
      { id: "t2", description: "Refund", amount: -25, type: "REVERSAL" },
    ] as any);
    mockGetPartnerWithdrawalBalance.mockResolvedValueOnce({ availableBalance: 300, settledBalance: 0, reservedBalance: 50 } as any);

    const navigation = { goBack: jest.fn(), navigate: jest.fn() };
    const view = await render(<EarningsStatsScreen navigation={navigation} />);
    expect(view.getByTestId("earnings-scroll").props.refreshControl.props.refreshing).toBe(true);

    await act(async () => {
      resolveSummary({ todaySettlement: 100, weekSettlement: 500, monthSettlement: 1000, lifetimeSettlement: 5000 });
      await summaryPromise;
    });

    expect(await view.findByText("Settlement")).toBeTruthy();
    expect(view.getByText("Refund")).toBeTruthy();
    expect(view.getByText("INR 300.00")).toBeTruthy();

    fireEvent.press(view.getByLabelText("Payouts"));
    fireEvent.press(view.getByLabelText("Bank Account"));
    fireEvent.press(view.getByLabelText("Withdraw"));
    fireEvent.press(view.getByLabelText("Go back"));

    expect(navigation.navigate).toHaveBeenCalledWith("Payouts");
    expect(navigation.navigate).toHaveBeenCalledWith("BankAccount");
    expect(navigation.navigate).toHaveBeenCalledWith("Withdrawals");
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  it("handles balance fallback when withdrawal details are unavailable", async () => {
    mockGetPartnerEarningsSummary.mockResolvedValue({ todaySettlement: 100, weekSettlement: 500, monthSettlement: 1000, lifetimeSettlement: 5000 } as any);
    mockGetPartnerEarningsTransactions.mockResolvedValue([]);
    mockGetPartnerWithdrawalBalance.mockRejectedValue(new Error("balance unavailable"));

    const fallbackView = await render(<EarningsStatsScreen navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />);
    expect(await fallbackView.findByText("Available")).toBeTruthy();
    expect(fallbackView.getAllByText("INR 0.00").length).toBeGreaterThanOrEqual(1);
    expect(mockToast).not.toHaveBeenCalledWith("balance unavailable");
  });
});
