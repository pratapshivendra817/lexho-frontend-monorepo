import React from "react";
import { cleanup, fireEvent, render } from "@testing-library/react-native";

import BackgroundLocationEducationScreen from "../BackgroundLocationEducationScreen";
import RootDetectionWarningScreen from "../RootDetectionWarningScreen";
import SplashScreen from "../SplashScreen";

describe("system screens", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the background location education flow and continues back", async () => {
    const navigation = { goBack: jest.fn() };
    const view = await render(<BackgroundLocationEducationScreen navigation={navigation} />);

    expect(view.getByText("Allow Background Location")).toBeTruthy();
    expect(view.getByText("- Accurate live tracking during active jobs")).toBeTruthy();

    fireEvent.press(view.getByText("Continue"));
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  it("renders rooted-device warning copy", async () => {
    const view = await render(<RootDetectionWarningScreen />);

    expect(view.getByText("Device Not Supported")).toBeTruthy();
    expect(view.getByText(/Sensitive partner actions are blocked/)).toBeTruthy();
  });

  it("renders the splash loading state", async () => {
    const view = await render(<SplashScreen />);

    expect(view.getByText("Lexho Partner")).toBeTruthy();
    expect(view.getByText("Preparing your workspace")).toBeTruthy();
  });
});
