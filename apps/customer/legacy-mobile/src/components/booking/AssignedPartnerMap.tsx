import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MAPBOX_PUBLIC_TOKEN } from "../../constants/env";
import type { BookingSummaryDto } from "../../types/contracts";
import { COLORS } from "../../theme/colors";

function coordinate(latitude: unknown, longitude: unknown): [number, number] | null {
  if (latitude == null || longitude == null || String(latitude).trim() === "" || String(longitude).trim() === "") return null;
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) return null;
  return [lng, lat];
}

export function AssignedPartnerMap({ booking }: { booking?: BookingSummaryDto }) {
  const map = booking?.map;
  const partner = coordinate(map?.partner?.latitude, map?.partner?.longitude);
  const customer = coordinate(map?.customer?.latitude, map?.customer?.longitude);
  let message = "Waiting for partner location";
  let Mapbox: any;
  if (map?.enabled && booking?.meta?.showMap && partner) {
    if (!String(MAPBOX_PUBLIC_TOKEN ?? "").trim()) {
      message = "Map is currently unavailable";
    } else {
      try {
        Mapbox = require("@rnmapbox/maps").default;
        Mapbox.setAccessToken(MAPBOX_PUBLIC_TOKEN);
      } catch {
        message = "Map is currently unavailable";
      }
    }
  }
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Partner location</Text>
      {Mapbox && partner ? (
        <Mapbox.MapView style={styles.map} styleURL={Mapbox.StyleURL.Dark}>
          <Mapbox.Camera zoomLevel={14} centerCoordinate={partner} />
          <Mapbox.PointAnnotation id="assigned-partner" coordinate={partner}>
            <View style={styles.partnerMarker} collapsable={false}><Text style={styles.markerLabel}>P</Text></View>
          </Mapbox.PointAnnotation>
          {customer ? (
            <Mapbox.PointAnnotation id="booking-address" coordinate={customer}>
              <View style={styles.customerMarker} collapsable={false}><Text style={styles.markerLabel}>H</Text></View>
            </Mapbox.PointAnnotation>
          ) : null}
        </Mapbox.MapView>
      ) : <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: COLORS.goldSoft, borderRadius: 18, overflow: "hidden" },
  title: { color: COLORS.goldSoft, fontWeight: "700", padding: 14 },
  message: { color: COLORS.goldSoft, padding: 18, paddingTop: 0 },
  map: { height: 250 },
  partnerMarker: { backgroundColor: COLORS.goldSoft, borderRadius: 16, width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  customerMarker: { backgroundColor: COLORS.blue600, borderRadius: 16, width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  markerLabel: { color: COLORS.navyDark, fontWeight: "900" },
});
