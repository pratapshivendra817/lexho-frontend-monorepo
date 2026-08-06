import React from "react";
import { Alert } from "react-native";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

import MobileNumberScreen from "../MobileNumberScreen";
import { sendOtp, verifyOtp } from "../../../services/authService";
import { trackAuthenticationEvent } from "../../../services/firebaseAnalytics";

jest.mock("../../../services/authService", () => ({
  sendOtp: jest.fn(),
  verifyOtp: jest.fn(),
}));

jest.mock("../../../services/firebaseAnalytics", () => ({
  trackAuthenticationEvent: jest.fn(),
}));

const mockSendOtp = sendOtp as jest.MockedFunction<typeof sendOtp>;
describe("auth screens", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    jest.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  it("validates mobile numbers, navigates on send otp success, and handles failure", async () => {
    const navigation = { navigate: jest.fn() };
    const view = await render(<MobileNumberScreen navigation={navigation} />);

    fireEvent.changeText(await view.findByPlaceholderText("9876543210"), "123");
    fireEvent.press(await view.findByText("Send OTP"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith("Invalid mobile number", "Enter a valid 10-digit mobile number.");
    });
    expect(trackAuthenticationEvent).toHaveBeenCalledWith(false, { stage: "send_otp_validation" });

    mockSendOtp.mockResolvedValueOnce({ resendAfter: 45 } as any);
    fireEvent.changeText(await view.findByPlaceholderText("9876543210"), "9876543210");
    fireEvent.press(await view.findByText("Send OTP"));

    await waitFor(() => {
      expect(navigation.navigate).toHaveBeenCalledWith("OTP", { mobile: "9876543210", resendAfter: 45 });
    });

    mockSendOtp.mockRejectedValueOnce(new Error("otp failed"));
    fireEvent.press(await view.findByText("Send OTP"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith("Unable to send OTP", "otp failed");
    });
  });

});
