import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useInstantBookingLifecycle } from "../../hooks/useInstantBookingLifecycle";
import { useBookingLifecycleNavigation } from "../../hooks/useBookingLifecycleNavigation";
import { COLORS } from '../../theme/colors';

type BookingProcessingRoute = { params?: { bookingId?: string } };


export function BookingProcessingScreen({ route, navigation }: { route: BookingProcessingRoute; navigation: any }) {
  const bookingId = String(route?.params?.bookingId ?? "").trim();
  const bookingQuery = useInstantBookingLifecycle(bookingId);
  useBookingLifecycleNavigation({
    bookingId,
    details: bookingQuery.data,
    navigation,
    currentRouteName: "BookingProcessing",
  });

  return (
    <View style={styles.root}>
      <View style={styles.orb} />
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.title}>Processing Your Booking</Text>
      <Text style={styles.sub}>{bookingQuery.data?.message ?? "We are validating availability and payment details. This usually takes a few seconds."}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.offWhite, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  orb: { position: "absolute", top: 110, width: 220, height: 220, borderRadius: 110, backgroundColor: COLORS.offWhite },
  title: { color: COLORS.primary, fontSize: 22, fontWeight: "900", textAlign: "center" },
  sub: { color: COLORS.slate700, fontSize: 14, fontWeight: "600", textAlign: "center", lineHeight: 20 },
});






