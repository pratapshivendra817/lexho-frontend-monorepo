import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StyleSheet, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Button, Text } from "react-native-paper";

import { useAppSelector } from "../../redux/hooks";
import { reverseGeocode } from "../../services/locationService";

export function MapAddressPickerScreen({ navigation, route }: any) {
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
  const reverseQuery = useQuery({
    queryKey: ["map-picker-reverse-geocode", marker.latitude, marker.longitude],
    queryFn: () => reverseGeocode({ latitude: marker.latitude, longitude: marker.longitude }),
  });
  const reverseData = reverseQuery.data?.data ?? reverseQuery.data ?? {};
  const addressPreview = String(
    reverseData?.fullAddress ??
      reverseData?.addressLine ??
      reverseData?.displayName ??
      reverseData?.formattedAddress ??
      "",
  ).trim();

  return (
    <View style={styles.root}>
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        onPress={(event: any) => {
          setMarker(event.nativeEvent.coordinate);
        }}
      >
        <Marker
          coordinate={marker}
          draggable
          onDragEnd={(event: any) => {
            setMarker(event.nativeEvent.coordinate);
          }}
        />
      </MapView>
      <View style={styles.sheet}>
        <Text style={styles.heading}>Pin exact address location</Text>
        <Text style={styles.meta}>
          Lat: {marker.latitude.toFixed(6)} | Lng: {marker.longitude.toFixed(6)}
        </Text>
        <Text style={styles.preview} numberOfLines={2}>
          {reverseQuery.isLoading ? "Resolving address..." : addressPreview || "Address preview not available"}
        </Text>
        <Button
          mode="contained"
          onPress={() =>
            navigation.navigate("AddAddressDetails", {
              address: route?.params?.address,
              pickedLocation: marker,
              pickedAddressLine: addressPreview,
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
  root: { flex: 1 },
  map: { flex: 1 },
  sheet: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  heading: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  meta: { color: "#475569", fontSize: 12 },
  preview: { color: "#334155", fontSize: 13 },
});
