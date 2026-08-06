import React from "react";
import { cleanup, fireEvent, render } from "@testing-library/react-native";

const mockDispatch = jest.fn();
const mockHydrateLocationCacheThunk = jest.fn(() => ({
  type: "location/hydrate",
}));
let mockAuthState = { token: null as string | null, hydrated: false };
let mockLocationState: Record<string, unknown> = {};

type ScreenRegistration = {
  name: string;
  component?: React.ComponentType<any>;
  children?: (props: any) => React.ReactNode;
  options?: any;
  listeners?: any;
};

const mockRootScreens: ScreenRegistration[] = [];
const mockAuthScreens: ScreenRegistration[] = [];
const mockTabScreens: ScreenRegistration[] = [];
const mockNavigatorProps: Record<string, any[]> = {
  root: [],
  auth: [],
  tabs: [],
};

function mockCreateNavigator(
  kind: "root" | "auth" | "tabs",
  registrations: ScreenRegistration[],
) {
  const Navigator = ({ children, ...props }: any) => {
    mockNavigatorProps[kind].push(props);
    return <>{children}</>;
  };
  const Screen = (props: ScreenRegistration) => {
    registrations.push(props);
    return props.children ? <>{props.children({ navigation: {} })}</> : null;
  };
  return { Navigator, Screen };
}

const mockRootNavigator = mockCreateNavigator("root", mockRootScreens);
const mockAuthNavigator = mockCreateNavigator("auth", mockAuthScreens);
const mockTabsNavigator = mockCreateNavigator("tabs", mockTabScreens);

jest.mock("@react-navigation/native-stack", () => ({
  createNativeStackNavigator: jest
    .fn()
    .mockReturnValueOnce(mockRootNavigator)
    .mockReturnValueOnce(mockAuthNavigator),
}));

jest.mock("@react-navigation/bottom-tabs", () => ({
  createBottomTabNavigator: () => mockTabsNavigator,
}));

jest.mock("@react-navigation/native", () => {
  const ReactModule = require("react");
  const { View } = require("react-native");
  return {
    DefaultTheme: { name: "default-theme" },
    DarkTheme: { name: "dark-theme" },
    NavigationContainer: ReactModule.forwardRef(
      ({ children, theme }: any, ref: any) => (
        <View ref={ref} testID="navigation-container" accessibilityLabel={theme.name}>
          {children}
        </View>
      ),
    ),
  };
});

jest.mock("../src/redux/hooks", () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: any) => unknown) =>
    selector({ auth: mockAuthState, location: mockLocationState }),
}));

jest.mock("../src/redux/locationSlice", () => ({
  hydrateLocationCacheThunk: () => mockHydrateLocationCacheThunk(),
}));

jest.mock("react-native-vector-icons/MaterialCommunityIcons", () => {
  const { Text } = require("react-native");
  return ({ name, color, size }: any) => (
    <Text accessibilityLabel={`icon-${name}`}>{`${name}:${color}:${size}`}</Text>
  );
});

function mockNamedScreen(path: string, exportName: string) {
  jest.doMock(path, () => {
    const { Text } = require("react-native");
    return {
      [exportName]: (props: any) => (
        <Text>{`${exportName}:${String(props?.route?.name ?? "")}`}</Text>
      ),
    };
  });
}

function mockDefaultScreen(path: string, name: string) {
  jest.doMock(path, () => {
    const { Text } = require("react-native");
    return {
      __esModule: true,
      default: () => <Text>{name}</Text>,
    };
  });
}

[
  ["../src/screens/auth/SplashScreen", "SplashScreen"],
  ["../src/screens/auth/LoginScreen", "LoginScreen"],
  ["../src/screens/auth/OtpScreen", "OtpScreen"],
  ["../src/screens/home/HomeScreen", "HomeScreen"],
  ["../src/screens/booking/BookingHistoryScreen", "BookingHistoryScreen"],
  ["../src/screens/profile/ProfileScreen", "ProfileScreen"],
  ["../src/screens/profile/LegalContentScreen", "LegalContentScreen"],
  ["../src/screens/notifications/NotificationsScreen", "NotificationsScreen"],
  ["../src/screens/cart/CartCrudScreen", "CartCrudScreen"],
  ["../src/screens/cart/CouponScreen", "CouponScreen"],
  ["../src/screens/profile/AddressScreen", "AddressScreen"],
  ["../src/screens/home/FavoritesScreen", "FavoritesScreen"],
  ["../src/screens/profile/ReferralScreen", "ReferralScreen"],
  ["../src/screens/booking/InstantBookingStatusScreen", "InstantBookingStatusScreen"],
  ["../src/screens/booking/InstantBookingWizardScreen", "InstantBookingWizardScreen"],
  ["../src/screens/booking/ScheduleBookingWizardScreen", "ScheduleBookingWizardScreen"],
  ["../src/screens/booking/RecurringBookingScreen", "RecurringBookingScreen"],
  ["../src/screens/booking/ScheduledBookingStatusScreen", "ScheduledBookingStatusScreen"],
  ["../src/screens/booking/ScheduledRescheduleScreen", "ScheduledRescheduleScreen"],
  ["../src/screens/booking/LiveTrackingScreen", "LiveTrackingScreen"],
  ["../src/screens/booking/BookingProcessingScreen", "BookingProcessingScreen"],
  ["../src/screens/booking/ServiceStartedScreen", "ServiceStartedScreen"],
  ["../src/screens/booking/ServiceInProgressScreen", "ServiceInProgressScreen"],
  ["../src/screens/booking/ServiceCompletedScreen", "ServiceCompletedScreen"],
  ["../src/screens/booking/PartnerArrivedScreen", "PartnerArrivedScreen"],
  ["../src/screens/booking/BookingStatusFallbackScreen", "BookingStatusFallbackScreen"],
  ["../src/screens/booking/SubscriptionPlanScreen", "SubscriptionPlanScreen"],
  ["../src/screens/booking/RatePartnerScreen", "RatePartnerScreen"],
  ["../src/screens/booking/BookingPaymentConfirmScreen", "BookingPaymentConfirmScreen"],
  ["../src/screens/booking/BookingDetailScreen", "BookingDetailScreen"],
  ["../src/screens/booking/SubscriptionConfirmedScreen", "SubscriptionConfirmedScreen"],
  ["../src/screens/payment/PaymentScreen", "PaymentScreen"],
  ["../src/screens/payment/PaymentStatusScreen", "PaymentStatusScreen"],
  ["../src/screens/home/ReviewScreen", "ReviewScreen"],
  ["../src/screens/support/SupportTicketsScreen", "SupportTicketsScreen"],
  ["../src/screens/support/FaqScreen", "FaqScreen"],
  ["../src/screens/service/ServiceListScreen", "ServiceListScreen"],
  ["../src/screens/service/ServiceDetailScreen", "ServiceDetailScreen"],
  ["../src/screens/booking-flow/BookingServiceScreen", "BookingServiceScreen"],
  ["../src/screens/booking-flow/BookingSlotScreen", "BookingSlotScreen"],
  ["../src/screens/booking-flow/BookingConfirmScreen", "BookingConfirmScreen"],
  ["../src/screens/location/DetectingLocationScreen", "DetectingLocationScreen"],
  ["../src/screens/location/LocationSearchScreen", "LocationSearchScreen"],
  ["../src/screens/location/AddAddressDetailsScreen", "AddAddressDetailsScreen"],
  ["../src/screens/location/MapAddressPickerScreen", "MapAddressPickerScreen"],
  ["../src/screens/location/ComingSoonScreen", "ComingSoonScreen"],
].forEach(([path, name]) => mockNamedScreen(path, name));

mockDefaultScreen("../src/screens/EditProfileScreen", "EditProfileScreen");

const { AppNavigator } = require("../src/navigation/AppNavigator") as typeof import("../src/navigation/AppNavigator");

function screen(
  registrations: ScreenRegistration[],
  name: string,
): ScreenRegistration {
  const registration = registrations.find(item => item.name === name);
  if (!registration) throw new Error(`Missing route registration: ${name}`);
  return registration;
}

async function renderNavigator(props: Record<string, unknown> = {}) {
  return render(<AppNavigator {...props} />);
}

describe("AppNavigator", () => {
  beforeEach(async () => {
    await cleanup();
    jest.clearAllMocks();
    mockRootScreens.length = 0;
    mockAuthScreens.length = 0;
    mockTabScreens.length = 0;
    mockNavigatorProps.root.length = 0;
    mockNavigatorProps.auth.length = 0;
    mockNavigatorProps.tabs.length = 0;
    mockAuthState = { token: null, hydrated: false };
    mockLocationState = {};
  });

  afterEach(async () => {
    await cleanup();
  });

  it("renders splash while authentication is hydrating and starts location hydration", async () => {
    const view = await renderNavigator();

    expect(view.getByText("SplashScreen:")).toBeTruthy();
    expect(view.queryByTestId("navigation-container")).toBeNull();
    expect(mockHydrateLocationCacheThunk).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith({ type: "location/hydrate" });
  });

  it("renders unauthenticated route graph with Auth as the initial route", async () => {
    mockAuthState = { token: null, hydrated: true };

    const view = await renderNavigator();

    expect(view.getByTestId("navigation-container")).toBeTruthy();
    expect(mockNavigatorProps.root.at(-1).initialRouteName).toBe("Auth");
    expect(mockRootScreens.map(item => item.name)).toContain("Auth");
    expect(mockRootScreens.map(item => item.name)).not.toContain("Main");

    const AuthComponent = screen(mockRootScreens, "Auth").component!;
    await render(<AuthComponent />);

    expect(mockAuthScreens.map(item => item.name)).toEqual(["Login", "Otp"]);
    expect(screen(mockAuthScreens, "Login").options).toEqual({
      headerShown: false,
    });
    expect(screen(mockAuthScreens, "Otp").options).toEqual({
      headerShown: false,
    });
  });

  it.each([
    [{ currentAddress: { id: " current-1 " } }, "Main"],
    [{ selectedAddress: { id: 22 } }, "Main"],
    [{ savedAddresses: [{ id: "saved-1" }] }, "Main"],
    [{ savedAddresses: "invalid" }, "DetectingLocationGate"],
    [{ currentAddress: { id: " " }, selectedAddress: { id: "" } }, "DetectingLocationGate"],
    [{}, "DetectingLocationGate"],
  ])("selects authenticated initial route from location state", async (location, expected) => {
    mockAuthState = { token: "token", hydrated: true };
    mockLocationState = location;

    await renderNavigator();

    expect(mockNavigatorProps.root.at(-1).initialRouteName).toBe(expected);
    expect(mockRootScreens.map(item => item.name)).toEqual(
      expect.arrayContaining(["DetectingLocationGate", "Main"]),
    );
    expect(mockRootScreens.map(item => item.name)).not.toContain("Auth");
  });

  it("passes navigation ref and light/dark themes to NavigationContainer", async () => {
    mockAuthState = { token: null, hydrated: true };
    const navigationRef = React.createRef<any>();

    const light = await renderNavigator({ navigationRef });
    expect(light.getByTestId("navigation-container").props.accessibilityLabel).toBe(
      "default-theme",
    );
    await light.unmount();

    const dark = await renderNavigator({ darkMode: true, navigationRef });
    expect(dark.getByTestId("navigation-container").props.accessibilityLabel).toBe(
      "dark-theme",
    );
  });

  it("registers the complete shared route graph and important screen options", async () => {
    mockAuthState = { token: "token", hydrated: true };
    mockLocationState = { savedAddresses: [{ id: "1" }] };

    await renderNavigator();

    const names = mockRootScreens.map(item => item.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "Main",
        "Notifications",
        "CartCrud",
        "Payment",
        "LiveTracking",
        "ServiceDetail",
        "LocationSearch",
        "EditProfile",
        "BookingConfirm",
      ]),
    );
    expect(screen(mockRootScreens, "ServiceDetail").options).toEqual(
      expect.objectContaining({
        presentation: "transparentModal",
        animation: "slide_from_bottom",
      }),
    );
    expect(screen(mockRootScreens, "Payment").options).toEqual({
      headerShown: true,
      title: "Payment",
    });
    expect(screen(mockRootScreens, "LiveTracking").options).toEqual({
      headerShown: true,
      title: "Live Tracking",
    });
  });

  it("configures all tabs, icons and Home tab reset navigation", async () => {
    mockAuthState = { token: "token", hydrated: true };
    mockLocationState = { currentAddress: { id: "address" } };
    await renderNavigator();

    const MainComponent = screen(mockRootScreens, "Main").component!;
    await render(<MainComponent />);

    expect(mockNavigatorProps.tabs.at(-1).backBehavior).toBe("history");
    expect(mockTabScreens.map(item => item.name)).toEqual([
      "Home",
      "Bookings",
      "Profile",
    ]);

    const navigate = jest.fn();
    const listeners = screen(mockTabScreens, "Home").listeners({
      navigation: { navigate },
    });
    listeners.tabPress();
    expect(navigate).toHaveBeenCalledWith("Home");

    const homeOptions = screen(mockTabScreens, "Home").options;
    const homeFocused = await render(
      homeOptions.tabBarIcon({ color: "gold", focused: true, size: 24 }),
    );
    expect(homeFocused.getByLabelText("icon-home-variant")).toBeTruthy();
    await homeFocused.unmount();
    const homeIdle = await render(
      homeOptions.tabBarIcon({ color: "gray", focused: false, size: 20 }),
    );
    expect(homeIdle.getByLabelText("icon-home-variant-outline")).toBeTruthy();
    await homeIdle.unmount();

    const bookingIcon = screen(mockTabScreens, "Bookings").options.tabBarIcon;
    const profileIcon = screen(mockTabScreens, "Profile").options.tabBarIcon;
    const icons = await render(
      <>
        {bookingIcon({ color: "x", focused: true, size: 18 })}
        {bookingIcon({ color: "x", focused: false, size: 18 })}
        {profileIcon({ color: "x", focused: true, size: 18 })}
        {profileIcon({ color: "x", focused: false, size: 18 })}
      </>,
    );
    expect(icons.getByLabelText("icon-clipboard-list")).toBeTruthy();
    expect(icons.getByLabelText("icon-clipboard-list-outline")).toBeTruthy();
    expect(icons.getByLabelText("icon-account")).toBeTruthy();
    expect(icons.getByLabelText("icon-account-outline")).toBeTruthy();
  });

  it.each([
    [undefined, true],
    [{ notificationSearchOpen: false }, true],
    [{ notificationSearchOpen: true }, false],
  ])("toggles notification search route parameter", async (params, expected) => {
    mockAuthState = { token: null, hydrated: true };
    await renderNavigator();

    const setParams = jest.fn();
    const options = screen(mockRootScreens, "Notifications").options({
      navigation: { setParams },
      route: { params },
    });
    const header = await render(options.headerRight());

    await fireEvent.press(
      header.getByLabelText("Toggle notification search"),
    );

    expect(setParams).toHaveBeenCalledWith({
      notificationSearchOpen: expected,
    });
    expect(
      header.getByLabelText(
        expected ? "icon-magnify" : "icon-close",
      ),
    ).toBeTruthy();
  });

  it("renders Cart header callbacks and handles back navigation", async () => {
    mockAuthState = { token: null, hydrated: true };
    await renderNavigator();

    const goBack = jest.fn();
    const options = screen(mockRootScreens, "CartCrud").options({
      navigation: { goBack },
    });
    const title = await render(options.headerTitle());
    expect(title.getByText("My Cart")).toBeTruthy();
    await title.unmount();

    const back = await render(options.headerLeft());
    await fireEvent.press(back.getByLabelText("Go back"));
    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it.each([
    [true, "back"],
    [false, "main"],
    [undefined, "main"],
  ])("uses safe Address back behavior when canGoBack is %p", async (canGoBack, expected) => {
    mockAuthState = { token: null, hydrated: true };
    await renderNavigator();

    const goBack = jest.fn();
    const navigate = jest.fn();
    const navigation =
      canGoBack === undefined
        ? { goBack, navigate }
        : { canGoBack: () => canGoBack, goBack, navigate };
    const options = screen(mockRootScreens, "Address").options({ navigation });
    const title = await render(options.headerTitle());
    expect(title.getByText("Address")).toBeTruthy();
    await title.unmount();

    const back = await render(options.headerLeft());
    await fireEvent.press(back.getByLabelText("Go back"));

    if (expected === "back") {
      expect(goBack).toHaveBeenCalledTimes(1);
      expect(navigate).not.toHaveBeenCalled();
    } else {
      expect(goBack).not.toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith("Main");
    }
  });

  it("re-renders route gate after Redux auth and location state changes", async () => {
    mockAuthState = { token: null, hydrated: true };
    const view = await renderNavigator();
    expect(mockNavigatorProps.root.at(-1).initialRouteName).toBe("Auth");

    mockRootScreens.length = 0;
    mockAuthState = { token: "new-token", hydrated: true };
    mockLocationState = { selectedAddress: { id: "selected" } };
    await view.rerender(<AppNavigator />);

    expect(mockNavigatorProps.root.at(-1).initialRouteName).toBe("Main");
    expect(mockRootScreens.map(item => item.name)).toContain("Main");
  });
});
