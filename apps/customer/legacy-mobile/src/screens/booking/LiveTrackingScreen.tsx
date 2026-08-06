import { Linking, StyleSheet, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { useEffect, useMemo, useState } from "react";
import { useInstantBookingLifecycle } from "../../hooks/useInstantBookingLifecycle";
import { useBookingLifecycleNavigation } from "../../hooks/useBookingLifecycleNavigation";
import { BookingStageShell } from "../../components/booking/BookingStageShell";
import { StatusBadge } from "../../components/booking/StatusBadge";
import { bookingTheme } from "../../components/booking/bookingTheme";
import { useAppSelector } from "../../redux/hooks";
import { useAppDispatch } from "../../redux/hooks";
import { MAPBOX_PUBLIC_TOKEN } from "../../constants/env";
import { getBookingMeta, shouldShowBookingMap } from "../../utils/bookingMeta";
import { captureFrontendError } from "../../services/monitoring";
import { trackLiveTrackingOpened, trackTrackPartnerClicked } from "../../services/customerAnalyticsEvents";
import { trackingStarted, trackingStopped, trackingUpdated } from "../../redux/trackingSlice";

type LiveRoute = { params?: { bookingId?: string } };

import { COLORS } from '../../theme/colors';

type LatLng = { latitude: number; longitude: number };

function toCoordinate(latitude: unknown, longitude: unknown): LatLng | null {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;
  return { latitude: lat, longitude: lng };
}

function TrackingPlaceholder() {
  return (
    <View style={styles.placeholderCard}>
      <Text style={styles.placeholderTitle}>Waiting for live location</Text>
      <Text style={styles.placeholderText}>Your partner location will appear here as soon as tracking starts.</Text>
    </View>
  );
}

function TrackingMap({
  customerCoord,
  partnerCoord,
  centerCoordinate,
  lineFeature,
}: {
  customerCoord: LatLng | null;
  partnerCoord: LatLng | null;
  centerCoordinate: [number, number];
  lineFeature: unknown;
}) {
  let Mapbox: any;
  try {
    Mapbox = require("@rnmapbox/maps").default;
    const token = String(MAPBOX_PUBLIC_TOKEN ?? "").trim();
    if (token) Mapbox.setAccessToken(token);
  } catch (error) {
    captureFrontendError(error, {
      screenName: "LiveTracking",
      userAction: "load_mapbox",
      apiEndpoint: "@rnmapbox/maps",
      errorCode: "MAPBOX_LOAD_FAILED",
    });
    return <TrackingPlaceholder />;
  }

  return (
    <Mapbox.MapView style={styles.map} styleURL={Mapbox.StyleURL.Dark}>
      <Mapbox.Camera zoomLevel={14} centerCoordinate={centerCoordinate} />
      {customerCoord ? (
        <Mapbox.PointAnnotation id="customer-location" coordinate={[customerCoord.longitude, customerCoord.latitude]}><View /></Mapbox.PointAnnotation>
      ) : null}
      {partnerCoord ? (
        <Mapbox.PointAnnotation id="partner-location" coordinate={[partnerCoord.longitude, partnerCoord.latitude]}><View /></Mapbox.PointAnnotation>
      ) : null}
      {lineFeature ? (
        <Mapbox.ShapeSource id="partner-route" shape={lineFeature as any}>
          <Mapbox.LineLayer id="partner-route-line" style={{ lineColor: COLORS.blue600, lineWidth: 4 }} />
        </Mapbox.ShapeSource>
      ) : null}
    </Mapbox.MapView>
  );
}

export function LiveTrackingScreen({ route, navigation }: { route: LiveRoute; navigation: any }) {
  const dispatch = useAppDispatch();
  const paramId = String(route?.params?.bookingId ?? "").trim();
  const [manualId, setManualId] = useState(paramId);
  const [autoFollow, setAutoFollow] = useState(true);
  const [routePoints, setRoutePoints] = useState<LatLng[]>([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>("-");
  const currentAddress = useAppSelector((s) => (s.location as any)?.currentAddress);
  const bookingId = useMemo(() => String(manualId || paramId).trim(), [manualId, paramId]);
  const bookingQuery = useInstantBookingLifecycle(bookingId);
  const booking = bookingQuery.data as any;
  useBookingLifecycleNavigation({
    bookingId,
    details: booking,
    navigation,
    currentRouteName: "LiveTracking",
  });

  useEffect(() => {
    if (!bookingId) return;
    dispatch(trackingStarted({ bookingId }));
    void trackLiveTrackingOpened({ booking_id: bookingId });
    return () => {
      dispatch(trackingStopped());
    };
  }, [bookingId, dispatch]);

  const meta = getBookingMeta(booking);
  const shouldLoadMapbox = shouldShowBookingMap(booking);
  const partnerFromMap = booking?.map?.partner ?? {};
  const customerFromMap = booking?.map?.customer ?? {};
  const partnerCoord = useMemo(
    () => toCoordinate(partnerFromMap?.latitude, partnerFromMap?.longitude),
    [partnerFromMap?.latitude, partnerFromMap?.longitude],
  );
  const customerCoord = useMemo(
    () =>
      toCoordinate(customerFromMap?.latitude, customerFromMap?.longitude) ??
      toCoordinate(currentAddress?.latitude, currentAddress?.longitude),
    [currentAddress?.latitude, currentAddress?.longitude, customerFromMap?.latitude, customerFromMap?.longitude],
  );
  const centerCoordinate = useMemo(() => {
    const source = partnerCoord ?? customerCoord;
    if (!source) return [77.209, 28.6139] as [number, number];
    return [source.longitude, source.latitude] as [number, number];
  }, [customerCoord, partnerCoord]);
  const lineFeature = useMemo(() => {
    if (routePoints.length < 2) return null;
    return {
      type: "Feature" as const,
      geometry: {
        type: "LineString" as const,
        coordinates: routePoints.map((p) => [p.longitude, p.latitude]),
      },
      properties: {},
    };
  }, [routePoints]);

  useEffect(() => {
    if (!partnerCoord) return;
    const updatedAt = String(partnerFromMap?.updatedAt ?? partnerFromMap?.lastHeartbeatAt ?? "").trim();
    setLastUpdatedAt(updatedAt || new Date().toLocaleTimeString());
    setRoutePoints((previous) => {
      const last = previous[previous.length - 1];
      if (last && Math.abs(last.latitude - partnerCoord.latitude) < 0.00005 && Math.abs(last.longitude - partnerCoord.longitude) < 0.00005) {
        return previous;
      }
      const next = [...previous, partnerCoord];
      return next.length > 30 ? next.slice(next.length - 30) : next;
    });
  }, [partnerCoord, partnerFromMap?.lastHeartbeatAt, partnerFromMap?.updatedAt]);

  useEffect(() => {
    dispatch(
      trackingUpdated({
        partnerLocation: partnerCoord,
        customerLocation: customerCoord,
        route: routePoints,
        etaMinutes: booking?.etaMinutes ?? null,
        lastUpdatedAt,
      }),
    );
  }, [booking?.etaMinutes, customerCoord, dispatch, lastUpdatedAt, partnerCoord, routePoints]);

  const openMap = async () => {
    if (!partnerCoord) return;
    void trackTrackPartnerClicked({ booking_id: bookingId, source: "live_tracking" });
    const url = `https://www.openstreetmap.org/?mlat=${partnerCoord.latitude}&mlon=${partnerCoord.longitude}#map=16/${partnerCoord.latitude}/${partnerCoord.longitude}`;
    await Linking.openURL(url);
  };

  return (
    <BookingStageShell title="Live Tracking" subtitle="Track your assigned partner in real time.">
      <StatusBadge status={String(bookingQuery.data?.assignmentStatus ?? bookingQuery.data?.status ?? "PARTNER_ASSIGNED").toUpperCase()} />
      <TextInput mode="outlined" label="Booking ID" value={manualId} onChangeText={setManualId} />
      <View style={styles.card}>
        <Text style={styles.meta}>Partner: {String(booking?.partnerName ?? "N/A")}</Text>
        <Text style={styles.meta}>ETA: {booking?.etaMinutes != null ? `${booking.etaMinutes} mins` : "N/A"}</Text>
        <Text style={styles.meta}>Last updated: {lastUpdatedAt}</Text>
        <Text style={styles.meta}>Latitude: {partnerCoord ? partnerCoord.latitude : "N/A"}</Text>
        <Text style={styles.meta}>Longitude: {partnerCoord ? partnerCoord.longitude : "N/A"}</Text>
      </View>
      <View style={styles.mapWrap}>
        {shouldLoadMapbox ? (
          <TrackingMap
            customerCoord={customerCoord}
            partnerCoord={partnerCoord}
            centerCoordinate={centerCoordinate}
            lineFeature={lineFeature}
          />
        ) : (
          <TrackingPlaceholder />
        )}
      </View>
      <View style={styles.actions}>
        <Button mode={autoFollow ? "contained-tonal" : "outlined"} onPress={() => setAutoFollow((previous) => !previous)}>
          {autoFollow ? "Auto-Follow ON" : "Auto-Follow OFF"}
        </Button>
      </View>
      <Button mode="contained" onPress={openMap} disabled={meta.canTrackPartner === false || !shouldLoadMapbox || !partnerCoord}>
        Open in Google Maps
      </Button>
      <Button mode="text" onPress={() => void bookingQuery.refetch()} loading={bookingQuery.isFetching}>
        Refresh location
      </Button>
      {bookingQuery.isError ? <Text style={styles.error}>We could not refresh the live location right now.</Text> : null}
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
    shadowColor: COLORS.slate900,
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
    backgroundColor: COLORS.white,
  },
  map: { height: 280 },
  placeholderCard: {
    minHeight: 220,
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.offWhite,
  },
  placeholderTitle: { color: bookingTheme.colors.textPrimary, fontSize: 16, fontWeight: "900", textAlign: "center" },
  placeholderText: { color: bookingTheme.colors.textMuted, fontSize: 13, fontWeight: "700", textAlign: "center", lineHeight: 19 },
  actions: { flexDirection: "row", justifyContent: "flex-end" },
  meta: { color: bookingTheme.colors.textMuted, fontSize: 13, fontWeight: "700" },
  error: { color: bookingTheme.colors.danger, fontWeight: "800" },
});
