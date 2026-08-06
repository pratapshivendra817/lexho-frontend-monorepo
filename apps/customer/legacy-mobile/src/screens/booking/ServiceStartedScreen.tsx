import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { StatusBadge } from "../../components/booking/StatusBadge";
import { BookingStatus } from "../../types/bookingLifecycle";
import { BookingStageShell } from "../../components/booking/BookingStageShell";
import { useInstantBookingLifecycle } from "../../hooks/useInstantBookingLifecycle";
import { useBookingLifecycleNavigation } from "../../hooks/useBookingLifecycleNavigation";
import { bookingTheme } from "../../components/booking/bookingTheme";
import { radii, shadows, spacing } from "../../constants/theme";

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





