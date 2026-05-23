import { useQuery } from "@tanstack/react-query";
import { Linking, StyleSheet, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { useEffect, useMemo, useRef, useState } from "react";
import MapView, { Marker, Polyline } from "react-native-maps";
import { getPartnerLiveLocation } from "../../api/bookingExtrasApi";
import { useInstantBookingLifecycle } from "../../hooks/useInstantBookingLifecycle";
import { useBookingLifecycleNavigation } from "../../hooks/useBookingLifecycleNavigation";
import { BookingStageShell } from "../../components/booking/BookingStageShell";
import { StatusBadge } from "../../components/booking/StatusBadge";
import { bookingTheme } from "../../components/booking/bookingTheme";
import { useAppSelector } from "../../redux/hooks";

type LiveRoute = { params?: { bookingId?: string } };
type LatLng = { latitude: number; longitude: number };

export function LiveTrackingScreen({ route, navigation }: { route: LiveRoute; navigation: any }) {
  const paramId = String(route?.params?.bookingId ?? "").trim();
  const [manualId, setManualId] = useState(paramId);
  const [autoFollow, setAutoFollow] = useState(true);
  const [routePoints, setRoutePoints] = useState<LatLng[]>([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>("-");
  const mapRef = useRef<MapView | null>(null);
  const currentAddress = useAppSelector((s) => (s.location as any)?.currentAddress);
  const bookingId = useMemo(() => String(manualId || paramId).trim(), [manualId, paramId]);
  const bookingQuery = useInstantBookingLifecycle(bookingId);
  useBookingLifecycleNavigation({
    bookingId,
    details: bookingQuery.data,
    navigation,
    currentRouteName: "LiveTracking",
  });

  const live = useQuery({
    queryKey: ["live-location", bookingId],
    queryFn: () => getPartnerLiveLocation(bookingId),
    enabled: bookingId.length > 0,
    refetchInterval: 10000,
  });

  const liveData = (live.data ?? {}) as Record<string, unknown>;
  const lat = Number(liveData?.lat ?? 0);
  const lng = Number(liveData?.lng ?? 0);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);
  const customerLat = Number(currentAddress?.latitude ?? 0);
  const customerLng = Number(currentAddress?.longitude ?? 0);
  const hasCustomerCoords = Number.isFinite(customerLat) && Number.isFinite(customerLng) && (customerLat !== 0 || customerLng !== 0);
  const partnerCoord = hasCoords ? ({ latitude: lat, longitude: lng } as LatLng) : null;
  const customerCoord = hasCustomerCoords ? ({ latitude: customerLat, longitude: customerLng } as LatLng) : null;

  useEffect(() => {
    if (!partnerCoord) return;
    setLastUpdatedAt(new Date().toLocaleTimeString());
    setRoutePoints((previous) => {
      const last = previous[previous.length - 1];
      if (last && Math.abs(last.latitude - partnerCoord.latitude) < 0.00005 && Math.abs(last.longitude - partnerCoord.longitude) < 0.00005) {
        return previous;
      }
      const next = [...previous, partnerCoord];
      return next.length > 30 ? next.slice(next.length - 30) : next;
    });
  }, [partnerCoord]);

  useEffect(() => {
    if (!mapRef.current || !autoFollow) return;
    const points: LatLng[] = [];
    if (customerCoord) points.push(customerCoord);
    if (partnerCoord) points.push(partnerCoord);
    if (points.length === 0) return;
    if (points.length === 1) {
      mapRef.current.animateToRegion(
        {
          latitude: points[0].latitude,
          longitude: points[0].longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        600,
      );
      return;
    }
    mapRef.current.fitToCoordinates(points, {
      edgePadding: { top: 100, right: 80, bottom: 80, left: 80 },
      animated: true,
    });
  }, [autoFollow, customerCoord, partnerCoord]);

  const openMap = async () => {
    if (!hasCoords) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    await Linking.openURL(url);
  };

  return (
    <BookingStageShell title="Live Tracking" subtitle="Track your assigned partner in real time.">
      <StatusBadge status={String(bookingQuery.data?.assignmentStatus ?? bookingQuery.data?.status ?? "PARTNER_ASSIGNED").toUpperCase()} />
      <TextInput mode="outlined" label="Booking ID" value={manualId} onChangeText={setManualId} />
      <View style={styles.card}>
        <Text style={styles.meta}>Partner: {String(bookingQuery.data?.partnerName ?? "N/A")}</Text>
        <Text style={styles.meta}>ETA: {String(liveData?.eta ?? "N/A")}</Text>
        <Text style={styles.meta}>Last updated: {lastUpdatedAt}</Text>
        <Text style={styles.meta}>Latitude: {hasCoords ? lat : "N/A"}</Text>
        <Text style={styles.meta}>Longitude: {hasCoords ? lng : "N/A"}</Text>
      </View>
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: customerCoord?.latitude ?? partnerCoord?.latitude ?? 28.6139,
            longitude: customerCoord?.longitude ?? partnerCoord?.longitude ?? 77.209,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
        >
          {customerCoord ? <Marker coordinate={customerCoord} title="You" /> : null}
          {partnerCoord ? <Marker coordinate={partnerCoord} title="Partner" pinColor="#16A34A" /> : null}
          {routePoints.length > 1 ? <Polyline coordinates={routePoints} strokeWidth={4} strokeColor="#2563EB" /> : null}
        </MapView>
      </View>
      <View style={styles.actions}>
        <Button mode={autoFollow ? "contained-tonal" : "outlined"} onPress={() => setAutoFollow((previous) => !previous)}>
          {autoFollow ? "Auto-Follow ON" : "Auto-Follow OFF"}
        </Button>
      </View>
      <Button mode="contained" onPress={openMap} disabled={!hasCoords}>
        Open in Google Maps
      </Button>
      <Button mode="text" onPress={() => void live.refetch()} loading={live.isFetching}>
        Refresh location
      </Button>
      {live.isError ? <Text style={styles.error}>Unable to fetch live location.</Text> : null}
    </BookingStageShell>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: bookingTheme.radius.card,
    borderWidth: 1,
    borderColor: bookingTheme.colors.cardBorder,
    backgroundColor: bookingTheme.colors.cardBg,
    padding: 14,
    gap: 7,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  mapWrap: {
    borderRadius: bookingTheme.radius.card,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: bookingTheme.colors.cardBorder,
  },
  map: { height: 280 },
  actions: { flexDirection: "row", justifyContent: "flex-end" },
  meta: { color: bookingTheme.colors.textMuted, fontSize: 13, fontWeight: "700" },
  error: { color: bookingTheme.colors.danger, fontWeight: "800" },
});
