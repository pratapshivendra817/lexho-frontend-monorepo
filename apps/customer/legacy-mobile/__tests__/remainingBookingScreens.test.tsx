import React from "react";
import { Alert, Linking } from "react-native";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

import { ScheduledRescheduleScreen } from "../src/screens/booking/ScheduledRescheduleScreen";
import { ScheduledBookingStatusScreen } from "../src/screens/booking/ScheduledBookingStatusScreen";
import { PartnerArrivedScreen } from "../src/screens/booking/PartnerArrivedScreen";
import { ServiceInProgressScreen } from "../src/screens/booking/ServiceInProgressScreen";
import { BookingStatusFallbackScreen } from "../src/screens/booking/BookingStatusFallbackScreen";
import { RatePartnerScreen } from "../src/screens/booking/RatePartnerScreen";

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockRefetch = jest.fn();
const mockReschedule = jest.fn();
const mockCancel = jest.fn();
const mockAddReview = jest.fn();
const mockCapture = jest.fn();
const mockTrackRescheduled = jest.fn();
const mockTrackCancelled = jest.fn();
let mockLifecycle: any;
let mockMeta: any;
let mockPending = false;
let mockSelectedTime = "2026-06-15T12:00:00";

jest.mock("../src/components/booking/BookingStageShell", () => ({
  BookingStageShell: ({ title, subtitle, children }: any) => {
    const { Text, View } = require("react-native");
    return <View><Text>{title}</Text><Text>{subtitle}</Text>{children}</View>;
  },
}));
jest.mock("../src/components/booking/StatusBadge", () => ({
  StatusBadge: ({ status }: any) => {
    const { Text } = require("react-native");
    return <Text>{`Status ${status}`}</Text>;
  },
}));
jest.mock("../src/components/booking/BookingTimeline", () => ({
  BookingTimeline: () => {
    const { Text } = require("react-native");
    return <Text>Timeline</Text>;
  },
}));
jest.mock("../src/components/cart/TimePicker", () => ({
  TimePicker: ({ onChange }: any) => {
    const { Pressable, Text } = require("react-native");
    return <Pressable onPress={() => onChange(mockSelectedTime)}><Text>Select new slot</Text></Pressable>;
  },
}));
jest.mock("../src/components/booking/RatingModal", () => ({
  RatingModal: ({ visible, onChange, onClose, onSubmit }: any) => {
    if (!visible) return null;
    const { Pressable, Text, View } = require("react-native");
    return <View>
      <Pressable onPress={() => onChange(4)}><Text>Choose 4 stars</Text></Pressable>
      <Pressable onPress={onSubmit}><Text>Submit rating</Text></Pressable>
      <Pressable onPress={onClose}><Text>Close rating</Text></Pressable>
    </View>;
  },
}));
jest.mock("../src/hooks/useInstantBookingLifecycle", () => ({
  useInstantBookingLifecycle: () => mockLifecycle,
}));
jest.mock("../src/hooks/useBookingLifecycleNavigation", () => ({
  useBookingLifecycleNavigation: jest.fn(),
}));
jest.mock("../src/utils/bookingMeta", () => ({
  getBookingMeta: () => mockMeta,
}));
jest.mock("../src/api/bookingExtrasApi", () => ({
  rescheduleBooking: (...args: any[]) => mockReschedule(...args),
  cancelBooking: (...args: any[]) => mockCancel(...args),
}));
jest.mock("../src/api/reviewApi", () => ({
  addReview: (...args: any[]) => mockAddReview(...args),
}));
jest.mock("../src/api/client", () => ({
  getApiErrorCode: () => "API_FAILURE",
}));
jest.mock("../src/services/customerAnalyticsEvents", () => ({
  trackBookingRescheduled: (...args: any[]) => mockTrackRescheduled(...args),
  trackBookingCancelled: (...args: any[]) => mockTrackCancelled(...args),
}));
jest.mock("../src/services/monitoring", () => ({
  captureFrontendError: (...args: any[]) => mockCapture(...args),
}));
jest.mock("@tanstack/react-query", () => ({
  useMutation: (options: any) => ({
    isPending: mockPending,
    mutate: async () => {
      if (mockPending) return;
      try {
        const result = await options.mutationFn();
        options.onSuccess?.(result);
      } catch (error) {
        options.onError?.(error);
      }
    },
  }),
}));

describe("remaining booking screens", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPending = false;
    mockMeta = {
      canCancel: true,
      canReschedule: true,
      canCallPartner: true,
      arrivalTime: "2026-06-13T10:00:00",
      trackingScreen: "LIVE_TRACKING",
    };
    mockLifecycle = {
      data: {
        id: "B1",
        serviceId: "S1",
        serviceName: "Deep Clean",
        partnerName: "Amit",
        partnerPhone: "9999999999",
        status: "CONFIRMED",
        assignmentStatus: "ARRIVED",
        scheduledAt: "2026-06-14T10:00:00",
        serviceStartedAt: "2026-06-14T10:05:00",
        estimatedCompletionTime: "2026-06-14T11:00:00",
        progressStatus: "Kitchen complete",
        fullAddress: "Indore",
        totalAmount: 500,
      },
      refetch: mockRefetch,
    };
    mockRefetch.mockResolvedValue({});
    mockReschedule.mockResolvedValue({ id: "B2" });
    mockCancel.mockResolvedValue({});
    mockAddReview.mockResolvedValue({});
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    jest.spyOn(Linking, "openURL").mockResolvedValue(undefined as never);
  });

  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it("reschedules a booking and rejects unchanged or failed slots", async () => {
    let view = await render(
      <ScheduledRescheduleScreen
        route={{ params: { bookingId: "B1", currentScheduledAt: "2026-06-14T10:00:00" } }}
        navigation={{ replace: mockReplace }}
      />,
    );
    await fireEvent.press(view.getByText("Select new slot"));
    await fireEvent.press(view.getByText("Confirm Reschedule"));
    await waitFor(() => expect(mockReschedule).toHaveBeenCalledWith("B1", { date: mockSelectedTime }));
    expect(mockReplace).toHaveBeenCalledWith("ScheduledBookingStatus", { bookingId: "B2" });

    await cleanup();
    mockSelectedTime = "2026-06-14T10:00:30";
    view = await render(
      <ScheduledRescheduleScreen
        route={{ params: { bookingId: "B1", currentScheduledAt: "2026-06-14T10:00:00" } }}
        navigation={{ replace: mockReplace }}
      />,
    );
    await fireEvent.press(view.getByText("Select new slot"));
    await fireEvent.press(view.getByText("Confirm Reschedule"));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith("Reschedule failed", expect.stringContaining("different slot")));
    mockSelectedTime = "2026-06-15T12:00:00";
  });

  it("renders scheduled status and handles refresh, reschedule, cancellation success and failure", async () => {
    let view = await render(
      <ScheduledBookingStatusScreen
        route={{ params: { bookingId: "B1" } }}
        navigation={{ navigate: mockNavigate }}
      />,
    );
    await fireEvent.press(view.getByText("Refresh Status"));
    await fireEvent.press(view.getByText("Reschedule Booking"));
    await fireEvent.press(view.getByText("Cancel Booking"));
    await waitFor(() => expect(mockCancel).toHaveBeenCalledWith("B1"));
    expect(mockNavigate).toHaveBeenCalledWith("ScheduledReschedule", expect.objectContaining({ bookingId: "B1" }));
    expect(mockNavigate).toHaveBeenCalledWith("Main", { screen: "Bookings" });

    await cleanup();
    mockCancel.mockRejectedValueOnce(new Error("Cancellation blocked"));
    view = await render(
      <ScheduledBookingStatusScreen route={{ params: { bookingId: "B1" } }} navigation={{ navigate: mockNavigate }} />,
    );
    await fireEvent.press(view.getByText("Cancel Booking"));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith("Cancel failed", "Cancellation blocked"));
    expect(mockCapture).toHaveBeenCalled();
  });

  it("renders arrived, progress, and fallback lifecycle states", async () => {
    let view = await render(
      <PartnerArrivedScreen route={{ params: { bookingId: "B1" } }} navigation={{}} />,
    );
    expect(view.getByText("Partner: Amit")).toBeTruthy();
    await fireEvent.press(view.getByText("Call Partner"));
    expect(Linking.openURL).toHaveBeenCalledWith("tel:9999999999");

    await cleanup();
    view = await render(
      <ServiceInProgressScreen route={{ params: { bookingId: "B1" } }} navigation={{}} />,
    );
    expect(view.getByText("Kitchen complete")).toBeTruthy();
    expect(view.getByText("Timeline")).toBeTruthy();

    await cleanup();
    view = await render(
      <BookingStatusFallbackScreen route={{ params: { bookingId: "B1" } }} navigation={{}} />,
    );
    expect(view.getByText("Tracking Screen: LIVE_TRACKING")).toBeTruthy();
  });

  it("submits ratings with explicit and fallback comments and reports missing service", async () => {
    let view = await render(<RatePartnerScreen route={{ params: { bookingId: "B1" } }} />);
    await fireEvent.changeText(view.getByDisplayValue(""), "Helpful partner");
    await fireEvent.press(view.getByText("Choose 4 stars"));
    await fireEvent.press(view.getByText("Submit rating"));
    await waitFor(() =>
      expect(mockAddReview).toHaveBeenCalledWith({
        serviceId: "S1",
        rating: 4,
        comment: "Helpful partner",
      }),
    );
    expect(Alert.alert).toHaveBeenCalledWith("Thank you", "Your rating has been submitted.");

    await cleanup();
    mockLifecycle = { data: { id: "B2" }, refetch: mockRefetch };
    view = await render(<RatePartnerScreen route={{ params: { bookingId: "B2" } }} />);
    expect(view.getByText(/Service details are loading/)).toBeTruthy();
    await fireEvent.press(view.getByText("Submit rating"));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith("Rating failed", "Service id not available yet."));
  });
});
