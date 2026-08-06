import React from "react";
import { Alert, Linking } from "react-native";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

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
      React.createElement(
        TouchableOpacity,
        {
          onPress: () => props.onChange({}, new Date(2026, 6, 10, 20, 30, 0, 0)),
          accessibilityLabel: "Apply picker value",
        },
        React.createElement(Text, null, "Apply picker"),
      ),
    );
  };
});

describe("ShiftScreen isolated interactions", () => {
  beforeEach(() => {
    jest.resetAllMocks();
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

  it("blocks invalid schedules before starting a shift", async () => {
    const view = await render(<ShiftScreen />);

    fireEvent.press(view.getByTestId("shift-start-time-button"));
    expect(await view.findByTestId("picker-time")).toBeTruthy();
    fireEvent.press(view.getByLabelText("Apply picker value"));

    expect(await view.findByText("Invalid schedule: End Time must be greater than Start Time.")).toBeTruthy();
    fireEvent.press(view.getByTestId("shift-primary-action"));

    expect(Alert.alert).toHaveBeenCalledWith("Invalid shift timing", "End time should be greater than start time.");
    expect(mockStartShift).not.toHaveBeenCalled();
    view.unmount();
  });
});
