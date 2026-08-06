import React from "react";
import { Alert } from "react-native";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

import { ProfileScreen } from "../src/screens/profile/ProfileScreen";

const mockDispatch = jest.fn();
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockClearSession = jest.fn();
const mockUnregister = jest.fn();
let mockState: any;

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ bottom: 10, top: 0, left: 0, right: 0 }),
}));

jest.mock("../src/redux/hooks", () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: any) => selector(mockState),
}));

jest.mock("../src/redux/customerProfileSlice", () => ({
  fetchCustomerProfileThunk: () => ({ type: "profile/fetch" }),
  refreshProfileBundleThunk: () => ({ type: "profile/refresh" }),
  requestAccountDeleteThunk: () => ({ type: "profile/delete" }),
}));

jest.mock("../src/redux/authSlice", () => ({
  clearSessionState: () => ({ type: "auth/clear" }),
}));

jest.mock("../src/utils/storage", () => ({
  clearSession: () => mockClearSession(),
}));

jest.mock("../src/services/notificationsService", () => ({
  unregisterDeviceToken: () => mockUnregister(),
}));

jest.mock("../src/modules/profile/components/Loader", () => ({
  Loader: () => {
    const { Text } = require("react-native");
    return <Text>Profile loading</Text>;
  },
}));

jest.mock("../src/modules/profile/components/ProfileCard", () => ({
  ProfileCard: ({ children }: any) => {
    const { View } = require("react-native");
    return <View>{children}</View>;
  },
}));

jest.mock("../src/modules/profile/components/SectionListItem", () => ({
  SectionListItem: ({ title, onPress }: any) => {
    const { Pressable, Text } = require("react-native");
    return <Pressable onPress={onPress}><Text>{title}</Text></Pressable>;
  },
}));

jest.mock("../src/modules/profile/components/CustomButton", () => ({
  CustomButton: ({ label, onPress }: any) => {
    const { Pressable, Text } = require("react-native");
    return <Pressable onPress={onPress}><Text>{label}</Text></Pressable>;
  },
}));

jest.mock("../src/modules/profile/components/EmptyState", () => ({
  EmptyState: ({ title, subtitle, actionLabel, onAction }: any) => {
    const { Pressable, Text, View } = require("react-native");
    return <View><Text>{title}</Text><Text>{subtitle}</Text><Pressable onPress={onAction}><Text>{actionLabel}</Text></Pressable></View>;
  },
}));

describe("ProfileScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch.mockImplementation((action) => action);
    mockState = {
      customerProfile: {
        profile: {
          firstName: "Shiv",
          lastName: "Kumar",
          mobile: "9999999999",
          profileImageUrl: "avatar.png",
        },
        addresses: [{ id: 1 }, { id: 2 }],
        content: {
          aboutUs: "About content",
          termsOfService: "Terms content",
          privacyPolicy: "Privacy content",
        },
        status: "success",
        accountDeleteStatus: "success",
      },
      auth: { user: { name: "Fallback", mobile: "8888888888" } },
    };
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    mockClearSession.mockResolvedValue(undefined);
    mockUnregister.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it("renders profile, refreshes, and navigates all menu actions", async () => {
    const view = await render(
      <ProfileScreen navigation={{ navigate: mockNavigate, goBack: mockGoBack }} />,
    );

    expect(view.getByText("Shiv Kumar")).toBeTruthy();
    expect(view.getByText("9999999999")).toBeTruthy();
    expect(view.getByText("Saved address (2)")).toBeTruthy();
    expect(view.getByText("Delete request submitted.")).toBeTruthy();
    expect(mockDispatch).toHaveBeenCalledWith({ type: "profile/refresh" });

    await fireEvent.press(view.getByLabelText("Go back"));
    await fireEvent.press(view.getByLabelText("Edit profile"));
    await fireEvent.press(view.getByText("My bookings"));
    await fireEvent.press(view.getByText("Help & Support"));
    await fireEvent.press(view.getByText("Saved address (2)"));
    await fireEvent.press(view.getByText("About us"));
    await fireEvent.press(view.getByText("Terms of service"));
    await fireEvent.press(view.getByText("Privacy policy"));

    expect(mockGoBack).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("EditProfile");
    expect(mockNavigate).toHaveBeenCalledWith("Bookings");
    expect(mockNavigate).toHaveBeenCalledWith("Support");
    expect(mockNavigate).toHaveBeenCalledWith("Address");
    expect(mockNavigate).toHaveBeenCalledWith("AboutUs", { content: "About content" });
    expect(mockNavigate).toHaveBeenCalledWith("TermsOfService", { content: "Terms content" });
    expect(mockNavigate).toHaveBeenCalledWith("PrivacyPolicy", { content: "Privacy content" });
  });

  it("handles delete and logout confirmations including best-effort failures", async () => {
    mockUnregister.mockRejectedValueOnce(new Error("notification failure"));
    mockClearSession.mockRejectedValueOnce(new Error("storage failure"));
    const view = await render(
      <ProfileScreen navigation={{ navigate: mockNavigate, goBack: mockGoBack }} />,
    );

    await fireEvent.press(view.getByText("Delete account"));
    let actions = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2];
    actions[1].onPress();
    expect(mockDispatch).toHaveBeenCalledWith({ type: "profile/delete" });

    await fireEvent.press(view.getByText("Logout"));
    actions = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2];
    actions[1].onPress();
    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith({ type: "auth/clear" }));
  });

  it("renders loading and error fallbacks and retries", async () => {
    mockState.customerProfile = {
      profile: null,
      addresses: [],
      content: null,
      status: "loading",
      accountDeleteStatus: "idle",
    };
    let view = await render(<ProfileScreen navigation={{}} />);
    expect(view.getByText("Profile loading")).toBeTruthy();

    await cleanup();
    mockState.customerProfile.status = "error";
    view = await render(<ProfileScreen navigation={{ navigate: mockNavigate, goBack: mockGoBack }} />);
    expect(view.getByText("Could not load profile")).toBeTruthy();
    expect(view.getByText("Fallback")).toBeTruthy();
    await fireEvent.press(view.getByText("Retry"));
    expect(mockDispatch).toHaveBeenCalledWith({ type: "profile/fetch" });
  });
});
