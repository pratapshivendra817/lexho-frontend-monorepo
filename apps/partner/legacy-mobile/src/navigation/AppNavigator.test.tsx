import React from "react";
import { Alert, Platform, Text, TouchableOpacity } from "react-native";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let mockAuthToken: string | null = null;
let mockHealthImplementation: () => Promise<any> = async () => ({ ok: true });
let mockPendingCall: any = null;
let mockCallPush: any = null;
let mockDispatchState = { chatUnread: 0 };
let mockPushCallbacks: { onForegroundMessage?: (payload: any) => void; onNotificationOpened?: (payload: any) => void } | null = null;
let mockUnauthorizedHandler: any = null;
let mockStackNavigatorProps: any[] = [];
let mockTabNavigatorProps: any[] = [];
let mockStackScreenProps: any[] = [];
let mockTabScreenProps: any[] = [];
let mockIncomingOfferHandler: ((signal: { callId: string; bookingId: number }) => void) | null = null;
let mockSetupPushListenersImplementation: (callbacks: any) => Promise<any>;
let mockOtpAuthSuccessHandler: ((payload: Record<string, any>, mobile: string) => Promise<void>) | null = null;
let mockRenderMainScreen = true;

const mockNavigation = {
  navigate: jest.fn(),
  replace: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
};

const mockDispatch = jest.fn((action) => action);
const mockSetupPushCleanup = jest.fn();
jest.mock("../screens/auth/MobileNumberScreen", () => {
  const ReactLocal = require("react");
  const { Text: RNText } = require("react-native");
  return function MockMobileNumberScreen() {
    return ReactLocal.createElement(RNText, { testID: "MobileNumberScreen-screen", accessibilityLabel: "MobileNumberScreen" }, "MobileNumberScreen");
  };
});
jest.mock("../screens/auth/OTPScreen", () => {
  const ReactLocal = require("react");
  const { Text: RNText, TouchableOpacity: RNTouchableOpacity } = require("react-native");
  return function MockOTPScreen(props: any) {
    mockOtpAuthSuccessHandler = props.onAuthSuccess;
    return ReactLocal.createElement(
      RNTouchableOpacity,
      {
        testID: "otp-success",
        onPress: () =>
          props.onAuthSuccess?.({ token: "jwt-token", refreshToken: "refresh-token", partnerId: "partner-1" }, "9876543210"),
      },
      ReactLocal.createElement(RNText, null, "OTPScreen"),
    );
  };
});
jest.mock("../screens/system/BackgroundLocationEducationScreen", () => {
  const ReactLocal = require("react");
  const { Text: RNText } = require("react-native");
  return function MockBackgroundLocationEducationScreen() {
    return ReactLocal.createElement(RNText, null, "BackgroundLocationEducationScreen");
  };
});
jest.mock("../screens/system/SplashScreen", () => {
  const ReactLocal = require("react");
  const { Text: RNText } = require("react-native");
  return function MockSplashScreen() {
    return ReactLocal.createElement(RNText, null, "SplashScreen");
  };
});
jest.mock("../screens/main/HomeScreen", () => {
  const ReactLocal = require("react");
  const { Text: RNText } = require("react-native");
  return function MockHomeScreen() {
    return ReactLocal.createElement(RNText, { testID: "HomeScreen-screen", accessibilityLabel: "HomeScreen" }, "HomeScreen");
  };
});
jest.mock("../screens/main/NewOrdersScreen", () => {
  const ReactLocal = require("react");
  const { Text: RNText } = require("react-native");
  return function MockNewOrdersScreen() {
    return ReactLocal.createElement(RNText, null, "NewOrdersScreen");
  };
});
jest.mock("../screens/main/OnboardingSubmitScreen", () => {
  const ReactLocal = require("react");
  const { Text: RNText } = require("react-native");
  return function MockOnboardingSubmitScreen() {
    return ReactLocal.createElement(RNText, null, "OnboardingSubmitScreen");
  };
});
jest.mock("../screens/main/ActiveJobScreen", () => {
  const ReactLocal = require("react");
  const { Text: RNText } = require("react-native");
  return function MockActiveJobScreen() {
    return ReactLocal.createElement(RNText, null, "ActiveJobScreen");
  };
});
jest.mock("../screens/main/DocumentUploadScreen", () => {
  const ReactLocal = require("react");
  const { Text: RNText } = require("react-native");
  return function MockDocumentUploadScreen() {
    return ReactLocal.createElement(RNText, null, "DocumentUploadScreen");
  };
});
jest.mock("../screens/main/SupportScreen", () => {
  const ReactLocal = require("react");
  const { Text: RNText, TouchableOpacity: RNTouchableOpacity } = require("react-native");
  return function MockSupportScreen(props: any) {
    return ReactLocal.createElement(
      RNTouchableOpacity,
      { testID: "logout-trigger", onPress: () => props.onLogout?.() },
      ReactLocal.createElement(RNText, null, "SupportScreen"),
    );
  };
});
jest.mock("../screens/main/NotificationsScreen", () => {
  const ReactLocal = require("react");
  const { Text: RNText } = require("react-native");
  return function MockNotificationsScreen() {
    return ReactLocal.createElement(RNText, null, "NotificationsScreen");
  };
});
jest.mock("../screens/main/OrderHistoryScreen", () => {
  const ReactLocal = require("react");
  const { Text: RNText } = require("react-native");
  return function MockOrderHistoryScreen() {
    return ReactLocal.createElement(RNText, null, "OrderHistoryScreen");
  };
});
jest.mock("../screens/main/ShiftScreen", () => {
  const ReactLocal = require("react");
  const { Text: RNText } = require("react-native");
  return function MockShiftScreen() {
    return ReactLocal.createElement(RNText, null, "ShiftScreen");
  };
});
jest.mock("../screens/main/OrderDetailsScreen", () => {
  const ReactLocal = require("react");
  const { Text: RNText } = require("react-native");
  return function MockOrderDetailsScreen() {
    return ReactLocal.createElement(RNText, null, "OrderDetailsScreen");
  };
});
jest.mock("../screens/main/EarningsStatsScreen", () => {
  const ReactLocal = require("react");
  const { Text: RNText } = require("react-native");
  return function MockEarningsStatsScreen() {
    return ReactLocal.createElement(RNText, null, "EarningsStatsScreen");
  };
});
jest.mock("../screens/main/PayoutsScreen", () => {
  const ReactLocal = require("react");
  const { Text: RNText } = require("react-native");
  return function MockPayoutsScreen() {
    return ReactLocal.createElement(RNText, null, "PayoutsScreen");
  };
});
jest.mock("../screens/main/PayoutDetailScreen", () => {
  const ReactLocal = require("react");
  const { Text: RNText } = require("react-native");
  return function MockPayoutDetailScreen() {
    return ReactLocal.createElement(RNText, null, "PayoutDetailScreen");
  };
});
jest.mock("../screens/main/BankAccountScreen", () => {
  const ReactLocal = require("react");
  const { Text: RNText } = require("react-native");
  return function MockBankAccountScreen() {
    return ReactLocal.createElement(RNText, null, "BankAccountScreen");
  };
});
jest.mock("../screens/main/WithdrawalsScreen", () => {
  const ReactLocal = require("react");
  const { Text: RNText } = require("react-native");
  return function MockWithdrawalsScreen() {
    return ReactLocal.createElement(RNText, null, "WithdrawalsScreen");
  };
});
jest.mock("../screens/main/ProfileScreen", () => {
  const ReactLocal = require("react");
  const { Text: RNText } = require("react-native");
  return function MockProfileScreen() {
    return ReactLocal.createElement(RNText, null, "ProfileScreen");
  };
});
jest.mock("../screens/main/ChatListScreen", () => {
  const ReactLocal = require("react");
  const { Text: RNText } = require("react-native");
  return function MockChatListScreen() {
    return ReactLocal.createElement(RNText, null, "ChatListScreen");
  };
});
jest.mock("../screens/main/ChatScreen", () => {
  const ReactLocal = require("react");
  const { Text: RNText } = require("react-native");
  return function MockChatScreen() {
    return ReactLocal.createElement(RNText, null, "ChatScreen");
  };
});
jest.mock("../screens/main/KycStatusScreen", () => {
  const ReactLocal = require("react");
  const { Text: RNText } = require("react-native");
  return function MockKycStatusScreen() {
    return ReactLocal.createElement(RNText, null, "KycStatusScreen");
  };
});
jest.mock("../screens/main/PartnerOperationsScreens", () => {
  const ReactLocal = require("react");
  const { Text: RNText } = require("react-native");
  return {
    LeaveManagementScreen: () => ReactLocal.createElement(RNText, null, "LeaveManagementScreen"),
    PerformanceDashboardScreen: () => ReactLocal.createElement(RNText, null, "PerformanceDashboardScreen"),
    RatingsScreen: () => ReactLocal.createElement(RNText, null, "RatingsScreen"),
    ServiceAreaManagementScreen: () => ReactLocal.createElement(RNText, null, "ServiceAreaManagementScreen"),
    WarningCenterScreen: () => ReactLocal.createElement(RNText, null, "WarningCenterScreen"),
  };
});

jest.mock("@react-navigation/native", () => ({
  NavigationContainer: ({ children }: any) => <>{children}</>,
  useNavigation: jest.fn(() => mockNavigation),
  useLinking: jest.fn(),
  LinkingContext: { Provider: ({ children }: any) => <>{children}</> },
}));

jest.mock("@react-navigation/native-stack", () => ({
  createNativeStackNavigator: jest.fn(() => ({
    Navigator: ({ children, ...props }: any) => {
      mockStackNavigatorProps.push(props);
      return <>{children}</>;
    },
    Screen: ({ name, component: Component, children, options }: any) => {
      mockStackScreenProps.push({ name, options });
      const props = { navigation: mockNavigation, route: { name, params: {} } };
      if (name === "Main" && !mockRenderMainScreen) {
        return null;
      }
      if (typeof children === "function") {
        return <>{children(props)}</>;
      }
      if (Component) {
        return <Component {...props} />;
      }
      return null;
    },
  })),
}));

jest.mock("@react-navigation/bottom-tabs", () => ({
  createBottomTabNavigator: jest.fn(() => ({
    Navigator: ({ children, ...props }: any) => {
      mockTabNavigatorProps.push(props);
      return <>{children}</>;
    },
    Screen: ({ name, component: Component, children, options }: any) => {
      mockTabScreenProps.push({ name, options });
      const props = { navigation: mockNavigation, route: { name, params: {} } };
      if (typeof children === "function") {
        return <>{children(props)}</>;
      }
      if (Component) {
        return <Component {...props} />;
      }
      return null;
    },
  })),
}));

jest.mock("react-native-vector-icons/MaterialCommunityIcons", () => {
  const ReactLocal = require("react");
  const { Text: RNText } = require("react-native");
  return function MockIcon(props: any) {
    return ReactLocal.createElement(RNText, { testID: `icon-${props.name}` }, props.name);
  };
});

jest.mock("../modules/calling", () => {
  const ReactLocal = require("react");
  const { Text: RNText } = require("react-native");
  return {
    ActiveCallScreen: () => ReactLocal.createElement(RNText, null, "ActiveCallScreen"),
    IncomingCallScreen: () => ReactLocal.createElement(RNText, null, "IncomingCallScreen"),
    MissedCallScreen: () => ReactLocal.createElement(RNText, null, "MissedCallScreen"),
    OutgoingCallScreen: () => ReactLocal.createElement(RNText, null, "OutgoingCallScreen"),
    callActions: {
      resetCall: jest.fn(() => ({ type: "call/resetCall" })),
      setCall: jest.fn((payload) => ({ type: "call/setCall", payload })),
      endCall: jest.fn((payload) => ({ type: "call/endCall", payload })),
    },
    useCallSocket: jest.fn((isAuthenticated, handler) => {
      mockIncomingOfferHandler = handler;
    }),
  };
});

jest.mock("../modules/navigation", () => {
  const ReactLocal = require("react");
  const { Text: RNText } = require("react-native");
  return {
    LiveTrackingScreen: () => ReactLocal.createElement(RNText, null, "LiveTrackingScreen"),
    RouteMapScreen: () => ReactLocal.createElement(RNText, null, "RouteMapScreen"),
  };
});

jest.mock("../modules/sos", () => {
  const ReactLocal = require("react");
  const { Text: RNText, TouchableOpacity: RNTouchableOpacity } = require("react-native");
  return {
    EmergencyContactsScreen: () => ReactLocal.createElement(RNText, null, "EmergencyContactsScreen"),
    SOSHistoryScreen: () => ReactLocal.createElement(RNText, null, "SOSHistoryScreen"),
    SOSScreen: () => ReactLocal.createElement(RNText, null, "SOSScreen"),
    FloatingSOSButton: ({ visible, onConfirmed }: any) =>
      visible
        ? ReactLocal.createElement(
            RNTouchableOpacity,
            { testID: "floating-sos", onPress: onConfirmed },
            ReactLocal.createElement(RNText, null, "FloatingSOSButton"),
          )
        : null,
    useSOSOfflineQueue: jest.fn(),
  };
});

jest.mock("../services/partnerService", () => ({
  getHealth: jest.fn(() => mockHealthImplementation()),
}));

jest.mock("../utils/storage", () => ({
  clearSession: jest.fn(async () => undefined),
  extractJwtToken: jest.fn((payload) => payload?.token ?? payload?.data?.token ?? null),
  getToken: jest.fn(async () => mockAuthToken),
  saveAdminProfile: jest.fn(async () => undefined),
  saveRefreshToken: jest.fn(async () => undefined),
  saveToken: jest.fn(async () => undefined),
}));

jest.mock("../services/notificationsService", () => ({
  initializePushNotifications: jest.fn(async () => true),
  markNotificationRead: jest.fn(async () => undefined),
  setupPushNotificationListeners: jest.fn(async (callbacks) => mockSetupPushListenersImplementation(callbacks)),
  unregisterDeviceToken: jest.fn(async () => undefined),
}));

jest.mock("../services/api", () => ({
  setUnauthorizedHandler: jest.fn((handler) => {
    mockUnauthorizedHandler = handler;
  }),
}));

jest.mock("../features/shift/locationTrackingManager", () => ({
  stopTrackingAndCleanup: jest.fn(),
}));

jest.mock("../features/shift/shiftStorage", () => ({
  clearShiftState: jest.fn(async () => undefined),
}));

jest.mock("../services/locationTrackingService", () => ({
  detectAndSyncCurrentLocation: jest.fn(async () => ({ latitude: 10, longitude: 20, label: "Test" })),
}));

jest.mock("../hooks/useRedux", () => ({
  useAppDispatch: jest.fn(() => mockDispatch),
  useAppSelector: jest.fn((selector) => selector({ chat: { unread: mockDispatchState.chatUnread } })),
}));

jest.mock("../redux/slices/partnerSlice", () => ({
  setLastKnownLocation: jest.fn((payload) => ({ type: "partner/setLastKnownLocation", payload })),
}));

jest.mock("../redux/slices/notificationSlice", () => ({
  upsertNotification: jest.fn((payload) => ({ type: "notifications/upsert", payload })),
}));

jest.mock("../redux/slices/chatSlice", () => ({
  clearChatState: jest.fn(() => ({ type: "chat/clearChatState" })),
  fetchChatThreads: jest.fn((page) => ({ type: "chat/fetchChatThreads", payload: page })),
  selectTotalChatUnread: jest.fn(() => mockDispatchState.chatUnread),
}));

jest.mock("../hooks/usePartnerChatSocket", () => ({
  usePartnerChatSocket: jest.fn(),
}));

jest.mock("../services/callApi", () => ({
  consumePendingIncomingCall: jest.fn(async () => mockPendingCall),
  parseCallPush: jest.fn(() => mockCallPush),
}));

jest.mock("../services/firebaseAnalytics", () => ({
  identifyPartnerAnalytics: jest.fn(async () => undefined),
  PARTNER_ANALYTICS_EVENTS: {
    logout: "logout",
    notificationReceived: "notificationReceived",
    notificationClicked: "notificationClicked",
  },
  trackAuthenticationEvent: jest.fn(async () => undefined),
  trackEvent: jest.fn(async () => undefined),
}));

jest.mock("../services/crashlyticsService", () => ({
  recordCrash: jest.fn(async () => undefined),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: { addEventListener: jest.fn(() => jest.fn()) },
}));

jest.mock("react-native-screens", () => ({}));
jest.mock("react-native-gesture-handler", () => ({
  GestureHandlerRootView: ({ children }: any) => <>{children}</>,
}));
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: any) => <>{children}</>,
  SafeAreaView: ({ children }: any) => <>{children}</>,
  useSafeAreaInsets: jest.fn(() => ({ top: 0, bottom: 0, left: 0, right: 0 })),
}));

import AppNavigator from "./AppNavigator";
import { clearShiftState } from "../features/shift/shiftStorage";
import { stopTrackingAndCleanup } from "../features/shift/locationTrackingManager";
import { clearSession, saveAdminProfile, saveRefreshToken, saveToken } from "../utils/storage";
import { initializePushNotifications, markNotificationRead, unregisterDeviceToken } from "../services/notificationsService";
import { setUnauthorizedHandler } from "../services/api";
import { detectAndSyncCurrentLocation } from "../services/locationTrackingService";
import { setLastKnownLocation } from "../redux/slices/partnerSlice";
import { upsertNotification } from "../redux/slices/notificationSlice";
import { clearChatState, fetchChatThreads } from "../redux/slices/chatSlice";
import { callActions } from "../modules/calling";
import { consumePendingIncomingCall, parseCallPush } from "../services/callApi";
import { identifyPartnerAnalytics, trackAuthenticationEvent, trackEvent } from "../services/firebaseAnalytics";
import { recordCrash } from "../services/crashlyticsService";

describe("AppNavigator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStackNavigatorProps = [];
    mockTabNavigatorProps = [];
    mockStackScreenProps = [];
    mockTabScreenProps = [];
    mockAuthToken = null;
    mockPendingCall = null;
    mockCallPush = null;
    mockDispatchState = { chatUnread: 0 };
    mockPushCallbacks = null;
    mockUnauthorizedHandler = null;
    mockIncomingOfferHandler = null;
    mockOtpAuthSuccessHandler = null;
    mockRenderMainScreen = true;
    mockHealthImplementation = async () => ({ ok: true });
    mockSetupPushListenersImplementation = async (callbacks) => {
      mockPushCallbacks = callbacks;
      return mockSetupPushCleanup;
    };
    Object.defineProperty(Platform, "OS", { configurable: true, get: () => "android" });
    jest.spyOn(Date, "now").mockReturnValue(1234567890);
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    jest.spyOn(require("react-native").ToastAndroid, "show").mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders the splash/loading state during bootstrap", async () => {
    let resolveHealth!: () => void;
    mockHealthImplementation = () => new Promise<void>((resolve) => { resolveHealth = resolve; });

    await render(<AppNavigator />);

    expect(screen.getByText("SplashScreen")).toBeTruthy();

    await act(async () => {
      resolveHealth();
      await Promise.resolve();
    });
  });

  it("renders unauthenticated stack screens after bootstrap", async () => {
    await render(<AppNavigator />);

    await waitFor(() => {
      expect(screen.getByText("MobileNumberScreen")).toBeTruthy();
    });

    expect(screen.getByText("OTPScreen")).toBeTruthy();
    expect(mockStackNavigatorProps[0].screenOptions).toEqual({
      headerShown: false,
      contentStyle: { backgroundColor: "#020A1E" },
    });
    expect(mockStackScreenProps.slice(0, 2).map((item) => item.name)).toEqual(["Login", "OTP"]);
    expect(screen.queryByTestId("floating-sos")).toBeNull();
  });

  it("completes login flow and renders authenticated tabs", async () => {
    await render(<AppNavigator />);

    await waitFor(() => {
      expect(screen.getByTestId("otp-success")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId("otp-success"));
    });

    await waitFor(() => {
      expect(screen.getByText("HomeScreen")).toBeTruthy();
    });

    expect(saveToken).toHaveBeenCalledWith("jwt-token");
    expect(saveRefreshToken).toHaveBeenCalledWith("refresh-token");
    expect(saveAdminProfile).toHaveBeenCalledWith({ email: "9876543210@partner.local" });
    expect(initializePushNotifications).toHaveBeenCalled();
    expect(identifyPartnerAnalytics).toHaveBeenCalledWith("partner-1");
    expect(trackAuthenticationEvent).toHaveBeenCalledWith(true, { mobile: "9876543210" });
    expect(mockTabScreenProps.map((item) => item.name)).toEqual([
      "HomeTab",
      "ProfileTab",
      "NotificationsTab",
      "ChatTab",
      "SupportTab",
    ]);
    expect(screen.getByTestId("floating-sos")).toBeTruthy();
  });

  it("handles login success without refresh token and uses nested partner identifiers", async () => {
    await render(<AppNavigator />);

    await waitFor(() => {
      expect(mockOtpAuthSuccessHandler).toEqual(expect.any(Function));
    });

    await act(async () => {
      await mockOtpAuthSuccessHandler?.({ data: { token: "nested-token", partnerId: "nested-partner" } }, "9999999999");
    });

    expect(saveToken).toHaveBeenCalledWith("nested-token");
    expect(saveRefreshToken).not.toHaveBeenCalled();
    expect(identifyPartnerAnalytics).toHaveBeenCalledWith("nested-partner");
    expect(saveAdminProfile).toHaveBeenCalledWith({ email: "9999999999@partner.local" });
  });

  it("uses payload user id as the analytics identifier when partner ids are absent", async () => {
    await render(<AppNavigator />);

    await waitFor(() => {
      expect(mockOtpAuthSuccessHandler).toEqual(expect.any(Function));
    });

    await act(async () => {
      await mockOtpAuthSuccessHandler?.({ token: "jwt-user", user: { id: "user-partner-7" } }, "7777777777");
    });

    expect(identifyPartnerAnalytics).toHaveBeenCalledWith("user-partner-7");
  });

  it("rejects login when verify otp response does not contain a token", async () => {
    await render(<AppNavigator />);

    await waitFor(() => {
      expect(mockOtpAuthSuccessHandler).toEqual(expect.any(Function));
    });

    await expect(mockOtpAuthSuccessHandler?.({ user: { id: "partner-user" } }, "8888888888")).rejects.toThrow(
      "Token missing in verify-otp response.",
    );

    expect(saveToken).not.toHaveBeenCalled();
  });

  it("renders authenticated main flow when a token already exists", async () => {
    mockAuthToken = "existing-token";
    await render(<AppNavigator />);

    await waitFor(() => {
      expect(screen.getByText("HomeScreen")).toBeTruthy();
    });

    expect(fetchChatThreads).toHaveBeenCalledWith(0);
    expect(setLastKnownLocation).toHaveBeenCalledWith({ latitude: 10, longitude: 20, label: "Test" });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "partner/setLastKnownLocation",
      payload: { latitude: 10, longitude: 20, label: "Test" },
    });
  });

  it("navigates to a pending incoming call after authenticated bootstrap", async () => {
    mockAuthToken = "existing-token";
    mockPendingCall = {
      type: "INCOMING_CALL",
      callId: "call-1",
      orderId: 42,
      customerId: "cust-1",
      customerName: "Aarav",
    };

    await render(<AppNavigator />);

    await waitFor(() => {
      expect(mockNavigation.navigate).toHaveBeenCalledWith("IncomingCall", { callId: "call-1", orderId: 42 });
    });

    expect(callActions.setCall).toHaveBeenCalled();
    expect(consumePendingIncomingCall).toHaveBeenCalled();
  });

  it("routes live socket incoming offers to the incoming call screen", async () => {
    mockAuthToken = "existing-token";
    await render(<AppNavigator />);

    await waitFor(() => {
      expect(screen.getByText("HomeScreen")).toBeTruthy();
    });

    await act(async () => {
      mockIncomingOfferHandler?.({ callId: "offer-1", bookingId: 91 });
      await Promise.resolve();
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith("IncomingCall", { callId: "offer-1", orderId: 91 });
  });

  it("handles bootstrap failure by recording a crash and showing the auth flow", async () => {
    mockHealthImplementation = async () => {
      throw new Error("health failed");
    };
    await render(<AppNavigator />);

    await waitFor(() => {
      expect(screen.getByText("MobileNumberScreen")).toBeTruthy();
    });

    expect(recordCrash).toHaveBeenCalled();
  });

  it("registers the unauthorized handler and performs logout cleanup", async () => {
    mockAuthToken = "existing-token";
    await render(<AppNavigator />);

    await waitFor(() => {
      expect(screen.getByText("HomeScreen")).toBeTruthy();
    });

    expect(setUnauthorizedHandler).toHaveBeenCalledWith(expect.any(Function));
    await act(async () => {
      await mockUnauthorizedHandler?.();
    });

    await waitFor(() => {
      expect(screen.getByText("MobileNumberScreen")).toBeTruthy();
    });

    expect(stopTrackingAndCleanup).toHaveBeenCalled();
    expect(clearShiftState).toHaveBeenCalled();
    expect(unregisterDeviceToken).toHaveBeenCalled();
    expect(clearSession).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith({ type: "chat/clearChatState" });
    expect(mockDispatch).toHaveBeenCalledWith({ type: "call/resetCall" });
    expect(trackEvent).toHaveBeenCalledWith("logout");
  });

  it("passes logout through the support tab screen", async () => {
    mockAuthToken = "existing-token";
    await render(<AppNavigator />);

    await waitFor(() => {
      expect(screen.getAllByTestId("logout-trigger")).toHaveLength(2);
    });

    await act(async () => {
      fireEvent.press(screen.getAllByTestId("logout-trigger")[0]);
    });

    await waitFor(() => {
      expect(screen.getByText("MobileNumberScreen")).toBeTruthy();
    });
  });

  it("navigates to SOS from the floating button", async () => {
    mockAuthToken = "existing-token";
    await render(<AppNavigator />);

    await waitFor(() => {
      expect(screen.getByTestId("floating-sos")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("floating-sos"));

    expect(mockNavigation.navigate).toHaveBeenCalledWith("SOS", { autoActivate: true });
  });

  it("wires tab labels, badge, and tab icons correctly", async () => {
    mockAuthToken = "existing-token";
    mockDispatchState = { chatUnread: 5 };
    await render(<AppNavigator />);

    await waitFor(() => {
      expect(mockTabNavigatorProps).toHaveLength(1);
    });

    expect(mockTabScreenProps.find((item) => item.name === "HomeTab")?.options.title).toBe("Home");
    expect(mockTabScreenProps.find((item) => item.name === "NotificationsTab")?.options.title).toBe("Alerts");
    expect(mockTabScreenProps.find((item) => item.name === "ChatTab")?.options.tabBarBadge).toBe(5);

    const screenOptions = mockTabNavigatorProps[0].screenOptions({ route: { name: "HomeTab" } });
    const iconElement = screenOptions.tabBarIcon({ color: "red", size: 20 });
    expect(iconElement.props.name).toBe("view-dashboard-outline");
    expect(screenOptions.headerShown).toBe(false);
    expect(screenOptions.tabBarActiveTintColor).toBe("#D4AF37");

    const fallbackIconElement = mockTabNavigatorProps[0].screenOptions({ route: { name: "UnknownTab" } }).tabBarIcon({
      color: "blue",
      size: 18,
    });
    expect(fallbackIconElement.props.name).toBe("circle");
  });

  it("applies gesture disabled options to call screens", async () => {
    mockAuthToken = "existing-token";
    await render(<AppNavigator />);

    await waitFor(() => {
      expect(mockStackScreenProps.some((item) => item.name === "IncomingCall")).toBe(true);
    });

    expect(mockStackScreenProps.find((item) => item.name === "IncomingCall")?.options).toEqual({ gestureEnabled: false });
    expect(mockStackScreenProps.find((item) => item.name === "OutgoingCall")?.options).toEqual({ gestureEnabled: false });
    expect(mockStackScreenProps.find((item) => item.name === "ActiveCall")?.options).toEqual({ gestureEnabled: false });
    expect(mockStackScreenProps.find((item) => item.name === "MissedCall")?.options).toEqual({ gestureEnabled: false });
  });

  it("routes opened booking notifications to order details", async () => {
    mockAuthToken = "existing-token";
    await render(<AppNavigator />);

    await waitFor(() => {
      expect(mockPushCallbacks?.onNotificationOpened).toEqual(expect.any(Function));
    });

    await act(async () => {
      mockPushCallbacks?.onNotificationOpened?.({ data: { redirectType: "BOOKING", redirectValue: "77" } });
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith("OrderDetails", { orderId: 77 });
  });

  it("routes chat notifications to the chat screen or chat tab fallback", async () => {
    mockAuthToken = "existing-token";
    await render(<AppNavigator />);

    await waitFor(() => {
      expect(mockPushCallbacks?.onNotificationOpened).toEqual(expect.any(Function));
    });

    await act(async () => {
      mockPushCallbacks?.onNotificationOpened?.({ data: { redirectType: "CHAT", redirectValue: "12" } });
    });
    await act(async () => {
      mockPushCallbacks?.onNotificationOpened?.({ data: { redirectType: "CHAT" } });
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith("Chat", { orderId: 12 });
    expect(mockNavigation.navigate).toHaveBeenCalledWith("Main", { screen: "ChatTab" });
  });

  it("routes warning notifications to the warnings screen and marks them read", async () => {
    mockAuthToken = "existing-token";
    await render(<AppNavigator />);

    await waitFor(() => {
      expect(mockPushCallbacks?.onNotificationOpened).toEqual(expect.any(Function));
    });

    await act(async () => {
      mockPushCallbacks?.onNotificationOpened?.({
        data: { redirectType: "WARNING", notificationId: "notif-warning-1", warningId: "w-10" },
      });
    });

    expect(markNotificationRead).toHaveBeenCalledWith("notif-warning-1");
    expect(upsertNotification).toHaveBeenCalledWith(expect.objectContaining({
      id: "notif-warning-1",
      source: "warning",
      read: true,
      redirectType: "WARNING",
      warningId: "w-10",
    }));
    expect(mockNavigation.navigate).toHaveBeenCalledWith("WarningCenter");
  });

  it("falls back unknown opened notifications to the notifications tab", async () => {
    mockAuthToken = "existing-token";
    await render(<AppNavigator />);

    await waitFor(() => {
      expect(mockPushCallbacks?.onNotificationOpened).toEqual(expect.any(Function));
    });

    await act(async () => {
      mockPushCallbacks?.onNotificationOpened?.({ data: { redirectType: "SOMETHING_ELSE" } });
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith("Main", { screen: "NotificationsTab" });
  });

  it("routes incoming call push payloads to the incoming call screen", async () => {
    mockAuthToken = "existing-token";
    mockCallPush = {
      type: "INCOMING_CALL",
      callId: "call-2",
      orderId: 88,
      customerId: "cust-2",
      customerName: "Riya",
    };
    await render(<AppNavigator />);

    await waitFor(() => {
      expect(mockPushCallbacks?.onNotificationOpened).toEqual(expect.any(Function));
    });

    await act(async () => {
      mockPushCallbacks?.onNotificationOpened?.({ data: { any: "thing" } });
    });

    expect(callActions.setCall).toHaveBeenCalled();
    expect(mockNavigation.navigate).toHaveBeenCalledWith("IncomingCall", { callId: "call-2", orderId: 88 });
    expect(parseCallPush).toHaveBeenCalled();
  });

  it("falls back to an empty participant id for incoming call notification payloads without customer ids", async () => {
    mockAuthToken = "existing-token";
    mockCallPush = {
      type: "INCOMING_CALL",
      callId: "call-missing-customer",
      orderId: 73,
      customerName: "No Id Caller",
    };
    await render(<AppNavigator />);

    await waitFor(() => {
      expect(mockPushCallbacks?.onNotificationOpened).toEqual(expect.any(Function));
    });

    await act(async () => {
      mockPushCallbacks?.onNotificationOpened?.({ notification: { title: "Call" } });
    });

    expect(callActions.setCall).toHaveBeenCalledWith(
      expect.objectContaining({
        participant: expect.objectContaining({ id: "", name: "No Id Caller", role: "CUSTOMER" }),
      }),
    );
  });

  it("routes missed call pushes and invalid booking redirects to their fallbacks", async () => {
    mockAuthToken = "existing-token";
    await render(<AppNavigator />);

    await waitFor(() => {
      expect(mockPushCallbacks?.onNotificationOpened).toEqual(expect.any(Function));
    });

    mockCallPush = { type: "CALL_MISSED", orderId: 66 };
    await act(async () => {
      mockPushCallbacks?.onNotificationOpened?.({ data: { redirectType: "BOOKING", redirectValue: "66" } });
    });

    expect(callActions.endCall).toHaveBeenCalledWith({ status: "missed", reason: "MISSED" });
    expect(mockNavigation.navigate).toHaveBeenCalledWith("OrderDetails", { orderId: 66 });

    mockCallPush = null;
    await act(async () => {
      mockPushCallbacks?.onNotificationOpened?.({ data: { redirectType: "ORDER", redirectValue: "invalid" } });
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith("Orders");
  });

  it("routes payout and support style notifications using fallback payload fields", async () => {
    mockAuthToken = "existing-token";
    await render(<AppNavigator />);

    await waitFor(() => {
      expect(mockPushCallbacks?.onNotificationOpened).toEqual(expect.any(Function));
    });

    await act(async () => {
      mockPushCallbacks?.onNotificationOpened?.({ data: { referenceType: "PAYOUT", referenceId: "p-1" } });
    });
    await act(async () => {
      mockPushCallbacks?.onNotificationOpened?.({ data: { notificationType: "TICKET", id: "support-1" } });
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith("Payouts");
    expect(mockNavigation.navigate).toHaveBeenCalledWith("Support");
  });

  it("handles foreground notifications with toast, notification upsert, and chat refresh", async () => {
    mockAuthToken = "existing-token";
    await render(<AppNavigator />);

    await waitFor(() => {
      expect(mockPushCallbacks?.onForegroundMessage).toEqual(expect.any(Function));
    });

    await act(async () => {
      mockPushCallbacks?.onForegroundMessage?.({
        notification: { title: "Chat", body: "New message" },
        data: { redirectType: "CHAT_MESSAGE", notificationId: "n-1" },
      });
    });

    expect(fetchChatThreads).toHaveBeenCalledWith(0);
    expect(upsertNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "n-1",
        title: "Chat",
        message: "New message",
        read: false,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "notifications/upsert" }));
    expect(require("react-native").ToastAndroid.show).toHaveBeenCalled();
  });

  it("uses warning defaults for foreground warning pushes", async () => {
    mockAuthToken = "existing-token";
    await render(<AppNavigator />);

    await waitFor(() => {
      expect(mockPushCallbacks?.onForegroundMessage).toEqual(expect.any(Function));
    });

    await act(async () => {
      mockPushCallbacks?.onForegroundMessage?.({
        data: { redirectType: "WARNING", notificationId: "warning-push-1", warningId: "w-42" },
      });
    });

    expect(upsertNotification).toHaveBeenCalledWith(expect.objectContaining({
      id: "warning-push-1",
      title: "New Warning Issued",
      message: "A new warning has been issued to your account. Tap to view the details.",
      source: "warning",
      redirectType: "WARNING",
      warningId: "w-42",
      read: false,
    }));
  });

  it("routes foreground incoming calls immediately without creating a notification", async () => {
    mockAuthToken = "existing-token";
    mockCallPush = {
      type: "INCOMING_CALL",
      callId: "call-foreground",
      orderId: 55,
      customerId: "cust-foreground",
      customerName: "Kabir",
    };
    await render(<AppNavigator />);

    await waitFor(() => {
      expect(mockPushCallbacks?.onForegroundMessage).toEqual(expect.any(Function));
    });

    await act(async () => {
      mockPushCallbacks?.onForegroundMessage?.({ data: { notificationType: "call" } });
    });

    expect(callActions.setCall).toHaveBeenCalled();
    expect(mockNavigation.navigate).toHaveBeenCalledWith("IncomingCall", { callId: "call-foreground", orderId: 55 });
    expect(upsertNotification).not.toHaveBeenCalled();
    expect(require("react-native").ToastAndroid.show).not.toHaveBeenCalled();
  });

  it("uses empty participant ids for foreground incoming calls without customer ids", async () => {
    mockAuthToken = "existing-token";
    mockCallPush = {
      type: "INCOMING_CALL",
      callId: "call-foreground-missing-customer",
      orderId: 58,
      customerName: "Foreground Caller",
    };
    await render(<AppNavigator />);

    await waitFor(() => {
      expect(mockPushCallbacks?.onForegroundMessage).toEqual(expect.any(Function));
    });

    await act(async () => {
      mockPushCallbacks?.onForegroundMessage?.({ notification: { body: "Incoming" } });
    });

    expect(callActions.setCall).toHaveBeenCalledWith(
      expect.objectContaining({
        participant: expect.objectContaining({ id: "", name: "Foreground Caller", role: "CUSTOMER" }),
      }),
    );
  });

  it("handles missed call foreground notifications and uses fallback notification text", async () => {
    Object.defineProperty(Platform, "OS", { configurable: true, get: () => "ios" });
    mockAuthToken = "existing-token";
    mockCallPush = { type: "CALL_MISSED", orderId: 72 };
    await render(<AppNavigator />);

    await waitFor(() => {
      expect(mockPushCallbacks?.onForegroundMessage).toEqual(expect.any(Function));
    });

    await act(async () => {
      mockPushCallbacks?.onForegroundMessage?.({
        data: {
          type: "message",
          title: "Fallback Title",
          id: "fallback-id",
        },
      });
    });

    expect(callActions.endCall).toHaveBeenCalledWith({ status: "missed", reason: "MISSED" });
    expect(trackEvent).toHaveBeenCalledWith("notificationReceived", { redirectType: "MESSAGE" });
    expect(upsertNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "fallback-id",
        title: "Fallback Title",
        message: "",
      }),
    );
    expect(Alert.alert).toHaveBeenCalledWith("Fallback Title", "New notification");
  });

  it("shows an alert for foreground notifications on ios", async () => {
    Object.defineProperty(Platform, "OS", { configurable: true, get: () => "ios" });
    mockAuthToken = "existing-token";
    await render(<AppNavigator />);

    await waitFor(() => {
      expect(mockPushCallbacks?.onForegroundMessage).toEqual(expect.any(Function));
    });

    await act(async () => {
      mockPushCallbacks?.onForegroundMessage?.({
        notification: { title: "Update", body: "Body" },
        data: { redirectType: "SUPPORT", notificationId: "n-2" },
      });
    });

    expect(Alert.alert).toHaveBeenCalledWith("Update", "Body");
  });

  it("does not block auth flow when location sync fails", async () => {
    (detectAndSyncCurrentLocation as jest.Mock).mockRejectedValueOnce(new Error("gps off"));
    mockAuthToken = "existing-token";
    await render(<AppNavigator />);

    await waitFor(() => {
      expect(screen.getByText("HomeScreen")).toBeTruthy();
    });

    expect(setLastKnownLocation).not.toHaveBeenCalled();
  });

  it("ignores push listener setup failures and keeps the app rendered", async () => {
    mockAuthToken = "existing-token";
    mockSetupPushListenersImplementation = async () => {
      throw new Error("push listener setup failed");
    };

    await render(<AppNavigator />);

    await waitFor(() => {
      expect(screen.getByText("HomeScreen")).toBeTruthy();
    });

    expect(mockPushCallbacks).toBeNull();
  });

  it("safely ignores opened notifications when the main navigator has not attached a navigation ref", async () => {
    mockAuthToken = "existing-token";
    mockRenderMainScreen = false;

    await render(<AppNavigator />);

    await waitFor(() => {
      expect(mockPushCallbacks?.onNotificationOpened).toEqual(expect.any(Function));
    });

    await act(async () => {
      mockPushCallbacks?.onNotificationOpened?.(null);
    });

    expect(mockNavigation.navigate).not.toHaveBeenCalled();
  });

  it("does not update auth or location state after bootstrap has been unmounted", async () => {
    let resolveHealth!: () => void;
    let resolveToken!: (value: any) => void;

    mockHealthImplementation = () => new Promise<void>((resolve) => {
      resolveHealth = resolve;
    });
    const storage = require("../utils/storage");
    (storage.getToken as jest.Mock).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveToken = resolve;
        }),
    );
    (consumePendingIncomingCall as jest.Mock).mockImplementationOnce(
      async () => ({
        type: "INCOMING_CALL",
        callId: "late-call",
        orderId: 90,
        customerId: "late-customer",
        customerName: "Late Caller",
      }),
    );

    const view = await render(<AppNavigator />);

    await act(async () => {
      resolveHealth();
      await Promise.resolve();
    });

    await act(async () => {
      await view.unmount();
    });

    await act(async () => {
      resolveToken("existing-token");
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(callActions.setCall).not.toHaveBeenCalledWith(
      expect.objectContaining({ callId: "late-call", bookingId: 90 }),
    );
    expect(setLastKnownLocation).not.toHaveBeenCalledWith({ latitude: 1, longitude: 2, label: "Late location" });
  });
});
