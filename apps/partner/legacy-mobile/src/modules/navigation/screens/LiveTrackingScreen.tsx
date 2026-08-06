import React, { useMemo } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import { COLORS } from "../../../constants/colors";
import { usePartnerNavigation } from "../hooks/usePartnerNavigation";
import { buildRouteFeature, ensureMapboxConfigured, getMapboxStyleUrl, getRouteBounds, toMapboxCoordinate } from "../services/mapboxService";

function formatMeters(value: number | null) {
  if (!value) return "--";
  return value >= 1000 ? `${(value / 1000).toFixed(1)} km` : `${Math.round(value)} m`;
}

function formatSeconds(value: number | null) {
  if (!value) return "--";
  const minutes = Math.max(1, Math.round(value / 60));
  return `${minutes} min`;
}

export default function LiveTrackingScreen({ route }: any) {
  const bookingId = Number(route?.params?.orderId ?? route?.params?.bookingId ?? 0);
  const customerLocation = useMemo(() => {
    const latitude = Number(route?.params?.customerLatitude);
    const longitude = Number(route?.params?.customerLongitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { latitude, longitude };
  }, [route?.params?.customerLatitude, route?.params?.customerLongitude]);
  const { navigation, tracking, refreshRoute } = usePartnerNavigation({
    bookingId,
    customerLocation,
    autoStart: true,
  });

  const Mapbox = require("@rnmapbox/maps").default;
  ensureMapboxConfigured(Mapbox);
  const activeRoute = navigation.activeRoute;
  const routeFeature = activeRoute ? buildRouteFeature(activeRoute) : null;
  const bounds = activeRoute ? getRouteBounds(activeRoute) : null;

  return (
    <View style={styles.root}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Live Tracking</Text>
        <Text style={styles.heroSubtitle}>Booking #{bookingId}</Text>
      </View>

      <View style={styles.mapShell}>
        {activeRoute && bounds ? (
          <Mapbox.MapView style={styles.map} styleURL={getMapboxStyleUrl()}>
            <Mapbox.Camera
              followUserLocation
              followZoomLevel={15}
              bounds={{ ne: bounds.ne, sw: bounds.sw, paddingTop: 80, paddingBottom: 80, paddingLeft: 40, paddingRight: 40 }}
            />
            <Mapbox.UserLocation visible />
            <Mapbox.ShapeSource id="live-route-source" shape={routeFeature}>
              <Mapbox.LineLayer id="live-route-line" style={{ lineColor: COLORS.secondary, lineWidth: 6 }} />
            </Mapbox.ShapeSource>
            {tracking.currentLocation ? (
              <Mapbox.PointAnnotation
                id="live-partner"
                coordinate={toMapboxCoordinate(tracking.currentLocation)}
              />
            ) : null}
            <Mapbox.PointAnnotation id="live-customer" coordinate={toMapboxCoordinate(activeRoute.customerLocation)} />
          </Mapbox.MapView>
        ) : (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={COLORS.secondary} />
            <Text style={styles.loadingText}>{navigation.lastError ?? "Preparing live route..."}</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.metricsRow}>
          <MetricCard label="Remaining ETA" value={formatSeconds(navigation.eta)} icon="timer-outline" />
          <MetricCard label="Remaining Distance" value={formatMeters(navigation.distance)} icon="map-marker-distance" />
        </View>

        <View style={styles.metricsRow}>
          <MetricCard label="Current Speed" value={tracking.currentLocation?.speedKmh ? `${Math.round(tracking.currentLocation.speedKmh)} km/h` : "--"} icon="speedometer" />
          <MetricCard label="Traffic Delay" value={formatSeconds(navigation.trafficDelaySeconds)} icon="traffic-light-outline" />
        </View>

        <View style={styles.instructionCard}>
          <Text style={styles.sectionTitle}>Next Maneuver</Text>
          <Text style={styles.instructionText}>{navigation.nextInstruction?.text ?? "Continue on current route"}</Text>
          <Text style={styles.instructionMeta}>
            {formatMeters(navigation.nextInstruction?.distanceMeters ?? null)} away
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshButton} onPress={() => refreshRoute().catch(() => null)}>
          <Text style={styles.refreshButtonText}>Refresh Route & ETA</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={styles.metricCard}>
      <MaterialCommunityIcons name={icon as any} size={18} color={COLORS.accent} />
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  heroCard: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: COLORS.background,
  },
  heroTitle: { color: COLORS.textPrimary, fontSize: 22, fontWeight: "800" },
  heroSubtitle: { color: COLORS.textSecondary, marginTop: 4 },
  mapShell: {
    height: 320,
    marginHorizontal: 16,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  map: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 20 },
  loadingText: { color: COLORS.textSecondary, textAlign: "center" },
  content: { padding: 16, gap: 12 },
  metricsRow: { flexDirection: "row", gap: 8 },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    padding: 12,
    gap: 4,
  },
  metricLabel: { color: COLORS.textSecondary, fontSize: 11, fontWeight: "700" },
  metricValue: { color: COLORS.textPrimary, fontSize: 16, fontWeight: "800" },
  instructionCard: {
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    padding: 14,
    gap: 6,
  },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: "800" },
  instructionText: { color: COLORS.textPrimary, fontSize: 16, fontWeight: "700" },
  instructionMeta: { color: COLORS.textSecondary, fontSize: 12 },
  refreshButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 12,
  },
  refreshButtonText: { color: COLORS.background, fontWeight: "800" },
});
