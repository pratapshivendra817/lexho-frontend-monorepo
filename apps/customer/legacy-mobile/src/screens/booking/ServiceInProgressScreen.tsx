import { StyleSheet, View } from "react-native";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { Text } from "react-native-paper";
import { BookingStageShell } from "../../components/booking/BookingStageShell";
import { StatusBadge } from "../../components/booking/StatusBadge";
import { bookingTheme } from "../../components/booking/bookingTheme";
import { useBookingLifecycleNavigation } from "../../hooks/useBookingLifecycleNavigation";
import { useInstantBookingLifecycle } from "../../hooks/useInstantBookingLifecycle";
import { BookingTimeline } from "../../components/booking/BookingTimeline";
import { radii, shadows, spacing } from "../../constants/theme";
import { COLORS } from "../../theme/colors";

type ServiceInProgressRoute = { params?: { bookingId?: string } };

function formatTime(value?: string | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) return raw;
  return parsed.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: true });
}

export function ServiceInProgressScreen({ route, navigation }: { route: ServiceInProgressRoute; navigation: any }) {
  const bookingId = String(route?.params?.bookingId ?? "").trim();
  const bookingQuery = useInstantBookingLifecycle(bookingId);
  const details = bookingQuery.data;

  useBookingLifecycleNavigation({
    bookingId,
    details,
    navigation,
    currentRouteName: "ServiceInProgress",
  });

  const progressStatus = String(details?.progressStatus ?? details?.trackingStatus ?? "").trim();

  return (
    <BookingStageShell title="Service In Progress" subtitle={details?.message ?? "Your service is underway."}>
      <StatusBadge status={String(details?.status ?? details?.assignmentStatus ?? "IN_PROGRESS").toUpperCase()} />
      <View style={styles.card}>
        <View style={styles.partnerRow}>
          <View style={styles.avatar}>
            <MaterialCommunityIcon name="account-hard-hat-outline" size={24} color={COLORS.goldSoft} />
          </View>
          <View style={styles.partnerText}>
            <Text style={styles.partnerName}>{details?.partnerName ?? "Partner"}</Text>
            <Text style={styles.meta}>{details?.partnerPhone ?? "Phone unavailable"}</Text>
          </View>
        </View>

        <View style={styles.line} />
        <Text style={styles.serviceName}>{details?.serviceName ?? "Service"}</Text>

        <BookingTimeline history={details?.statusHistory} compact />
        {progressStatus ? <Text style={styles.progressText}>{progressStatus}</Text> : null}

        <View style={styles.detailGrid}>
          <View style={styles.detailCell}>
            <Text style={styles.label}>Start Time</Text>
            <Text style={styles.value}>{formatTime(details?.serviceStartedAt ?? details?.scheduledAt)}</Text>
          </View>
          <View style={styles.detailCell}>
            <Text style={styles.label}>Expected Completion</Text>
            <Text style={styles.value}>{formatTime(details?.estimatedCompletionTime)}</Text>
          </View>
        </View>

        {String(details?.serviceCompletePin ?? "").trim() ? (
          <View style={styles.pinCard}>
            <Text style={styles.label}>Service Complete PIN</Text>
            <Text style={styles.pinValue}>{details?.serviceCompletePin}</Text>
            <Text style={styles.meta}>Expires: {formatTime(details?.serviceCompletePinExpiresAt)}</Text>
          </View>
        ) : null}
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
    gap: 12,
    ...shadows.sm,
  },
  partnerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.navyDark,
  },
  partnerText: { flex: 1, gap: 2 },
  partnerName: { color: bookingTheme.colors.textPrimary, fontSize: 16, fontWeight: "900" },
  meta: { color: bookingTheme.colors.textMuted, fontSize: 12, fontWeight: "700" },
  line: { height: 1, backgroundColor: COLORS.borderSoft },
  serviceName: { color: bookingTheme.colors.textPrimary, fontSize: 18, fontWeight: "900" },
  progressList: { gap: 8 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  progressText: { color: bookingTheme.colors.textPrimary, fontSize: 14, fontWeight: "800" },
  detailGrid: { flexDirection: "row", gap: 8 },
  detailCell: {
    flex: 1,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    backgroundColor: COLORS.offWhite,
    padding: spacing.sm,
    gap: 3,
  },
  pinCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    backgroundColor: COLORS.offWhite,
    padding: spacing.sm,
    gap: 4,
    alignItems: "center",
  },
  pinValue: { color: bookingTheme.colors.textPrimary, fontSize: 26, fontWeight: "900", letterSpacing: 4 },
  label: { color: COLORS.slate500, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  value: { color: bookingTheme.colors.textPrimary, fontSize: 13, fontWeight: "900" },
});
