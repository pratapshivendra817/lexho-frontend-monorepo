import MapView, { Marker, Polyline } from "react-native-maps";
import { StyleSheet, View } from "react-native";

type LatLng = { latitude: number; longitude: number };

export function LiveMapView({ customer, partner, routePoints = [] }: { customer: LatLng; partner: LatLng; routePoints?: LatLng[] }) {
  return (
    <View style={styles.wrap}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: (customer.latitude + partner.latitude) / 2,
          longitude: (customer.longitude + partner.longitude) / 2,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        }}
      >
        <Marker coordinate={customer} title="You" />
        <Marker coordinate={partner} title="Partner" pinColor="#16A34A" />
        {routePoints.length > 1 ? <Polyline coordinates={routePoints} strokeWidth={4} strokeColor="#2563EB" /> : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "#E2E8F0" },
  map: { height: 260 },
});
