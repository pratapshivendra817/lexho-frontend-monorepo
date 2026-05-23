import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { SplashScreen } from "../screens/auth/SplashScreen";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { OtpScreen } from "../screens/auth/OtpScreen";
import { HomeScreen } from "../screens/home/HomeScreen";
import { BookingHistoryScreen } from "../screens/booking/BookingHistoryScreen";
import { ProfileScreen } from "../screens/profile/ProfileScreen";
import EditProfileScreen from "../screens/EditProfileScreen";
import { NotificationsScreen } from "../screens/notifications/NotificationsScreen";
import { CartCrudScreen } from "../screens/cart/CartCrudScreen";
import { CouponScreen } from "../screens/cart/CouponScreen";
import { AddressScreen } from "../screens/profile/AddressScreen";
import { FavoritesScreen } from "../screens/home/FavoritesScreen";
import { ReferralScreen } from "../screens/profile/ReferralScreen";
import { SubscriptionScreen } from "../screens/profile/SubscriptionScreen";
import { InstantBookingStatusScreen } from "../screens/booking/InstantBookingStatusScreen";
import { ScheduledBookingStatusScreen } from "../screens/booking/ScheduledBookingStatusScreen";
import { ScheduledRescheduleScreen } from "../screens/booking/ScheduledRescheduleScreen";
import { LiveTrackingScreen } from "../screens/booking/LiveTrackingScreen";
import { BookingProcessingScreen } from "../screens/booking/BookingProcessingScreen";
import { ServiceStartedScreen } from "../screens/booking/ServiceStartedScreen";
import { ServiceCompletedScreen } from "../screens/booking/ServiceCompletedScreen";
import { RatePartnerScreen } from "../screens/booking/RatePartnerScreen";
import { BookingPaymentConfirmScreen } from "../screens/booking/BookingPaymentConfirmScreen";
import { BookingDetailScreen } from "../screens/booking/BookingDetailScreen";
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
import { ENABLE_LIVE_TRACKING } from "../constants/env";

type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Notifications: undefined;
  CartCrud: undefined;
  Coupon: undefined;
  Address: undefined;
  Favorites: undefined;
  Referral: undefined;
  Subscriptions: undefined;
  InstantBookingStatus: { bookingId?: string } | undefined;
  ScheduledBookingStatus: { bookingId?: string } | undefined;
  ScheduledReschedule: { bookingId?: string; currentScheduledAt?: string } | undefined;
  LiveTracking: { bookingId?: string } | undefined;
  Payment: { bookingId?: string; cartId?: number | null; amount?: number; currency?: string; postPaymentRoute?: "ScheduledBookingStatus" | "InstantBookingStatus" | "PaymentStatus" | "BookingPaymentConfirm" } | undefined;
  PaymentStatus: { bookingId?: string } | undefined;
  BookingPaymentConfirm: { bookingId?: string } | undefined;
  BookingProcessing: { bookingId?: string } | undefined;
  ServiceStarted: { bookingId?: string } | undefined;
  ServiceCompleted: { bookingId?: string } | undefined;
  RatePartner: { bookingId?: string } | undefined;
  Reviews: undefined;
  Support: undefined;
  Faq: undefined;
  BookingDetail: { bookingId: string };
  ServiceList: { categoryId: string | number; categoryName?: string };
  ServiceDetail: { serviceId: string };
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
      <Auth.Screen name="Otp" component={OtpScreen} options={{ title: "Verify OTP" }} />
    </Auth.Navigator>
  );
}

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: "#0A1424",
          borderTopColor: "#1F2A44",
          borderTopWidth: 0.6,
          height: 70,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: "#7DD3FC",
        tabBarInactiveTintColor: "#93A4BE",
        tabBarLabelStyle: { fontWeight: "700", fontSize: 11, textAlign: "center" },
        tabBarIconStyle: { marginTop: 3 },
        tabBarItemStyle: {
          borderRadius: 14,
          marginHorizontal: 7,
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 2,
        },
        tabBarActiveBackgroundColor: "rgba(125,211,252,0.14)",
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

export function AppNavigator({ darkMode = false, navigationRef }: { darkMode?: boolean; navigationRef?: any }) {
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
    <NavigationContainer ref={navigationRef} theme={darkMode ? DarkTheme : DefaultTheme}>
      <Root.Navigator screenOptions={{ headerShown: false, animation: "fade" }}>
        {!token ? (
          <Root.Screen name="Auth" component={AuthNavigator} />
        ) : !hasCurrentAddress ? (
          <Root.Screen name="DetectingLocationGate" component={DetectingLocationScreen} options={{ headerShown: false }} />
        ) : (
          <Root.Screen name="Main" component={MainTabs} />
        )}
        <Root.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: true, title: "Notifications" }} />
        <Root.Screen name="CartCrud" component={CartCrudScreen} options={{ headerShown: true, title: "My Cart" }} />
        <Root.Screen name="Coupon" component={CouponScreen} options={{ headerShown: true, title: "Coupons" }} />
        <Root.Screen name="Address" component={AddressScreen} options={{ headerShown: true, title: "Addresses" }} />
        <Root.Screen name="Favorites" component={FavoritesScreen} options={{ headerShown: true, title: "Favorites" }} />
        <Root.Screen name="Referral" component={ReferralScreen} options={{ headerShown: true, title: "Referral" }} />
        <Root.Screen name="Subscriptions" component={SubscriptionScreen} options={{ headerShown: true, title: "Subscriptions" }} />
        <Root.Screen name="InstantBookingStatus" component={InstantBookingStatusScreen} options={{ headerShown: true, title: "Instant Booking" }} />
        <Root.Screen name="ScheduledBookingStatus" component={ScheduledBookingStatusScreen} options={{ headerShown: true, title: "Scheduled Booking" }} />
        <Root.Screen name="ScheduledReschedule" component={ScheduledRescheduleScreen} options={{ headerShown: true, title: "Reschedule" }} />
        {ENABLE_LIVE_TRACKING ? (
          <Root.Screen name="LiveTracking" component={LiveTrackingScreen} options={{ headerShown: true, title: "Live Tracking" }} />
        ) : null}
        <Root.Screen name="Payment" component={PaymentScreen} options={{ headerShown: true, title: "Payment" }} />
        <Root.Screen name="PaymentStatus" component={PaymentStatusScreen} options={{ headerShown: true, title: "Payment Status" }} />
        <Root.Screen name="BookingPaymentConfirm" component={BookingPaymentConfirmScreen} options={{ headerShown: true, title: "Booking Confirmed" }} />
        <Root.Screen name="BookingProcessing" component={BookingProcessingScreen} options={{ headerShown: true, title: "Processing" }} />
        <Root.Screen name="ServiceStarted" component={ServiceStartedScreen} options={{ headerShown: true, title: "Service Started" }} />
        <Root.Screen name="ServiceCompleted" component={ServiceCompletedScreen} options={{ headerShown: true, title: "Service Completed" }} />
        <Root.Screen name="RatePartner" component={RatePartnerScreen} options={{ headerShown: true, title: "Rate Partner" }} />
        <Root.Screen name="Reviews" component={ReviewScreen} options={{ headerShown: true, title: "Reviews" }} />
        <Root.Screen name="Support" component={SupportTicketsScreen} options={{ headerShown: true, title: "Help & Support" }} />
        <Root.Screen name="Faq" component={FaqScreen} options={{ headerShown: true, title: "FAQs" }} />
        <Root.Screen name="BookingDetail" component={BookingDetailScreen} options={{ headerShown: true, title: "Booking Detail" }} />
        <Root.Screen name="ServiceList" component={ServiceListScreen} options={{ headerShown: true, title: "Services" }} />
        <Root.Screen name="ServiceDetail" component={ServiceDetailScreen} options={{ headerShown: true, title: "Service Detail" }} />
        <Root.Screen name="DetectingLocation" component={DetectingLocationScreen} options={{ headerShown: false }} />
        <Root.Screen name="LocationSearch" component={LocationSearchScreen} options={{ headerShown: true, title: "Select Location" }} />
        <Root.Screen
          name="AddAddressDetails"
          component={AddAddressDetailsScreen}
          options={{
            headerShown: true,
            title: "Add Address Details",
            headerStyle: { backgroundColor: "#F8FFFA" },
            headerTintColor: "#0F172A",
            headerTitleStyle: { color: "#0F172A", fontWeight: "800" },
          }}
        />
        <Root.Screen name="MapAddressPicker" component={MapAddressPickerScreen} options={{ headerShown: true, title: "Pick on Map" }} />
        <Root.Screen name="ComingSoon" component={ComingSoonScreen} options={{ headerShown: false }} />
        <Root.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false }} />
        <Root.Screen name="BookingService" component={BookingServiceScreen} options={{ headerShown: true, title: "Book Service" }} />
        <Root.Screen name="BookingSlot" component={BookingSlotScreen} options={{ headerShown: true, title: "Select Slot" }} />
        <Root.Screen name="BookingConfirm" component={BookingConfirmScreen} options={{ headerShown: true, title: "Confirm Booking" }} />
      </Root.Navigator>
    </NavigationContainer>
  );
}
