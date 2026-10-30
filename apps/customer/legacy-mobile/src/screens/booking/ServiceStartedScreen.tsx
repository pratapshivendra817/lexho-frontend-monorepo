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

function formatDateTime(value?: string) {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) return raw;
  return parsed.toLocaleString();
}


export function ServiceStartedScreen({ route, navigation }: { route: ServiceStartedRoute; navigation: any }) {
  const bookingId = String(route?.params?.bookingId ?? "").trim();
  const bookingQuery = useInstantBookingLifecycle(bookingId);
  const details = bookingQuery.data;
  useBookingLifecycleNavigation({
    bookingId,
    details,
    navigation,
    currentRouteName: "ServiceStarted",
  });

  return (
    <BookingStageShell title="Service Started" subtitle={details?.message ?? "Partner has started working on your request. You can follow live updates here."}>
      <StatusBadge status={BookingStatus.IN_PROGRESS} />
      <View style={styles.card}>
        <Text style={styles.row}>Booking ID: {details?.id ?? bookingId}</Text>
        <Text style={styles.row}>Partner: {details?.partnerName ?? "-"}</Text>
        <Text style={styles.row}>Address: {details?.fullAddress ?? details?.address ?? "-"}</Text>
      </View>
      {String(details?.serviceCompletePin ?? "").trim() ? (
        <View style={styles.pinCard}>
          <Text style={styles.pinTitle}>Service Complete PIN</Text>
          <Text style={styles.pinValue}>{details?.serviceCompletePin}</Text>
          <Text style={styles.row}>Share this only when the partner finishes the service.</Text>
          <Text style={styles.row}>Expires: {formatDateTime(details?.serviceCompletePinExpiresAt)}</Text>
        </View>
      ) : null}
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
  pinCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: bookingTheme.colors.cardBorder,
    backgroundColor: bookingTheme.colors.cardBg,
    padding: spacing.md + 2,
    gap: 8,
    alignItems: "center",
    ...shadows.sm,
  },
  pinTitle: { color: bookingTheme.colors.textPrimary, fontSize: 13, fontWeight: "900" },
  pinValue: { color: bookingTheme.colors.textPrimary, fontSize: 28, fontWeight: "900", letterSpacing: 4 },
});





