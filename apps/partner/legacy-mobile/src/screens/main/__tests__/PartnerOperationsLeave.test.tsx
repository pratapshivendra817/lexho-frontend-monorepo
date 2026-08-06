import React from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

import { LeaveManagementScreen } from "../PartnerOperationsScreens";
import {
  applyPartnerLeave,
  cancelPartnerLeave,
  getPartnerLeaves,
} from "../../../services/partnerService";

const mockToast = jest.fn();

jest.mock("../../../services/partnerService", () => ({
  applyPartnerLeave: jest.fn(),
  cancelPartnerLeave: jest.fn(),
  getPartnerLeaves: jest.fn(),
  getPartnerPerformanceSummary: jest.fn(),
  getPartnerRatings: jest.fn(),
  getPartnerServiceAreas: jest.fn(),
  getPartnerWarnings: jest.fn(),
  updatePartnerServiceAreas: jest.fn(),
}));

jest.mock("../../../context/AppFeedbackContext", () => ({
  useAppFeedback: () => ({ toast: mockToast }),
}));

jest.mock("../../../components/payments/PaymentHeader", () => {
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");
  return function MockPaymentHeader({ title, onBack }: { title: string; onBack: () => void }) {
    return React.createElement(
      View,
      null,
      React.createElement(TouchableOpacity, { onPress: onBack }, React.createElement(Text, null, "Back")),
      React.createElement(Text, null, title),
    );
  };
});

describe("PartnerOperations leave management", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockToast.mockReset();
    (getPartnerLeaves as jest.Mock).mockResolvedValue([
      { id: "leave-1", fromDate: "2099-07-20", toDate: "2099-07-21", reason: "", status: "APPROVED" },
    ]);
    (applyPartnerLeave as jest.Mock).mockResolvedValue(undefined);
    (cancelPartnerLeave as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it("renders future leave entries and cancels them", async () => {
    const view = await render(<LeaveManagementScreen navigation={{ goBack: jest.fn() }} />);

    expect(await view.findByText("No reason provided")).toBeTruthy();
    fireEvent.press(view.getByTestId("leave-cancel-button-leave-1"));

    await waitFor(() => {
      expect(cancelPartnerLeave).toHaveBeenCalledWith("leave-1");
    });
  });

  it("validates empty leave input before submit", async () => {
    (getPartnerLeaves as jest.Mock).mockResolvedValue([]);

    const view = await render(<LeaveManagementScreen navigation={{ goBack: jest.fn() }} />);

    expect(await view.findByText("No leave history.")).toBeTruthy();
    fireEvent.press(view.getByTestId("leave-apply-button"));

    expect(mockToast).toHaveBeenCalledWith("Enter start and end dates in YYYY-MM-DD format");
    expect(applyPartnerLeave).not.toHaveBeenCalled();
  });

  it("submits leave input and handles api failure", async () => {
    (getPartnerLeaves as jest.Mock).mockResolvedValue([]);
    (applyPartnerLeave as jest.Mock).mockRejectedValueOnce(new Error("leave apply failed"));

    const view = await render(<LeaveManagementScreen navigation={{ goBack: jest.fn() }} />);

    await view.findByText("No leave history.");
    await act(async () => {
      fireEvent.changeText(view.getByLabelText("Leave start date"), "2099-08-01");
      fireEvent.changeText(view.getByLabelText("Leave end date"), "2099-08-02");
      fireEvent.changeText(view.getByLabelText("Leave reason"), "Festival");
    });
    fireEvent.press(view.getByTestId("leave-apply-button"));

    await waitFor(() => {
      expect(applyPartnerLeave).toHaveBeenCalledWith({
        fromDate: "2099-08-01",
        toDate: "2099-08-02",
        reason: "Festival",
      });
    });
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith("leave apply failed");
    });
  });
});
