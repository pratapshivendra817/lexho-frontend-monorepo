import React from "react";
import { cleanup, render } from "@testing-library/react-native";

import {
  PerformanceDashboardScreen,
  RatingsScreen,
} from "../PartnerOperationsScreens";
import {
  getPartnerPerformanceSummary,
  getPartnerRatings,
} from "../../../services/partnerService";

const mockToast = jest.fn();

jest.mock("../../../services/partnerService", () => ({
  getPartnerPerformanceSummary: jest.fn(),
  getPartnerRatings: jest.fn(),
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
      React.createElement(TouchableOpacity, { onPress: onBack, accessibilityLabel: "Go back" }, React.createElement(Text, null, "Back")),
      React.createElement(Text, null, title),
    );
  };
});

describe("partner operations screens", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders performance and ratings data", async () => {
    (getPartnerPerformanceSummary as jest.Mock).mockResolvedValueOnce({
      acceptanceRate: 90,
      completionRate: 95,
      cancellationRate: 3,
      rating: 4.8,
      onTimeArrivalRate: 88,
    });

    const performanceView = await render(<PerformanceDashboardScreen navigation={{ goBack: jest.fn() }} />);
    expect(await performanceView.findByText("Acceptance Rate")).toBeTruthy();
    expect(performanceView.getByText("90%")).toBeTruthy();

    performanceView.unmount();

    (getPartnerRatings as jest.Mock).mockResolvedValueOnce({
      averageRating: 4.6,
      totalReviews: 12,
      feedback: [{ id: "1", customerName: "Nisha", rating: 5, comment: "Excellent", createdAt: "2026-07-01T10:00:00Z" }],
    });

    const ratingsView = await render(<RatingsScreen navigation={{ goBack: jest.fn() }} />);
    expect(await ratingsView.findByText("4.6/5")).toBeTruthy();
    expect(ratingsView.getByText("Excellent")).toBeTruthy();
  });
});
