import React from "react";
import { Alert, Linking } from "react-native";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

import { SubscriptionConfirmedScreen } from "../src/screens/booking/SubscriptionConfirmedScreen";

const mockNavigate = jest.fn();
let mockQuery: any;

jest.mock("@tanstack/react-query", () => ({
  useQuery: () => mockQuery,
}));

jest.mock("../src/components/booking/BookingStageShell", () => ({
  BookingStageShell: ({ title, subtitle, children }: any) => {
    const { Text, View } = require("react-native");
    return <View><Text>{title}</Text><Text>{subtitle}</Text>{children}</View>;
  },
}));

jest.mock("../src/api/subscriptionApi", () => ({
  getSubscriptionDetails: jest.fn(),
}));

describe("SubscriptionConfirmedScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = {
      data: {
        id: "SUB-1",
        serviceType: "COOK",
        frequencyDays: ["Monday", "Friday"],
        startDate: "2026-06-15",
        endDate: "2026-07-15",
        visits: 8,
        timeSlot: "08:00",
        fullAddress: "Indore",
        totalAmount: 2000,
        nextVisitDate: "2026-06-16",
      },
    };
    jest.spyOn(Linking, "canOpenURL").mockResolvedValue(true);
    jest.spyOn(Linking, "openURL").mockResolvedValue(undefined as never);
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
  });

  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it("renders details and handles navigation and support calling", async () => {
    const view = await render(
      <SubscriptionConfirmedScreen
        route={{ params: { subscriptionId: "SUB-1" } }}
        navigation={{ navigate: mockNavigate }}
      />,
    );

    expect(view.getByText("Subscription Confirmed")).toBeTruthy();
    expect(view.getByText("Subscription ID: SUB-1")).toBeTruthy();
    expect(view.getByText("Cook")).toBeTruthy();
    expect(view.getByText("Monday, Friday")).toBeTruthy();

    await fireEvent.press(view.getByText("View Subscription"));
    await fireEvent.press(view.getByText("Manage Schedule"));
    await fireEvent.press(view.getByText("Call Support"));

    expect(mockNavigate).toHaveBeenCalledWith("SubscriptionPlan", { subscriptionId: "SUB-1" });
    expect(mockNavigate).toHaveBeenCalledWith("Main", { screen: "Bookings" });
    await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith("tel:+917999700475"));
  });

  it("uses fallbacks and handles unavailable and failed calls", async () => {
    mockQuery = { data: { serviceType: "CLEANING", planName: "Monthly" } };
    (Linking.canOpenURL as jest.Mock).mockResolvedValueOnce(false);
    let view = await render(
      <SubscriptionConfirmedScreen route={{ params: {} }} navigation={{ navigate: mockNavigate }} />,
    );
    expect(view.getByText("Cleaning")).toBeTruthy();
    expect(view.getByText("Monthly")).toBeTruthy();
    await fireEvent.press(view.getByText("View Subscription"));
    expect(mockNavigate).not.toHaveBeenCalledWith("SubscriptionPlan", expect.anything());
    await fireEvent.press(view.getByText("Call Support"));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith("Call unavailable", expect.any(String)));

    await cleanup();
    (Linking.canOpenURL as jest.Mock).mockRejectedValueOnce(new Error("link failure"));
    view = await render(
      <SubscriptionConfirmedScreen
        route={{ params: { bookingId: "SUB-2" } }}
        navigation={{ navigate: mockNavigate }}
      />,
    );
    await fireEvent.press(view.getByText("Call Support"));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith("Call failed", expect.any(String)));
  });
});
