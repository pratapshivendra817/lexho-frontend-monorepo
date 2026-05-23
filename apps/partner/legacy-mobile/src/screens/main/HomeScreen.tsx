import React, { useCallback, useEffect, useState } from "react";
import { Alert, AppState, Dimensions, ImageBackground, Linking, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker } from "react-native-maps";
import { useAppDispatch, useAppSelector } from "../../hooks/useRedux";
import { setLastKnownLocation, setOnlineStatus, setPartnerStats } from "../../redux/slices/partnerSlice";
import { setWalletSnapshot } from "../../redux/slices/walletSlice";
import { getDashboardStats, getPartnerHomeBanners } from "../../services/partnerService";
import { COLORS } from "../../constants/colors";
import { detectAndSyncCurrentLocation } from "../../services/locationTrackingService";
import { setPartnerAvailabilityApi } from "../../features/shift/shiftApi";

export default function HomeScreen() {
  const SHOW_LOCATION_DEBUG = __DEV__;
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();
  const online = useAppSelector((s) => s.partner.online);
  const stats = useAppSelector((s) => s.partner.stats);
  const lastKnownLocation = useAppSelector((s) => s.partner.lastKnownLocation);
  const isBoundaryVerifying = Boolean(lastKnownLocation?.boundaryVerifying);
  const [refreshing, setRefreshing] = useState(false);
  const [bannerItems, setBannerItems] = useState<Array<{ id: string; title: string; subtitle?: string; imageUrl?: string }>>([]);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [locationHint, setLocationHint] = useState<string>("Go Online to show location");
  const [shouldAutoGoOnline, setShouldAutoGoOnline] = useState(false);
  const bannerWidth = Dimensions.get("window").width - 32;
  const hasCoords = Boolean(lastKnownLocation && Number.isFinite(lastKnownLocation.latitude) && Number.isFinite(lastKnownLocation.longitude));

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
    setLocationHint("Detecting current location...");
    const location = await detectAndSyncCurrentLocation();
    dispatch(setLastKnownLocation(location));
    setLocationHint("Current location");
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
        setLocationHint("Location unavailable. Enable GPS and retry.");
      }
    } else {
      setLocationHint("Go Online to show location");
    }
  }, [dispatch, online]);

  useEffect(() => {
    load().catch(() => null);
  }, [load]);

  const onToggle = useCallback(async (value: boolean) => {
    if (!value) {
      setShouldAutoGoOnline(false);
      setLocationHint("Go Online to show location");
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
      setLocationHint("Location unavailable. Enable GPS and retry.");
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
                <Text style={styles.locationText}>
                  {lastKnownLocation.label ??
                    `${lastKnownLocation.latitude.toFixed(4)}, ${lastKnownLocation.longitude.toFixed(4)}`}
                </Text>
                {SHOW_LOCATION_DEBUG ? (
                  <>
                    <Text style={styles.locationDebugText}>
                      PIN: {lastKnownLocation.pincode ?? "N/A"} | ACC:{" "}
                      {typeof lastKnownLocation.accuracy === "number" ? `${Math.round(lastKnownLocation.accuracy)}m` : "N/A"} |{" "}
                      {lastKnownLocation.latitude.toFixed(5)}, {lastKnownLocation.longitude.toFixed(5)}
                    </Text>
                    <Text style={styles.locationDebugText}>
                      SRC: {lastKnownLocation.provider ?? "unknown"} | CONF: {lastKnownLocation.confidence ?? "LOW"}
                    </Text>
                    {lastKnownLocation.trustedAt ? (
                      <Text style={styles.locationDebugText}>
                        Last trusted: {new Date(lastKnownLocation.trustedAt).toLocaleTimeString()}
                      </Text>
                    ) : null}
                  </>
                ) : null}
                {lastKnownLocation.boundaryVerifying ? (
                  <Text style={styles.locationWarnText}>Near boundary, verifying pincode...</Text>
                ) : null}
                {lastKnownLocation.confidence === "LOW" ? (
                  <Text style={styles.locationWarnText}>Low confidence: Open sky me 10 sec rukkar Re-detect location karein.</Text>
                ) : null}
                <TouchableOpacity
                  style={[styles.redetectBtn, isBoundaryVerifying && styles.redetectBtnDisabled]}
                  disabled={isBoundaryVerifying}
                  onPress={() => detectLocationForOnline().catch(() => null)}
                >
                  <Text style={styles.redetectBtnText}>Re-detect location</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
          <View style={styles.headerCenter}>
            <TouchableOpacity
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
                      <View style={styles.bannerOverlay}>
                        <Text style={styles.bannerTag}>Premium Partner</Text>
                        <Text style={styles.bannerTitle} numberOfLines={2}>{item.title}</Text>
                        {item.subtitle ? <Text style={styles.bannerSubtitle} numberOfLines={2}>{item.subtitle}</Text> : null}
                      </View>
                    </ImageBackground>
                  </View>
                ))}
              </ScrollView>
              <View style={styles.bannerDots}>
                {bannerItems.map((item, index) => (
                  <View key={item.id} style={[styles.dot, index === bannerIndex && styles.dotActive]} />
                ))}
              </View>
            </>
          ) : (
            <View style={[styles.bannerPage, styles.bannerFallback]}>
              <Text style={styles.bannerTag}>Premium Partner</Text>
              <Text style={styles.bannerTitle}>Latest Offers From Admin</Text>
              <Text style={styles.bannerSubtitle}>Active banners will appear here automatically</Text>
            </View>
          )}
        </View>

        <View style={styles.quickPillsRow}>
          <QuickPill label="Orders" icon="clipboard-list-outline" onPress={() => navigation.navigate("Orders")} />
          <QuickPill label="History" icon="history" onPress={() => navigation.navigate("History")} />
          <QuickPill label="Earnings" icon="cash-multiple" onPress={() => navigation.navigate("Earnings")} />
          <QuickPill label="Shift" icon="truck-fast-outline" onPress={() => navigation.navigate("Shift")} />
        </View>

        <View style={styles.mapCard}>
          <View style={styles.mapCardHeader}>
            <Text style={styles.mapTitle}>Live Location</Text>
            <TouchableOpacity
              style={styles.mapLinkBtn}
              disabled={!hasCoords}
              onPress={async () => {
                if (!lastKnownLocation) return;
                const url = `https://www.google.com/maps/search/?api=1&query=${lastKnownLocation.latitude},${lastKnownLocation.longitude}`;
                await Linking.openURL(url);
              }}
            >
              <Text style={[styles.mapLinkText, !hasCoords && styles.mapLinkTextDisabled]}>Open Maps</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.mapWrap}>
            {hasCoords && lastKnownLocation ? (
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: lastKnownLocation.latitude,
                  longitude: lastKnownLocation.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
              >
                <Marker
                  coordinate={{ latitude: lastKnownLocation.latitude, longitude: lastKnownLocation.longitude }}
                  title="Your Live Location"
                  description={lastKnownLocation.label ?? "Current location"}
                />
              </MapView>
            ) : (
              <View style={styles.mapPlaceholder}>
                <Text style={styles.mapPlaceholderText}>{locationHint}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.cardRow}>
          <StatCard label="Today Earnings" value={`INR ${stats?.todayEarnings ?? 0}`} />
          <StatCard label="Completed Orders" value={String(stats?.totalCompletedOrders ?? 0)} />
        </View>
        <View style={styles.cardRow}>
          <StatCard label="Pending Orders" value={String(stats?.pendingOrders ?? 0)} />
          <StatCard label="Cancelled Orders" value={String(stats?.cancelledOrders ?? 0)} />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
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
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  locationText: { color: COLORS.textSecondary, marginTop: 2, fontSize: 12, fontWeight: "600" },
  locationDebugText: { color: COLORS.textSecondary, marginTop: 2, fontSize: 10, fontWeight: "500", opacity: 0.85 },
  locationWarnText: { color: "#FBBF24", marginTop: 2, fontSize: 10, fontWeight: "700" },
  redetectBtn: {
    marginTop: 4,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: COLORS.surfaceSoft,
  },
  redetectBtnText: { color: COLORS.textSecondary, fontSize: 10, fontWeight: "700" },
  redetectBtnDisabled: { opacity: 0.55 },
  headerCenter: { alignItems: "center", justifyContent: "center", gap: 2 },
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
  onlinePillOff: { backgroundColor: "rgba(128, 140, 160, 0.14)", borderColor: COLORS.border },
  onlineKnob: { width: 24, height: 24, borderRadius: 12 },
  onlineKnobOn: { backgroundColor: "#2ECC71" },
  onlineKnobOff: { backgroundColor: "#64748B" },
  onlinePillText: { marginLeft: 8, marginRight: 8, fontSize: 11, fontWeight: "800", letterSpacing: 0.4 },
  onlinePillTextOn: { color: "#B5F5CF" },
  onlinePillTextOff: { color: COLORS.textSecondary },
  bannerShell: {
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  bannerPage: { height: 170 },
  bannerImage: { flex: 1, justifyContent: "flex-end" },
  bannerImageRadius: { borderRadius: 20 },
  bannerOverlay: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 28,
    backgroundColor: "rgba(8, 12, 24, 0.42)",
    gap: 4,
  },
  bannerFallback: {
    backgroundColor: COLORS.surfaceElevated,
    padding: 16,
    justifyContent: "flex-end",
  },
  bannerTag: {
    color: "#89A2FF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  bannerTitle: { color: COLORS.white, fontWeight: "800", fontSize: 20, lineHeight: 24 },
  bannerSubtitle: { color: "#C7D2FE", fontSize: 12, lineHeight: 16, marginTop: 2 },
  bannerDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(10, 15, 30, 0.55)",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 4,
    backgroundColor: "#4B5563",
  },
  dotActive: {
    width: 18,
    backgroundColor: "#E2E8F0",
  },
  quickPillsRow: { flexDirection: "row", gap: 8 },
  quickPill: {
    flex: 1,
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  quickPillText: { color: COLORS.textPrimary, fontSize: 11, fontWeight: "700" },
  mapCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    padding: 10,
    gap: 8,
  },
  mapCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  mapTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: "800" },
  mapLinkBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: COLORS.surfaceSoft,
  },
  mapLinkText: { color: COLORS.textPrimary, fontSize: 11, fontWeight: "700" },
  mapLinkTextDisabled: { color: COLORS.textMuted },
  mapWrap: { borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: COLORS.border },
  map: { height: 180 },
  mapPlaceholder: { height: 180, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surfaceSoft, paddingHorizontal: 12 },
  mapPlaceholderText: { color: COLORS.textSecondary, fontSize: 12, textAlign: "center" },
  cardRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  statLabel: { color: COLORS.textSecondary, fontSize: 12 },
  statValue: { color: COLORS.textPrimary, fontSize: 20, fontWeight: "800", marginTop: 6 },
});
