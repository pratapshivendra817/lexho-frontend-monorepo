import React, { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import { COLORS } from "../../../constants/colors";
import { usePartnerNavigation } from "../hooks/usePartnerNavigation";
import { buildRouteFeature, ensureMapboxConfigured, getMapboxStyleUrl, getRouteBounds, toMapboxCoordinate } from "../services/mapboxService";

function formatEta(seconds: number | null) {
  if (!seconds) return "--";
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min`;
}

function formatDistance(distanceMeters: number | null) {
  if (!distanceMeters) return "--";
  return distanceMeters >= 1000 ? `${(distanceMeters / 1000).toFixed(1)} km` : `${Math.round(distanceMeters)} m`;
}

export default function RouteMapScreen({ route, navigation }: any) {
  const bookingId = Number(route?.params?.orderId ?? route?.params?.bookingId ?? 0);
  const customerLocation = useMemo(() => {
    const latitude = Number(route?.params?.customerLatitude);
    const longitude = Number(route?.params?.customerLongitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { latitude, longitude };
  }, [route?.params?.customerLatitude, route?.params?.customerLongitude]);
  const { navigation: navigationState, tracking } = usePartnerNavigation({
    bookingId,
    customerLocation,
    autoStart: false,
  });

  const Mapbox = require("@rnmapbox/maps").default;
  ensureMapboxConfigured(Mapbox);

  const activeRoute = navigationState.activeRoute;
  const routeFeature = activeRoute ? buildRouteFeature(activeRoute) : null;
  const bounds = activeRoute ? getRouteBounds(activeRoute) : null;

  return (
    <View style={styles.root}>
      <View style={styles.headerCard}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.heading}>Route Preview</Text>
          <Text style={styles.subheading}>Booking #{bookingId}</Text>
        </View>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() =>
            navigation.navigate("LiveTracking", {
              orderId: bookingId,
              customerLatitude: customerLocation?.latitude,
              customerLongitude: customerLocation?.longitude,
            })
          }
        >
          <Text style={styles.primaryButtonText}>Start Navigation</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <InfoCard label="ETA" value={formatEta(navigationState.eta)} icon="clock-outline" />
        <InfoCard label="Distance" value={formatDistance(navigationState.distance)} icon="map-marker-distance" />
        <InfoCard
          label="Traffic"
          value={formatEta(navigationState.trafficDelaySeconds)}
          icon="traffic-light-outline"
        />
      </View>

      <View style={styles.mapShell}>
        {activeRoute && bounds ? (
          <Mapbox.MapView style={styles.map} styleURL={getMapboxStyleUrl()}>
            <Mapbox.Camera
              bounds={{ ne: bounds.ne, sw: bounds.sw, paddingTop: 80, paddingBottom: 80, paddingLeft: 40, paddingRight: 40 }}
            />
            <Mapbox.ShapeSource id="route-source" shape={routeFeature}>
              <Mapbox.LineLayer
                id="route-line"
                style={{ lineColor: COLORS.secondary, lineWidth: 5, lineCap: "round", lineJoin: "round" }}
              />
            </Mapbox.ShapeSource>
            <Mapbox.PointAnnotation id="partner-marker" coordinate={toMapboxCoordinate(activeRoute.partnerLocation)} />
            <Mapbox.PointAnnotation id="customer-marker" coordinate={toMapboxCoordinate(activeRoute.customerLocation)} />
          </Mapbox.MapView>
        ) : (
          <View style={styles.placeholder}>
            {navigationState.routeStatus === "loading" ? (
              <>
                <ActivityIndicator color={COLORS.secondary} />
                <Text style={styles.placeholderText}>Fetching route...</Text>
              </>
            ) : (
              <Text style={styles.placeholderText}>{navigationState.lastError ?? "Route preview will appear here."}</Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.footerCard}>
        <Text style={styles.footerTitle}>Customer Details</Text>
        <Text style={styles.footerMeta}>Live GPS status: {tracking.accuracyValid ? "Accurate" : "Verifying"}</Text>
        <Text style={styles.footerMeta}>Route source: {activeRoute?.source ?? "pending"}</Text>
      </View>
    </View>
  );
}

function InfoCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={styles.infoCard}>
      <MaterialCommunityIcons name={icon as any} size={18} color={COLORS.accent} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background, padding: 16, gap: 12 },
  headerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 12,
  },
  headerTextWrap: { gap: 4 },
  heading: { color: COLORS.textPrimary, fontSize: 22, fontWeight: "800" },
  subheading: { color: COLORS.textSecondary, fontSize: 13, fontWeight: "600" },
  primaryButton: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryButtonText: { color: COLORS.background, fontWeight: "800" },
  statsRow: { flexDirection: "row", gap: 8 },
  infoCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    padding: 12,
    gap: 4,
  },
  infoLabel: { color: COLORS.textSecondary, fontSize: 11, fontWeight: "700" },
  infoValue: { color: COLORS.textPrimary, fontSize: 16, fontWeight: "800" },
  mapShell: {
    flex: 1,
    minHeight: 320,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  map: { flex: 1 },
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 20 },
  placeholderText: { color: COLORS.textSecondary, textAlign: "center" },
  footerCard: {
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    padding: 14,
    gap: 4,
  },
  footerTitle: { color: COLORS.textPrimary, fontWeight: "800" },
  footerMeta: { color: COLORS.textSecondary, fontSize: 12 },
});
