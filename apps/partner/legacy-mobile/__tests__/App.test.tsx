import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

const mockDispatch = jest.fn();
const mockHandleNavigationStateChange = jest.fn(async () => undefined);
const mockInitializeCrashlytics = jest.fn(async () => undefined);
const mockGetOfflineQueueSize = jest.fn(async () => 0);
const mockStartOfflineQueueAutoRetry = jest.fn();
const mockSetServerOfflineHandler = jest.fn();

let mockNetworkOnline = true;
let mockSecurityBlocked = false;
let mockFeedbackState = {
  loading: false,
  toastMessage: "",
  toastVisible: false,
  dismissToast: jest.fn(),
};

jest.mock("../src/navigation/AppNavigator", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return () => React.createElement(Text, null, "App Navigator");
});
jest.mock("redux-persist/integration/react", () => ({
  PersistGate: ({ children }: any) => children,
}));
jest.mock("../src/redux/store", () => ({
  store: {
    getState: () => ({ partner: { online: false }, offline: {} }),
    dispatch: jest.fn(),
    subscribe: jest.fn(() => jest.fn()),
  },
  persistor: {},
}));
jest.mock("../src/hooks/useRedux", () => ({
  useAppDispatch: () => mockDispatch,
}));
jest.mock("../src/hooks/useNetworkStatus", () => ({
  useNetworkStatus: () => mockNetworkOnline,
}));
jest.mock("../src/hooks/useSecurityGuard", () => ({
  useSecurityGuard: () => ({ blocked: mockSecurityBlocked }),
}));
jest.mock("../src/hooks/useOnlineHoursSync", () => ({
  useOnlineHoursSync: () => undefined,
}));
jest.mock("../src/services/crashlyticsService", () => ({
  initializeCrashlytics: () => mockInitializeCrashlytics(),
}));
jest.mock("../src/services/offlineQueue", () => ({
  getOfflineQueueSize: () => mockGetOfflineQueueSize(),
  startOfflineQueueAutoRetry: (...args: any[]) => mockStartOfflineQueueAutoRetry(...args),
  registerOfflineHandler: jest.fn(),
}));
jest.mock("../src/services/api", () => ({
  setServerOfflineHandler: (...args: any[]) => mockSetServerOfflineHandler(...args),
}));
jest.mock("../src/services/partnerActionQueueService", () => ({}));
jest.mock("../src/services/screenTrackingService", () => ({
  navigationTrackingRef: { current: null },
  handleNavigationStateChange: (...args: any[]) => mockHandleNavigationStateChange(...args),
}));
jest.mock("../src/components/common/OfflineBanner", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    OfflineBanner: ({ visible }: { visible: boolean }) => React.createElement(Text, null, visible ? "offline-visible" : "offline-hidden"),
  };
});
jest.mock("../src/components/common/GlobalLoader", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    GlobalLoader: ({ visible }: { visible: boolean }) => React.createElement(Text, null, visible ? "loader-visible" : "loader-hidden"),
  };
});
jest.mock("../src/components/common/ToastMessage", () => {
  const React = require("react");
  const { Text, TouchableOpacity } = require("react-native");
  return {
    ToastMessage: ({ visible, message, onClose }: { visible: boolean; message: string; onClose: () => void }) =>
      React.createElement(
        TouchableOpacity,
        { accessibilityLabel: "dismiss-toast", onPress: onClose },
        React.createElement(Text, null, visible ? message || "toast-visible" : "toast-hidden"),
      ),
  };
});
jest.mock("../src/context/AppFeedbackContext", () => ({
  AppFeedbackProvider: ({ children }: any) => children,
  useAppFeedback: () => mockFeedbackState,
}));
jest.mock("../src/screens/system/RootDetectionWarningScreen", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return () => React.createElement(Text, null, "Root detection warning");
});
jest.mock("@react-navigation/native", () => ({
  NavigationContainer: ({ children, onReady, onStateChange }: any) => {
    const React = require("react");
    const { View, TouchableOpacity, Text } = require("react-native");
    return React.createElement(
      View,
      null,
      React.createElement(
        TouchableOpacity,
        { accessibilityLabel: "nav-ready", onPress: onReady },
        React.createElement(Text, null, "ready"),
      ),
      React.createElement(
        TouchableOpacity,
        { accessibilityLabel: "nav-state-change", onPress: onStateChange },
        React.createElement(Text, null, "state"),
      ),
      children,
    );
  },
}));

import App from "../App";

describe("App", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNetworkOnline = true;
    mockSecurityBlocked = false;
    mockFeedbackState = {
      loading: false,
      toastMessage: "",
      toastVisible: false,
      dismissToast: jest.fn(),
    };
    mockStartOfflineQueueAutoRetry.mockImplementation((listener: (size: number) => void) => {
      listener(5);
      return jest.fn();
    });
    mockGetOfflineQueueSize.mockResolvedValue(3);
  });

  it("renders app chrome, initializes side effects, triggers navigation callbacks, and cleans up", async () => {
    const stopRetry = jest.fn();
    mockStartOfflineQueueAutoRetry.mockImplementationOnce((listener: (size: number) => void) => {
      listener(5);
      return stopRetry;
    });

    const view = await render(<App />);

    expect(view.getByText("App Navigator")).toBeTruthy();
    expect(view.getByText("offline-hidden")).toBeTruthy();
    expect(view.getByText("loader-hidden")).toBeTruthy();
    expect(view.getByText("toast-hidden")).toBeTruthy();

    await waitFor(() => {
      expect(mockInitializeCrashlytics).toHaveBeenCalled();
      expect(mockSetServerOfflineHandler).toHaveBeenCalledWith(expect.any(Function));
      expect(mockDispatch).toHaveBeenCalledWith({ type: "offline/setQueuedActions", payload: 5 });
      expect(mockDispatch).toHaveBeenCalledWith({ type: "offline/setQueuedActions", payload: 3 });
      expect(mockDispatch).toHaveBeenCalledWith({ type: "offline/setOfflineStatus", payload: false });
    });

    fireEvent.press(view.getByLabelText("nav-ready"));
    fireEvent.press(view.getByLabelText("nav-state-change"));
    await waitFor(() => {
      expect(mockHandleNavigationStateChange).toHaveBeenCalledTimes(2);
    });

    view.unmount();
    await waitFor(() => {
      expect(stopRetry).toHaveBeenCalled();
      expect(mockSetServerOfflineHandler).toHaveBeenLastCalledWith(null);
    });
  });

});
