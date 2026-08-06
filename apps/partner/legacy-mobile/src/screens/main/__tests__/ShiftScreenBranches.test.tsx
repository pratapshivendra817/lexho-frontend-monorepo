import React from "react";
import { Alert, Linking, Platform } from "react-native";
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

describe("ShiftScreen branch coverage", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockOnline = false;
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    (Linking as any).sendIntent = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(Linking, "openURL").mockResolvedValue();
    jest.spyOn(Linking, "openSettings").mockResolvedValue();
    mockControllerState = {
      state: { shiftStarted: false, startedAt: null },
      history: [],
      historyLoading: false,
      historyError: "",
      loading: false,
      error: "",
      lastLocationSentAt: null,
      dispatchConfig: null,
      startShift: mockStartShift.mockResolvedValue(undefined),
      endShift: mockEndShift.mockResolvedValue(undefined),
      refetchHistory: mockRefetchHistory.mockResolvedValue(undefined),
    };
  });

  afterEach(() => {
    cleanup();
  });

  it("updates date and end-time pickers, and closes the picker on dismiss", async () => {
    const view = await render(<ShiftScreen />);

    fireEvent.press(view.getByTestId("shift-date-button"));
    expect(await view.findByTestId("picker-date")).toBeTruthy();
    fireEvent.press(view.getByLabelText("Apply picker value"));
    expect(await view.findByText("2026-07-10")).toBeTruthy();

    fireEvent.press(view.getByTestId("shift-end-time-button"));
    expect(await view.findByTestId("picker-time")).toBeTruthy();
    fireEvent.press(view.getByLabelText("Apply picker value"));
    expect(await view.findByText("20:30")).toBeTruthy();

    fireEvent.press(view.getByTestId("shift-start-time-button"));
    expect(await view.findByTestId("picker-time")).toBeTruthy();
    fireEvent.press(view.getByLabelText("Dismiss picker value"));
    await waitFor(() => {
      expect(view.queryByTestId("picker-time")).toBeNull();
    });
  });

  it("swallows start-shift failures without changing behavior", async () => {
    mockStartShift.mockRejectedValueOnce(new Error("start failed"));

    const view = await render(<ShiftScreen />);
    fireEvent.press(view.getByText("Start Shift"));

    await waitFor(() => {
      expect(mockStartShift).toHaveBeenCalledWith({
        shiftDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        startTime: "09:00",
        endTime: "18:00",
      });
    });
  });

  it("opens iOS location settings from error action and falls back to openSettings on failure", async () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "ios",
    });
    mockControllerState = {
      ...mockControllerState,
      error: "Location unavailable right now",
    };
    (Linking.openURL as jest.Mock).mockRejectedValueOnce(new Error("prefs unavailable"));

    const view = await render(<ShiftScreen />);

    fireEvent.press(view.getByTestId("shift-error-action"));

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith("App-Prefs:Privacy&path=LOCATION");
    });
    await waitFor(() => {
      expect(Linking.openSettings).toHaveBeenCalled();
    });
  });

  it("shows the location assist modal, supports dismiss, and opens Android settings", async () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "android",
    });
    mockControllerState = {
      ...mockControllerState,
      error: "Permission denied for location access",
    };

    const dismissView = await render(<ShiftScreen />);
    expect(await dismissView.findByText("For a better experience, your device will need to use Location Accuracy")).toBeTruthy();
    fireEvent.press(dismissView.getByTestId("shift-modal-dismiss-button"));
    await waitFor(() => {
      expect(dismissView.queryByText("For a better experience, your device will need to use Location Accuracy")).toBeNull();
    });
    await act(async () => {
      dismissView.unmount();
    });

    const openView = await render(<ShiftScreen />);
    await act(async () => {
      fireEvent.press(await openView.findByTestId("shift-modal-open-settings-button"));
    });

    await waitFor(() => {
      expect((Linking as any).sendIntent).toHaveBeenCalledWith("android.settings.LOCATION_SOURCE_SETTINGS");
    });
    await act(async () => {
      openView.unmount();
    });
  });
});
