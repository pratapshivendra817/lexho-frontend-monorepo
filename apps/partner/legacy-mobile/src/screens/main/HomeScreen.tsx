import React, { useCallback, useEffect, useState } from "react";
import { Alert, AppState, Dimensions, ImageBackground, Linking, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppDispatch, useAppSelector } from "../../hooks/useRedux";
import { setLastKnownLocation, setOnlineStatus, setPartnerStats } from "../../redux/slices/partnerSlice";
import { setWalletSnapshot } from "../../redux/slices/walletSlice";
import { getDashboardStats, getPartnerHomeBanners } from "../../services/partnerService";
import { COLORS } from "../../constants/colors";
import { detectAndSyncCurrentLocation } from "../../services/locationTrackingService";
import { setPartnerAvailabilityApi } from "../../features/shift/shiftApi";

export default function HomeScreen() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();
  const online = useAppSelector((s) => s.partner.online);
  const lastKnownLocation = useAppSelector((s) => s.partner.lastKnownLocation);
  const isBoundaryVerifying = Boolean(lastKnownLocation?.boundaryVerifying);
  const [refreshing, setRefreshing] = useState(false);
  const [bannerItems, setBannerItems] = useState<Array<{ id: string; title: string; subtitle?: string; imageUrl?: string }>>([]);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [shouldAutoGoOnline, setShouldAutoGoOnline] = useState(false);
  const bannerWidth = Dimensions.get("window").width;

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

  const detectLocationForOnline = useCallback(async () => {
    const location = await detectAndSyncCurrentLocation();
    dispatch(setLastKnownLocation(location));
  }, [dispatch]);

  const load = useCallback(async () => {
    const [next, banners] = await Promise.all([getDashboardStats(), getPartnerHomeBanners(5)]);
    dispatch(setPartnerStats(next));
    dispatch(setWalletSnapshot({ todayEarnings: next.todayEarnings, totalEarnings: next.todayEarnings }));
    setBannerItems(banners);
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

  const onToggle = useCallback(async (value: boolean) => {
    if (!value) {
      setShouldAutoGoOnline(false);
      try {
        await setPartnerAvailabilityApi(false);
        dispatch(setOnlineStatus(false));
      } catch {
        Alert.alert("Unable to go offline", "Please try again.");
      }
      return;
    }

    try {
      await detectLocationForOnline();
    } catch {
      Alert.alert("Enable GPS", "Please enable device location to go online.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open Settings",
          onPress: () => {
            setShouldAutoGoOnline(true);
            openGpsSettings().catch(() => null);
          },
        },
      ]);
      return;
    }

    try {
      await setPartnerAvailabilityApi(true);
      dispatch(setOnlineStatus(true));
      setShouldAutoGoOnline(false);
      navigation.navigate("Shift");
    } catch (error: any) {
      dispatch(setOnlineStatus(false));
      Alert.alert("Unable to go online", error?.message || "Please try again.");
    }
  }, [detectLocationForOnline, dispatch, navigation, openGpsSettings]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next !== "active") return;
      if (shouldAutoGoOnline && !online) {
        onToggle(true).catch(() => null);
        return;
      }
      if (online) detectLocationForOnline().catch(() => null);
    });
    return () => sub.remove();
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
              disabled={isBoundaryVerifying}
              onPress={() => onToggle(!online)}
            >
              <View style={[styles.onlineKnob, online ? styles.onlineKnobOn : styles.onlineKnobOff]} />
              <Text style={[styles.onlinePillText, online ? styles.onlinePillTextOn : styles.onlinePillTextOff]}>
                {online ? "ONLINE" : "OFFLINE"}
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
              <Text style={styles.bannerTag}>Premium Partner</Text>
              <Text style={styles.bannerTitle}>Latest Offers From Admin</Text>
              <Text style={styles.bannerSubtitle}>Active banners will appear here automatically</Text>
            </View>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickPillsRow}
        >
          <QuickPill label="Orders" icon="clipboard-list-outline" onPress={() => navigation.navigate("Orders")} />
          <QuickPill label="History" icon="history" onPress={() => navigation.navigate("History")} />
          <QuickPill label="Earnings" icon="cash-multiple" onPress={() => navigation.navigate("Earnings")} />
          <QuickPill label="Shift" icon="truck-fast-outline" onPress={() => navigation.navigate("Shift")} />
          <QuickPill label="Performance" icon="chart-line" onPress={() => navigation.navigate("Performance")} />
          <QuickPill label="Warnings" icon="alert-outline" onPress={() => navigation.navigate("WarningCenter")} />
          <QuickPill label="Leave Management" icon="calendar-account-outline" onPress={() => navigation.navigate("LeaveManagement")} />
        </ScrollView>
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
  quickPillsRow: { marginLeft: -16, paddingLeft: 6, paddingRight: 8, flexDirection: "row", gap: 8 },
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
