import { Linking, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { BookingStageShell } from "../../components/booking/BookingStageShell";
import { StatusBadge } from "../../components/booking/StatusBadge";
import { bookingTheme } from "../../components/booking/bookingTheme";
import { useBookingLifecycleNavigation } from "../../hooks/useBookingLifecycleNavigation";
import { useInstantBookingLifecycle } from "../../hooks/useInstantBookingLifecycle";
import { getBookingMeta } from "../../utils/bookingMeta";
import { radii, shadows, spacing } from "../../constants/theme";
import { COLORS } from "../../theme/colors";

type PartnerArrivedRoute = { params?: { bookingId?: string } };

function formatDateTime(value?: string) {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) return raw;
  return parsed.toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
}

function showStartPin(booking: any) {
  return String(booking?.serviceStartPin ?? "").trim().length > 0;
}

export function PartnerArrivedScreen({ route, navigation }: { route: PartnerArrivedRoute; navigation: any }) {
  const bookingId = String(route?.params?.bookingId ?? "").trim();
  const bookingQuery = useInstantBookingLifecycle(bookingId);
  const booking = bookingQuery.data;
  const meta = getBookingMeta(booking);
  const phone = String(booking?.partnerPhone ?? "").trim();

  useBookingLifecycleNavigation({
    bookingId,
    details: booking,
    navigation,
    currentRouteName: "PartnerArrived",
  });

  return (
    <BookingStageShell title="Partner Arrived" subtitle={booking?.message ?? "Partner has arrived at your location."}>
      <StatusBadge status={String(booking?.assignmentStatus ?? "ARRIVED").toUpperCase()} />
      <View style={styles.card}>
        <View style={styles.iconRow}>
          <View style={styles.iconWrap}>
            <MaterialCommunityIcon name="map-marker-check-outline" size={22} color={COLORS.green700} />
          </View>
          <View style={styles.iconText}>
            <Text style={styles.title}>Partner has arrived at your location.</Text>
            <Text style={styles.subtitle}>Please allow entry or coordinate with the partner.</Text>
          </View>
        </View>
        <Text style={styles.row}>Partner: {booking?.partnerName ?? "-"}</Text>
        <Text style={styles.row}>Phone: {phone || "-"}</Text>
        <Text style={styles.row}>Arrival Time: {formatDateTime(meta.arrivalTime)}</Text>
        <Text style={styles.row}>Service: {booking?.serviceName ?? "-"}</Text>
      </View>

      {meta.canCallPartner && phone ? (
        <Pressable style={styles.primaryBtn} onPress={() => Linking.openURL(`tel:${phone}`)}>
          <Text style={styles.primaryText}>Call Partner</Text>
        </Pressable>
      ) : null}

      {showStartPin(booking) ? (
        <View style={styles.pinCard}>
          <Text style={styles.pinTitle}>Service Start PIN</Text>
          <Text style={styles.pinValue}>{booking?.serviceStartPin}</Text>
          <Text style={styles.pinMeta}>Expires: {formatDateTime(booking?.serviceStartPinExpiresAt)}</Text>
        </View>
      ) : null}

      <View style={styles.startState}>
        <Text style={styles.startText}>Waiting for service to start.</Text>
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
    gap: 10,
    ...shadows.sm,
  },
  iconRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  iconWrap: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.offWhite },
  iconText: { flex: 1, gap: 2 },
  title: { color: bookingTheme.colors.textPrimary, fontSize: 15, fontWeight: "900" },
  subtitle: { color: bookingTheme.colors.textMuted, fontSize: 13, fontWeight: "700" },
  row: { color: bookingTheme.colors.textMuted, fontSize: 13, fontWeight: "700" },
  primaryBtn: { backgroundColor: bookingTheme.colors.primaryBtn, borderRadius: radii.md, paddingVertical: spacing.md + 1, alignItems: "center", ...shadows.sm },
  primaryText: { color: bookingTheme.colors.primaryBtnText, fontSize: 14, fontWeight: "900" },
  pinCard: { borderRadius: radii.md, borderWidth: 1, borderColor: COLORS.borderSoft, backgroundColor: COLORS.white, padding: spacing.md, gap: 6, alignItems: "center" },
  pinTitle: { color: bookingTheme.colors.textPrimary, fontSize: 13, fontWeight: "900" },
  pinValue: { color: bookingTheme.colors.textPrimary, fontSize: 28, fontWeight: "900", letterSpacing: 4 },
  pinMeta: { color: bookingTheme.colors.textMuted, fontSize: 12, fontWeight: "700" },
  startState: { borderRadius: radii.md, borderWidth: 1, borderColor: COLORS.borderSoft, backgroundColor: COLORS.white, padding: spacing.md, alignItems: "center" },
  startText: { color: bookingTheme.colors.textPrimary, fontSize: 13, fontWeight: "800", textAlign: "center" },
});
