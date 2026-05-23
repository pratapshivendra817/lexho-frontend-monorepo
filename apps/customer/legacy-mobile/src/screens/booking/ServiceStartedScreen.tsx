import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { StatusBadge } from "../../components/booking/StatusBadge";
import { BookingStatus } from "../../types/bookingLifecycle";
import { BookingStageShell } from "../../components/booking/BookingStageShell";
import { useInstantBookingLifecycle } from "../../hooks/useInstantBookingLifecycle";
import { useBookingLifecycleNavigation } from "../../hooks/useBookingLifecycleNavigation";
import { bookingTheme } from "../../components/booking/bookingTheme";

type ServiceStartedRoute = { params?: { bookingId?: string } };

export function ServiceStartedScreen({ route, navigation }: { route: ServiceStartedRoute; navigation: any }) {
  const bookingId = String(route?.params?.bookingId ?? "").trim();
  const bookingQuery = useInstantBookingLifecycle(bookingId);
  useBookingLifecycleNavigation({
    bookingId,
    details: bookingQuery.data,
    navigation,
    currentRouteName: "ServiceStarted",
  });

  return (
    <BookingStageShell title="Service Started" subtitle={bookingQuery.data?.message ?? "Partner has started working on your request. You can follow live updates here."}>
      <StatusBadge status={BookingStatus.IN_PROGRESS} />
      <View style={styles.card}>
        <Text style={styles.row}>Booking ID: {bookingQuery.data?.id ?? bookingId}</Text>
        <Text style={styles.row}>Partner: {bookingQuery.data?.partnerName ?? "-"}</Text>
        <Text style={styles.row}>Address: {bookingQuery.data?.fullAddress ?? bookingQuery.data?.address ?? "-"}</Text>
      </View>
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
});
