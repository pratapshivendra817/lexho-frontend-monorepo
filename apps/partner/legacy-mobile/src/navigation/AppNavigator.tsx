import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Platform, StyleSheet, ToastAndroid, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import MobileNumberScreen from "../screens/auth/MobileNumberScreen";
import OTPScreen from "../screens/auth/OTPScreen";
import BackgroundLocationEducationScreen from "../screens/system/BackgroundLocationEducationScreen";
import SplashScreen from "../screens/system/SplashScreen";
import HomeScreen from "../screens/main/HomeScreen";
import NewOrdersScreen from "../screens/main/NewOrdersScreen";
import ActiveJobScreen from "../screens/main/ActiveJobScreen";
import SupportScreen from "../screens/main/SupportScreen";
import NotificationsScreen from "../screens/main/NotificationsScreen";
import PartnerOnboardingScreen from "../screens/main/PartnerOnboardingScreen";
import OrderHistoryScreen from "../screens/main/OrderHistoryScreen";
import ShiftScreen from "../screens/main/ShiftScreen";
import OrderDetailsScreen from "../screens/main/OrderDetailsScreen";
import EarningsStatsScreen from "../screens/main/EarningsStatsScreen";
import PayoutsScreen from "../screens/main/PayoutsScreen";
import PayoutDetailScreen from "../screens/main/PayoutDetailScreen";
import BankAccountScreen from "../screens/main/BankAccountScreen";
import WithdrawalsScreen from "../screens/main/WithdrawalsScreen";
import AppSettingsScreen from "../screens/main/AppSettingsScreen";
import LanguageSelectionScreen from "../screens/main/LanguageSelectionScreen";
import ScreeningCentreScreen from "../screens/main/ScreeningCentreScreen";
import LegalDocumentScreen from "../modules/legal/screens/LegalDocumentScreen";
import { PartnerDeleteAccountScreen, PartnerDeleteConfirmScreen, PartnerDeleteStatusScreen, PartnerFaqScreen, PartnerLegalAcceptanceScreen, PartnerLegalDetailScreen, PartnerLegalScreen, PartnerSupportContactScreen } from "../screens/main/PartnerComplianceScreens";
import ChatListScreen from "../screens/main/ChatListScreen";
import ChatScreen from "../screens/main/ChatScreen";
import { ActiveCallScreen, IncomingCallScreen, MissedCallScreen, OutgoingCallScreen, callActions, useCallSocket } from "../modules/calling";
import { LiveTrackingScreen, RouteMapScreen } from "../modules/navigation";
import { EmergencyContactsScreen, FloatingSOSButton, SOSHistoryScreen, SOSScreen, useSOSOfflineQueue } from "../modules/sos";
import {
  LeaveManagementScreen,
  PerformanceDashboardScreen,
  RatingsScreen,
  ServiceAreaManagementScreen,
  WarningCenterScreen,
} from "../screens/main/PartnerOperationsScreens";

import { COLORS } from "../constants/colors";
import { getHealth } from "../services/partnerService";
import { clearSession, extractJwtToken, getToken, saveAdminProfile, savePartnerProviderId, saveRefreshToken, saveToken } from "../utils/storage";
import { initializePushNotifications, markNotificationRead, setupPushNotificationListeners, unregisterDeviceToken } from "../services/notificationsService";
import { setUnauthorizedHandler } from "../services/api";
import { stopTrackingAndCleanup } from "../features/shift/locationTrackingManager";
import { clearShiftState } from "../features/shift/shiftStorage";
import { detectAndSyncCurrentLocation } from "../services/locationTrackingService";
import { useAppDispatch } from "../hooks/useRedux";
import { setLastKnownLocation } from "../redux/slices/partnerSlice";
import { upsertNotification } from "../redux/slices/notificationSlice";
import { clearChatState, fetchChatThreads, selectTotalChatUnread } from "../redux/slices/chatSlice";
import { useAppSelector } from "../hooks/useRedux";
import { usePartnerChatSocket } from "../hooks/usePartnerChatSocket";
import { consumePendingIncomingCall, parseCallPush } from "../services/callApi";
import { identifyPartnerAnalytics, PARTNER_ANALYTICS_EVENTS, trackAuthenticationEvent, trackEvent } from "../services/firebaseAnalytics";
import { recordCrash } from "../services/crashlyticsService";

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  OTP: { mobile: string; resendAfter?: number };
  Main: undefined;
  ActiveJob: { orderId: number };
  Support: undefined;
  Shift: undefined;
  Orders: undefined;
  History: undefined;
  Earnings: undefined;
  Payouts: undefined;
  PayoutDetail: { payoutId: string };
  BankAccount: undefined;
  Withdrawals: undefined;
  OrderDetails: { orderId: number; requestId?: number };
  Performance: undefined;
  Ratings: undefined;
  LeaveManagement: undefined;
  ServiceAreas: undefined;
  WarningCenter: undefined;
  ChatList: undefined;
  Chat: { orderId: number; customerName?: string };
  IncomingCall: { callId: string; orderId: number };
  OutgoingCall: { orderId: number; customerName?: string; callId?: string };
  ActiveCall: undefined;
  MissedCall: undefined;
  RouteMap: { orderId: number; customerLatitude?: number; customerLongitude?: number };
  LiveTracking: { orderId: number; customerLatitude?: number; customerLongitude?: number };
  BackgroundLocationEducation: undefined;
  SOS: { autoActivate?: boolean } | undefined;
  EmergencyContacts: undefined;
  SOSHistory: undefined;
  AppSettings: undefined;
  LanguageSelection: undefined;
  ScreeningCentre: undefined;
  PartnerOnboarding: undefined;
  LegalDocument: { slug: "terms-and-conditions" | "privacy-policy" | "about-us"; title: string };
  PartnerLegal: undefined;
  PartnerLegalDetail: { type: any; title: string };
  PartnerLegalAcceptance: { type: any; title: string; version: string };
  PartnerFaq: undefined;
  PartnerSupportContact: undefined;
  PartnerDeleteAccount: undefined;
  PartnerDeleteConfirm: undefined;
  PartnerDeleteStatus: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator();
const APP_NAV_COPY = {
  home: "Home",
  alerts: "Alerts",
  chats: "Chats",
  support: "Support",
} as const;

function readPushData(payload: any) {
  const data = payload?.data ?? {};
  const redirectType = String(data.redirectType ?? data.referenceType ?? data.notificationType ?? data.type ?? "").toUpperCase();
  const redirectValue = String(data.redirectValue ?? data.referenceId ?? data.orderId ?? data.bookingId ?? data.id ?? "").trim();
  const warningId = String(data.warningId ?? data.referenceId ?? data.id ?? "").trim();
  const isWarning = redirectType === "WARNING" || redirectType === "WARNINGS";
  return {
    redirectType,
    redirectValue,
    title: String(payload?.notification?.title ?? data.title ?? (isWarning ? "New Warning Issued" : "New notification")).trim(),
    message: String(payload?.notification?.body ?? data.message ?? data.body ?? (isWarning ? "A new warning has been issued to your account. Tap to view the details." : "")).trim(),
    notificationId: String(data.notificationId ?? data.id ?? `${Date.now()}`).trim(),
    warningId,
    isWarning,
  };
}

function MainTabs({ onLogout }: { onLogout: () => Promise<void> }) {
  const chatUnread = useAppSelector(selectTotalChatUnread);
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.secondary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: { height: 64, backgroundColor: COLORS.surface, borderTopColor: COLORS.border, borderTopWidth: 1 },
        tabBarLabelStyle: { fontWeight: "700", paddingBottom: 6 },
        tabBarIcon: ({ color, size }) => {
          const nameMap: Record<string, string> = {
            HomeTab: "view-dashboard-outline",
            OnboardingTab: "clipboard-edit-outline",
            NotificationsTab: "bell-outline",
            ChatTab: "message-text-outline",
            SupportTab: "menu",
          };
          return <MaterialCommunityIcons name={nameMap[route.name] ?? "circle"} color={color} size={size} />;
        },
      })}
    >
      <Tabs.Screen name="HomeTab" component={HomeScreen} options={{ title: APP_NAV_COPY.home }} />
      <Tabs.Screen name="OnboardingTab" options={{ title: "Onboarding" }}>{(props) => <PartnerOnboardingScreen {...props} onLogout={onLogout} />}</Tabs.Screen>
      <Tabs.Screen name="NotificationsTab" component={NotificationsScreen} options={{ title: APP_NAV_COPY.alerts }} />
      <Tabs.Screen name="ChatTab" component={ChatListScreen} options={{ title: APP_NAV_COPY.chats, tabBarBadge: chatUnread || undefined }} />
      <Tabs.Screen name="SupportTab" options={{ title: APP_NAV_COPY.support }}>{(props) => <SupportScreen {...props} onLogout={onLogout} />}</Tabs.Screen>
    </Tabs.Navigator>
  );
}

export default function AppNavigator() {
  const dispatch = useAppDispatch();
  const rootNavigationRef = useRef<any>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pendingCallRoute, setPendingCallRoute] = useState<{ callId: string; orderId: number } | null>(null);
  usePartnerChatSocket(isAuthenticated);
  const handleIncomingOffer = useCallback((signal: { callId: string; bookingId: number }) => {
    rootNavigationRef.current?.navigate("IncomingCall", { callId: signal.callId, orderId: signal.bookingId });
  }, []);
  useCallSocket(isAuthenticated, handleIncomingOffer);
  useSOSOfflineQueue(isAuthenticated);

  const handleLoginSuccess = useCallback(async (payload: Record<string, any>, mobile: string) => {
    const jwt = extractJwtToken(payload);
    if (!jwt) throw new Error("Token missing in verify-otp response.");

    const refreshToken = payload?.refreshToken ?? payload?.data?.refreshToken ?? null;
    const partnerId = payload?.partnerId ?? payload?.providerId ?? payload?.data?.partnerId ?? payload?.data?.providerId ?? payload?.user?.partnerId ?? payload?.user?.providerId ?? payload?.user?.id ?? null;
    await saveToken(jwt);
    if (refreshToken) await saveRefreshToken(refreshToken);
    await savePartnerProviderId(partnerId);
    await saveAdminProfile({ email: `${mobile}@partner.local`, mobile });
    await initializePushNotifications();
    await identifyPartnerAnalytics(payload?.partnerId ?? payload?.data?.partnerId ?? payload?.user?.id ?? null);
    await trackAuthenticationEvent(true, { mobile });
    setIsAuthenticated(true);
  }, []);

  const handleLogout = useCallback(async () => {
    stopTrackingAndCleanup();
    await clearShiftState();
    await unregisterDeviceToken();
    await clearSession();
    dispatch(clearChatState());
    dispatch(callActions.resetCall());
    await trackEvent(PARTNER_ANALYTICS_EVENTS.logout);
    setIsAuthenticated(false);
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated) dispatch(fetchChatThreads(0));
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !pendingCallRoute || !rootNavigationRef.current) return;
    rootNavigationRef.current.navigate("IncomingCall", pendingCallRoute);
    setPendingCallRoute(null);
  }, [isAuthenticated, pendingCallRoute]);

  const handleNotificationRoute = useCallback((payload: any) => {
    const navigation = rootNavigationRef.current;
    if (!navigation) return;
    const parsed = readPushData(payload);
    const numericId = Number(parsed.redirectValue);
    const callPayload = parseCallPush(payload);
    if (callPayload?.type === "INCOMING_CALL") {
      dispatch(callActions.setCall({ callId: callPayload.callId, bookingId: callPayload.orderId, direction: "incoming", participant: { id: callPayload.customerId ?? "", name: callPayload.customerName, role: "CUSTOMER" }, status: "ringing", startedAt: Date.now() }));
      return navigation.navigate("IncomingCall", { callId: callPayload.callId, orderId: callPayload.orderId });
    }
    if (callPayload?.type === "CALL_MISSED") {
      dispatch(callActions.endCall({ status: "missed", reason: "MISSED" }));
      return navigation.navigate("OrderDetails", { orderId: callPayload.orderId });
    }
    if (
      parsed.redirectType === "BOOKING" ||
      parsed.redirectType === "ORDER" ||
      parsed.redirectType === "NEW_ORDER" ||
      parsed.redirectType === "DISPATCH_REQUEST"
    ) {
      if (Number.isFinite(numericId) && numericId > 0) {
        return navigation.navigate("OrderDetails", { orderId: numericId });
      }
      return navigation.navigate("Orders");
    }
    if (parsed.redirectType === "EARNINGS" || parsed.redirectType === "PAYOUT") return navigation.navigate("Payouts");
    if (
      parsed.redirectType === "ONBOARDING" ||
      parsed.redirectType === "PARTNER_ONBOARDING" ||
      parsed.redirectType === "ONBOARDING_STATUS"
    ) {
      return navigation.navigate("Main", { screen: "OnboardingTab" });
    }
    if (parsed.isWarning) {
      if (parsed.notificationId && !parsed.notificationId.startsWith("warning:")) {
        void markNotificationRead(parsed.notificationId).catch(() => null);
      }
      dispatch(upsertNotification({
        id: parsed.notificationId || `warning:${parsed.warningId || Date.now()}`,
        title: parsed.title,
        message: parsed.message,
        createdAt: new Date().toISOString(),
        read: true,
        source: "warning",
        redirectType: "WARNING",
        redirectValue: parsed.warningId || parsed.redirectValue,
        warningId: parsed.warningId || parsed.redirectValue,
      }));
      return navigation.navigate("WarningCenter");
    }
    if (parsed.redirectType === "CHAT" || parsed.redirectType === "CHAT_MESSAGE" || parsed.redirectType === "MESSAGE") {
      if (Number.isFinite(numericId) && numericId > 0) return navigation.navigate("Chat", { orderId: numericId });
      return navigation.navigate("Main", { screen: "ChatTab" });
    }
    if (parsed.redirectType === "SUPPORT" || parsed.redirectType === "TICKET") return navigation.navigate("Support");
    return navigation.navigate("Main", { screen: "NotificationsTab" });
  }, [dispatch]);

  useEffect(() => {
    let active = true;
    (async () => {
      const token = await getToken();
      if (active) setIsAuthenticated(Boolean(token));

      try {
        await getHealth();
        if (token) {
        await identifyPartnerAnalytics(null);
          // Re-register/refresh the FCM token for sessions restored from
          // storage. Previously this ran only immediately after OTP login,
          // so an existing session could miss push notifications after a
          // token rotation or app reinstall.
          void initializePushNotifications().catch(() => null);
          const pendingCall = await consumePendingIncomingCall();
          if (active && pendingCall?.type === "INCOMING_CALL") {
            dispatch(callActions.setCall({ callId: pendingCall.callId, bookingId: pendingCall.orderId, direction: "incoming", participant: { id: pendingCall.customerId ?? "", name: pendingCall.customerName, role: "CUSTOMER" }, status: "ringing", startedAt: Date.now() }));
            setPendingCallRoute({ callId: pendingCall.callId, orderId: pendingCall.orderId });
          }
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
        void recordCrash(new Error("partner_app_bootstrap_failed"));
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

  useEffect(() => {
    if (!isAuthenticated) return;
    let cleanup: (() => void) | null = null;
    setupPushNotificationListeners({
      onForegroundMessage: (payload) => {
        const parsed = readPushData(payload);
        const callPayload = parseCallPush(payload);
        if (callPayload?.type === "INCOMING_CALL") {
          dispatch(callActions.setCall({ callId: callPayload.callId, bookingId: callPayload.orderId, direction: "incoming", participant: { id: callPayload.customerId ?? "", name: callPayload.customerName, role: "CUSTOMER" }, status: "ringing", startedAt: Date.now() }));
          rootNavigationRef.current?.navigate("IncomingCall", { callId: callPayload.callId, orderId: callPayload.orderId });
          return;
        }
        if (callPayload?.type === "CALL_MISSED") dispatch(callActions.endCall({ status: "missed", reason: "MISSED" }));
        if (["CHAT", "CHAT_MESSAGE", "MESSAGE"].includes(parsed.redirectType)) {
          dispatch(fetchChatThreads(0));
        }
        void trackEvent(PARTNER_ANALYTICS_EVENTS.notificationReceived, {
          redirectType: parsed.redirectType,
        });
        dispatch(upsertNotification({
          id: parsed.notificationId,
          title: parsed.title,
          message: parsed.message,
          createdAt: new Date().toISOString(),
          read: false,
          source: parsed.isWarning ? "warning" : "system",
          redirectType: parsed.isWarning ? "WARNING" : parsed.redirectType,
          redirectValue: parsed.warningId || parsed.redirectValue,
          warningId: parsed.warningId || undefined,
        }));
        const displayText = parsed.message ? `${parsed.title}: ${parsed.message}` : parsed.title;
        if (Platform.OS === "android") {
          ToastAndroid.show(displayText, ToastAndroid.LONG);
        } else {
          Alert.alert(parsed.title, parsed.message || "New notification");
        }
      },
      onNotificationOpened: handleNotificationRoute,
    }).then((fn) => {
      cleanup = fn;
    }).catch(() => null);
    return () => {
      cleanup?.();
    };
  }, [dispatch, handleNotificationRoute, isAuthenticated]);

  const screenOptions = useMemo(() => ({ headerShown: false, contentStyle: { backgroundColor: COLORS.background } }), []);

  if (bootstrapping) {
    return (
      <View style={styles.loaderWrap}>
        <SplashScreen />
      </View>
    );
  }

  return (
    <>
    <Stack.Navigator screenOptions={screenOptions}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Login">{(props) => <MobileNumberScreen {...props} />}</Stack.Screen>
          <Stack.Screen name="OTP">{(props) => <OTPScreen {...props} onAuthSuccess={handleLoginSuccess} />}</Stack.Screen>
        </>
      ) : (
        <>
          <Stack.Screen name="Main">
            {(props) => {
              rootNavigationRef.current = props.navigation;
              return <MainTabs onLogout={handleLogout} />;
            }}
          </Stack.Screen>
          <Stack.Screen name="ActiveJob" component={ActiveJobScreen} />
              <Stack.Screen name="Support">{(props) => <SupportScreen {...props} onLogout={handleLogout} />}</Stack.Screen>
              <Stack.Screen name="AppSettings" component={AppSettingsScreen} />
              <Stack.Screen name="LanguageSelection" component={LanguageSelectionScreen} />
              <Stack.Screen name="ScreeningCentre" component={ScreeningCentreScreen} />
              <Stack.Screen name="LegalDocument" component={LegalDocumentScreen} />
              <Stack.Screen name="PartnerLegal" component={PartnerLegalScreen} />
              <Stack.Screen name="PartnerLegalDetail" component={PartnerLegalDetailScreen} />
              <Stack.Screen name="PartnerLegalAcceptance" component={PartnerLegalAcceptanceScreen} />
              <Stack.Screen name="PartnerFaq" component={PartnerFaqScreen} />
              <Stack.Screen name="PartnerSupportContact" component={PartnerSupportContactScreen} />
              <Stack.Screen name="PartnerDeleteAccount" component={PartnerDeleteAccountScreen} />
              <Stack.Screen name="PartnerDeleteConfirm" component={PartnerDeleteConfirmScreen} options={{ presentation: "transparentModal", headerShown: false }} />
              <Stack.Screen name="PartnerDeleteStatus" component={PartnerDeleteStatusScreen} />
          <Stack.Screen name="Shift" component={ShiftScreen} />
          <Stack.Screen name="Orders" component={NewOrdersScreen} />
          <Stack.Screen name="History" component={OrderHistoryScreen} />
          <Stack.Screen name="Earnings" component={EarningsStatsScreen} />
          <Stack.Screen name="Payouts" component={PayoutsScreen} />
          <Stack.Screen name="PayoutDetail" component={PayoutDetailScreen} />
          <Stack.Screen name="BankAccount" component={BankAccountScreen} />
          <Stack.Screen name="Withdrawals" component={WithdrawalsScreen} />
          <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
          <Stack.Screen name="Performance" component={PerformanceDashboardScreen} />
          <Stack.Screen name="Ratings" component={RatingsScreen} />
          <Stack.Screen name="LeaveManagement" component={LeaveManagementScreen} />
          <Stack.Screen name="ServiceAreas" component={ServiceAreaManagementScreen} />
          <Stack.Screen name="WarningCenter" component={WarningCenterScreen} />
          <Stack.Screen name="ChatList" component={ChatListScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="IncomingCall" component={IncomingCallScreen} options={{ gestureEnabled: false }} />
          <Stack.Screen name="OutgoingCall" component={OutgoingCallScreen} options={{ gestureEnabled: false }} />
          <Stack.Screen name="ActiveCall" component={ActiveCallScreen} options={{ gestureEnabled: false }} />
          <Stack.Screen name="MissedCall" component={MissedCallScreen} options={{ gestureEnabled: false }} />
          <Stack.Screen name="RouteMap" component={RouteMapScreen} />
          <Stack.Screen name="LiveTracking" component={LiveTrackingScreen} />
          <Stack.Screen name="BackgroundLocationEducation" component={BackgroundLocationEducationScreen} />
          <Stack.Screen name="SOS" component={SOSScreen} />
          <Stack.Screen name="EmergencyContacts" component={EmergencyContactsScreen} />
          <Stack.Screen name="SOSHistory" component={SOSHistoryScreen} />
        </>
      )}
    </Stack.Navigator>
    <FloatingSOSButton visible={isAuthenticated} onConfirmed={() => rootNavigationRef.current?.navigate("SOS", { autoActivate: true })} />
    </>
  );
}

const styles = StyleSheet.create({
  loaderWrap: { flex: 1, backgroundColor: COLORS.background },
});
