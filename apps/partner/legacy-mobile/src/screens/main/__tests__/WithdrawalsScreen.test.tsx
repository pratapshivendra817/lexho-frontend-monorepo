import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import WithdrawalsScreen, {
  money,
  normalizeWithdrawalAmountInput,
  validateWithdrawalAmount,
  withdrawalTimeline,
} from "../WithdrawalsScreen";
import {
  createPartnerWithdrawal,
  getPartnerWithdrawalBalance,
  getPartnerWithdrawals,
} from "../../../services/partnerService";

const mockToast = jest.fn();

jest.mock("../../../services/partnerService", () => ({
  createPartnerWithdrawal: jest.fn(),
  getPartnerWithdrawalBalance: jest.fn(),
  getPartnerWithdrawals: jest.fn(),
}));

jest.mock("../../../context/AppFeedbackContext", () => ({
  useAppFeedback: () => ({ toast: mockToast }),
}));

jest.mock("../../../context/AppLanguageContext", () => ({
  useAppLanguage: () => ({
    t: (key: string) => ({
      "common.currency_inr": "INR",
      "withdrawals.screen_title": "Withdrawals",
      "withdrawals.empty_history": "No withdrawal requests yet.",
      "withdrawals.settled_balance": "Settled balance",
      "withdrawals.amount_accessibility": "Withdrawal amount",
      "withdrawals.status_pending": "Pending",
      "withdrawals.status_approved": "Approved",
      "withdrawals.status_rejected": "Rejected",
      "withdrawals.status_completed": "Completed",
      "withdrawals.caption_requested": "Requested",
      "withdrawals.caption_awaiting_approval": "Awaiting approval",
      "withdrawals.caption_no_rejection": "No rejection",
      "withdrawals.caption_settlement_pending": "Settlement pending",
      "payouts.request": "Request Withdrawal",
    }[key] ?? key),
  }),
}));

jest.mock("../../../components/payments/PaymentHeader", () => {
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");
  return function MockPaymentHeader({ title, onBack }: { title: string; onBack: () => void }) {
    return React.createElement(
      View,
      null,
      React.createElement(TouchableOpacity, { onPress: onBack, accessibilityLabel: "Go back" }, React.createElement(Text, null, "Back")),
      React.createElement(Text, null, title),
    );
  };
});

const mockedGetPartnerWithdrawalBalance = getPartnerWithdrawalBalance as jest.MockedFunction<typeof getPartnerWithdrawalBalance>;
const mockedGetPartnerWithdrawals = getPartnerWithdrawals as jest.MockedFunction<typeof getPartnerWithdrawals>;

const balanceResponse = {
  availableBalance: 900,
  reservedBalance: 100,
  settledBalance: 1000,
};

describe("WithdrawalsScreen", () => {
  beforeEach(() => {
    mockedGetPartnerWithdrawalBalance.mockReset();
    mockedGetPartnerWithdrawals.mockReset();
    mockToast.mockReset();
    mockedGetPartnerWithdrawalBalance.mockResolvedValue(balanceResponse as any);
    mockedGetPartnerWithdrawals.mockResolvedValue([]);
    (createPartnerWithdrawal as jest.Mock).mockResolvedValue(undefined);
  });

  it("renders history rows, statuses, and back navigation", async () => {
    mockedGetPartnerWithdrawals.mockResolvedValueOnce([
      { id: "1", amount: 120, status: "COMPLETED", requestedAt: "2026-06-20T10:00:00Z", processedAt: "2026-06-21T11:00:00Z" },
      { id: "2", amount: 90, status: "REJECTED", requestedAt: "2026-06-22T10:00:00Z" },
    ] as any);

    const navigation = { goBack: jest.fn() };
    const view = await render(<WithdrawalsScreen navigation={navigation} />);

    await waitFor(() => {
      expect(view.getByText("Withdrawals")).toBeTruthy();
    });
    expect(view.getByText("INR 900.00")).toBeTruthy();
    expect(view.getByText("Withdrawal #1")).toBeTruthy();
    expect(view.getByText("Withdrawal #2")).toBeTruthy();
    expect(view.getAllByText("Pending").length).toBeGreaterThan(0);
    expect(view.getAllByText("Approved").length).toBeGreaterThan(0);
    expect(view.getAllByText("Rejected").length).toBeGreaterThan(0);
    expect(view.getAllByText("Completed").length).toBeGreaterThan(0);

    fireEvent.press(view.getByLabelText("Go back"));
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  it("renders empty history state after successful load", async () => {
    const view = await render(<WithdrawalsScreen navigation={{ goBack: jest.fn() }} />);

    await waitFor(() => {
      expect(view.getByText("No withdrawal requests yet.")).toBeTruthy();
    });
    expect(view.getByText("Settled balance: INR 1000.00")).toBeTruthy();
  });

  it("shows toast when initial load fails", async () => {
    mockedGetPartnerWithdrawalBalance.mockRejectedValueOnce(new Error("Unable to load withdrawals"));

    const view = await render(<WithdrawalsScreen navigation={{ goBack: jest.fn() }} />);

    await waitFor(() => {
      expect(view.getByText("Withdrawals")).toBeTruthy();
    });
    expect(mockToast).toHaveBeenCalledWith("Unable to load withdrawals");
  });

  it("validates invalid withdrawal submissions", async () => {
    const view = await render(<WithdrawalsScreen navigation={{ goBack: jest.fn() }} />);
    await waitFor(() => {
      expect(view.getByText("Settled balance: INR 1000.00")).toBeTruthy();
    });

    fireEvent.changeText(view.getByLabelText("Withdrawal amount"), "0");
    fireEvent.press(view.getAllByText("Request Withdrawal")[1]);
    expect(mockToast).toHaveBeenCalledWith("Enter a valid withdrawal amount");
    expect(createPartnerWithdrawal).not.toHaveBeenCalled();
  });

  it("formats money and normalizes withdrawal amount input", () => {
    expect(money(12, "INR")).toBe("INR 12.00");
    expect(normalizeWithdrawalAmountInput("1a2b.3-4")).toBe("12.34");
  });

  it("validates withdrawal amount rules", () => {
    expect(validateWithdrawalAmount("0", 900)).toEqual({
      error: "Enter a valid withdrawal amount",
      value: 0,
    });

    expect(validateWithdrawalAmount("950", 900)).toEqual({
      error: "Amount cannot exceed available balance",
      value: 950,
    });

    expect(validateWithdrawalAmount("300", 900)).toEqual({
      error: null,
      value: 300,
    });
  });

  it("builds withdrawal timeline for completed and rejected rows", () => {
    expect(withdrawalTimeline({ status: "COMPLETED", requestedAt: "2026-06-20T10:00:00Z", processedAt: "2026-06-21T11:00:00Z" } as any)).toEqual([
      { label: "Pending", done: true, at: "2026-06-20T10:00:00Z", caption: "Requested" },
      { label: "Approved", done: true, caption: "Awaiting approval" },
      { label: "Rejected", done: false, caption: "No rejection" },
      { label: "Completed", done: true, at: "2026-06-21T11:00:00Z", caption: "Settlement pending" },
    ]);

    expect(withdrawalTimeline({ status: "REJECTED", requestedAt: null } as any)).toEqual([
      { label: "Pending", done: true, at: null, caption: "Requested" },
      { label: "Approved", done: false, caption: "Awaiting approval" },
      { label: "Rejected", done: true, caption: "No rejection" },
      { label: "Completed", done: false, at: undefined, caption: "Settlement pending" },
    ]);
  });
});
