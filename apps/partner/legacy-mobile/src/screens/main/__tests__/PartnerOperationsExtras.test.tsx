import React from "react";
import { cleanup, render } from "@testing-library/react-native";

import {
  RatingsScreen,
} from "../PartnerOperationsScreens";
import {
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

describe("PartnerOperations extras", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getPartnerRatings as jest.Mock).mockResolvedValue({
      averageRating: 0,
      totalReviews: 0,
      feedback: [],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders ratings empty state", async () => {
    const view = await render(<RatingsScreen navigation={{ goBack: jest.fn() }} />);

    expect(await view.findByText("No customer feedback yet.")).toBeTruthy();
    expect(view.getByText("0/5")).toBeTruthy();
  });

  it("renders ratings feedback fallbacks for missing customer name and comment", async () => {
    (getPartnerRatings as jest.Mock).mockResolvedValueOnce({
      averageRating: 3.8,
      totalReviews: 1,
      feedback: [
        {
          id: "feedback-1",
          rating: 4,
        },
      ],
    });

    const view = await render(<RatingsScreen navigation={{ goBack: jest.fn() }} />);

    expect(await view.findByText("3.8/5")).toBeTruthy();
    expect(view.getByText("Customer | 4/5")).toBeTruthy();
    expect(view.getByText("No written feedback")).toBeTruthy();
  });
});
