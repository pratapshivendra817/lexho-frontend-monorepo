import React from "react";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { LoginScreen } from "../src/screens/auth/LoginScreen";
import { OtpScreen } from "../src/screens/auth/OtpScreen";

jest.setTimeout(15_000);

const mockSendOtp = jest.fn();
const mockVerifyOtp = jest.fn();
const mockDispatch = jest.fn();
const mockSaveSession = jest.fn();
const mockSetAnalyticsUser = jest.fn();
const mockSetCrashlyticsUser = jest.fn();
const mockTrackAnalyticsEvent = jest.fn();
const mockTrackUserLogin = jest.fn();
const mockTrackUserRegistration = jest.fn();
const mockLegalContent = jest.fn();

let mockLegalQuery: any;

jest.mock("@tanstack/react-query", () => {
  const ReactModule = require("react");
  return {
    useQuery: () => mockLegalQuery,
    useMutation: (options: any) => {
      const [state, setState] = ReactModule.useState({
        isPending: false,
        isError: false,
        isSuccess: false,
        error: null,
      });
      const mutate = async (variables?: unknown) => {
        if (state.isPending) return;
        setState({ isPending: true, isError: false, isSuccess: false, error: null });
        try {
          const data = await options.mutationFn(variables);
          await options.onSuccess?.(data, variables);
          setState({ isPending: false, isError: false, isSuccess: true, error: null });
        } catch (error) {
          setState({ isPending: false, isError: true, isSuccess: false, error });
        }
      };
      const reset = () =>
        setState({ isPending: false, isError: false, isSuccess: false, error: null });
      return { ...state, mutate, reset };
    },
  };
});

jest.mock("react-native-paper", () => {
  const { Pressable, Text, TextInput: NativeTextInput, View } = require("react-native");
  const MockTextInput = ({ label, value, onChangeText, onSubmitEditing, ...props }: any) => (
    <NativeTextInput
      {...props}
      accessibilityLabel={props.accessibilityLabel ?? label}
      placeholder={label}
      value={value}
      onChangeText={onChangeText}
      onSubmitEditing={onSubmitEditing}
    />
  );
  MockTextInput.Affix = () => null;
  return {
    Text,
    TextInput: MockTextInput,
    Snackbar: ({ visible, children, onDismiss }: any) =>
      visible ? (
        <View>
          <Text>{children}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Dismiss error" onPress={onDismiss}>
            <Text>Dismiss</Text>
          </Pressable>
        </View>
      ) : null,
  };
});

jest.mock("../src/components/buttons/PrimaryButton", () => {
  const { Pressable, Text } = require("react-native");
  return {
    PrimaryButton: ({ label, onPress, loading, disabled, accessibilityLabel }: any) => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: Boolean(disabled) }}
        disabled={disabled}
        onPress={onPress}
      >
        <Text>{loading ? "Loading..." : label}</Text>
      </Pressable>
    ),
  };
});

jest.mock("../src/api/authApi", () => ({
  sendOtp: (...args: any[]) => mockSendOtp(...args),
  verifyOtp: (...args: any[]) => mockVerifyOtp(...args),
}));

jest.mock("../src/api/customerProfileApi", () => ({
  getCustomerProfileContent: (...args: any[]) => mockLegalContent(...args),
}));

jest.mock("../src/redux/hooks", () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock("../src/redux/authSlice", () => ({
  setSession: (payload: unknown) => ({ type: "auth/setSession", payload }),
}));

jest.mock("../src/redux/locationSlice", () => ({
  resetLocationState: () => ({ type: "location/reset" }),
}));

jest.mock("../src/utils/storage", () => ({
  saveSession: (...args: any[]) => mockSaveSession(...args),
}));

jest.mock("../src/services/firebaseAnalytics", () => ({
  setAnalyticsUser: (...args: any[]) => mockSetAnalyticsUser(...args),
  trackAnalyticsEvent: (...args: any[]) => mockTrackAnalyticsEvent(...args),
}));

jest.mock("../src/services/firebaseCrashlytics", () => ({
  setCrashlyticsUser: (...args: any[]) => mockSetCrashlyticsUser(...args),
}));

jest.mock("../src/services/customerAnalyticsEvents", () => ({
  trackUserLogin: (...args: any[]) => mockTrackUserLogin(...args),
  trackUserRegistration: (...args: any[]) => mockTrackUserRegistration(...args),
}));

describe("LoginScreen", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await cleanup();
    mockLegalQuery = {
      data: {
        termsOfService: "Backend terms",
        privacyPolicy: "Backend privacy",
      },
    };
    mockSendOtp.mockResolvedValue({ success: true });
  });

  afterEach(async () => {
    await cleanup();
  });

  it("renders the mobile OTP login form", async () => {
    const view = await render(<LoginScreen navigation={{ navigate: jest.fn(), getParent: jest.fn() }} />);

    expect(view.getByText("Sign in to Lexho")).toBeTruthy();
    expect(view.getByLabelText("Lexho logo")).toBeTruthy();
    expect(view.getByLabelText("Mobile number")).toBeTruthy();
    expect(view.getByLabelText("Send OTP to verify mobile number")).toBeTruthy();
  });

  it.each(["", "123", "5123456789"])("validates invalid mobile value %p", async (mobile) => {
    const view = await render(<LoginScreen navigation={{ navigate: jest.fn(), getParent: jest.fn() }} />);

    await fireEvent.changeText(view.getByLabelText("Mobile number"), mobile);
    await fireEvent.press(view.getByLabelText("Send OTP to verify mobile number"));

    await waitFor(() => expect(view.getByText("Enter valid 10-digit mobile")).toBeTruthy());
    expect(mockSendOtp).not.toHaveBeenCalled();
  });

  it("sanitizes input, sends OTP, and navigates to verification", async () => {
    const navigate = jest.fn();
    const view = await render(<LoginScreen navigation={{ navigate, getParent: jest.fn() }} />);

    await fireEvent.changeText(view.getByLabelText("Mobile number"), "98a76543210extra");
    expect(view.getByLabelText("Mobile number").props.value).toBe("9876543210");
    await fireEvent.press(view.getByLabelText("Send OTP to verify mobile number"));

    await waitFor(() => expect(mockSendOtp).toHaveBeenCalledWith("9876543210"));
    expect(navigate).toHaveBeenCalledWith("Otp", { mobile: "9876543210" });
  });

  it("shows API/network errors, supports retry, and dismisses the snackbar", async () => {
    mockSendOtp
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockResolvedValueOnce({ success: true });
    const navigate = jest.fn();
    const view = await render(<LoginScreen navigation={{ navigate, getParent: jest.fn() }} />);

    await fireEvent.changeText(view.getByLabelText("Mobile number"), "9876543210");
    await fireEvent.press(view.getByLabelText("Send OTP to verify mobile number"));
    await waitFor(() => expect(view.getByText("Network Error")).toBeTruthy());

    await fireEvent.press(view.getByLabelText("Dismiss error"));
    expect(view.queryByText("Network Error")).toBeNull();
    await fireEvent.press(view.getByLabelText("Send OTP to verify mobile number"));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("Otp", { mobile: "9876543210" }));
  });

  it("opens backend legal content and safely handles a missing parent navigator", async () => {
    const parentNavigate = jest.fn();
    let view = await render(
      <LoginScreen navigation={{
        navigate: jest.fn(),
        getParent: jest.fn(() => ({ navigate: parentNavigate })),
      }} />,
    );

    await fireEvent.press(view.getByText("Terms & Conditions"));
    await fireEvent.press(view.getByText("Privacy Policy"));
    expect(parentNavigate).toHaveBeenCalledWith("TermsOfService", { content: "Backend terms" });
    expect(parentNavigate).toHaveBeenCalledWith("PrivacyPolicy", { content: "Backend privacy" });

    await cleanup();
    mockLegalQuery = { data: undefined };
    view = await render(
      <LoginScreen navigation={{ navigate: jest.fn(), getParent: jest.fn(() => null) }} />,
    );
    await fireEvent.press(view.getByText("Terms & Conditions"));
    expect(view.getByText("Sign in to Lexho")).toBeTruthy();
  });
});

describe("OtpScreen", () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    await cleanup();
    mockDispatch.mockImplementation((action) => action);
    mockSaveSession.mockResolvedValue(undefined);
    mockSetAnalyticsUser.mockResolvedValue(undefined);
    mockSetCrashlyticsUser.mockResolvedValue(undefined);
    mockTrackAnalyticsEvent.mockResolvedValue(undefined);
    mockTrackUserLogin.mockResolvedValue(undefined);
    mockTrackUserRegistration.mockResolvedValue(undefined);
    mockSendOtp.mockResolvedValue({ success: true });
    mockVerifyOtp.mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      user: { id: "42", mobile: "9876543210" },
    });
  });

  afterEach(async () => {
    await cleanup();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  async function renderOtp(overrides: Record<string, unknown> = {}) {
    const navigation = { goBack: jest.fn(), ...overrides };
    const view = await render(
      <OtpScreen navigation={navigation} route={{ params: { mobile: "9876543210" } }} />,
    );
    return { view, navigation };
  }

  it("renders OTP input, mobile number, countdown, and back navigation", async () => {
    const { view, navigation } = await renderOtp();

    expect(view.getByText("Verify OTP")).toBeTruthy();
    expect(view.getByText("Enter the secure code sent to +91 9876543210")).toBeTruthy();
    expect(view.getByText("Resend OTP in 30s")).toBeTruthy();
    await fireEvent.press(view.getByLabelText("Change mobile number"));
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  it.each(["", "12"])("validates invalid OTP %p", async (otp) => {
    const { view } = await renderOtp();

    await fireEvent.changeText(view.getByLabelText("OTP"), otp);
    await fireEvent.press(view.getByText("Verify & Continue"));
    await waitFor(() => expect(view.getByText("Enter valid OTP")).toBeTruthy());
    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });

  it("sanitizes OTP and saves a successful existing-user session", async () => {
    const { view } = await renderOtp();

    await fireEvent.changeText(view.getByLabelText("OTP"), "12a34567");
    expect(view.getByLabelText("OTP").props.value).toBe("123456");
    await fireEvent.press(view.getByText("Verify & Continue"));

    await waitFor(() => expect(mockSaveSession).toHaveBeenCalledWith(
      "access-token",
      "refresh-token",
      { id: "42", mobile: "9876543210" },
    ));
    expect(mockDispatch).toHaveBeenCalledWith({ type: "location/reset" });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "auth/setSession",
      payload: {
        token: "access-token",
        refreshToken: "refresh-token",
        user: { id: "42", mobile: "9876543210" },
      },
    });
    expect(mockSetAnalyticsUser).toHaveBeenCalledWith("42");
    expect(mockSetCrashlyticsUser).toHaveBeenCalledWith("42");
    expect(mockTrackAnalyticsEvent).toHaveBeenCalledWith("login_success", {
      method: "otp",
      user_id_present: true,
    });
    expect(mockTrackUserLogin).toHaveBeenCalled();
    expect(mockTrackUserRegistration).not.toHaveBeenCalled();
  });

  it("extracts nested tokens, creates a fallback user, and tracks new registration", async () => {
    mockVerifyOtp.mockResolvedValue({
      data: {
        token: "nested-token",
        refreshToken: "nested-refresh",
        isNewUser: true,
      },
    });
    const { view } = await renderOtp();

    await fireEvent.changeText(view.getByLabelText("OTP"), "1234");
    await fireEvent.press(view.getByText("Verify & Continue"));

    await waitFor(() => expect(mockSaveSession).toHaveBeenCalledWith(
      "nested-token",
      "nested-refresh",
      { id: "", mobile: "9876543210" },
    ));
    expect(mockTrackUserRegistration).toHaveBeenCalledWith({
      method: "otp",
      user_id_present: false,
    });
  });

  it.each([
    [new Error("Invalid OTP"), "Invalid OTP"],
    [new Error("OTP expired"), "OTP expired"],
    ["unexpected", "Failed"],
  ])("shows verification failure %p and dismisses it", async (error, message) => {
    mockVerifyOtp.mockRejectedValue(error);
    const { view } = await renderOtp();

    await fireEvent.changeText(view.getByLabelText("OTP"), "1234");
    await fireEvent.press(view.getByText("Verify & Continue"));
    await waitFor(() => expect(view.getByText(message)).toBeTruthy());
    await fireEvent.press(view.getAllByLabelText("Dismiss error")[0]);
    expect(view.queryByText(message)).toBeNull();
  });

  it("rejects missing token and session-storage failures", async () => {
    mockVerifyOtp.mockResolvedValueOnce({ user: { id: "42" } });
    const { view } = await renderOtp();
    await fireEvent.changeText(view.getByLabelText("OTP"), "1234");
    await fireEvent.press(view.getByText("Verify & Continue"));
    await waitFor(() => expect(view.getByText("Token missing")).toBeTruthy());

    mockVerifyOtp.mockResolvedValueOnce({ token: "token", user: { id: "42" } });
    mockSaveSession.mockRejectedValueOnce(new Error("Storage unavailable"));
    await fireEvent.press(view.getByText("Verify & Continue"));
    await waitFor(() => expect(view.getByText("Storage unavailable")).toBeTruthy());
  });

  it("counts down, resends OTP, resets the timer, and shows success", async () => {
    const { view } = await renderOtp();

    for (let tick = 0; tick < 65; tick += 1) {
      await jest.advanceTimersByTimeAsync(1_000);
    }
    await waitFor(() => expect(view.getByText("Resend OTP")).toBeTruthy());
    await fireEvent.press(view.getByText("Resend OTP"));

    await waitFor(() => expect(mockSendOtp).toHaveBeenCalledWith("9876543210"));
    expect(view.getByText("OTP resent successfully")).toBeTruthy();
    expect(view.getByText("Resend OTP in 30s")).toBeTruthy();
  });

  it("shows resend errors and cleans the countdown timer on unmount", async () => {
    const clearTimeoutSpy = jest.spyOn(globalThis, "clearTimeout");
    mockSendOtp.mockRejectedValue(new Error("Resend unavailable"));
    const { view } = await renderOtp();
    for (let tick = 0; tick < 65; tick += 1) {
      await jest.advanceTimersByTimeAsync(1_000);
    }
    await fireEvent.press(view.getByText("Resend OTP"));
    await waitFor(() => expect(view.getByText("Resend unavailable")).toBeTruthy());

    await view.unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
