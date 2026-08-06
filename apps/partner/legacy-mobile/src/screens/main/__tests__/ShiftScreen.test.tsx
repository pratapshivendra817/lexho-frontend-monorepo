import React from "react";
import { Alert, Linking } from "react-native";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

import ShiftScreen from "../ShiftScreen";

const mockStartShift = jest.fn();
const mockEndShift = jest.fn();
const mockRefetchHistory = jest.fn();
let mockOnline = false;
let mockControllerState: any;

jest.mock("../../../hooks/useRedux", () => ({
  useAppSelector: (selector: any) => selector({ partner: { online: mockOnline } }),
}));

jest.mock("../../../features/shift/useShiftController", () => ({
  useShiftController: () => mockControllerState,
}));

jest.mock("@react-native-community/datetimepicker", () => {
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");
  return function MockDateTimePicker(props: any) {
    return React.createElement(
      View,
      { testID: `picker-${props.mode}` },
      React.createElement(Text, null, props.mode),
      React.createElement(
        TouchableOpacity,
        {
          onPress: () => props.onChange({}, new Date(2026, 6, 10, 20, 30, 0, 0)),
          accessibilityLabel: "Apply picker value",
        },
        React.createElement(Text, null, "Apply picker"),
      ),
      React.createElement(
        TouchableOpacity,
        {
          onPress: () => props.onChange({}, undefined),
          accessibilityLabel: "Dismiss picker value",
        },
        React.createElement(Text, null, "Dismiss picker"),
      ),
    );
  };
});

describe("ShiftScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, "sendIntent").mockResolvedValue(undefined as any);
    jest.spyOn(Linking, "openSettings").mockResolvedValue();
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    mockOnline = false;
    mockControllerState = {
      state: { shiftStarted: false, startedAt: null },
      history: [],
      historyLoading: false,
      historyError: "",
      loading: false,
      error: "",
      lastLocationSentAt: null,
      dispatchConfig: { foregroundTrackingIntervalSeconds: 30, backgroundTrackingIntervalSeconds: 120 },
      startShift: mockStartShift.mockResolvedValue(undefined),
      endShift: mockEndShift.mockResolvedValue(undefined),
      refetchHistory: mockRefetchHistory.mockResolvedValue(undefined),
    };
  });

  afterEach(() => {
    cleanup();
  });

  it("renders a stopped shift and starts it with the selected schedule", async () => {
    const view = await render(<ShiftScreen />);

    expect(view.getByText("Shift Not Started")).toBeTruthy();
    expect(view.getByText("No shift history yet.")).toBeTruthy();

    fireEvent.press(view.getByText("Start Shift"));

    await waitFor(() => {
      expect(mockStartShift).toHaveBeenCalledWith({
        shiftDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        startTime: "09:00",
        endTime: "18:00",
      });
    });
  });

  it("shows gps assistance for active shifts and supports ending the shift", async () => {
    mockOnline = true;
    mockControllerState = {
      ...mockControllerState,
      state: { shiftStarted: true, startedAt: Date.now() - 60000 },
      history: [{ id: "h1", online: true, startedAt: "2026-07-01T10:00:00Z", endedAt: "2026-07-01T18:00:00Z", durationSeconds: 28800, shiftStart: "09:00", shiftEnd: "18:00", updatedAt: "2026-07-01T18:00:00Z", maxActiveJobs: 2 }],
      error: "GPS is turned off",
      lastLocationSentAt: "2026-07-01T12:00:00Z",
    };

    const view = await render(<ShiftScreen />);

    expect(view.getByText("Shift Running")).toBeTruthy();
    expect(view.getByText("GPS is turned off")).toBeTruthy();
    expect(view.getByText("Duration: 08:00:00")).toBeTruthy();

    fireEvent.press(view.getByText("End Shift"));
    await waitFor(() => {
      expect(mockEndShift).toHaveBeenCalled();
    });

    expect(view.getByText("Turn on")).toBeTruthy();
  });

  it("renders loading, history error, and non-gps retry flow", async () => {
    mockControllerState = {
      ...mockControllerState,
      historyLoading: false,
      historyError: "Unable to load shift history",
      error: "server unavailable",
    };

    const view = await render(<ShiftScreen />);

    expect(view.getByText("Unable to load shift history")).toBeTruthy();
    expect(view.getByText("Retry")).toBeTruthy();

    fireEvent.press(view.getByText("Retry"));
    await waitFor(() => {
      expect(mockRefetchHistory).toHaveBeenCalled();
    });
  });

  it("refreshes history and shows complete history metadata", async () => {
    mockControllerState = {
      ...mockControllerState,
      state: { shiftStarted: true, startedAt: Date.now() - 60_000 },
      lastLocationSentAt: Date.now(),
      history: [
        {
          id: "h1",
          online: false,
          shiftStart: "09:00",
          shiftEnd: "18:00",
          updatedAt: "2026-07-01T18:00:00Z",
          maxActiveJobs: 4,
          startedAt: Date.parse("2026-07-01T10:00:00Z"),
          endedAt: Date.parse("2026-07-01T18:00:00Z"),
          durationSeconds: 28800,
        },
      ],
    };

    const view = await render(<ShiftScreen />);

    expect(view.getByText("Online: false")).toBeTruthy();
    expect(view.getByText("Shift Start: 09:00")).toBeTruthy();
    expect(view.getByText("Shift End: 18:00")).toBeTruthy();
    expect(view.getByText("Max Active Jobs: 4")).toBeTruthy();
    expect(view.getByText(/Last location updated:/)).toBeTruthy();

    const tree = view.toJSON() as any;
    await act(async () => {
      await tree.props.refreshControl.props.onRefresh();
    });

    expect(mockRefetchHistory).toHaveBeenCalled();
  });
});
