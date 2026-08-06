import { StyleSheet, View } from "react-native";
import { COLORS } from '../../theme/colors';
import { MAPBOX_PUBLIC_TOKEN } from "../../constants/env";

type LatLng = { latitude: number; longitude: number };


export function LiveMapView({ customer, partner, routePoints = [] }: { customer: LatLng; partner: LatLng; routePoints?: LatLng[] }) {
  const Mapbox = require("@rnmapbox/maps").default;
  const token = String(MAPBOX_PUBLIC_TOKEN ?? "").trim();
  if (token) Mapbox.setAccessToken(token);
  const centerCoordinate: [number, number] = [
    (customer.longitude + partner.longitude) / 2,
    (customer.latitude + partner.latitude) / 2,
  ];
  const lineFeature =
    routePoints.length > 1
      ? {
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: routePoints.map((point) => [point.longitude, point.latitude]),
          },
          properties: {},
        }
      : null;

  return (
    <View style={styles.wrap}>
      <Mapbox.MapView style={styles.map} styleURL={Mapbox.StyleURL.Dark}>
        <Mapbox.Camera zoomLevel={13} centerCoordinate={centerCoordinate} />
        <Mapbox.PointAnnotation id="customer-pin" coordinate={[customer.longitude, customer.latitude]}><View /></Mapbox.PointAnnotation>
        <Mapbox.PointAnnotation id="partner-pin" coordinate={[partner.longitude, partner.latitude]}><View /></Mapbox.PointAnnotation>
        {lineFeature ? (
          <Mapbox.ShapeSource id="live-route" shape={lineFeature as any}>
            <Mapbox.LineLayer id="live-route-line" style={{ lineColor: COLORS.blue600, lineWidth: 4 }} />
          </Mapbox.ShapeSource>
        ) : null}
      </Mapbox.MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: COLORS.borderSoft },
  map: { height: 260 },
});
