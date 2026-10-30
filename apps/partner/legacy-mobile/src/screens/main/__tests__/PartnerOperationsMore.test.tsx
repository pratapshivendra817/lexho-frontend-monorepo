import React from "react";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

import {
  LeaveManagementScreen,
  ServiceAreaManagementScreen,
  WarningCenterScreen,
} from "../PartnerOperationsScreens";
import {
  applyPartnerLeave,
  cancelPartnerLeave,
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

jest.mock("../../../context/AppLanguageContext", () => ({
  useAppLanguage: () => ({
    t: (_key: string, fallback?: string) => fallback ?? "",
  }),
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

describe("PartnerOperations more screens", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (getPartnerPerformanceSummary as jest.Mock).mockResolvedValue({});
    (getPartnerRatings as jest.Mock).mockResolvedValue({ averageRating: 0, totalReviews: 0, feedback: [] });
    (getPartnerLeaves as jest.Mock).mockResolvedValue([]);
    (getPartnerServiceAreas as jest.Mock).mockResolvedValue([]);
    (getPartnerWarnings as jest.Mock).mockResolvedValue([]);
    (applyPartnerLeave as jest.Mock).mockResolvedValue(undefined);
    (cancelPartnerLeave as jest.Mock).mockResolvedValue(undefined);
    (updatePartnerServiceAreas as jest.Mock).mockResolvedValue(undefined);
    mockToast.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders empty leave and service-area states", async () => {
    const leaveNav = { goBack: jest.fn() };
    const leaveView = await render(<LeaveManagementScreen navigation={leaveNav} />);

    expect(await leaveView.findByText("No leave history.")).toBeTruthy();
    fireEvent.press(leaveView.getByText("Back"));
    expect(leaveNav.goBack).toHaveBeenCalled();

    const serviceNav = { goBack: jest.fn() };
    const serviceView = await render(<ServiceAreaManagementScreen navigation={serviceNav} />);

    expect(await serviceView.findByText("No service areas available.")).toBeTruthy();
    fireEvent.press(serviceView.getByText("Back"));
    expect(serviceNav.goBack).toHaveBeenCalled();
  });

  it("renders the empty warnings state and supports going back", async () => {
    const emptyView = await render(<WarningCenterScreen navigation={{ goBack: jest.fn() }} />);
    expect(await emptyView.findByText("No active warnings.")).toBeTruthy();
    expect(emptyView.getByText("You're doing a great job. Keep maintaining high service quality.")).toBeTruthy();
    fireEvent.press(emptyView.getByText("Back"));
  });
});
