import React from "react";
import { Alert, Linking } from "react-native";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

import { InstantBookingStatusScreen } from "../src/screens/booking/InstantBookingStatusScreen";

const mockNavigate = jest.fn();
const mockRefetch = jest.fn();
const mockCancel = jest.fn();
const mockTrackCancelled = jest.fn();
const mockCaptureError = jest.fn();
let mockQuery: any;
let mockMeta: any;
let mockMutationError: any;
let mockMutationPending = false;

jest.mock("react-native-vector-icons/MaterialCommunityIcons", () => {
  const { Text } = require("react-native");
  return ({ name }: any) => <Text accessibilityLabel={`icon-${name}`}>{name}</Text>;
});

jest.mock("@tanstack/react-query", () => ({
  useMutation: (options: any) => ({
    isPending: mockMutationPending,
    mutate: async () => {
      if (mockMutationPending) return;
      try {
        await options.mutationFn();
        options.onSuccess?.();
      } catch (error) {
        mockMutationError = error;
        options.onError?.(error);
      }
    },
  }),
}));

jest.mock("../src/hooks/useInstantBookingLifecycle", () => ({
  useInstantBookingLifecycle: () => mockQuery,
}));

jest.mock("../src/hooks/useBookingLifecycleNavigation", () => ({
  useBookingLifecycleNavigation: jest.fn(),
  resolveLifecycleTarget: () => ({ name: "LiveTracking" }),
}));

jest.mock("../src/utils/bookingMeta", () => ({
  getBookingMeta: () => mockMeta,
}));

jest.mock("../src/api/bookingExtrasApi", () => ({
  cancelBooking: (...args: any[]) => mockCancel(...args),
}));

jest.mock("../src/services/customerAnalyticsEvents", () => ({
  trackBookingCancelled: (...args: any[]) => mockTrackCancelled(...args),
}));

jest.mock("../src/services/monitoring", () => ({
  captureFrontendError: (...args: any[]) => mockCaptureError(...args),
}));

jest.mock("../src/api/client", () => ({
  getApiErrorCode: () => "CANCEL_FAILED",
}));

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

describe("InstantBookingStatusScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMutationError = null;
    mockMutationPending = false;
    mockMeta = {
      canCallPartner: true,
      canTrackPartner: true,
      canCancel: true,
      canReschedule: true,
      canRaiseIssue: true,
    };
    mockQuery = {
      data: {
        id: "B1",
        assignmentStatus: "PARTNER_ASSIGNED",
        serviceName: "Deep Clean",
        scheduledAt: "2026-06-13T10:00:00",
        fullAddress: "Indore",
        partnerName: "Amit",
        partnerPhone: "+91 99999 99999",
        partnerRating: 4.5,
        etaMinutes: 10,
        statusHistory: [
          { key: "a", label: "Placed", active: true },
          { key: "b", label: "Assigned", status: "DONE" },
        ],
      },
      wsConnected: true,
      isError: false,
      refetch: mockRefetch,
    };
    mockRefetch.mockResolvedValue({ data: mockQuery.data });
    mockCancel.mockResolvedValue({});
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    jest.spyOn(Linking, "openURL").mockResolvedValue(undefined as never);
  });

  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it("renders status, contacts partner, tracks, reschedules, raises issue, refreshes, and cancels", async () => {
    const view = await render(
      <InstantBookingStatusScreen
        route={{ params: { bookingId: "B1" } }}
        navigation={{ navigate: mockNavigate }}
      />,
    );

    expect(view.getByText("Realtime WS")).toBeTruthy();
    expect(view.getByText("Deep Clean")).toBeTruthy();
    expect(view.getByText("4.5")).toBeTruthy();
    expect(view.getByText("Timeline")).toBeTruthy();

    await fireEvent.press(view.getByLabelText("icon-phone"));
    await fireEvent.press(view.getByLabelText("icon-chat-outline"));
    expect(Linking.openURL).toHaveBeenCalledWith("tel:+91 99999 99999");
    expect(Linking.openURL).toHaveBeenCalledWith("https://wa.me/919999999999");

    await fireEvent.press(view.getByText("Track Booking"));
    expect(mockNavigate).toHaveBeenCalledWith("LiveTracking", { bookingId: "B1" });
    await fireEvent.press(view.getByText("Reschedule"));
    await fireEvent.press(view.getByText("Raise Issue"));
    await fireEvent.press(view.getByText("Refresh Status"));
    expect(mockNavigate).toHaveBeenCalledWith("CartCrud");
    expect(mockNavigate).toHaveBeenCalledWith("Support");
    expect(mockRefetch).toHaveBeenCalled();

    await fireEvent.press(view.getByText("Cancel"));
    await waitFor(() => expect(mockCancel).toHaveBeenCalledWith("B1"));
    expect(mockTrackCancelled).toHaveBeenCalledWith({
      booking_id: "B1",
      source: "instant_status",
    });
    expect(Alert.alert).toHaveBeenCalledWith("Cancelled", "Booking cancelled successfully.");
  });

  it("handles missing phone, polling/error state, pending cancellation, and cancellation failure", async () => {
    mockQuery = {
      ...mockQuery,
      data: { ...mockQuery.data, partnerPhone: "", partnerName: "", partnerRating: 0 },
      wsConnected: false,
      isError: true,
    };
    mockMutationPending = true;
    let view = await render(
      <InstantBookingStatusScreen route={{ params: {} }} navigation={{ navigate: mockNavigate }} />,
    );
    expect(view.getByText("Polling")).toBeTruthy();
    expect(view.getByText("Unable to fetch booking status. Please retry.")).toBeTruthy();
    expect(view.getByText("Cancelling...")).toBeTruthy();
    await fireEvent.press(view.getByText("Cancelling..."));
    expect(mockCancel).not.toHaveBeenCalled();

    await cleanup();
    mockMutationPending = false;
    mockCancel.mockRejectedValueOnce(new Error("Cannot cancel"));
    view = await render(
      <InstantBookingStatusScreen route={{ params: { bookingId: "B2" } }} navigation={{ navigate: mockNavigate }} />,
    );
    await fireEvent.press(view.getByText("Cancel"));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith("Cancel failed", "Cannot cancel"));
    expect(mockCaptureError).toHaveBeenCalledWith(
      mockMutationError,
      expect.objectContaining({ errorCode: "CANCEL_FAILED" }),
    );
  });
});
