import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import PartnerProfileScreen from "../PartnerProfileScreen";

jest.mock("@react-navigation/native", () => ({
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
  })),
  useRoute: jest.fn(() => ({ key: "PartnerProfileScreen", name: "PartnerProfileScreen", params: {} })),
}));

jest.mock("../../services/partnerService", () => ({
  getPartnerProfile: jest.fn(),
  updatePartnerProfile: jest.fn(),
  uploadPartnerProfileImage: jest.fn(),
}));

jest.mock("react-native-image-picker", () => ({
  launchCamera: jest.fn(async () => ({ assets: [] })),
  launchImageLibrary: jest.fn(async () => ({ assets: [] })),
}));

const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

const createDeferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

const renderScreen = async (onLogout = jest.fn(async () => undefined)) => {
  const view = await render(<PartnerProfileScreen onLogout={onLogout} />);
  return { ...view, onLogout };
};

describe("PartnerProfileScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAsyncStorage.getItem.mockResolvedValue(null);
  });

  it("renders the title and fallback subtitle while profile data is absent", async () => {
    const view = await renderScreen();

    expect(view.getByText("Partner Profile")).toBeTruthy();
    expect(view.getByTestId("partner-profile-email").props.children).toBe("Logged in partner");

    await waitFor(() => {
      expect(mockedAsyncStorage.getItem).toHaveBeenCalledWith("admin_profile");
    });
  });

  it("renders the stored profile email from AsyncStorage", async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify({ email: "partner@example.com" }));

    const view = await renderScreen();

    await waitFor(() => {
      expect(view.getByText("partner@example.com")).toBeTruthy();
    });
  });

  it("falls back to the generic subtitle when the stored profile has an empty email", async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify({ email: "" }));

    const view = await renderScreen();

    await waitFor(() => {
      expect(view.getByText("Logged in partner")).toBeTruthy();
    });
  });

  it("falls back to the generic subtitle when stored profile JSON is invalid", async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce("{invalid-json");
    mockedAsyncStorage.removeItem.mockResolvedValueOnce();

    const view = await renderScreen();

    await waitFor(() => {
      expect(view.getByText("Logged in partner")).toBeTruthy();
    });
    expect(mockedAsyncStorage.removeItem).toHaveBeenCalledWith("admin_profile");
  });

  it("shows a loading spinner and disables logout while logout is in progress", async () => {
    const deferredLogout = createDeferred<void>();
    const onLogout = jest.fn(() => deferredLogout.promise);

    const view = await renderScreen(onLogout);

    await act(async () => {
      fireEvent.press(view.getByTestId("partner-profile-logout-button"));
    });

    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(view.getByTestId("partner-profile-logout-spinner")).toBeTruthy();
    expect(view.queryByText("Logout")).toBeNull();

    await act(async () => {
      deferredLogout.resolve();
      await deferredLogout.promise;
    });

    await waitFor(() => {
      expect(view.getByText("Logout")).toBeTruthy();
    });
  });

  it("restores the logout button when logout fails", async () => {
    const deferredLogout = createDeferred<void>();
    deferredLogout.promise.catch(() => undefined);
    const onLogout = jest.fn(() => deferredLogout.promise);

    const view = await renderScreen(onLogout);

    await act(async () => {
      fireEvent.press(view.getByTestId("partner-profile-logout-button"));
    });

    expect(view.getByTestId("partner-profile-logout-spinner")).toBeTruthy();

    await act(async () => {
      deferredLogout.reject(new Error("Logout failed"));
      await deferredLogout.promise.catch(() => undefined);
    });

    await waitFor(() => {
      expect(view.getByText("Logout")).toBeTruthy();
    });
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("does not update the email after unmount when the profile request resolves late", async () => {
    const deferredProfile = createDeferred<string | null>();
    mockedAsyncStorage.getItem.mockReturnValueOnce(deferredProfile.promise);

    const view = await renderScreen();

    await act(async () => {
      await view.unmount();
    });

    await act(async () => {
      deferredProfile.resolve(JSON.stringify({ email: "late@example.com" }));
      await deferredProfile.promise;
    });

    expect(mockedAsyncStorage.getItem).toHaveBeenCalledWith("admin_profile");
  });
});
