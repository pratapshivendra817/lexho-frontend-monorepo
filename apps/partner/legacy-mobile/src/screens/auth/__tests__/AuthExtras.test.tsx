import React from "react";
import { Alert, Text, TextInput, TouchableOpacity } from "react-native";
import ReactTestRenderer, { act } from "react-test-renderer";

import OTPScreen from "../OTPScreen";
import { sendOtp, verifyOtp } from "../../../services/authService";

jest.mock("../../../services/authService", () => ({
  sendOtp: jest.fn(),
  verifyOtp: jest.fn(),
}));

jest.mock("../../../services/firebaseAnalytics", () => ({
  trackAuthenticationEvent: jest.fn(),
}));

describe("auth extra screens", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    jest.spyOn(console, "log").mockImplementation(jest.fn());
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  const renderScreen = async () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = ReactTestRenderer.create(
        <OTPScreen
          route={{ params: { mobile: "9876543210", resendAfter: 0 } }}
          onAuthSuccess={jest.fn(async () => undefined)}
          navigation={{}}
        />,
      );
    });
    return tree;
  };

  it("validates otp input, verifies successfully, and resends otp", async () => {
    const onAuthSuccess = jest.fn(async () => undefined);
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = ReactTestRenderer.create(
        <OTPScreen
          route={{ params: { mobile: "9876543210", resendAfter: 0 } }}
          
          onAuthSuccess={onAuthSuccess}
          navigation={{}}
        />,
      );
    });

    const buttons = tree.root.findAllByType(TouchableOpacity);
    await act(async () => {
      buttons[0].props.onPress();
    });
    expect(Alert.alert).toHaveBeenCalledWith("Invalid OTP", "Enter a valid 6-digit OTP.");

    (verifyOtp as jest.Mock).mockResolvedValueOnce({ token: "jwt" });
    const input = tree.root.findByType(TextInput);
    await act(async () => {
      input.props.onChangeText("123456");
    });
    await act(async () => {
      buttons[0].props.onPress();
    });

    expect(verifyOtp).toHaveBeenCalledWith("9876543210", "123456");
    expect(onAuthSuccess).toHaveBeenCalledWith({ token: "jwt" }, "9876543210");

    (sendOtp as jest.Mock).mockResolvedValueOnce({ resendAfter: 5 });
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    await act(async () => {
      buttons[1].props.onPress();
    });

    expect(sendOtp).toHaveBeenCalledWith("9876543210");
    expect(Alert.alert).toHaveBeenCalledWith("OTP sent", "A new code has been sent to your mobile.");
    await act(async () => {
      tree.unmount();
    });
  });

  it("shows otp verification failure", async () => {
    const onAuthSuccess = jest.fn(async () => undefined);
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = ReactTestRenderer.create(
        <OTPScreen
          route={{ params: { mobile: "9876543210", resendAfter: 0 } }}
          onAuthSuccess={onAuthSuccess}
          navigation={{}}
        />,
      );
    });

    (verifyOtp as jest.Mock).mockRejectedValueOnce(new Error("Bad otp"));
    const input = tree.root.findByType(TextInput);
    const verifyButton = tree.root.findAllByType(TouchableOpacity)[0];

    await act(async () => {
      input.props.onChangeText("123456");
    });
    await act(async () => {
      verifyButton.props.onPress();
    });

    expect(Alert.alert).toHaveBeenCalledWith("OTP verification failed", "Bad otp");
    expect(onAuthSuccess).not.toHaveBeenCalled();
    await act(async () => {
      tree.unmount();
    });
  });
});
