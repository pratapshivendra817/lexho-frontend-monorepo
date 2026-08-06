import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Pressable, Text } from "react-native";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { SplashScreen } from "../screens/auth/SplashScreen";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { OtpScreen } from "../screens/auth/OtpScreen";
import { HomeScreen } from "../screens/home/HomeScreen";
import { BookingHistoryScreen } from "../screens/booking/BookingHistoryScreen";
import { ProfileScreen } from "../screens/profile/ProfileScreen";
import { LegalContentScreen } from "../screens/profile/LegalContentScreen";
import EditProfileScreen from "../screens/EditProfileScreen";
import { NotificationsScreen } from "../screens/notifications/NotificationsScreen";
import { CartCrudScreen } from "../screens/cart/CartCrudScreen";
import { CouponScreen } from "../screens/cart/CouponScreen";
import { AddressScreen } from "../screens/profile/AddressScreen";
import { FavoritesScreen } from "../screens/home/FavoritesScreen";
import { ReferralScreen } from "../screens/profile/ReferralScreen";
import { InstantBookingStatusScreen } from "../screens/booking/InstantBookingStatusScreen";
import { InstantBookingWizardScreen } from "../screens/booking/InstantBookingWizardScreen";
import { ScheduleBookingWizardScreen } from "../screens/booking/ScheduleBookingWizardScreen";
import { RecurringBookingScreen } from "../screens/booking/RecurringBookingScreen";
import { ScheduledBookingStatusScreen } from "../screens/booking/ScheduledBookingStatusScreen";
import { ScheduledRescheduleScreen } from "../screens/booking/ScheduledRescheduleScreen";
import { LiveTrackingScreen } from "../screens/booking/LiveTrackingScreen";
import { BookingProcessingScreen } from "../screens/booking/BookingProcessingScreen";
import { ServiceStartedScreen } from "../screens/booking/ServiceStartedScreen";
import { ServiceInProgressScreen } from "../screens/booking/ServiceInProgressScreen";
import { ServiceCompletedScreen } from "../screens/booking/ServiceCompletedScreen";
import { PartnerArrivedScreen } from "../screens/booking/PartnerArrivedScreen";
import { BookingStatusFallbackScreen } from "../screens/booking/BookingStatusFallbackScreen";
import { SubscriptionPlanScreen } from "../screens/booking/SubscriptionPlanScreen";
import { RatePartnerScreen } from "../screens/booking/RatePartnerScreen";
import { BookingPaymentConfirmScreen } from "../screens/booking/BookingPaymentConfirmScreen";
import { BookingDetailScreen } from "../screens/booking/BookingDetailScreen";
import { SubscriptionConfirmedScreen } from "../screens/booking/SubscriptionConfirmedScreen";
import { PaymentScreen } from "../screens/payment/PaymentScreen";
import { PaymentStatusScreen } from "../screens/payment/PaymentStatusScreen";
import { ReviewScreen } from "../screens/home/ReviewScreen";
import { SupportTicketsScreen } from "../screens/support/SupportTicketsScreen";
import { FaqScreen } from "../screens/support/FaqScreen";
import { ServiceListScreen } from "../screens/service/ServiceListScreen";
import { ServiceDetailScreen } from "../screens/service/ServiceDetailScreen";
import { BookingServiceScreen } from "../screens/booking-flow/BookingServiceScreen";
import { BookingSlotScreen } from "../screens/booking-flow/BookingSlotScreen";
import { BookingConfirmScreen } from "../screens/booking-flow/BookingConfirmScreen";
import { DetectingLocationScreen } from "../screens/location/DetectingLocationScreen";
import { LocationSearchScreen } from "../screens/location/LocationSearchScreen";
import { AddAddressDetailsScreen } from "../screens/location/AddAddressDetailsScreen";
import { MapAddressPickerScreen } from "../screens/location/MapAddressPickerScreen";
import { ComingSoonScreen } from "../screens/location/ComingSoonScreen";
import { hydrateLocationCacheThunk } from "../redux/locationSlice";
import { ActiveCallScreen, IncomingCallScreen, MissedCallScreen, OutgoingCallScreen } from "../modules/calling";


import { COLORS } from '../theme/colors';
import { radii, shadows, spacing } from "../constants/theme";

type RecurringCartPayload = {
  serviceName?: string;
  serviceId?: number;
  subscriptionServiceType?: "CLEANING" | "COOK";
  frequencyDays?: string[];
  frequencyLabel?: string;
  startDate?: string;
  endDate?: string;
  visits?: number;
  durationHours?: number;
  durationLabel?: string;
  familySize?: string;
  familySizeLabel?: string;
  timeSlot?: string;
  perVisitPrice?: number;
  price?: number;
};

type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Notifications: { notificationSearchOpen?: boolean } | undefined;
  CartCrud:
    | {
        bookingMode?: "SCHEDULED" | "SUBSCRIPTION";
        scheduleMode?: "FIXED" | "HOURLY";
        serviceId?: number;
        categoryName?: string;
        durationHours?: number;
        durationLabel?: string;
        recurringBooking?: RecurringCartPayload;
        cookFamilySizeId?: number;
        cookFamilySize?: string;
        cookFamilySizeLabel?: string;
      }
    | undefined;
  Coupon: undefined;
  Address: undefined;
  Favorites: undefined;
  Referral: undefined;
  InstantBookingStatus: { bookingId?: string } | undefined;
  InstantBookingWizard: undefined;
  ScheduleBookingWizard: undefined;
  RecurringBooking: { serviceId?: number; hourlyRate?: number; pricePerHour?: number; price?: number } | undefined;
  ScheduledBookingStatus: { bookingId?: string } | undefined;
  ScheduledReschedule: { bookingId?: string; currentScheduledAt?: string } | undefined;
  LiveTracking: { bookingId?: string } | undefined;
  Payment:
    | {
        bookingId?: string;
        cartId?: number | null;
        amount?: number;
        currency?: string;
        bookingMode?: "INSTANT" | "SCHEDULED" | "SUBSCRIPTION";
        postPaymentRoute?: "ScheduledBookingStatus" | "InstantBookingStatus" | "PaymentStatus" | "BookingPaymentConfirm" | "SubscriptionConfirmed";
      }
    | undefined;
  PaymentStatus: { bookingId?: string } | undefined;
  BookingPaymentConfirm: { bookingId?: string; bookingMode?: "INSTANT" | "SCHEDULED" | "SUBSCRIPTION" } | undefined;
  SubscriptionConfirmed: { bookingId?: string; subscriptionId?: string } | undefined;
  BookingProcessing: { bookingId?: string } | undefined;
  PartnerArrived: { bookingId?: string } | undefined;
  ServiceStarted: { bookingId?: string } | undefined;
  ServiceInProgress: { bookingId?: string } | undefined;
  ServiceCompleted: { bookingId?: string } | undefined;
  BookingStatusFallback: { bookingId?: string } | undefined;
  SubscriptionPlan: { subscriptionId?: string; bookingId?: string } | undefined;
  RatePartner: { bookingId?: string } | undefined;
  Reviews: undefined;
  Support: undefined;
  AboutUs: { content?: string } | undefined;
  TermsOfService: { content?: string } | undefined;
  PrivacyPolicy: { content?: string } | undefined;
  Faq: undefined;
  BookingDetail: { bookingId: string };
  ServiceList: { categoryId: string | number; categoryName?: string };
  ServiceDetail: {
    serviceId: string;
    serviceName?: string;
    servicePriceLabel?: string;
    serviceImageUrl?: string;
    source?: string;
    bookingMode?: string;
    scheduleMode?: string;
    categoryId?: string;
    categoryName?: string;
    cookFamilySizeId?: number;
    cookFamilySize?: string;
    cookFamilySizeLabel?: string;
    requiresCookFamilySize?: boolean;
    showCookCoverage?: boolean;
    showCleaningCoverage?: boolean;
    durationHours?: number;
    durationLabel?: string;
  };
  DetectingLocationGate: undefined;
  DetectingLocation: undefined;
  LocationSearch: undefined;
  AddAddressDetails: { address?: any } | undefined;
  MapAddressPicker: { address?: any; initial?: { latitude?: number; longitude?: number } } | undefined;
  ComingSoon: { addressLine?: string; pincode?: string } | undefined;
  EditProfile: undefined;
  BookingService: undefined;
  BookingSlot: { serviceId: number };
  BookingConfirm: { serviceId: number; scheduledTime: string };
  IncomingCall: { callId: string; bookingId: number };
  OutgoingCall: { bookingId: number; partnerName?: string };
  ActiveCall: undefined;
  MissedCall: undefined;
};
type AuthStackParamList = { Login: undefined; Otp: { mobile: string } };
type MainTabsParamList = { Home: undefined; Bookings: undefined; Profile: undefined };

const Root = createNativeStackNavigator<RootStackParamList>();
const Auth = createNativeStackNavigator<AuthStackParamList>();
const Tabs = createBottomTabNavigator<MainTabsParamList>();

function HomeTabIcon({ color, focused, size }: { color: string; focused: boolean; size: number }) {
  return <MaterialCommunityIcon color={color} name={focused ? "home-variant" : "home-variant-outline"} size={size} />;
}

function BookingsTabIcon({ color, focused, size }: { color: string; focused: boolean; size: number }) {
  return <MaterialCommunityIcon color={color} name={focused ? "clipboard-list" : "clipboard-list-outline"} size={size} />;
}

function ProfileTabIcon({ color, focused, size }: { color: string; focused: boolean; size: number }) {
  return <MaterialCommunityIcon color={color} name={focused ? "account" : "account-outline"} size={size} />;
}

function AuthNavigator() {
  return (
    <Auth.Navigator>
      <Auth.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Auth.Screen name="Otp" component={OtpScreen} options={{ headerShown: false }} />
    </Auth.Navigator>
  );
}

function MainTabs() {
  return (
    <Tabs.Navigator
      backBehavior="history"
      screenOptions={{
        tabBarStyle: {
          backgroundColor: COLORS.navyDark,
          borderTopColor: "transparent",
          borderTopWidth: 0,
          height: 76,
          paddingTop: spacing.sm,
          paddingBottom: spacing.md,
          paddingHorizontal: spacing.sm,
          ...shadows.lg,
        },
        tabBarActiveTintColor: COLORS.goldSoft,
        tabBarInactiveTintColor: COLORS.slate400,
        tabBarLabelStyle: { fontWeight: "700", fontSize: 11, textAlign: "center", letterSpacing: 0.2 },
        tabBarIconStyle: { marginTop: 2 },
        tabBarItemStyle: {
          borderRadius: radii.md,
          marginHorizontal: spacing.sm - 1,
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 3,
        },
        tabBarActiveBackgroundColor: "rgba(217,164,65,0.22)",
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="Home"
        options={{
          tabBarIcon: HomeTabIcon,
          tabBarLabel: "Lexho",
          tabBarLabelStyle: { fontWeight: "700", fontSize: 10, textAlign: "center" },
        }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            navigation.navigate("Home");
          },
        })}
      >
        {(props) => <HomeScreen {...props} />}
      </Tabs.Screen>
      <Tabs.Screen name="Bookings" component={BookingHistoryScreen} options={{ tabBarIcon: BookingsTabIcon }} />
      <Tabs.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: ProfileTabIcon }} />
    </Tabs.Navigator>
  );
}

export function AppNavigator({
  darkMode = false,
  navigationRef,
  onReady,
  onStateChange,
}: {
  darkMode?: boolean;
  navigationRef?: any;
  onReady?: () => void;
  onStateChange?: (state: any) => void;
}) {
  const dispatch = useAppDispatch();
  const { token, hydrated } = useAppSelector((s) => s.auth);
  const locationState = useAppSelector((s) => s.location as any);
  const currentAddressIdRaw = locationState?.currentAddress?.id as string | number | undefined;
  const selectedAddressIdRaw = locationState?.selectedAddress?.id as string | number | undefined;
  const savedAddresses = Array.isArray(locationState?.savedAddresses) ? locationState.savedAddresses : [];
  const hasCurrentAddress =
    String(currentAddressIdRaw ?? "").trim().length > 0 ||
    String(selectedAddressIdRaw ?? "").trim().length > 0 ||
    savedAddresses.length > 0;

  useEffect(() => {
    void dispatch(hydrateLocationCacheThunk());
  }, [dispatch]);

  if (!hydrated) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={darkMode ? DarkTheme : DefaultTheme}
      onReady={onReady}
      onStateChange={onStateChange}
    >
      <Root.Navigator
        initialRouteName={!token ? "Auth" : hasCurrentAddress ? "Main" : "DetectingLocationGate"}
        screenOptions={{
          headerShown: false,
          animation: "fade",
          contentStyle: { backgroundColor: COLORS.navyDark },
          headerStyle: { backgroundColor: COLORS.navyDark },
          headerTintColor: COLORS.white,
          headerTitleStyle: { color: COLORS.white, fontWeight: "800" },
        }}
      >
        {!token ? (
          <Root.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <>
            <Root.Screen name="DetectingLocationGate" component={DetectingLocationScreen} options={{ headerShown: false }} />
            <Root.Screen name="Main" component={MainTabs} />
          </>
        )}
        <Root.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={({ navigation, route }: any) => ({
            headerShown: true,
            title: "Notification",
            headerRight: () => (
              <Pressable
                onPress={() =>
                  navigation.setParams({
                    notificationSearchOpen: !route?.params?.notificationSearchOpen,
                  })
                }
                accessibilityRole="button"
                accessibilityLabel="Toggle notification search"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: COLORS.goldSoft,
                  backgroundColor: "rgba(217,164,65,0.12)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 2,
                }}
              >
                <MaterialCommunityIcon
                  name={route?.params?.notificationSearchOpen ? "close" : "magnify"}
                  size={17}
                  color={COLORS.goldSoft}
                />
              </Pressable>
            ),
          })}
        />
        <Root.Screen
          name="CartCrud"
          component={CartCrudScreen}
          options={({ navigation }) => ({
            headerShown: true,
            title: "",
            headerBackTitleVisible: false,
            headerTitleAlign: "left",
            headerLeftContainerStyle: {
              paddingLeft: 4,
              paddingRight: 8,
            },
            headerTitle: () => (
              <Text style={{ color: COLORS.white, fontWeight: "800", fontSize: 18, marginLeft: 14 }}>
                My Cart
              </Text>
            ),
            headerLeft: () => (
              <Pressable
                onPress={() => navigation.goBack()}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  borderWidth: 1.2,
                  borderColor: COLORS.goldSoft,
                  backgroundColor: "rgba(217,164,65,0.18)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginLeft: 2,
                }}
              >
                <MaterialCommunityIcon name="arrow-left" size={18} color={COLORS.goldSoft} />
              </Pressable>
            ),
          })}
        />
        <Root.Screen name="Coupon" component={CouponScreen} options={{ headerShown: true, title: "Coupons" }} />
        <Root.Screen
          name="Address"
          component={AddressScreen}
          options={({ navigation }) => ({
            headerShown: true,
            title: "",
            headerLeftContainerStyle: { paddingRight: 8 },
            headerTitle: () => (
              <Text style={{ color: COLORS.white, fontWeight: "800", fontSize: 20, marginLeft: 8 }}>
                Address
              </Text>
            ),
            headerLeft: () => (
              <Pressable
                onPress={() => {
                  if (typeof navigation?.canGoBack === "function" && navigation.canGoBack()) {
                    navigation.goBack();
                  } else {
                    navigation.navigate("Main");
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  borderWidth: 1.2,
                  borderColor: COLORS.goldSoft,
                  backgroundColor: "rgba(217,164,65,0.18)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginLeft: 2,
                }}
              >
                <MaterialCommunityIcon name="arrow-left" size={18} color={COLORS.goldSoft} />
              </Pressable>
            ),
          })}
        />
        <Root.Screen name="Favorites" component={FavoritesScreen} options={{ headerShown: true, title: "Favorites" }} />
        <Root.Screen name="Referral" component={ReferralScreen} options={{ headerShown: true, title: "Referral" }} />
        <Root.Screen name="InstantBookingWizard" component={InstantBookingWizardScreen} options={{ headerShown: false }} />
        <Root.Screen name="ScheduleBookingWizard" component={ScheduleBookingWizardScreen} options={{ headerShown: false }} />
        <Root.Screen name="RecurringBooking" component={RecurringBookingScreen} options={{ headerShown: false }} />
        <Root.Screen name="InstantBookingStatus" component={InstantBookingStatusScreen} options={{ headerShown: true, title: "Instant Booking" }} />
        <Root.Screen name="ScheduledBookingStatus" component={ScheduledBookingStatusScreen} options={{ headerShown: true, title: "Scheduled Booking" }} />
        <Root.Screen name="ScheduledReschedule" component={ScheduledRescheduleScreen} options={{ headerShown: true, title: "Reschedule" }} />
        <Root.Screen name="LiveTracking" component={LiveTrackingScreen} options={{ headerShown: true, title: "Live Tracking" }} />
        <Root.Screen name="Payment" component={PaymentScreen} options={{ headerShown: true, title: "Payment" }} />
        <Root.Screen name="PaymentStatus" component={PaymentStatusScreen} options={{ headerShown: true, title: "Payment Status" }} />
        <Root.Screen name="BookingPaymentConfirm" component={BookingPaymentConfirmScreen} options={{ headerShown: true, title: "Booking Confirmed" }} />
        <Root.Screen name="SubscriptionConfirmed" component={SubscriptionConfirmedScreen} options={{ headerShown: true, title: "Subscription Confirmed" }} />
        <Root.Screen name="BookingProcessing" component={BookingProcessingScreen} options={{ headerShown: true, title: "Processing" }} />
        <Root.Screen name="PartnerArrived" component={PartnerArrivedScreen} options={{ headerShown: true, title: "Partner Arrived" }} />
        <Root.Screen name="ServiceStarted" component={ServiceStartedScreen} options={{ headerShown: true, title: "Service Started" }} />
        <Root.Screen name="ServiceInProgress" component={ServiceInProgressScreen} options={{ headerShown: true, title: "Service In Progress" }} />
        <Root.Screen name="ServiceCompleted" component={ServiceCompletedScreen} options={{ headerShown: true, title: "Service Completed" }} />
        <Root.Screen name="BookingStatusFallback" component={BookingStatusFallbackScreen} options={{ headerShown: true, title: "Booking Status" }} />
        <Root.Screen name="SubscriptionPlan" component={SubscriptionPlanScreen} options={{ headerShown: true, title: "Subscription Plan" }} />
        <Root.Screen name="RatePartner" component={RatePartnerScreen} options={{ headerShown: true, title: "Rate Partner" }} />
        <Root.Screen name="Reviews" component={ReviewScreen} options={{ headerShown: true, title: "Reviews" }} />
        <Root.Screen name="Support" component={SupportTicketsScreen} options={{ headerShown: true, title: "Help & Support" }} />
        <Root.Screen name="AboutUs" component={LegalContentScreen} options={{ headerShown: true, title: "About Us" }} />
        <Root.Screen name="TermsOfService" component={LegalContentScreen} options={{ headerShown: true, title: "Terms of Service" }} />
        <Root.Screen name="PrivacyPolicy" component={LegalContentScreen} options={{ headerShown: true, title: "Privacy Policy" }} />
        <Root.Screen name="Faq" component={FaqScreen} options={{ headerShown: true, title: "FAQs" }} />
        <Root.Screen name="BookingDetail" component={BookingDetailScreen} options={{ headerShown: true, title: "Booking Detail" }} />
        <Root.Screen
          name="ServiceList"
          component={ServiceListScreen}
          options={{
            headerShown: false,
          }}
        />
        <Root.Screen
          name="ServiceDetail"
          component={ServiceDetailScreen}
          options={{
            headerShown: false,
            presentation: "transparentModal",
            animation: "slide_from_bottom",
            contentStyle: { backgroundColor: "transparent" },
          }}
        />
        <Root.Screen name="DetectingLocation" component={DetectingLocationScreen} options={{ headerShown: false }} />
        <Root.Screen name="LocationSearch" component={LocationSearchScreen} options={{ headerShown: true, title: "Select Location" }} />
        <Root.Screen
          name="AddAddressDetails"
          component={AddAddressDetailsScreen}
          options={{
            headerShown: true,
            title: "Add Address Details",
            headerStyle: { backgroundColor: COLORS.navyDark },
            headerTintColor: COLORS.white,
            headerTitleStyle: { color: COLORS.white, fontWeight: "800" },
          }}
        />
        <Root.Screen name="MapAddressPicker" component={MapAddressPickerScreen} options={{ headerShown: true, title: "Pick on Map" }} />
        <Root.Screen name="ComingSoon" component={ComingSoonScreen} options={{ headerShown: false }} />
        <Root.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false }} />
        <Root.Screen name="BookingService" component={BookingServiceScreen} options={{ headerShown: true, title: "Book Service" }} />
        <Root.Screen name="BookingSlot" component={BookingSlotScreen} options={{ headerShown: true, title: "Select Slot" }} />
        <Root.Screen name="BookingConfirm" component={BookingConfirmScreen} options={{ headerShown: true, title: "Confirm Booking" }} />
        <Root.Screen name="IncomingCall" component={IncomingCallScreen} options={{ headerShown: false, gestureEnabled: false }} />
        <Root.Screen name="OutgoingCall" component={OutgoingCallScreen} options={{ headerShown: false, gestureEnabled: false }} />
        <Root.Screen name="ActiveCall" component={ActiveCallScreen} options={{ headerShown: false, gestureEnabled: false }} />
        <Root.Screen name="MissedCall" component={MissedCallScreen} options={{ headerShown: false, gestureEnabled: false }} />
      </Root.Navigator>
    </NavigationContainer>
  );
}
