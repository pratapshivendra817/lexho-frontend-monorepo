import React from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

type AuthState = {
  token: string | null;
  refreshToken: string | null;
  user: { id?: string | number } | null;
  hydrated: boolean;
};

let mockAuthState: AuthState = {
  token: null,
  refreshToken: null,
  user: null,
  hydrated: false,
};
let mockThemeMode = "light";
let mockNavigationReady = false;
let mockNavigatorShouldThrow: unknown = null;
let mockSocketOptions: any;
let mockPushCallbacks: any;
let mockPaperProviderProps: any;

const mockNavigate = jest.fn();
const mockUseAuthBootstrap = jest.fn();
const mockTrackAppOpen = jest.fn().mockResolvedValue(undefined);
const mockSaveSession = jest.fn().mockResolvedValue(undefined);
const mockSavePendingReferralCode = jest.fn().mockResolvedValue(undefined);
const mockGetPendingPaymentBookingId = jest.fn().mockResolvedValue(null);
const mockClearPendingPaymentBookingId = jest.fn().mockResolvedValue(undefined);
const mockGetBookingDetails = jest.fn();
const mockResolveLifecycleTarget = jest.fn();
const mockInitializePushNotifications = jest.fn().mockResolvedValue(undefined);
const mockSetupPushNotificationListeners = jest.fn();
const mockSetAnalyticsUser = jest.fn().mockResolvedValue(undefined);
const mockTrackAnalyticsEvent = jest.fn().mockResolvedValue(undefined);
const mockSetCrashlyticsUser = jest.fn().mockResolvedValue(undefined);
const mockInitializeCrashlytics = jest.fn().mockResolvedValue(undefined);
const mockLogCrashlyticsMessage = jest.fn().mockResolvedValue(undefined);
const mockRecordNonFatalError = jest.fn().mockResolvedValue(undefined);
const mockCaptureFrontendError = jest.fn();
const mockTrackBusinessEvent = jest.fn();
const mockPushCleanup = jest.fn();

class MockQueryClient {
  setQueryData = jest.fn();
  invalidateQueries = jest.fn().mockResolvedValue(undefined);
}

const mockQueryClient = new MockQueryClient();

jest.mock("@tanstack/react-query", () => {
  const { View } = require("react-native");
  return {
    QueryClient: jest.fn(() => mockQueryClient),
    QueryClientProvider: ({ children }: any) => (
      <View testID="query-provider">{children}</View>
    ),
  };
});

jest.mock("react-redux", () => {
  const { View } = require("react-native");
  return {
    Provider: ({ children }: any) => <View testID="redux-provider">{children}</View>,
  };
});

jest.mock("../src/redux/store", () => ({ store: { dispatch: jest.fn() } }));

jest.mock("../src/redux/hooks", () => ({
  useAppSelector: (selector: (state: any) => unknown) =>
    selector({
      auth: mockAuthState,
      offline: { isOffline: false },
      notification: {},
    }),
}));

jest.mock("@react-navigation/native", () => ({
  createNavigationContainerRef: () => ({
    isReady: () => mockNavigationReady,
    navigate: mockNavigate,
  }),
}));

jest.mock("../src/navigation/AppNavigator", () => {
  const { Text } = require("react-native");
  return {
    AppNavigator: ({ darkMode }: any) => {
      if (mockNavigatorShouldThrow !== null) throw mockNavigatorShouldThrow;
      return <Text>{`App Navigator:${String(darkMode)}`}</Text>;
    },
  };
});

jest.mock("react-native-paper", () => {
  const { Pressable, Text, View } = require("react-native");
  return {
    MD3DarkTheme: { dark: true, colors: { base: "dark" } },
    MD3LightTheme: { dark: false, colors: { base: "light" } },
    PaperProvider: (props: any) => {
      mockPaperProviderProps = props;
      return <View testID="paper-provider">{props.children}</View>;
    },
    Snackbar: ({ action, children, onDismiss, visible }: any) => (
      <View testID="snackbar" accessibilityLabel={String(visible)}>
        <Text>{children}</Text>
        <Pressable accessibilityLabel="dismiss-snackbar" onPress={onDismiss} />
        <Pressable accessibilityLabel="view-notification" onPress={action.onPress} />
      </View>
    ),
  };
});

jest.mock("react-native-vector-icons/MaterialCommunityIcons", () => {
  const { Text } = require("react-native");
  return ({ color, name, size }: any) => (
    <Text accessibilityLabel={`icon-${name}`}>{`${color}:${size}`}</Text>
  );
});

jest.mock("../src/hooks/useAuthBootstrap", () => ({
  useAuthBootstrap: () => mockUseAuthBootstrap(),
}));

jest.mock("../src/hooks/useThemeMode", () => ({
  useThemeMode: () => ({ mode: mockThemeMode }),
}));

jest.mock("../src/hooks/useCustomerNotificationSocket", () => ({
  useCustomerNotificationSocket: (options: any) => {
    mockSocketOptions = options;
  },
}));

jest.mock("../src/modules/calling", () => ({
  useCallSocket: jest.fn(),
}));

jest.mock("../src/services/notificationsService", () => ({
  initializePushNotifications: (...args: any[]) =>
    mockInitializePushNotifications(...args),
  setupPushNotificationListeners: (callbacks: any) => {
    mockPushCallbacks = callbacks;
    return mockSetupPushNotificationListeners(callbacks);
  },
}));

jest.mock("../src/services/firebaseAnalytics", () => ({
  setAnalyticsUser: (...args: any[]) => mockSetAnalyticsUser(...args),
  trackAnalyticsEvent: (...args: any[]) => mockTrackAnalyticsEvent(...args),
}));

jest.mock("../src/services/firebaseCrashlytics", () => ({
  initializeCrashlytics: (...args: any[]) => mockInitializeCrashlytics(...args),
  logCrashlyticsMessage: (...args: any[]) => mockLogCrashlyticsMessage(...args),
  recordNonFatalError: (...args: any[]) => mockRecordNonFatalError(...args),
  setCrashlyticsUser: (...args: any[]) => mockSetCrashlyticsUser(...args),
}));

jest.mock("../src/services/customerAnalyticsEvents", () => ({
  trackAppOpen: (...args: any[]) => mockTrackAppOpen(...args),
}));

jest.mock("../src/utils/storage", () => ({
  clearPendingPaymentBookingId: (...args: any[]) =>
    mockClearPendingPaymentBookingId(...args),
  getPendingPaymentBookingId: (...args: any[]) =>
    mockGetPendingPaymentBookingId(...args),
  savePendingReferralCode: (...args: any[]) =>
    mockSavePendingReferralCode(...args),
  saveSession: (...args: any[]) => mockSaveSession(...args),
}));

jest.mock("../src/api/bookingExtrasApi", () => ({
  getBookingDetails: (...args: any[]) => mockGetBookingDetails(...args),
}));

jest.mock("../src/hooks/useBookingLifecycleNavigation", () => ({
  resolveLifecycleTarget: (...args: any[]) => mockResolveLifecycleTarget(...args),
}));

jest.mock("../src/services/monitoring", () => ({
  captureFrontendError: (...args: any[]) => mockCaptureFrontendError(...args),
  trackBusinessEvent: (...args: any[]) => mockTrackBusinessEvent(...args),
}));

jest.mock("../src/theme/theme", () => ({
  getTheme: ({ mode }: any) => ({
    colors: {
      primary: `${mode}-primary`,
      bgSecondary: `${mode}-background`,
      bgCard: `${mode}-surface`,
      textPrimary: `${mode}-text`,
      border: `${mode}-border`,
      error: `${mode}-error`,
    },
  }),
}));

const App = require("../src/App").default as typeof import("../src/App").default;

function authenticatedState(overrides: Partial<AuthState> = {}): AuthState {
  return {
    token: "access-token",
    refreshToken: "refresh-token",
    user: { id: "user-7" },
    hydrated: true,
    ...overrides,
  };
}

async function renderApp() {
  const view = await render(<App />);
  await waitFor(() => expect(mockTrackAppOpen).toHaveBeenCalled());
  return view;
}

describe("App bootstrap", () => {
  beforeEach(async () => {
    await cleanup();
    jest.clearAllMocks();
    mockAuthState = {
      token: null,
      refreshToken: null,
      user: null,
      hydrated: false,
    };
    mockThemeMode = "light";
    mockNavigationReady = false;
    mockNavigatorShouldThrow = null;
    mockSocketOptions = undefined;
    mockPushCallbacks = undefined;
    mockPaperProviderProps = undefined;
    mockSetupPushNotificationListeners.mockResolvedValue(mockPushCleanup);
    mockGetPendingPaymentBookingId.mockResolvedValue(null);
    mockSaveSession.mockResolvedValue(undefined);
    mockSetAnalyticsUser.mockResolvedValue(undefined);
    mockSetCrashlyticsUser.mockResolvedValue(undefined);
    mockTrackAnalyticsEvent.mockResolvedValue(undefined);
    mockInitializePushNotifications.mockResolvedValue(undefined);
    mockQueryClient.invalidateQueries.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await cleanup();
  });

  it("renders all root providers, starts auth bootstrap and builds the light theme", async () => {
    const view = await renderApp();

    expect(view.getByTestId("redux-provider")).toBeTruthy();
    expect(view.getByTestId("query-provider")).toBeTruthy();
    expect(view.getByTestId("paper-provider")).toBeTruthy();
    expect(view.getByText("App Navigator:false")).toBeTruthy();
    expect(mockUseAuthBootstrap).toHaveBeenCalled();
    expect(mockTrackAppOpen).toHaveBeenCalledWith({
      platform: "android",
      source: "bootstrap",
    });
    expect(mockSocketOptions).toEqual(
      expect.objectContaining({ enabled: false, token: null, userId: "" }),
    );
    expect(mockPaperProviderProps.theme).toEqual(
      expect.objectContaining({
        dark: false,
        colors: expect.objectContaining({
          primary: "light-primary",
          background: "light-background",
          surface: "light-surface",
          onSurface: "light-text",
          outline: "light-border",
          error: "light-error",
        }),
      }),
    );

    const icon = await render(
      mockPaperProviderProps.settings.icon({
        color: "gold",
        name: "home",
        size: 21,
      }),
    );
    expect(icon.getByLabelText("icon-home").props.children).toBe("gold:21");
    await icon.unmount();
  });

  it("persists an authenticated session and initializes user services", async () => {
    mockAuthState = authenticatedState();
    mockThemeMode = "dark";

    const view = await renderApp();

    expect(view.getByText("App Navigator:true")).toBeTruthy();
    expect(mockSocketOptions).toEqual(
      expect.objectContaining({
        enabled: true,
        token: "access-token",
        userId: "user-7",
      }),
    );
    await waitFor(() => {
      expect(mockSaveSession).toHaveBeenCalledWith(
        "access-token",
        "refresh-token",
        { id: "user-7" },
      );
      expect(mockSetAnalyticsUser).toHaveBeenCalledWith("user-7");
      expect(mockSetCrashlyticsUser).toHaveBeenCalledWith("user-7");
      expect(mockTrackAnalyticsEvent).toHaveBeenCalledWith(
        "customer_session_active",
        { has_refresh_token: true, user_id_present: true },
      );
      expect(mockInitializePushNotifications).toHaveBeenCalledTimes(1);
      expect(mockSetupPushNotificationListeners).toHaveBeenCalledTimes(1);
    });

    await view.unmount();
    expect(mockPushCleanup).toHaveBeenCalledTimes(1);
  });

  it("clears analytics identities for a hydrated guest", async () => {
    mockAuthState.hydrated = true;

    await renderApp();

    await waitFor(() => {
      expect(mockSetAnalyticsUser).toHaveBeenCalledWith(null);
      expect(mockSetCrashlyticsUser).toHaveBeenCalledWith(null);
    });
    expect(mockSaveSession).not.toHaveBeenCalled();
    expect(mockInitializePushNotifications).not.toHaveBeenCalled();
    expect(mockSetupPushNotificationListeners).not.toHaveBeenCalled();
  });

  it("uses undefined optional session fields and swallows initialization failures", async () => {
    mockAuthState = authenticatedState({ refreshToken: null, user: null });
    mockSaveSession.mockRejectedValueOnce(new Error("storage unavailable"));

    const view = await renderApp();

    await waitFor(() => {
      expect(mockSaveSession).toHaveBeenCalledWith(
        "access-token",
        undefined,
        undefined,
      );
    });
    expect(view.getByText("App Navigator:false")).toBeTruthy();
    expect(mockInitializePushNotifications).not.toHaveBeenCalled();
  });

  it("updates notification cache for new and duplicate socket messages", async () => {
    mockAuthState = authenticatedState();
    await renderApp();

    mockSocketOptions.onMessage({ data: { id: "n-1", title: "Updated" } });
    const duplicateUpdater = mockQueryClient.setQueryData.mock.calls.at(-1)[1];
    expect(
      duplicateUpdater({ data: [{ id: "n-1", title: "Old" }] }),
    ).toEqual([{ id: "n-1", title: "Updated" }]);

    mockSocketOptions.onMessage({ notificationId: "n-2" });
    const newUpdater = mockQueryClient.setQueryData.mock.calls.at(-1)[1];
    expect(newUpdater([{ id: "n-1" }])).toEqual([
      { notificationId: "n-2" },
      { id: "n-1" },
    ]);

    mockSocketOptions.onMessage(null);
    const nullUpdater = mockQueryClient.setQueryData.mock.calls.at(-1)[1];
    expect(nullUpdater(undefined)).toEqual([{}]);
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["notifications", "unread-count"],
    });
  });

  it("renders and dismisses foreground push messages", async () => {
    mockAuthState = authenticatedState();
    const view = await renderApp();

    await act(async () => {
      mockPushCallbacks.onForegroundMessage({
        notification: { title: "Booking", body: "Confirmed" },
      });
    });
    expect(view.getByText("Booking: Confirmed")).toBeTruthy();
    expect(view.getByTestId("snackbar").props.accessibilityLabel).toBe("true");

    await fireEvent.press(view.getByLabelText("dismiss-snackbar"));
    expect(view.getByTestId("snackbar").props.accessibilityLabel).toBe("false");

    await act(async () => {
      mockPushCallbacks.onForegroundMessage({ data: {} });
    });
    expect(view.getByText("New notification")).toBeTruthy();
    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["notifications"],
    });
  });

  it("opens notification list from the snackbar only when navigation is ready", async () => {
    mockAuthState = authenticatedState();
    const view = await renderApp();

    await fireEvent.press(view.getByLabelText("view-notification"));
    expect(mockNavigate).not.toHaveBeenCalled();

    mockNavigationReady = true;
    await fireEvent.press(view.getByLabelText("view-notification"));
    expect(mockNavigate).toHaveBeenCalledWith("Notifications");
  });

  it("absorbs notification cache invalidation failures", async () => {
    mockAuthState = authenticatedState();
    mockQueryClient.invalidateQueries.mockRejectedValue(new Error("cache offline"));
    await renderApp();

    mockSocketOptions.onMessage({ id: "socket-notification" });
    await act(async () => {
      mockPushCallbacks.onForegroundMessage({
        data: { title: "Update", message: "Ready" },
      });
      mockPushCallbacks.onNotificationOpened({ data: {} });
      await Promise.resolve();
    });

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledTimes(5);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe("push notification navigation", () => {
  beforeEach(async () => {
    await cleanup();
    jest.clearAllMocks();
    mockAuthState = authenticatedState();
    mockThemeMode = "light";
    mockNavigationReady = true;
    mockNavigatorShouldThrow = null;
    mockSetupPushNotificationListeners.mockResolvedValue(mockPushCleanup);
    mockGetPendingPaymentBookingId.mockResolvedValue(null);
    mockQueryClient.invalidateQueries.mockResolvedValue(undefined);
    await renderApp();
  });

  afterEach(async () => {
    await cleanup();
  });

  it.each([
    [{ redirectType: " notifications " }, ["Notifications"]],
    [{ referenceType: "promotion" }, ["Coupon"]],
    [{ notificationType: "PROMOTIONAL_OFFER" }, ["Coupon"]],
    [{ type: "subscription" }, ["Main", { screen: "Bookings" }]],
    [{ type: "SUBSCRIPTION_REMINDER" }, ["Main", { screen: "Bookings" }]],
    [{ type: "PAYMENT", payment_id: "pay-1" }, ["PaymentStatus", { bookingId: "pay-1" }]],
    [{ type: "PAYMENTSTATUS" }, ["PaymentStatus", undefined]],
    [{ type: "INSTANT_BOOKING", booking_id: "b-1" }, ["InstantBookingStatus", { bookingId: "b-1" }]],
    [{ type: "SEARCHING_PARTNER" }, ["InstantBookingStatus", undefined]],
    [{ type: "SCHEDULED_BOOKING", referenceId: "b-2" }, ["ScheduledBookingStatus", { bookingId: "b-2" }]],
    [{ type: "TRACKING", bookingId: "b-3" }, ["LiveTracking", { bookingId: "b-3" }]],
    [{ type: "SUPPORT" }, ["Support"]],
    [{ type: "TICKET" }, ["Support"]],
    [{ type: "BOOKING_DETAIL", bookingId: "b-4" }, ["BookingDetail", { bookingId: "b-4" }]],
    [{ type: "SERVICE_COMPLETED" }, ["Main", { screen: "Bookings" }]],
    [{ type: "UNKNOWN", redirectValue: "b-5" }, ["PaymentStatus", { bookingId: "b-5" }]],
    [{}, ["Notifications"]],
  ])("routes push payload %#", (data, expected) => {
    mockPushCallbacks.onNotificationOpened({ data });
    expect(mockNavigate).toHaveBeenLastCalledWith(...(expected as any));
  });

  it("does not navigate before the container is ready", () => {
    mockNavigationReady = false;
    mockPushCallbacks.onNotificationOpened({ data: { type: "NOTIFICATIONS" } });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe("pending payment recovery", () => {
  beforeEach(async () => {
    await cleanup();
    jest.clearAllMocks();
    mockAuthState = authenticatedState();
    mockThemeMode = "light";
    mockNavigationReady = true;
    mockNavigatorShouldThrow = null;
    mockSetupPushNotificationListeners.mockResolvedValue(mockPushCleanup);
    mockSaveSession.mockResolvedValue(undefined);
    mockQueryClient.invalidateQueries.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await cleanup();
  });

  it("skips recovery without a token or ready navigator", async () => {
    mockNavigationReady = false;
    await renderApp();
    expect(mockGetPendingPaymentBookingId).not.toHaveBeenCalled();
  });

  it("clears and routes a successfully recovered payment", async () => {
    const booking = { paymentStatus: "success" };
    mockGetPendingPaymentBookingId.mockResolvedValue("booking-1");
    mockGetBookingDetails.mockResolvedValue(booking);
    mockResolveLifecycleTarget.mockReturnValue({ name: "ServiceStarted" });

    await renderApp();

    await waitFor(() => {
      expect(mockClearPendingPaymentBookingId).toHaveBeenCalledTimes(1);
      expect(mockTrackBusinessEvent).toHaveBeenCalledWith(
        "payment_recovered_success",
        expect.objectContaining({ booking_id: "booking-1" }),
      );
      expect(mockNavigate).toHaveBeenCalledWith("ServiceStarted", {
        bookingId: "booking-1",
      });
    });
  });

  it("falls back to BookingDetail when lifecycle target has no name", async () => {
    mockGetPendingPaymentBookingId.mockResolvedValue("booking-2");
    mockGetBookingDetails.mockResolvedValue({ paymentStatus: "SUCCESS" });
    mockResolveLifecycleTarget.mockReturnValue({});

    await renderApp();

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("BookingDetail", {
        bookingId: "booking-2",
      }),
    );
  });

  it.each(["FAILED", "EXPIRED"])(
    "routes retryable %s payments to PaymentStatus",
    async paymentStatus => {
      mockGetPendingPaymentBookingId.mockResolvedValue("booking-3");
      mockGetBookingDetails.mockResolvedValue({
        paymentStatus,
        retryPaymentAllowed: true,
      });

      await renderApp();

      await waitFor(() => {
        expect(mockTrackBusinessEvent).toHaveBeenCalledWith(
          "payment_recovered_retry_required",
          expect.objectContaining({ booking_id: "booking-3" }),
        );
        expect(mockNavigate).toHaveBeenCalledWith("PaymentStatus", {
          bookingId: "booking-3",
        });
      });
    },
  );

  it("does not navigate for non-retryable failed payments", async () => {
    mockGetPendingPaymentBookingId.mockResolvedValue("booking-4");
    mockGetBookingDetails.mockResolvedValue({
      paymentStatus: "FAILED",
      retryPaymentAllowed: false,
    });

    await renderApp();
    await waitFor(() => expect(mockGetBookingDetails).toHaveBeenCalled());

    expect(mockTrackBusinessEvent).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("reports recovery API errors with diagnostic context", async () => {
    const error = new Error("network down");
    mockGetPendingPaymentBookingId.mockResolvedValue("booking-5");
    mockGetBookingDetails.mockRejectedValue(error);

    await renderApp();

    await waitFor(() =>
      expect(mockCaptureFrontendError).toHaveBeenCalledWith(error, {
        screenName: "Bootstrap",
        userAction: "payment_recovery",
        apiEndpoint: "/api/bookings/details/booking-5",
        errorCode: "PAYMENT_RECOVERY_FAILED",
      }),
    );
  });

  it("cancels payment recovery after unmount", async () => {
    let resolvePending!: (value: string) => void;
    mockGetPendingPaymentBookingId.mockReturnValue(
      new Promise(resolve => {
        resolvePending = resolve;
      }),
    );
    const view = await renderApp();

    await view.unmount();
    resolvePending("late-booking");
    await Promise.resolve();

    expect(mockGetBookingDetails).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe("root error boundary", () => {
  beforeEach(async () => {
    await cleanup();
    jest.clearAllMocks();
    mockAuthState = authenticatedState();
    mockThemeMode = "light";
    mockNavigationReady = false;
    mockSetupPushNotificationListeners.mockResolvedValue(mockPushCleanup);
    mockGetPendingPaymentBookingId.mockResolvedValue(null);
  });

  afterEach(async () => {
    mockNavigatorShouldThrow = null;
    await cleanup();
  });

  it("renders a useful fallback and reports Error instances", async () => {
    const error = new Error("navigator failed");
    mockNavigatorShouldThrow = error;
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);

    const view = await render(<App />);

    await waitFor(() => {
      expect(view.getByText("App crashed while rendering")).toBeTruthy();
      expect(view.getByText("navigator failed")).toBeTruthy();
    });
    expect(mockLogCrashlyticsMessage).toHaveBeenCalledWith("Root render crash");
    expect(mockRecordNonFatalError).toHaveBeenCalledWith(error, {
      area: "root_error_boundary",
    });
    consoleError.mockRestore();
  });

  it("uses a safe message for non-Error throws", async () => {
    mockNavigatorShouldThrow = "broken";
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);

    const view = await render(<App />);

    await waitFor(() =>
      expect(view.getByText("Unexpected runtime error")).toBeTruthy(),
    );
    consoleError.mockRestore();
  });
});
