import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, Dimensions, ImageBackground, Linking, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, Vibration, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppDispatch, useAppSelector } from "../../hooks/useRedux";
import { setLastKnownLocation, setOnlineStatus, setPartnerStats } from "../../redux/slices/partnerSlice";
import { setWalletSnapshot } from "../../redux/slices/walletSlice";
import { setActiveOrder } from "../../redux/slices/orderSlice";
import { getDashboardStats, getPartnerHomeBanners, getPartnerScreeningCentre } from "../../services/partnerService";
import { COLORS } from "../../constants/colors";
import { detectAndSyncCurrentLocation, startLocationTracking, stopLocationTracking } from "../../services/locationTrackingService";
import { setPartnerAvailabilityApi, startShiftApi } from "../../features/shift/shiftApi";
import { getShiftState } from "../../features/shift/shiftStorage";
import type { PartnerScreeningCentre } from "../../types/partner";
import { canReceiveNewBookings } from "../../utils/partnerDispatch";
import { useRealtimeDispatchRequests } from "../../hooks/useRealtimeDispatchRequests";
import { acceptDispatchRequest, rejectDispatchRequest } from "../../services/partnerService";
import type { PartnerOrder } from "../../types/order";
import ScreeningCentreCard from "./components/ScreeningCentreCard";
import { startBookingAlertSound, stopBookingAlertSound } from "../../services/bookingAlertSound";

const HOME_COPY = {
  retry: "Retry",
  goOfflineErrorTitle: "Unable to go offline",
  enableLocationTitle: "Enable GPS",
  enableLocationMessage: "Please enable device location to go online.",
  cancel: "Cancel",
  openSettings: "Open Settings",
  goOnlineErrorTitle: "Unable to go online",
  online: "ONLINE",
  offline: "OFFLINE",
  bannerTag: "Latest Offers From Admin",
  bannerTitle: "Home",
  bannerFallback: "Active banners will appear here automatically",
  orders: "Order",
  history: "Order History",
  earnings: "Earnings",
  shift: "Shift Management",
  performance: "Performance",
  warningCenter: "Warnings",
  visitCentre: "Visit Centre",
  openInMaps: "Open in Maps",
  callSupport: "Call Support",
  activeJob: "Active Job",
  openActiveJob: "Open Active Job",
} as const;

export default function HomeScreen() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();
  const online = useAppSelector((s) => s.partner.online);
  const lastKnownLocation = useAppSelector((s) => s.partner.lastKnownLocation);
  const activeOrder = useAppSelector((s) => s.orders.activeOrder);
  const isBoundaryVerifying = Boolean(lastKnownLocation?.boundaryVerifying);
  const [refreshing, setRefreshing] = useState(false);
  const toggleInFlight = useRef(false);
  // Keep this in a ref as well as state. Returning from Android Settings can
  // happen before React has committed the state update from the alert action.
  const autoOnlineRetryRef = useRef(false);
  const autoOnlineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toggling, setToggling] = useState(false);
  const [bannerItems, setBannerItems] = useState<Array<{ id: string; title: string; subtitle?: string; imageUrl?: string }>>([]);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [shouldAutoGoOnline, setShouldAutoGoOnline] = useState(false);
  const [screeningCentre, setScreeningCentre] = useState<PartnerScreeningCentre | null>(null);
  const [shiftStarted, setShiftStarted] = useState(true);
  const bannerWidth = Dimensions.get("window").width;
  const dispatchEligible = canReceiveNewBookings({
    online,
    shiftStarted,
  });
  const { orders: dispatchOrders, refresh: refreshDispatchOrders } = useRealtimeDispatchRequests(dispatchEligible);
  const [incomingBusy, setIncomingBusy] = useState(false);
  const [incomingSeconds, setIncomingSeconds] = useState(0);
  const incomingOrder = dispatchOrders.find((order) => {
    const status = String(order.status ?? "NEW").toUpperCase();
    return order.available !== false && ["NEW", "PENDING", "ASSIGNED"].includes(status);
  }) ?? null;

  useEffect(() => {
    if (!incomingOrder) {
      setIncomingSeconds(0);
      Vibration.cancel();
      stopBookingAlertSound();
      return;
    }
    const expiry = incomingOrder.expiresAt ? Date.parse(incomingOrder.expiresAt) : NaN;
    const initial = Number.isFinite(expiry)
      ? Math.max(0, Math.ceil((expiry - Date.now()) / 1000))
      : Math.max(1, Number(incomingOrder.expiresInSeconds ?? (incomingOrder.slaMinutes ? Number(incomingOrder.slaMinutes) * 60 : 30)));
    setIncomingSeconds(initial);
    Vibration.vibrate([0, 500, 500], true);
    startBookingAlertSound();
    const timer = setInterval(() => {
      const left = Number.isFinite(expiry)
        ? Math.max(0, Math.ceil((expiry - Date.now()) / 1000))
        : Math.max(0, initial - 1);
      setIncomingSeconds(left);
      if (left <= 0) {
        Vibration.cancel();
        stopBookingAlertSound();
        refreshDispatchOrders().catch(() => null);
      }
    }, 1000);
    return () => {
      clearInterval(timer);
      Vibration.cancel();
      stopBookingAlertSound();
    };
  }, [incomingOrder, refreshDispatchOrders]);

  const handleIncomingAccept = useCallback(async (order: PartnerOrder) => {
    if (incomingBusy || incomingSeconds <= 0) return;
    setIncomingBusy(true);
    try {
      const response = await acceptDispatchRequest(order.requestId ?? order.id);
      const responseData: any = response as any;
      const orderId = Number(responseData?.orderId ?? responseData?.bookingId ?? responseData?.data?.orderId ?? order.orderId ?? order.id);
      dispatch(setActiveOrder({ ...order, id: orderId, orderId, status: "ACCEPTED" }));
      Vibration.cancel();
      stopBookingAlertSound();
      refreshDispatchOrders().catch(() => null);
      navigation.navigate(String(order.bookingType ?? "").toUpperCase() === "INSTANT" ? "RouteMap" : "ActiveJob", {
        orderId,
        customerLatitude: order.latitude,
        customerLongitude: order.longitude,
      });
    } catch (error: any) {
      Alert.alert("Unable to accept booking", error?.message || "Please try again.");
    } finally {
      setIncomingBusy(false);
    }
  }, [dispatch, incomingBusy, incomingSeconds, navigation, refreshDispatchOrders]);

  const handleIncomingReject = useCallback(async (order: PartnerOrder) => {
    if (incomingBusy) return;
    setIncomingBusy(true);
    try {
      await rejectDispatchRequest(order.requestId ?? order.id, "Not available");
      Vibration.cancel();
      stopBookingAlertSound();
      refreshDispatchOrders().catch(() => null);
    } catch (error: any) {
      Alert.alert("Unable to reject booking", error?.message || "Please try again.");
    } finally {
      setIncomingBusy(false);
    }
  }, [incomingBusy, refreshDispatchOrders]);

  const openGpsSettings = useCallback(async () => {
    try {
      if (Platform.OS === "android") {
        await Linking.sendIntent("android.settings.LOCATION_SOURCE_SETTINGS");
        return;
      }
      await Linking.openURL("App-Prefs:Privacy&path=LOCATION");
    } catch {
      await Linking.openSettings();
    }
  }, []);

  const scheduleAutoOnlineRetry = useCallback(() => {
    autoOnlineRetryRef.current = true;
    setShouldAutoGoOnline(true);
  }, []);

  const detectLocationForOnline = useCallback(async () => {
    const location = await detectAndSyncCurrentLocation(true);
    dispatch(setLastKnownLocation(location));
  }, [dispatch]);

  const load = useCallback(async () => {
    const shiftSnapshot = await getShiftState().catch(() => null);
    if (shiftSnapshot?.online !== undefined && shiftSnapshot.online !== online) {
      dispatch(setOnlineStatus(Boolean(shiftSnapshot.online)));
    }
    setShiftStarted(online || (shiftSnapshot?.shiftStarted ?? true));

    const [statsResult, bannersResult, centreResult] = await Promise.allSettled([
      getDashboardStats(),
      getPartnerHomeBanners(5),
      getPartnerScreeningCentre(),
    ]);

    if (statsResult.status === "fulfilled") {
      dispatch(setPartnerStats(statsResult.value));
      dispatch(setWalletSnapshot({ todayEarnings: statsResult.value.todayEarnings, totalEarnings: statsResult.value.todayEarnings }));
    } else {
      throw statsResult.reason;
    }

    setBannerItems(bannersResult.status === "fulfilled" ? bannersResult.value : []);
    setScreeningCentre(centreResult.status === "fulfilled" ? centreResult.value : null);

    if (online) {
      try {
        await detectLocationForOnline();
      } catch {
        // Ignore location refresh failures during initial load; the header already reflects state.
      }
    }
  }, [detectLocationForOnline, dispatch, online]);

  useEffect(() => {
    load().catch(() => null);
  }, [load]);

  // Keep the backend's dispatch location fresh while the partner is online.
  // The online toggle alone is not enough for instant matching: dispatch also
  // requires a recent current_partner_locations row.
  useEffect(() => {
    if (!online) {
      if (typeof stopLocationTracking === "function") stopLocationTracking();
      return;
    }
    if (typeof startLocationTracking === "function") startLocationTracking(30_000).catch(() => null);
    return () => { if (typeof stopLocationTracking === "function") stopLocationTracking(); };
  }, [online]);

  useEffect(() => {
    if (activeOrder && ["COMPLETED", "CANCELLED", "REJECTED", "EXPIRED"].includes(String(activeOrder.status).toUpperCase())) {
      dispatch(setActiveOrder(null));
    }
  }, [activeOrder, dispatch]);

  const applyAvailability = useCallback(async (value: boolean) => {
    if (!value) {
      setShouldAutoGoOnline(false);
      try {
        await setPartnerAvailabilityApi(false);
        dispatch(setOnlineStatus(false));
      } catch {
        Alert.alert(HOME_COPY.goOfflineErrorTitle, HOME_COPY.retry);
      }
      return;
    }

    let availabilityActivated = false;
    let locationAttempted = false;
    try {
      await startShiftApi();
      availabilityActivated = true;
      await setPartnerAvailabilityApi(true);
      locationAttempted = true;
      await detectLocationForOnline();
    } catch (error: any) {
      if (availabilityActivated) {
        await setPartnerAvailabilityApi(false).catch(() => null);
      }
      dispatch(setOnlineStatus(false));
      if (!locationAttempted || error?.code === "LOCATION_SYNC_FAILED") {
        Alert.alert(HOME_COPY.goOnlineErrorTitle, error.message);
        return;
      }
      Alert.alert(HOME_COPY.enableLocationTitle, HOME_COPY.enableLocationMessage, [
        { text: HOME_COPY.cancel, style: "cancel" },
        {
          text: HOME_COPY.openSettings,
          onPress: () => {
            scheduleAutoOnlineRetry();
            openGpsSettings().catch(() => null);
          },
        },
      ]);
      return;
    }

    try {
      dispatch(setOnlineStatus(true));
      setShouldAutoGoOnline(false);
    } catch (error: any) {
      dispatch(setOnlineStatus(false));
      Alert.alert(HOME_COPY.goOnlineErrorTitle, error?.message || HOME_COPY.retry);
    }
  }, [detectLocationForOnline, dispatch, navigation, openGpsSettings, scheduleAutoOnlineRetry]);

  const onToggle = useCallback(async (value: boolean) => {
    if (toggleInFlight.current) return;
    toggleInFlight.current = true;
    setToggling(true);
    try {
      await applyAvailability(value);
    } finally {
      toggleInFlight.current = false;
      setToggling(false);
    }
  }, [applyAvailability]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next !== "active") return;
      if ((shouldAutoGoOnline || autoOnlineRetryRef.current) && !online) {
        autoOnlineRetryRef.current = false;
        if (autoOnlineTimerRef.current) clearTimeout(autoOnlineTimerRef.current);
        onToggle(true).catch(() => null);
        return;
      }
      if (online) detectLocationForOnline().catch(() => null);
    });
    return () => {
      sub.remove();
      if (autoOnlineTimerRef.current) clearTimeout(autoOnlineTimerRef.current);
    };
  }, [detectLocationForOnline, online, onToggle, shouldAutoGoOnline]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => {
          setRefreshing(true);
          try { await load(); } finally { setRefreshing(false); }
        }} />}
      >
        <View style={styles.header}>
          <View>
            {online && lastKnownLocation ? (
              <>
                <View style={styles.locationRow}>
                  <MaterialCommunityIcons name="map-marker-radius-outline" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.locationText}>
                    {lastKnownLocation.label ??
                      `${lastKnownLocation.latitude.toFixed(4)}, ${lastKnownLocation.longitude.toFixed(4)}`}
                  </Text>
                </View>
              </>
            ) : null}
          </View>
          <View style={styles.headerCenter}>
            <TouchableOpacity
              testID="home-online-toggle"
              activeOpacity={0.88}
              style={[styles.onlinePill, online ? styles.onlinePillOn : styles.onlinePillOff]}
              disabled={isBoundaryVerifying || toggling}
              accessibilityState={{ disabled: isBoundaryVerifying || toggling, busy: toggling }}
              onPress={() => onToggle(!online)}
            >
              <View style={[styles.onlineKnob, online ? styles.onlineKnobOn : styles.onlineKnobOff]} />
              <Text style={[styles.onlinePillText, online ? styles.onlinePillTextOn : styles.onlinePillTextOff]}>
                {online ? HOME_COPY.online : HOME_COPY.offline}
              </Text>
            </TouchableOpacity>
          </View>
          <View />
        </View>

        <View style={styles.bannerShell}>
          {bannerItems.length > 0 ? (
            <>
              <ScrollView
                testID="home-banner-scroll"
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(event) => {
                  const next = Math.round(event.nativeEvent.contentOffset.x / bannerWidth);
                  setBannerIndex(next);
                }}
              >
                {bannerItems.map((item) => (
                  <View key={item.id} style={[styles.bannerPage, { width: bannerWidth }]}>
                    <ImageBackground source={{ uri: item.imageUrl }} style={styles.bannerImage} imageStyle={styles.bannerImageRadius}>
                      <View style={styles.bannerOverlay} />
                    </ImageBackground>
                  </View>
                ))}
              </ScrollView>
            </>
          ) : (
            <View style={[styles.bannerPage, styles.bannerFallback]}>
              <Text style={styles.bannerTag}>{HOME_COPY.bannerTag}</Text>
              <Text style={styles.bannerTitle}>{HOME_COPY.bannerTitle}</Text>
              <Text style={styles.bannerSubtitle}>{HOME_COPY.bannerFallback}</Text>
            </View>
          )}
        </View>

        <Modal visible={Boolean(incomingOrder && incomingSeconds > 0)} transparent animationType="slide" onRequestClose={() => undefined}>
          {incomingOrder ? <View testID="home-incoming-booking-card" style={styles.incomingModalBackdrop}>
            <View style={styles.incomingCard}>
            <View style={styles.incomingHeader}>
              <View>
                <Text style={styles.incomingTitle}>New Booking Request</Text>
                <Text style={styles.incomingSubtitle}>{incomingOrder.bookingType === "SUBSCRIPTION" ? "Subscription service" : "New service booking"}</Text>
              </View>
              <Text testID="home-incoming-booking-timer" style={styles.incomingTimer}>{incomingSeconds}s</Text>
            </View>
            <View style={styles.incomingDivider} />
            <Text style={styles.incomingService}>{incomingOrder.serviceName ?? incomingOrder.serviceType ?? incomingOrder.serviceCategory ?? "Service"}</Text>
            {incomingOrder.subscriptionId ? <Text style={styles.incomingDetail}>Subscription ID: {incomingOrder.subscriptionId}</Text> : null}
            <Text style={styles.incomingDetail}>Customer name: {incomingOrder.customerName ?? "-"}</Text>
            <Text style={styles.incomingDetail}>Date: {incomingOrder.scheduledDate ?? "-"}</Text>
            <Text style={styles.incomingDetail}>Time: {incomingOrder.scheduledTime ?? "-"}</Text>
            <Text style={styles.incomingDetail}>Address: {incomingOrder.address ?? "-"}</Text>
            <Text style={styles.incomingDetail}>Payout: ₹{incomingOrder.payout ?? incomingOrder.amount ?? 0}</Text>
            <View style={styles.incomingActions}>
              <TouchableOpacity testID="home-incoming-reject" disabled={incomingBusy} style={styles.rejectButton} onPress={() => handleIncomingReject(incomingOrder)}>
                <Text style={styles.rejectButtonText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="home-incoming-accept" disabled={incomingBusy} style={styles.acceptButton} onPress={() => handleIncomingAccept(incomingOrder)}>
                <Text style={styles.acceptButtonText}>{incomingBusy ? "Accepting..." : "Accept Booking"}</Text>
              </TouchableOpacity>
            </View>
            </View>
          </View> : null}
        </Modal>

        {activeOrder ? (
          <TouchableOpacity
            testID="home-active-job-card"
            style={[styles.activeJobCard, dispatchEligible ? styles.activeJobCardEligible : null]}
            activeOpacity={0.92}
            onPress={() =>
              navigation.navigate("ActiveJob", {
                orderId: activeOrder.orderId ?? activeOrder.id,
                customerLatitude: activeOrder.latitude,
                customerLongitude: activeOrder.longitude,
              })
            }
          >
            <View style={styles.activeJobHeader}>
              <Text style={styles.activeJobTitle}>{HOME_COPY.activeJob}</Text>
              <Text style={styles.activeJobStatus}>{String(activeOrder.status ?? "ACCEPTED").toUpperCase()}</Text>
            </View>
            <Text style={styles.activeJobName}>{activeOrder.customerName ?? HOME_COPY.activeJob}</Text>
            <Text style={styles.activeJobMeta}>{activeOrder.address ?? "-"}</Text>
            <Text style={styles.activeJobCta}>{HOME_COPY.openActiveJob}</Text>
          </TouchableOpacity>
        ) : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickPillsRow}
        >
          <QuickPill label={HOME_COPY.orders} icon="clipboard-list-outline" onPress={() => navigation.navigate("Orders")} />
          <QuickPill label={HOME_COPY.history} icon="history" onPress={() => navigation.navigate("History")} />
          <QuickPill label={HOME_COPY.earnings} icon="cash-multiple" onPress={() => navigation.navigate("Earnings")} />
          <QuickPill label={HOME_COPY.shift} icon="truck-fast-outline" onPress={() => navigation.navigate("Shift")} />
          <QuickPill label={HOME_COPY.performance} icon="chart-line" onPress={() => navigation.navigate("Performance")} />
          <QuickPill label={HOME_COPY.warningCenter} icon="alert-outline" onPress={() => navigation.navigate("WarningCenter")} />
        </ScrollView>

        {screeningCentre ? (
          <View style={styles.screeningCentreWrap}>
            <Text style={styles.sectionTitle}>{HOME_COPY.visitCentre}</Text>
            <ScreeningCentreCard
              centre={screeningCentre}
              openMapsLabel={HOME_COPY.openInMaps}
              callSupportLabel={HOME_COPY.callSupport}
              onPress={() => navigation.navigate("ScreeningCentre")}
              testIDPrefix="home-screening-centre"
            />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickPill({ label, icon, onPress }: { label: string; icon: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.quickPill} activeOpacity={0.9} onPress={onPress}>
      <MaterialCommunityIcons name={icon as any} size={16} color={COLORS.textPrimary} />
      <Text style={styles.quickPillText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, backgroundColor: COLORS.background, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  locationText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: "600" },
  headerCenter: { marginLeft: "auto", alignItems: "flex-end", justifyContent: "center", gap: 2 },
  onlinePill: {
    height: 34,
    minWidth: 116,
    borderRadius: 999,
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
  },
  onlinePillOn: { backgroundColor: "rgba(46, 204, 113, 0.16)", borderColor: "#2ECC71" },
  onlinePillOff: { backgroundColor: "rgba(128, 140, 160, 0.14)", borderColor: COLORS.borderSoft },
  onlineKnob: { width: 24, height: 24, borderRadius: 12 },
  onlineKnobOn: { backgroundColor: "#2ECC71" },
  onlineKnobOff: { backgroundColor: "#64748B" },
  onlinePillText: { marginLeft: 8, marginRight: 8, fontSize: 11, fontWeight: "800", letterSpacing: 0.4 },
  onlinePillTextOn: { color: "#B5F5CF" },
  onlinePillTextOff: { color: COLORS.textSecondary },
  bannerShell: {
    marginHorizontal: -16,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  bannerPage: { height: 330 },
  bannerImage: { flex: 1, justifyContent: "flex-end" },
  bannerImageRadius: { borderRadius: 20 },
  bannerOverlay: {
    flex: 1,
  },
  bannerFallback: {
    backgroundColor: COLORS.surfaceElevated,
    padding: 16,
    justifyContent: "flex-end",
  },
  bannerTag: { color: COLORS.secondary, fontWeight: "800", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 },
  bannerTitle: { color: COLORS.textPrimary, fontWeight: "800", fontSize: 28, marginTop: 6 },
  bannerSubtitle: { color: COLORS.textSecondary, fontSize: 14, marginTop: 6, maxWidth: 240, lineHeight: 20 },
  quickPillsRow: { marginLeft: -16, paddingLeft: 6, paddingRight: 8, flexDirection: "row", gap: 8 },
  screeningCentreWrap: { gap: 10, marginHorizontal: -16 },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: "800", paddingHorizontal: 16 },
  incomingModalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(2, 12, 27, 0.72)" },
  incomingCard: { backgroundColor: "#102A43", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 6, borderWidth: 1, borderColor: "#38BDF8" },
  incomingHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  incomingTitle: { color: "#F8FAFC", fontSize: 18, fontWeight: "900" },
  incomingSubtitle: { color: "#BAE6FD", fontSize: 12, fontWeight: "700", marginTop: 3 },
  incomingTimer: { color: "#FBBF24", fontSize: 18, fontWeight: "900" },
  incomingDivider: { height: 1, backgroundColor: "rgba(125, 211, 252, 0.28)", marginVertical: 5 },
  incomingService: { color: "#7DD3FC", fontSize: 15, fontWeight: "800" },
  incomingDetail: { color: "#E2E8F0", fontSize: 13 },
  incomingActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  rejectButton: { flex: 1, alignItems: "center", padding: 11, borderRadius: 10, backgroundColor: "#7F1D1D" },
  rejectButtonText: { color: "#FECACA", fontWeight: "900" },
  acceptButton: { flex: 1, alignItems: "center", padding: 11, borderRadius: 10, backgroundColor: "#16A34A" },
  acceptButtonText: { color: "#FFFFFF", fontWeight: "900" },
  activeJobCard: {
    marginHorizontal: -16,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 6,
  },
  activeJobCardEligible: { borderColor: COLORS.secondary },
  activeJobHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  activeJobTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: "800" },
  activeJobStatus: { color: COLORS.secondary, fontSize: 11, fontWeight: "900" },
  activeJobName: { color: COLORS.textPrimary, fontSize: 14, fontWeight: "700" },
  activeJobMeta: { color: COLORS.textSecondary, fontSize: 12 },
  activeJobCta: { color: COLORS.secondary, fontSize: 12, fontWeight: "900", marginTop: 2 },
  quickPill: {
    minHeight: 40,
    minWidth: 108,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    backgroundColor: COLORS.surface,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  quickPillText: { color: COLORS.textPrimary, fontSize: 11, fontWeight: "700" },
});
