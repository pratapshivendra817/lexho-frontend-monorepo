import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { StatusBadge } from "../../components/booking/StatusBadge";
import { BookingStatus } from "../../types/bookingLifecycle";
import { BookingStageShell } from "../../components/booking/BookingStageShell";
import { useInstantBookingLifecycle } from "../../hooks/useInstantBookingLifecycle";
import { useBookingLifecycleNavigation } from "../../hooks/useBookingLifecycleNavigation";
import { bookingTheme } from "../../components/booking/bookingTheme";

type ServiceCompletedRoute = { params?: { bookingId?: string } };

export function ServiceCompletedScreen({ route, navigation }: { route: ServiceCompletedRoute; navigation: any }) {
  const bookingId = String(route?.params?.bookingId ?? "").trim();
  const bookingQuery = useInstantBookingLifecycle(bookingId);
  useBookingLifecycleNavigation({
    bookingId,
    details: bookingQuery.data,
    navigation,
    currentRouteName: "ServiceCompleted",
  });

  return (
    <BookingStageShell title="Service Completed" subtitle="Everything is done. Please share your rating for this service.">
      <StatusBadge status={BookingStatus.COMPLETED} />
      <View style={styles.card}>
        <Text style={styles.row}>Booking ID: {bookingQuery.data?.id ?? bookingId}</Text>
        <Text style={styles.row}>Total Amount: Rs {bookingQuery.data?.totalAmount ?? bookingQuery.data?.amount ?? "-"}</Text>
      </View>
      <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate("RatePartner", { bookingId })}>
        <Text style={styles.primaryText}>Rate Partner</Text>
      </Pressable>
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
    gap: 8,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  row: { color: bookingTheme.colors.textMuted, fontSize: 13, fontWeight: "700" },
  primaryBtn: { borderRadius: bookingTheme.radius.button, backgroundColor: bookingTheme.colors.primaryBtn, alignItems: "center", paddingVertical: 13, marginTop: 8 },
  primaryText: { color: bookingTheme.colors.primaryBtnText, fontWeight: "900", letterSpacing: 0.2 },
});
