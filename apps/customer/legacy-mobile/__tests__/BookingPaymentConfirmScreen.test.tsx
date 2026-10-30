import React from "react";
import { Alert, Linking } from "react-native";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

import { BookingPaymentConfirmScreen } from "../src/screens/booking/BookingPaymentConfirmScreen";

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
let mockQuery: any;
let mockMeta: any;
let mockTarget: any;

jest.mock("../src/hooks/useInstantBookingLifecycle", () => ({
  useInstantBookingLifecycle: () => mockQuery,
}));

jest.mock("../src/hooks/useBookingLifecycleNavigation", () => ({
  resolveLifecycleTarget: () => mockTarget,
}));

jest.mock("../src/utils/bookingMeta", () => ({
  getBookingMeta: () => mockMeta,
}));

jest.mock("../src/components/booking/BookingStageShell", () => ({
  BookingStageShell: ({ title, subtitle, children }: any) => {
    const { Text, View } = require("react-native");
    return <View><Text>{title}</Text><Text>{subtitle}</Text>{children}</View>;
  },
}));

jest.mock("../src/components/booking/BookingTimeline", () => ({
  BookingTimeline: () => {
    const { Text } = require("react-native");
    return <Text>Booking timeline</Text>;
  },
}));

jest.mock("../src/components/booking/AssignedPartnerMap", () => ({
  AssignedPartnerMap: ({ booking }: any) => {
    const { Text } = require("react-native");
    return <Text testID="assigned-partner-map">{String(booking?.map?.partner?.latitude ?? "waiting")}</Text>;
  },
}));

describe("BookingPaymentConfirmScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMeta = { canReschedule: true, canRaiseIssue: true };
    mockTarget = { name: "LiveTracking" };
    mockQuery = {
      refetch: jest.fn(),
      data: {
        id: "B1",
        bookingType: "SCHEDULED",
        serviceName: "Deep Clean",
        scheduledAt: "2026-06-14T10:00:00",
        assignmentStatus: "PENDING",
        fullAddress: "Indore",
        totalAmount: 1000,
        statusHistory: [{ label: "Confirmed" }],
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

  function renderScreen(mode: any = "SCHEDULED", bookingId = "B1") {
    return render(
      <BookingPaymentConfirmScreen
        route={{ params: { bookingId, bookingMode: mode } }}
        navigation={{ navigate: mockNavigate, replace: mockReplace }}
      />,
    );
  }

  it("refreshes PINs and only shows the PIN for the current service stage", async () => {
    mockQuery.data = { ...mockQuery.data, serviceStartPin: "0123", serviceCompletePin: "0456" };
    const view = await renderScreen();
    expect(view.getByText("Start Service PIN")).toBeTruthy();
    expect(view.getByText("End Service PIN")).toBeTruthy();
    expect(view.queryByText("0123")).toBeNull();
    expect(view.queryByText("0456")).toBeNull();
    await fireEvent.press(view.getByText("Refresh PINs & Status"));
    expect(mockQuery.refetch).toHaveBeenCalledTimes(1);

    for (const status of ["ARRIVED", "IN_PROGRESS", "STARTED", "COMPLETED", "CANCELLED"]) {
      mockQuery.data = { ...mockQuery.data, assignmentStatus: status };
      await view.rerender(<BookingPaymentConfirmScreen route={{ params: { bookingId: "B1" } }} navigation={{ navigate: mockNavigate, replace: mockReplace }} />);
      expect(Boolean(view.queryByText("0123"))).toBe(status === "ARRIVED");
      expect(Boolean(view.queryByText("0456"))).toBe(["IN_PROGRESS", "STARTED"].includes(status));
    }
  });

  it("shows and updates the map only for an assigned instant booking", async () => {
    mockQuery.data = { ...mockQuery.data, bookingType: "INSTANT", assignmentStatus: "SEARCHING_PARTNER" };
    const view = await renderScreen("INSTANT");
    expect(view.queryByTestId("assigned-partner-map")).toBeNull();
    const refresh = () => view.rerender(<BookingPaymentConfirmScreen route={{ params: { bookingId: "B1" } }} navigation={{ navigate: mockNavigate, replace: mockReplace }} />);
    for (const status of ["ACCEPTED", "PARTNER_ASSIGNED", "ON_THE_WAY", "ARRIVED"]) {
      mockQuery.data = { ...mockQuery.data, assignmentStatus: status };
      await refresh();
      expect(view.getByTestId("assigned-partner-map")).toBeTruthy();
    }
    mockQuery.data = { ...mockQuery.data, map: { partner: { latitude: 19.14 } } };
    await refresh();
    expect(view.getByText("19.14")).toBeTruthy();
    mockQuery.data = { ...mockQuery.data, map: { partner: { latitude: 19.15 } } };
    await refresh();
    expect(view.getByText("19.15")).toBeTruthy();
    for (const status of ["IN_PROGRESS", "COMPLETED", "CANCELLED"]) {
      mockQuery.data = { ...mockQuery.data, assignmentStatus: status };
      await refresh();
      expect(view.queryByTestId("assigned-partner-map")).toBeNull();
    }
    mockQuery.data = { ...mockQuery.data, bookingType: "SCHEDULED", assignmentStatus: "PARTNER_ASSIGNED" };
    await refresh();
    expect(view.queryByTestId("assigned-partner-map")).toBeNull();
  });

  it("renders scheduled details, proceeds, reschedules, raises issue, and calls support", async () => {
    const view = await renderScreen();

    expect(view.getByText("Scheduled Booking Confirmed")).toBeTruthy();
    expect(view.getByText("Booking timeline")).toBeTruthy();
    expect(view.getByText("View Booking")).toBeTruthy();

    await fireEvent.press(view.getByText("View Booking"));
    await fireEvent.press(view.getByText("Reschedule Booking"));
    await fireEvent.press(view.getByText("Raise Issue"));
    await fireEvent.press(view.getByText("Call Support"));

    expect(mockReplace).toHaveBeenCalledWith("LiveTracking", { bookingId: "B1" });
    expect(mockNavigate).toHaveBeenCalledWith("ScheduledReschedule", {
      bookingId: "B1",
      currentScheduledAt: "2026-06-14T10:00:00",
    });
    expect(mockNavigate).toHaveBeenCalledWith("Support");
    await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith("tel:+917999700475"));
  });

  it("renders instant and generic branches and handles support failures", async () => {
    mockQuery.data = {
      ...mockQuery.data,
      bookingType: "INSTANT",
      trackingStatus: "SEARCHING",
      createdAt: "invalid-date",
    };
    let view = await renderScreen("INSTANT");
    expect(view.getByText("Instant Booking Confirmed")).toBeTruthy();
    expect(view.getByText("Track Booking")).toBeTruthy();
    await fireEvent.press(view.getByText("Go to My Bookings"));
    expect(mockNavigate).toHaveBeenCalledWith("Main", { screen: "Bookings" });

    await cleanup();
    mockQuery.data = { bookingType: "OTHER" };
    (Linking.canOpenURL as jest.Mock).mockResolvedValueOnce(false);
    view = await renderScreen(null, "");
    expect(view.getByText("Booking Confirmed")).toBeTruthy();
    expect(view.getByText("Open Support Tickets")).toBeTruthy();
    await fireEvent.press(view.getByText("Track Booking"));
    expect(mockReplace).not.toHaveBeenCalled();
    await fireEvent.press(view.getByText("Call Support"));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith("Call unavailable", expect.any(String)));

    await cleanup();
    (Linking.canOpenURL as jest.Mock).mockRejectedValueOnce(new Error("failed"));
    view = await renderScreen("INSTANT", "B2");
    await fireEvent.press(view.getByText("Call Support"));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith("Call failed", expect.any(String)));
  });
});
