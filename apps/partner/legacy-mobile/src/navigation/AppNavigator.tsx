import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import MobileNumberScreen from "../screens/auth/MobileNumberScreen";
import OTPScreen from "../screens/auth/OTPScreen";
import SplashScreen from "../screens/system/SplashScreen";
import HomeScreen from "../screens/main/HomeScreen";
import NewOrdersScreen from "../screens/main/NewOrdersScreen";
import OnboardingSubmitScreen from "../screens/main/OnboardingSubmitScreen";
import ActiveJobScreen from "../screens/main/ActiveJobScreen";
import DocumentUploadScreen from "../screens/main/DocumentUploadScreen";
import SupportScreen from "../screens/main/SupportScreen";
import NotificationsScreen from "../screens/main/NotificationsScreen";
import OrderHistoryScreen from "../screens/main/OrderHistoryScreen";
import ShiftScreen from "../screens/main/ShiftScreen";
import OrderDetailsScreen from "../screens/main/OrderDetailsScreen";
import EarningsStatsScreen from "../screens/main/EarningsStatsScreen";
import ProfileScreen from "../screens/main/ProfileScreen";

import { COLORS } from "../constants/colors";
import { getHealth } from "../services/partnerService";
import { clearSession, extractJwtToken, getToken, saveAdminProfile, saveRefreshToken, saveToken } from "../utils/storage";
import { initializePushNotifications, unregisterDeviceToken } from "../services/notificationsService";
import { setUnauthorizedHandler } from "../services/api";
import { stopTrackingAndCleanup } from "../features/shift/locationTrackingManager";
import { clearShiftState } from "../features/shift/shiftStorage";
import { detectAndSyncCurrentLocation } from "../services/locationTrackingService";
import { useAppDispatch } from "../hooks/useRedux";
import { setLastKnownLocation } from "../redux/slices/partnerSlice";

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  OTP: { mobile: string; resendAfter?: number };
  Main: undefined;
  ActiveJob: { orderId: number };
  DocumentUpload: undefined;
  Support: undefined;
  OnboardingSubmit: undefined;
  Shift: undefined;
  Orders: undefined;
  History: undefined;
  Earnings: undefined;
  OrderDetails: { orderId: number };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator();

function MainTabs({ onLogout }: { onLogout: () => Promise<void> }) {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.secondary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: { height: 64, backgroundColor: COLORS.surface, borderTopColor: COLORS.border },
        tabBarLabelStyle: { fontWeight: "700", paddingBottom: 6 },
        tabBarIcon: ({ color, size }) => {
          const nameMap: Record<string, string> = {
            HomeTab: "view-dashboard-outline",
            OnboardingTab: "account-plus-outline",
            NotificationsTab: "bell-outline",
            SupportTab: "menu",
            ProfileTab: "account-outline",
          };
          return <MaterialCommunityIcons name={nameMap[route.name] ?? "circle"} color={color} size={size} />;
        },
      })}
    >
      <Tabs.Screen name="HomeTab" component={HomeScreen} options={{ title: "Home" }} />
      <Tabs.Screen name="ProfileTab" component={ProfileScreen} options={{ title: "Profile" }} />
      <Tabs.Screen name="NotificationsTab" component={NotificationsScreen} options={{ title: "Alerts" }} />
      <Tabs.Screen name="SupportTab" options={{ title: "Support" }}>{() => <SupportScreen onLogout={onLogout} />}</Tabs.Screen>
      <Tabs.Screen name="OnboardingTab" component={OnboardingSubmitScreen} options={{ title: "Onboarding" }} />
    </Tabs.Navigator>
  );
}

export default function AppNavigator() {
  const dispatch = useAppDispatch();
  const [bootstrapping, setBootstrapping] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLoginSuccess = useCallback(async (payload: Record<string, any>, mobile: string) => {
    const jwt = extractJwtToken(payload);
    if (!jwt) throw new Error("Token missing in verify-otp response.");

    const refreshToken = payload?.refreshToken ?? payload?.data?.refreshToken ?? null;
    await saveToken(jwt);
    if (refreshToken) await saveRefreshToken(refreshToken);
    await saveAdminProfile({ email: `${mobile}@partner.local` });
    await initializePushNotifications();
    setIsAuthenticated(true);
  }, []);

  const handleLogout = useCallback(async () => {
    stopTrackingAndCleanup();
    await clearShiftState();
    await unregisterDeviceToken();
    await clearSession();
    setIsAuthenticated(false);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await getHealth();
        const token = await getToken();
        if (active) setIsAuthenticated(Boolean(token));
        if (token) {
          try {
            const location = await detectAndSyncCurrentLocation();
            if (active) {
              dispatch(setLastKnownLocation(location));
            }
          } catch {
            // Do not block auth flow when location/GPS is unavailable.
          }
        }
      } catch {
        if (active) setIsAuthenticated(false);
      } finally {
        if (active) setBootstrapping(false);
      }
    })();
    return () => { active = false; };
  }, [dispatch]);

  useEffect(() => {
    setUnauthorizedHandler(handleLogout);
    return () => setUnauthorizedHandler(null);
  }, [handleLogout]);

  const screenOptions = useMemo(() => ({ headerShown: false, contentStyle: { backgroundColor: COLORS.background } }), []);

  if (bootstrapping) {
    return (
      <View style={styles.loaderWrap}>
        <SplashScreen />
        <ActivityIndicator color={COLORS.secondary} size="small" style={styles.loader} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Login">{(props) => <MobileNumberScreen {...props} />}</Stack.Screen>
          <Stack.Screen name="OTP">{(props) => <OTPScreen {...props} onAuthSuccess={handleLoginSuccess} />}</Stack.Screen>
        </>
      ) : (
        <>
          <Stack.Screen name="Main">{() => <MainTabs onLogout={handleLogout} />}</Stack.Screen>
          <Stack.Screen name="ActiveJob" component={ActiveJobScreen} />
          <Stack.Screen name="DocumentUpload" component={DocumentUploadScreen} />
          <Stack.Screen name="Support">{() => <SupportScreen onLogout={handleLogout} />}</Stack.Screen>
          <Stack.Screen name="OnboardingSubmit" component={OnboardingSubmitScreen} />
          <Stack.Screen name="Shift" component={ShiftScreen} />
          <Stack.Screen name="Orders" component={NewOrdersScreen} />
          <Stack.Screen name="History" component={OrderHistoryScreen} />
          <Stack.Screen name="Earnings" component={EarningsStatsScreen} />
          <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loaderWrap: { flex: 1, backgroundColor: COLORS.background },
  loader: { position: "absolute", bottom: 80, alignSelf: "center" },
});
