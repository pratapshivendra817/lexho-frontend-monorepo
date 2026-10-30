import React from "react";
import { Alert, Linking } from "react-native";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

import { ScheduledRescheduleScreen } from "../src/screens/booking/ScheduledRescheduleScreen";
import { ScheduledBookingStatusScreen } from "../src/screens/booking/ScheduledBookingStatusScreen";
import { PartnerArrivedScreen } from "../src/screens/booking/PartnerArrivedScreen";
import { ServiceInProgressScreen } from "../src/screens/booking/ServiceInProgressScreen";
import { ServiceCompletedScreen } from "../src/screens/booking/ServiceCompletedScreen";
import { BookingStatusFallbackScreen } from "../src/screens/booking/BookingStatusFallbackScreen";

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockRefetch = jest.fn();
const mockReschedule = jest.fn();
const mockCancel = jest.fn();
const mockSubmitCustomerReview = jest.fn();
const mockCapture = jest.fn();
const mockTrackRescheduled = jest.fn();
const mockTrackCancelled = jest.fn();
const mockTrackCompleted = jest.fn();
const mockInvalidateQueries = jest.fn();
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
  submitCustomerReview: (...args: any[]) => mockSubmitCustomerReview(...args),
}));
jest.mock("../src/api/client", () => ({
  getApiErrorCode: () => "API_FAILURE",
}));
jest.mock("../src/services/customerAnalyticsEvents", () => ({
  trackBookingRescheduled: (...args: any[]) => mockTrackRescheduled(...args),
  trackBookingCancelled: (...args: any[]) => mockTrackCancelled(...args),
  trackBookingCompleted: (...args: any[]) => mockTrackCompleted(...args),
}));
jest.mock("../src/services/monitoring", () => ({
  captureFrontendError: (...args: any[]) => mockCapture(...args),
}));
jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: (...args: any[]) => mockInvalidateQueries(...args),
  }),
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
    mockSubmitCustomerReview.mockResolvedValue({});
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

  it("submits review from the completed service flow and hides review when booking is unresolved", async () => {
    mockLifecycle = {
      data: {
        ...mockLifecycle.data,
        status: "COMPLETED",
        meta: { canReview: true, reviewSubmitted: false },
      },
      refetch: mockRefetch,
    };

    let view = await render(<ServiceCompletedScreen route={{ params: { bookingId: "B1" } }} navigation={{}} />);
    await fireEvent.changeText(view.getByDisplayValue(""), "Helpful partner");
    await fireEvent.press(view.getByLabelText("4 star rating"));
    await fireEvent.press(view.getByText("Submit Review"));
    await waitFor(() =>
      expect(mockSubmitCustomerReview).toHaveBeenCalledWith({
        bookingId: "B1",
        rating: 4,
        reviewText: "Helpful partner",
      }),
    );
    expect(view.getByText("Your review has been submitted")).toBeTruthy();
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["instant-booking-status", "B1"] });
    expect(mockTrackCompleted).toHaveBeenCalled();

    await cleanup();
    mockLifecycle = { data: {}, refetch: mockRefetch };
    view = await render(<ServiceCompletedScreen route={{ params: {} }} navigation={{}} />);
    expect(view.getByText("Service Completed")).toBeTruthy();
    expect(view.queryByText("Submit Review")).toBeNull();
  });
});
