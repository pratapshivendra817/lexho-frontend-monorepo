import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { useAppSelector } from "../redux/hooks";
import { SplashScreen } from "../screens/auth/SplashScreen";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { OtpScreen } from "../screens/auth/OtpScreen";
import { HomeScreen } from "../screens/home/HomeScreen";
import { BookingHistoryScreen } from "../screens/booking/BookingHistoryScreen";
import { ProfileScreen } from "../screens/profile/ProfileScreen";
import { NotificationsScreen } from "../screens/notifications/NotificationsScreen";
import { CartCrudScreen } from "../screens/cart/CartCrudScreen";
import { CouponScreen } from "../screens/cart/CouponScreen";
import { AddressScreen } from "../screens/profile/AddressScreen";
import { FavoritesScreen } from "../screens/home/FavoritesScreen";
import { ReferralScreen } from "../screens/profile/ReferralScreen";
import { SubscriptionScreen } from "../screens/profile/SubscriptionScreen";
import { BookingDetailScreen } from "../screens/booking/BookingDetailScreen";
import { LiveTrackingScreen } from "../screens/booking/LiveTrackingScreen";
import { PaymentScreen } from "../screens/payment/PaymentScreen";
import { PaymentStatusScreen } from "../screens/payment/PaymentStatusScreen";
import { ReviewScreen } from "../screens/home/ReviewScreen";
import { SupportTicketsScreen } from "../screens/support/SupportTicketsScreen";
import { ServiceListScreen } from "../screens/service/ServiceListScreen";
import { ServiceDetailScreen } from "../screens/service/ServiceDetailScreen";

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
  BookingDetail: undefined;
  LiveTracking: undefined;
  Payment: undefined;
  PaymentStatus: undefined;
  Reviews: undefined;
  Support: undefined;
  ServiceList: { categoryId: string | number; categoryName?: string };
  ServiceDetail: { serviceId: string };
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

export function AppNavigator({ darkMode = false }: { darkMode?: boolean }) {
  const { token, hydrated } = useAppSelector((s) => s.auth);

  if (!hydrated) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer theme={darkMode ? DarkTheme : DefaultTheme}>
      <Root.Navigator screenOptions={{ headerShown: false, animation: "fade" }}>
        {!token ? <Root.Screen name="Auth" component={AuthNavigator} /> : <Root.Screen name="Main" component={MainTabs} />}
        <Root.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: true, title: "Notifications" }} />
        <Root.Screen name="CartCrud" component={CartCrudScreen} options={{ headerShown: true, title: "My Cart" }} />
        <Root.Screen name="Coupon" component={CouponScreen} options={{ headerShown: true, title: "Coupons" }} />
        <Root.Screen name="Address" component={AddressScreen} options={{ headerShown: true, title: "Addresses" }} />
        <Root.Screen name="Favorites" component={FavoritesScreen} options={{ headerShown: true, title: "Favorites" }} />
        <Root.Screen name="Referral" component={ReferralScreen} options={{ headerShown: true, title: "Referral" }} />
        <Root.Screen name="Subscriptions" component={SubscriptionScreen} options={{ headerShown: true, title: "Subscriptions" }} />
        <Root.Screen name="BookingDetail" component={BookingDetailScreen} options={{ headerShown: true, title: "Booking Details" }} />
        <Root.Screen name="LiveTracking" component={LiveTrackingScreen} options={{ headerShown: true, title: "Live Tracking" }} />
        <Root.Screen name="Payment" component={PaymentScreen} options={{ headerShown: true, title: "Payment" }} />
        <Root.Screen name="PaymentStatus" component={PaymentStatusScreen} options={{ headerShown: true, title: "Payment Status" }} />
        <Root.Screen name="Reviews" component={ReviewScreen} options={{ headerShown: true, title: "Reviews" }} />
        <Root.Screen name="Support" component={SupportTicketsScreen} options={{ headerShown: true, title: "Support" }} />
        <Root.Screen name="ServiceList" component={ServiceListScreen} options={{ headerShown: true, title: "Services" }} />
        <Root.Screen name="ServiceDetail" component={ServiceDetailScreen} options={{ headerShown: true, title: "Service Detail" }} />
      </Root.Navigator>
    </NavigationContainer>
  );
}
