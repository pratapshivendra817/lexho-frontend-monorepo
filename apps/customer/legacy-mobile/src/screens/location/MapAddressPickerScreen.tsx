import { useMemo, useState } from "react";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";

import { useAppSelector } from "../../redux/hooks";
import { reverseGeocode } from "../../services/locationService";
import { MAPBOX_PUBLIC_TOKEN } from "../../constants/env";
import { COLORS } from '../../theme/colors';

function toLatLngFromMapEvent(event: any): { latitude: number; longitude: number } | null {
  const coords = event?.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { latitude: lat, longitude: lng };
}

function pickAddressMeta(reverseData: any) {
  const root = reverseData?.data ?? reverseData ?? {};
  const addressText = String(
    root?.formattedAddress ??
      root?.fullAddress ??
      root?.addressLine ??
      root?.displayName ??
      "",
  );
  const parsedSector = addressText.match(/\bSector\s+\d+[A-Za-z]?\b/i)?.[0] ?? "";
  return {
    formattedAddress: String(root?.formattedAddress ?? "").trim(),
    area: String(root?.area ?? root?.locality ?? root?.subLocality ?? root?.neighbourhood ?? root?.neighborhood ?? "").trim(),
    sector: String(root?.sector ?? parsedSector).trim(),
    landmark: String(root?.landmark ?? "").trim(),
    city: String(root?.city ?? root?.town ?? root?.village ?? root?.district ?? "").trim(),
    state: String(root?.state ?? "").trim(),
    country: String(root?.country ?? "India").trim() || "India",
    pincode: String(root?.pincode ?? root?.postalCode ?? root?.postcode ?? "").trim(),
    latitude: Number(root?.latitude ?? root?.lat ?? 0),
    longitude: Number(root?.longitude ?? root?.lng ?? 0),
    serviceAvailable: typeof root?.serviceAvailable === "boolean" ? root.serviceAvailable : null,
  };
}

function buildAddressPreview(reverseData: any) {
  const meta = pickAddressMeta(reverseData);
  const structured = [meta.landmark, meta.area || meta.sector, meta.city, meta.state, meta.pincode, meta.country]
    .filter(Boolean)
    .join(", ");
  const fallback = String(
    reverseData?.data?.formattedAddress ??
      reverseData?.formattedAddress ??
      reverseData?.data?.fullAddress ??
      reverseData?.fullAddress ??
      reverseData?.data?.addressLine ??
      reverseData?.addressLine ??
      reverseData?.data?.displayName ??
      reverseData?.displayName ??
      "",
  ).trim();
  return meta.formattedAddress || structured || fallback;
}

export function MapAddressPickerScreen({ navigation, route }: any) {
  const Mapbox = require("@rnmapbox/maps").default;
  if (MAPBOX_PUBLIC_TOKEN) {
    Mapbox.setAccessToken(MAPBOX_PUBLIC_TOKEN);
  }

  const currentAddress = useAppSelector((s) => (s.location as any)?.currentAddress);
  const initial = route?.params?.initial;

  const initialRegion = useMemo(() => {
    const latitude = Number(initial?.latitude ?? currentAddress?.latitude ?? 28.6139);
    const longitude = Number(initial?.longitude ?? currentAddress?.longitude ?? 77.209);
    return {
      latitude: Number.isFinite(latitude) && latitude !== 0 ? latitude : 28.6139,
      longitude: Number.isFinite(longitude) && longitude !== 0 ? longitude : 77.209,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }, [currentAddress?.latitude, currentAddress?.longitude, initial?.latitude, initial?.longitude]);

  const [marker, setMarker] = useState({
    latitude: initialRegion.latitude,
    longitude: initialRegion.longitude,
  });
  const [debouncedMarker, setDebouncedMarker] = useState(marker);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedMarker(marker), 400);
    return () => clearTimeout(id);
  }, [marker]);
  const centerCoordinate = useMemo(() => [marker.longitude, marker.latitude] as [number, number], [marker.latitude, marker.longitude]);
  const reverseQuery = useQuery({
    queryKey: ["map-picker-reverse-geocode", debouncedMarker.latitude, debouncedMarker.longitude],
    queryFn: () =>
      reverseGeocode({
        lat: debouncedMarker.latitude,
        lng: debouncedMarker.longitude,
        detectionSource: "MAP_PICK",
        manualConfirmed: false,
      }),
  });
  const reverseData = reverseQuery.data?.data ?? reverseQuery.data ?? {};
  const addressPreview = buildAddressPreview(reverseData);
  const pickedAddressMeta = pickAddressMeta(reverseData);
  const pickedLocation =
    Number.isFinite(pickedAddressMeta.latitude) &&
    pickedAddressMeta.latitude !== 0 &&
    Number.isFinite(pickedAddressMeta.longitude) &&
    pickedAddressMeta.longitude !== 0
      ? { latitude: pickedAddressMeta.latitude, longitude: pickedAddressMeta.longitude }
      : marker;

  return (
    <View style={styles.root}>
      <Mapbox.MapView
        style={styles.map}
        styleURL={Mapbox.StyleURL.Dark}
        onPress={(event: any) => {
          const coords = toLatLngFromMapEvent(event);
          if (coords) setMarker(coords);
        }}
      >
        <Mapbox.Camera zoomLevel={16} centerCoordinate={centerCoordinate} />
        <Mapbox.PointAnnotation id="picked-location" coordinate={centerCoordinate}><View /></Mapbox.PointAnnotation>
      </Mapbox.MapView>
      <View style={styles.sheet}>
        <Text style={styles.heading}>Pin exact address location</Text>
        <Text style={styles.preview} numberOfLines={2}>
          {reverseQuery.isLoading ? "Resolving address..." : addressPreview || "Address preview not available"}
        </Text>
        <Button
          mode="contained"
          buttonColor={COLORS.goldSoft}
          textColor={COLORS.navyDark}
          onPress={() =>
            navigation.navigate("AddAddressDetails", {
              address: route?.params?.address,
              pickedLocation,
              pickedAddressLine: addressPreview,
              pickedAddressMeta,
            })
          }
        >
          Use This Location
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.navyDark },
  map: { flex: 1 },
  sheet: {
    marginHorizontal: 0,
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: COLORS.navyDark,
    borderRadius: 14,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
  },
  heading: { fontSize: 16, fontWeight: "800", color: COLORS.white },
  preview: { color: COLORS.neutral100, fontSize: 13 },
});
