import React from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

import {
  LeaveManagementScreen,
  PerformanceDashboardScreen,
  ServiceAreaManagementScreen,
  WarningCenterScreen,
} from "../PartnerOperationsScreens";
import {
  applyPartnerLeave,
  getPartnerLeaves,
  getPartnerPerformanceSummary,
  getPartnerRatings,
  getPartnerServiceAreas,
  getPartnerWarnings,
  updatePartnerServiceAreas,
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
      React.createElement(TouchableOpacity, { onPress: onBack, accessibilityLabel: "Go back" }, React.createElement(Text, null, "Back")),
      React.createElement(Text, null, title),
    );
  };
});

describe("PartnerOperations branch coverage", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockToast.mockReset();
    (getPartnerRatings as jest.Mock).mockResolvedValue({ averageRating: 0, totalReviews: 0, feedback: [] });
    (applyPartnerLeave as jest.Mock).mockResolvedValue(undefined);
    (updatePartnerServiceAreas as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it("submits leave successfully, resets inputs, and reloads leave history", async () => {
    (getPartnerLeaves as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: "leave-2", fromDate: "2099-09-01", toDate: "2099-09-02", reason: "Trip", status: "PENDING" },
      ]);

    const view = await render(<LeaveManagementScreen navigation={{ goBack: jest.fn() }} />);

    await view.findByText("No leave history.");
    await act(async () => {
      fireEvent.changeText(view.getByLabelText("Leave start date"), "2099-09-01");
      fireEvent.changeText(view.getByLabelText("Leave end date"), "2099-09-02");
      fireEvent.changeText(view.getByLabelText("Leave reason"), "  ");
    });
    fireEvent.press(view.getByTestId("leave-apply-button"));

    await waitFor(() => {
      expect(applyPartnerLeave).toHaveBeenCalledWith({
        fromDate: "2099-09-01",
        toDate: "2099-09-02",
        reason: undefined,
      });
    });
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith("Leave applied");
    });
    await waitFor(() => {
      expect(getPartnerLeaves).toHaveBeenCalledTimes(2);
    });
    expect(view.getAllByDisplayValue("")).toHaveLength(3);
    expect(view.getByText("2099-09-01 to 2099-09-02")).toBeTruthy();
  });

  it("filters selected service areas before saving and reports save failures", async () => {
    (getPartnerServiceAreas as jest.Mock).mockResolvedValueOnce([
      { id: "a1", name: "Missing Pincode", selected: true, pincode: "", city: "Delhi" },
      { id: "a2", name: "Dwarka", selected: false, pincode: "110075", city: "Delhi" },
    ]);
    (updatePartnerServiceAreas as jest.Mock)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("save failed"));

    const view = await render(<ServiceAreaManagementScreen navigation={{ goBack: jest.fn() }} />);

    expect(await view.findByText("Dwarka")).toBeTruthy();
    await act(async () => {
      fireEvent.press(view.getByTestId("service-area-toggle-a2"));
    });
    fireEvent.press(view.getByTestId("service-area-save-button"));

    await waitFor(() => {
      expect(updatePartnerServiceAreas).toHaveBeenNthCalledWith(1, [{ pincode: "110075", city: "Delhi" }]);
    });
    expect(mockToast).toHaveBeenCalledWith("Service areas updated");

    fireEvent.press(view.getByTestId("service-area-save-button"));
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith("save failed");
    });
  });

  it("renders warning cards with active styling, guidance, and timestamps", async () => {
    (getPartnerWarnings as jest.Mock).mockResolvedValueOnce([
      {
        id: "warning-1",
        type: "Late Arrival",
        reason: "Reached 20 minutes late",
        guidance: "Improve punctuality",
        createdAt: "2026-07-01T10:00:00Z",
        status: "ACTIVE",
        active: true,
      },
    ]);

    const view = await render(<WarningCenterScreen navigation={{ goBack: jest.fn() }} />);

    expect(await view.findByText("Late Arrival")).toBeTruthy();
    expect(view.getByText("Status")).toBeTruthy();
    expect(view.getByText("ACTIVE")).toBeTruthy();
    expect(view.getByText("Improve punctuality")).toBeTruthy();
    expect(view.getByText(/2026/)).toBeTruthy();
  });

  it("shows loader errors, retries failed loads, and supports pull-to-refresh", async () => {
    (getPartnerPerformanceSummary as jest.Mock)
      .mockRejectedValueOnce(new Error("summary failed"))
      .mockResolvedValue({
        acceptanceRate: 91,
        completionRate: 96,
        cancellationRate: 1,
        rating: 4.9,
        onTimeArrivalRate: 90,
      });

    const view = await render(<PerformanceDashboardScreen navigation={{ goBack: jest.fn() }} />);

    expect(await view.findByText("summary failed")).toBeTruthy();
    fireEvent.press(view.getByTestId("screen-retry-performance"));

    await waitFor(() => {
      expect(view.getByText("91%")).toBeTruthy();
    });

    const tree = view.toJSON() as any;
    await act(async () => {
      await tree.props.refreshControl.props.onRefresh();
    });

    await waitFor(() => {
      expect(getPartnerPerformanceSummary).toHaveBeenCalledTimes(3);
    });
  });
});
