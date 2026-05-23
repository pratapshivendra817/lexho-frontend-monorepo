import { Provider } from "react-redux";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { MD3DarkTheme, MD3LightTheme, PaperProvider, Snackbar } from "react-native-paper";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { createNavigationContainerRef } from "@react-navigation/native";
import { AppNavigator } from "./navigation/AppNavigator";
import { store } from "./redux/store";
import { useAppSelector } from "./redux/hooks";
import { useAuthBootstrap } from "./hooks/useAuthBootstrap";
import { useColorScheme } from "react-native";
import { useEffect, useState } from "react";
import { initializePushNotifications, setupPushNotificationListeners } from "./services/notificationsService";
import { saveSession } from "./utils/storage";
import { ENABLE_LIVE_TRACKING } from "./constants/env";
import { useCustomerNotificationSocket } from "./hooks/useCustomerNotificationSocket";

const queryClient = new QueryClient();
const navigationRef = createNavigationContainerRef<any>();

function handlePushNavigation(payload: any) {
  if (!navigationRef.isReady()) return;
  const data = payload?.data ?? {};
  const bookingId = String(data?.bookingId ?? data?.id ?? "").trim();
  const redirectType = String(data?.redirectType ?? data?.type ?? "").trim().toUpperCase();

  if (redirectType === "NOTIFICATIONS") return navigationRef.navigate("Notifications");
  if (redirectType === "PAYMENT" || redirectType === "PAYMENTSTATUS") {
    return navigationRef.navigate("PaymentStatus", bookingId ? { bookingId } : undefined);
  }
  if (redirectType === "INSTANT_BOOKING" || redirectType === "SEARCHING_PARTNER") {
    return navigationRef.navigate("InstantBookingStatus", bookingId ? { bookingId } : undefined);
  }
  if (redirectType === "SCHEDULED_BOOKING") {
    return navigationRef.navigate("ScheduledBookingStatus", bookingId ? { bookingId } : undefined);
  }
  if (redirectType === "TRACKING") {
    if (ENABLE_LIVE_TRACKING) {
      return navigationRef.navigate("LiveTracking", bookingId ? { bookingId } : undefined);
    }
    return navigationRef.navigate("Main", { screen: "Bookings" });
  }
  if (bookingId) {
    return navigationRef.navigate("PaymentStatus", { bookingId });
  }
  return navigationRef.navigate("Notifications");
}

function Bootstrap() {
  useAuthBootstrap();
  const token = useAppSelector((s) => s.auth.token);
  const refreshToken = useAppSelector((s) => s.auth.refreshToken);
  const user = useAppSelector((s) => s.auth.user);
  const hydrated = useAppSelector((s) => s.auth.hydrated);
  const mode = useColorScheme();
  const [pushBannerVisible, setPushBannerVisible] = useState(false);
  const [pushBannerText, setPushBannerText] = useState("");
  const userId = String(user?.id ?? "").trim();
  const icon = ({ color, name, size }: { color: string; name: string; size: number }) => (
    <MaterialCommunityIcon color={color} name={name} size={size} />
  );

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
  }, [token]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!hydrated) return;
      if (!active) return;
      if (token) {
        await saveSession(token, refreshToken ?? undefined, user ?? undefined);
        await initializePushNotifications();
      }
    })().catch(() => null);
    return () => {
      active = false;
    };
  }, [hydrated, refreshToken, token, user]);

  return (
    <PaperProvider
      settings={{ icon }}
      theme={mode === "dark" ? MD3DarkTheme : MD3LightTheme}
    >
      <AppNavigator darkMode={mode === "dark"} navigationRef={navigationRef} />
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
  errorRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: "#FFF1F2",
  },
  errorTitle: { color: "#9F1239", fontSize: 18, fontWeight: "700", marginBottom: 8 },
  errorText: { color: "#881337", textAlign: "center" },
});

