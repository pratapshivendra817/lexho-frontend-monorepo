import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { BookingStageShell } from "../../components/booking/BookingStageShell";
import { StatusBadge } from "../../components/booking/StatusBadge";
import { bookingTheme } from "../../components/booking/bookingTheme";
import { useInstantBookingLifecycle } from "../../hooks/useInstantBookingLifecycle";
import { getBookingMeta } from "../../utils/bookingMeta";
import { radii, shadows, spacing } from "../../constants/theme";

type FallbackRoute = { params?: { bookingId?: string } };

export function BookingStatusFallbackScreen({ route }: { route: FallbackRoute; navigation: any }) {
  const bookingId = String(route?.params?.bookingId ?? "").trim();
  const bookingQuery = useInstantBookingLifecycle(bookingId);
  const booking = bookingQuery.data;
  const meta = getBookingMeta(booking);

  return (
    <BookingStageShell title="Booking Status" subtitle={booking?.message ?? "Latest booking status is shown below."}>
      <StatusBadge status={String(booking?.assignmentStatus ?? booking?.status ?? "PENDING").toUpperCase()} />
      <View style={styles.card}>
        <Text style={styles.row}>Booking ID: {booking?.id ?? bookingId}</Text>
        <Text style={styles.row}>Service: {booking?.serviceName ?? "-"}</Text>
        <Text style={styles.row}>Status: {booking?.status ?? "-"}</Text>
        <Text style={styles.row}>Tracking Screen: {String(meta.trackingScreen ?? "UNKNOWN")}</Text>
      </View>
    </BookingStageShell>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: bookingTheme.colors.cardBorder,
    backgroundColor: bookingTheme.colors.cardBg,
    padding: spacing.md + 2,
    gap: 8,
    ...shadows.sm,
  },
  row: { color: bookingTheme.colors.textMuted, fontSize: 13, fontWeight: "700" },
});
