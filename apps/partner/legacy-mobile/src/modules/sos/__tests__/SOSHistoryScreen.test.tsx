import React from "react";
import { render, waitFor } from "@testing-library/react-native";

import { SOSHistoryScreen } from "../screens/SOSHistoryScreen";
import { getSOSHistory } from "../services/SOSApiService";

jest.mock("../services/SOSApiService", () => ({
  getSOSHistory: jest.fn(),
}));

jest.mock("../../../context/AppLanguageContext", () => ({
  useAppLanguage: () => ({
    t: (key: string) =>
      ({
        "sos.history_title": "SOS History",
        "sos.history_empty": "No SOS incidents found.",
        "sos.history_load_error": "Unable to load SOS history.",
        "sos.emergency_title_short": "Emergency SOS",
        "sos.event_label": "Event",
        "sos.status_triggered": "TRIGGERED",
        "sos.status_acknowledged": "ACKNOWLEDGED",
        "sos.status_resolved": "RESOLVED",
        "support.message": "Message",
      }[key] ?? key),
  }),
}));

jest.mock("../../../components/payments/PaymentHeader", () => {
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");

  return function MockPaymentHeader({
    title,
    onBack,
  }: {
    title: string;
    onBack: () => void;
  }) {
    return React.createElement(
      View,
      null,
      React.createElement(
        TouchableOpacity,
        { onPress: onBack, accessibilityLabel: "Go back" },
        React.createElement(Text, null, "Back"),
      ),
      React.createElement(Text, null, title),
    );
  };
});

const mockedGetSOSHistory = getSOSHistory as jest.MockedFunction<typeof getSOSHistory>;

describe("SOSHistoryScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders empty state when there are no incidents", async () => {
    mockedGetSOSHistory.mockResolvedValueOnce([]);

    const view = await render(<SOSHistoryScreen navigation={{ goBack: jest.fn() }} />);

    expect(await view.findByText("SOS History")).toBeTruthy();
    expect(await view.findByText("No SOS incidents found.")).toBeTruthy();
  });

  it("renders incidents with localized status labels", async () => {
    mockedGetSOSHistory.mockResolvedValueOnce([
      {
        eventId: "EVT-1",
        status: "TRIGGERED",
        latitude: 28.6139,
        longitude: 77.209,
        address: "Connaught Place",
        message: "Need urgent help",
        createdAt: "2026-08-17T10:30:00.000Z",
      },
      {
        eventId: "EVT-2",
        status: "RESOLVED",
        latitude: 19.076,
        longitude: 72.8777,
        createdAt: "2026-08-16T09:10:00.000Z",
      },
    ] as any);

    const view = await render(<SOSHistoryScreen navigation={{ goBack: jest.fn() }} />);

    expect(await view.findByText("Event: EVT-1")).toBeTruthy();
    expect(view.getAllByText("Emergency SOS").length).toBeGreaterThan(0);
    expect(view.getByText("Connaught Place")).toBeTruthy();
    expect(view.getByText("Message: Need urgent help")).toBeTruthy();
    expect(view.getByText("TRIGGERED")).toBeTruthy();
    expect(view.getByText("RESOLVED")).toBeTruthy();
  });

  it("shows localized load error when history fetch fails", async () => {
    mockedGetSOSHistory.mockRejectedValueOnce(new Error("network broke"));

    const view = await render(<SOSHistoryScreen navigation={{ goBack: jest.fn() }} />);

    await waitFor(() => {
      expect(view.getByText("Unable to load SOS history.")).toBeTruthy();
    });
  });
});
