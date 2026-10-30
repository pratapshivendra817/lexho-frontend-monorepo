import { Provider } from "react-redux";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Linking, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { MD3DarkTheme, MD3LightTheme, PaperProvider, Snackbar } from "react-native-paper";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { createNavigationContainerRef } from "@react-navigation/native";
import { AppNavigator } from "./navigation/AppNavigator";
import { store } from "./redux/store";
import { useAppSelector } from "./redux/hooks";
import { useAuthBootstrap } from "./hooks/useAuthBootstrap";
import { useEffect, useMemo, useState } from "react";
import { initializePushNotifications, setupPushNotificationListeners } from "./services/notificationsService";
import { setAnalyticsUser, trackAnalyticsEvent } from "./services/firebaseAnalytics";
import { initializeCrashlytics, logCrashlyticsMessage, recordNonFatalError, setCrashlyticsUser } from "./services/firebaseCrashlytics";
import { trackAppOpen } from "./services/customerAnalyticsEvents";
import { clearPendingPaymentBookingId, getPendingPaymentBookingId, saveSession } from "./utils/storage";
import { savePendingReferralCode } from "./utils/storage";
import { useCustomerNotificationSocket } from "./hooks/useCustomerNotificationSocket";
import { useThemeMode } from "./hooks/useThemeMode";
import { getTheme } from './theme/theme';
import { getBookingDetails } from "./api/bookingExtrasApi";
import { resolveLifecycleTarget } from "./hooks/useBookingLifecycleNavigation";
import { captureFrontendError, trackBusinessEvent } from "./services/monitoring";
import { useCallSocket } from "./modules/calling";
import { getActiveRouteName, resetTrackedScreen, trackNavigationScreen } from "./services/screenTrackingService";
import { networkService } from "./services/networkService";
import { clearNotificationHints } from "./redux/notificationSlice";


import { COLORS } from './theme/colors';

const queryClient = new QueryClient();
const navigationRef = createNavigationContainerRef<any>();

function extractReferralCodeFromUrl(url?: string | null) {
  const raw = String(url ?? "").trim();
  if (!raw) return null;
  const match = raw.match(/[?&]ref=([^&#]+)/i);
  if (!match?.[1]) return null;
  return decodeURIComponent(match[1]).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "") || null;
}

function handlePushNavigation(payload: any) {
  if (!navigationRef.isReady()) return;
  const data = payload?.data ?? {};
  const redirectType = String(data?.redirectType ?? data?.referenceType ?? data?.notificationType ?? data?.type ?? "").trim().toUpperCase();
  const redirectValue = String(data?.redirectValue ?? data?.referenceId ?? "").trim();
  const bookingId = String(data?.bookingId ?? data?.booking_id ?? redirectValue ?? data?.id ?? "").trim();

  if (redirectType === "NOTIFICATIONS") return navigationRef.navigate("Notifications");
  if (redirectType === "PROMOTION" || redirectType === "PROMOTIONAL_OFFER") return navigationRef.navigate("Coupon");
  if (redirectType === "SUBSCRIPTION" || redirectType === "SUBSCRIPTION_REMINDER") return navigationRef.navigate("Main", { screen: "Bookings" });
  if (redirectType === "PAYMENT" || redirectType === "PAYMENTSTATUS") {
    const paymentId = String(data?.paymentId ?? data?.payment_id ?? redirectValue ?? bookingId).trim();
    return navigationRef.navigate("PaymentStatus", paymentId ? { bookingId: paymentId } : undefined);
  }
  if (redirectType === "INSTANT_BOOKING" || redirectType === "SEARCHING_PARTNER") {
    return navigationRef.navigate("InstantBookingStatus", bookingId ? { bookingId } : undefined);
  }
  if (redirectType === "SCHEDULED_BOOKING") {
    return navigationRef.navigate("ScheduledBookingStatus", bookingId ? { bookingId } : undefined);
  }
  if (redirectType === "TRACKING") {
    return navigationRef.navigate("LiveTracking", bookingId ? { bookingId } : undefined);
  }
  if (redirectType === "SUPPORT" || redirectType === "TICKET") {
    return navigationRef.navigate("Support");
  }
  if (
    redirectType === "BOOKING_DETAIL" ||
    redirectType === "BOOKING" ||
    redirectType === "BOOKING_CONFIRMED" ||
    redirectType === "PROFESSIONAL_ASSIGNED" ||
    redirectType === "PROFESSIONAL_ON_THE_WAY" ||
    redirectType === "SERVICE_STARTED" ||
    redirectType === "SERVICE_COMPLETED"
  ) {
    if (bookingId) return navigationRef.navigate("BookingDetail", { bookingId });
    return navigationRef.navigate("Main", { screen: "Bookings" });
  }
  if (bookingId) {
    return navigationRef.navigate("PaymentStatus", { bookingId });
  }
  return navigationRef.navigate("Notifications");
}

function Bootstrap() {
  useAuthBootstrap();
  const dispatch = store.dispatch;
  const token = useAppSelector((s) => s.auth.token);
  const refreshToken = useAppSelector((s) => s.auth.refreshToken);
  const user = useAppSelector((s) => s.auth.user);
  const hydrated = useAppSelector((s) => s.auth.hydrated);
  const { mode } = useThemeMode();
  const [pushBannerVisible, setPushBannerVisible] = useState(false);
  const [pushBannerText, setPushBannerText] = useState("");
  const isOffline = useAppSelector((s) => s.offline.isOffline);
  const userId = String(user?.id ?? "").trim();
  const appTheme = useMemo(() => getTheme({ app: "customer", mode }), [mode]);
  const paperTheme = useMemo(() => {
    const base = mode === "dark" ? MD3DarkTheme : MD3LightTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: appTheme.colors.primary,
        background: appTheme.colors.bgSecondary,
        surface: appTheme.colors.bgCard,
        onSurface: appTheme.colors.textPrimary,
        outline: appTheme.colors.border,
        error: appTheme.colors.error,
      },
    };
  }, [appTheme.colors, mode]);
  const icon = ({ color, name, size }: { color: string; name: string; size: number }) => (
    <MaterialCommunityIcon color={color} name={name} size={size} />
  );

  useCallSocket(Boolean(token && userId), ({ callId, bookingId }) => {
    if (navigationRef.isReady()) navigationRef.navigate("IncomingCall", { callId, bookingId });
  });

  useEffect(() => {
    const stopNetworkService = networkService.start(store);
    return () => {
      stopNetworkService?.();
      networkService.stop();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const captureReferralFromUrl = async (url?: string | null) => {
      const code = extractReferralCodeFromUrl(url);
      if (!code) return;
      await savePendingReferralCode(code);
      if (!mounted) return;
      queryClient.invalidateQueries({ queryKey: ["pending-referral-code"] }).catch(() => null);
      if (navigationRef.isReady() && !token) {
        navigationRef.navigate("Auth");
      }
    };

    void Linking.getInitialURL?.()
      ?.then((url) => captureReferralFromUrl(url))
      .catch(() => null);

    const subscription = Linking.addEventListener?.("url", ({ url }) => {
      void captureReferralFromUrl(url);
    });

    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, [token]);

  useEffect(() => {
    void trackAppOpen({
      platform: "android",
      source: "bootstrap",
    });
  }, []);

  useEffect(() => {
    if (!token || !navigationRef.isReady()) return;
    let cancelled = false;
    (async () => {
      const pendingBookingId = await getPendingPaymentBookingId();
      if (!pendingBookingId || cancelled) return;
      try {
        const booking = await getBookingDetails(pendingBookingId);
        if (cancelled) return;
        const paymentStatus = String(booking?.paymentStatus ?? "").toUpperCase();
        if (paymentStatus === "SUCCESS") {
          await clearPendingPaymentBookingId();
          trackBusinessEvent("payment_recovered_success", {
            screenName: "Bootstrap",
            userAction: "payment_recovery",
            booking_id: pendingBookingId,
          });
          const target = resolveLifecycleTarget(booking);
          navigationRef.navigate(target.name ?? "BookingDetail", { bookingId: pendingBookingId });
          return;
        }
        if ((paymentStatus === "FAILED" || paymentStatus === "EXPIRED") && booking?.retryPaymentAllowed === true) {
          trackBusinessEvent("payment_recovered_retry_required", {
            screenName: "Bootstrap",
            userAction: "payment_recovery",
            booking_id: pendingBookingId,
          });
          navigationRef.navigate("PaymentStatus", { bookingId: pendingBookingId });
        }
      } catch (error) {
        captureFrontendError(error, {
          screenName: "Bootstrap",
          userAction: "payment_recovery",
          apiEndpoint: `/api/bookings/details/${pendingBookingId}`,
          errorCode: "PAYMENT_RECOVERY_FAILED",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch, token]);

  useCustomerNotificationSocket({
    enabled: Boolean(token && userId),
    token,
    userId,
    onMessage: (incoming) => {
      const payload = incoming && typeof incoming === "object" && "data" in (incoming as any) ? (incoming as any).data : incoming;
      queryClient.setQueryData(["notifications"], (prev: any) => {
        const current = Array.isArray(prev?.data) ? prev.data : Array.isArray(prev) ? prev : [];
        const nextItem = payload ?? {};
        const nextId = String(nextItem?.id ?? nextItem?.notificationId ?? nextItem?.eventId ?? "").trim();
        const existingIndex = current.findIndex((item: any) => String(item?.id ?? item?.notificationId ?? "") === nextId);
        if (existingIndex >= 0) {
          const updated = [...current];
          updated[existingIndex] = { ...updated[existingIndex], ...nextItem };
          return updated;
        }
        return [nextItem, ...current];
      });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] }).catch(() => null);
    },
  });

  useEffect(() => {
    if (!token) return;
    let cleanup: (() => void) | null = null;
    void setupPushNotificationListeners({
      onForegroundMessage: (payload) => {
        const title = String(payload?.notification?.title ?? payload?.data?.title ?? "New notification").trim();
        const body = String(payload?.notification?.body ?? payload?.data?.message ?? "").trim();
        const message = body ? `${title}: ${body}` : title;
        setPushBannerText(message);
        setPushBannerVisible(true);
        queryClient.invalidateQueries({ queryKey: ["notifications"] }).catch(() => null);
        queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] }).catch(() => null);
      },
      onNotificationOpened: (payload) => {
        dispatch(clearNotificationHints());
        queryClient.invalidateQueries({ queryKey: ["notifications"] }).catch(() => null);
        queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] }).catch(() => null);
        handlePushNavigation(payload);
      },
    }).then((fn) => {
      cleanup = fn;
    });
    return () => {
      cleanup?.();
    };
  }, [dispatch, token]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!hydrated) return;
      if (!active) return;
      if (token) {
        await saveSession(token, refreshToken ?? undefined, user ?? undefined);
        await setAnalyticsUser(user?.id);
        await setCrashlyticsUser(user?.id);
        await initializeCrashlytics(user?.id);
        await trackAnalyticsEvent("customer_session_active", {
          has_refresh_token: Boolean(refreshToken),
          user_id_present: Boolean(user?.id),
        });
        await initializePushNotifications();
      } else {
        await setAnalyticsUser(null);
        await setCrashlyticsUser(null);
      }
    })().catch(() => null);
    return () => {
      active = false;
    };
  }, [dispatch, hydrated, refreshToken, token, user]);

  return (
    <PaperProvider
      settings={{ icon }}
      theme={paperTheme}
    >
      {isOffline ? (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>You are offline. Pending actions will retry automatically.</Text>
        </View>
      ) : null}
      <AppNavigator
        darkMode={mode === "dark"}
        navigationRef={navigationRef}
        onReady={() => {
          resetTrackedScreen();
          void trackNavigationScreen(navigationRef.getCurrentRoute?.()?.name, dispatch);
        }}
        onStateChange={(state: any) => {
          const routeName = getActiveRouteName(state);
          void trackNavigationScreen(routeName, dispatch);
        }}
      />
      <Snackbar
        visible={pushBannerVisible}
        onDismiss={() => setPushBannerVisible(false)}
        duration={3200}
        action={{ label: "View", onPress: () => navigationRef.isReady() && navigationRef.navigate("Notifications") }}
      >
        {pushBannerText || "New notification"}
      </Snackbar>
    </PaperProvider>
  );
}

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown) {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "Unexpected runtime error",
    };
  }

  componentDidCatch(error: unknown) {
    // Keep it logged in development to quickly identify root-cause instead of silent white screen.
    // eslint-disable-next-line no-console
    console.error("Root render crash", error);
    void logCrashlyticsMessage("Root render crash");
    void recordNonFatalError(error, {
      area: "root_error_boundary",
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorRoot}>
          <Text style={styles.errorTitle}>App crashed while rendering</Text>
          <Text style={styles.errorText}>{this.state.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <RootErrorBoundary>
            <Bootstrap />
          </RootErrorBoundary>
        </QueryClientProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  offlineBanner: {
    backgroundColor: COLORS.goldSoft,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  offlineText: {
    color: COLORS.navyDark,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  errorRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: COLORS.offWhite,
  },
  errorTitle: { color: COLORS.error, fontSize: 18, fontWeight: "700", marginBottom: 8 },
  errorText: { color: COLORS.red700, textAlign: "center" },
});
