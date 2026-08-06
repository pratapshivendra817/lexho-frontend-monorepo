import React from "react";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

import { SubscriptionPlanScreen } from "../src/screens/booking/SubscriptionPlanScreen";

const mockInvalidate = jest.fn();
const mockPause = jest.fn();
const mockResume = jest.fn();
const mockCancel = jest.fn();
const mockTrackPaused = jest.fn();
const mockTrackCancelled = jest.fn();
const mockTrackEvent = jest.fn();
const mockCaptureError = jest.fn();
let mockVisitsQuery: any;
let mockDetailsQuery: any;
let mutationIndex = 0;

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidate }),
  useQuery: (options: any) =>
    options.queryKey[0] === "subscription-visits" ? mockVisitsQuery : mockDetailsQuery,
  useMutation: (options: any) => {
    mutationIndex += 1;
    return {
      mutate: async () => {
        try {
          await options.mutationFn();
          options.onSuccess?.();
        } catch (error) {
          options.onError?.(error);
        }
      },
    };
  },
}));

jest.mock("../src/api/subscriptionApi", () => ({
  getSubscriptionDetails: jest.fn(),
  pauseSubscription: (...args: any[]) => mockPause(...args),
  resumeSubscription: (...args: any[]) => mockResume(...args),
  cancelSubscription: (...args: any[]) => mockCancel(...args),
}));

jest.mock("../src/api/subscriptionVisitsApi", () => ({
  getSubscriptionVisits: jest.fn(),
}));

jest.mock("../src/services/customerAnalyticsEvents", () => ({
  trackSubscriptionPaused: (...args: any[]) => mockTrackPaused(...args),
  trackSubscriptionCancelled: (...args: any[]) => mockTrackCancelled(...args),
}));

jest.mock("../src/services/monitoring", () => ({
  trackBusinessEvent: (...args: any[]) => mockTrackEvent(...args),
  captureFrontendError: (...args: any[]) => mockCaptureError(...args),
}));

jest.mock("../src/api/client", () => ({
  getApiErrorCode: () => "SUB_ERROR",
}));

jest.mock("../src/components/booking/BookingTimeline", () => ({
  BookingTimeline: () => {
    const { Text } = require("react-native");
    return <Text>Visit timeline</Text>;
  },
}));

describe("SubscriptionPlanScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mutationIndex = 0;
    mockInvalidate.mockResolvedValue(undefined);
    mockPause.mockResolvedValue({});
    mockResume.mockResolvedValue({});
    mockCancel.mockResolvedValue({});
    mockDetailsQuery = {
      data: {
        planName: "Weekly",
        nextVisitDate: "2026-06-15",
        canPause: true,
        canResume: true,
        canCancel: true,
      },
    };
    mockVisitsQuery = {
      isLoading: false,
      data: [
        {
          id: "V1",
          serviceName: "Cook Visit",
          section: "Upcoming Visits",
          scheduledAt: "2026-06-15T08:00:00",
          status: "SCHEDULED",
          partnerName: "Amit",
        },
        {
          id: "V2",
          serviceName: "Completed Visit",
          section: "Completed Visits",
          scheduledAt: "invalid",
          status: "DONE",
        },
      ],
    };
  });

  afterEach(cleanup);

  it("renders grouped visits and runs pause, resume, and cancel success flows", async () => {
    const view = await render(
      <SubscriptionPlanScreen route={{ params: { subscriptionId: "SUB-1" } }} navigation={{}} />,
    );

    expect(view.getByText("Plan: Weekly")).toBeTruthy();
    expect(view.getByText("Upcoming Visits")).toBeTruthy();
    expect(view.getByText("Completed Visits")).toBeTruthy();
    expect(view.getAllByText("Visit timeline")).toHaveLength(2);

    await fireEvent.press(view.getByText("Pause"));
    await fireEvent.press(view.getByText("Resume"));
    await fireEvent.press(view.getByText("Cancel"));

    await waitFor(() => expect(mockPause).toHaveBeenCalledWith("SUB-1"));
    expect(mockResume).toHaveBeenCalledWith("SUB-1");
    expect(mockCancel).toHaveBeenCalledWith("SUB-1");
    expect(mockTrackPaused).toHaveBeenCalledWith({ subscription_id: "SUB-1" });
    expect(mockTrackEvent).toHaveBeenCalledWith("subscription_resumed", { subscription_id: "SUB-1" });
    expect(mockTrackCancelled).toHaveBeenCalledWith({ subscription_id: "SUB-1" });
    expect(mockInvalidate).toHaveBeenCalled();
  });

  it("renders loading and empty states and reports mutation failures", async () => {
    mockVisitsQuery = { isLoading: true, data: [] };
    let view = await render(
      <SubscriptionPlanScreen route={{ params: { bookingId: "SUB-2" } }} navigation={{}} />,
    );
    expect(view.toJSON()).not.toBeNull();

    await cleanup();
    mockVisitsQuery = { isLoading: false, data: [] };
    mockPause.mockRejectedValueOnce(new Error("pause failed"));
    mockResume.mockRejectedValueOnce(new Error("resume failed"));
    mockCancel.mockRejectedValueOnce(new Error("cancel failed"));
    view = await render(
      <SubscriptionPlanScreen route={{ params: { subscriptionId: "SUB-2" } }} navigation={{}} />,
    );
    expect(view.getByText("No visit history available.")).toBeTruthy();
    await fireEvent.press(view.getByText("Pause"));
    await fireEvent.press(view.getByText("Resume"));
    await fireEvent.press(view.getByText("Cancel"));
    await waitFor(() => expect(mockCaptureError).toHaveBeenCalledTimes(3));
  });
});
