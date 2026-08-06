import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { Text } from "react-native-paper";
import { BookingStageShell } from "../../components/booking/BookingStageShell";
import { bookingTheme } from "../../components/booking/bookingTheme";
import { useInstantBookingLifecycle } from "../../hooks/useInstantBookingLifecycle";
import { resolveLifecycleTarget } from "../../hooks/useBookingLifecycleNavigation";
import { BookingTimeline } from "../../components/booking/BookingTimeline";
import { getBookingMeta } from "../../utils/bookingMeta";
import { COLORS } from '../../theme/colors';
import { radii, shadows, spacing } from "../../constants/theme";

type BookingPaymentConfirmRoute = { params?: { bookingId?: string; bookingMode?: "INSTANT" | "SCHEDULED" | "SUBSCRIPTION" } };

const SUPPORT_NUMBER = "+917999700475";

function formatDateTime(value?: string) {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) return raw;
  return parsed.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function BookingPaymentConfirmScreen({ route, navigation }: { route: BookingPaymentConfirmRoute; navigation: any }) {
  const bookingId = String(route?.params?.bookingId ?? "").trim();
  const bookingQuery = useInstantBookingLifecycle(bookingId);
  const details = bookingQuery.data;
  const routeBookingMode = String(route?.params?.bookingMode ?? "").toUpperCase();
  const bookingType = String(details?.bookingType ?? routeBookingMode).toUpperCase();
  const isInstantBooking = routeBookingMode === "INSTANT" || bookingType === "INSTANT";
  const isScheduledBooking = routeBookingMode === "SCHEDULED" || bookingType === "SCHEDULED";
  const meta = getBookingMeta(details);

  const goNext = () => {
    if (!bookingId) return;
    const target = resolveLifecycleTarget(details as any);
    navigation.replace(target.name ?? "BookingDetail", { bookingId });
  };

  const onReschedule = () => {
    if (!bookingId) return;
    navigation.navigate("ScheduledReschedule", {
      bookingId,
      currentScheduledAt: details?.scheduledAt,
    });
  };

  const onCallSupport = async () => {
    const phone = `tel:${SUPPORT_NUMBER}`;
    try {
      const canOpen = await Linking.canOpenURL(phone);
      if (!canOpen) {
        Alert.alert("Call unavailable", `Please dial ${SUPPORT_NUMBER} manually.`);
        return;
      }
      await Linking.openURL(phone);
    } catch {
      Alert.alert("Call failed", `Please dial ${SUPPORT_NUMBER} manually.`);
    }
  };

  return (
    <BookingStageShell
      title={isInstantBooking ? "Instant Booking Confirmed" : isScheduledBooking ? "Scheduled Booking Confirmed" : "Booking Confirmed"}
      subtitle={
        isInstantBooking
          ? "Payment received. We are matching your request with nearby partners."
          : isScheduledBooking
            ? "Payment received. We will notify you before the service starts."
          : "Payment received successfully. Your booking is now confirmed."
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, isScheduledBooking && styles.cardScheduled]}>
          <View style={styles.successRow}>
            <View style={[styles.iconWrap, isScheduledBooking && styles.iconWrapScheduled]}>
              <MaterialCommunityIcon name="check-circle" size={26} color={isScheduledBooking ? COLORS.goldSoft : COLORS.green600} />
            </View>
            <View style={styles.successTextWrap}>
              <Text style={[styles.successTitle, isScheduledBooking && styles.textScheduledPrimary]}>Payment Successful</Text>
              <Text style={[styles.successSub, isScheduledBooking && styles.textScheduledSecondary]}>Booking ID: {(details?.id ?? bookingId) || "-"}</Text>
            </View>
          </View>
          <View style={[styles.line, isScheduledBooking && styles.lineScheduled]} />

          <View style={styles.row}><Text style={[styles.label, isScheduledBooking && styles.textScheduledLabel]}>Service</Text><Text style={[styles.value, isScheduledBooking && styles.textScheduledPrimary]}>{details?.serviceName ?? "-"}</Text></View>
          {isInstantBooking ? (
            <>
              <View style={styles.row}><Text style={styles.label}>Status</Text><Text style={styles.value}>{details?.trackingStatus ?? details?.status ?? "-"}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Requested At</Text><Text style={styles.value}>{formatDateTime(details?.createdAt ?? details?.scheduledAt)}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Estimated Start</Text><Text style={styles.value}>{formatDateTime(details?.promisedStartTime ?? details?.scheduledAt)}</Text></View>
            </>
          ) : isScheduledBooking ? (
            <>
              <View style={styles.row}><Text style={[styles.label, styles.textScheduledLabel]}>Booking Type</Text><Text style={[styles.value, styles.textScheduledPrimary]}>Scheduled</Text></View>
              <View style={styles.row}><Text style={[styles.label, styles.textScheduledLabel]}>Scheduled Date & Time</Text><Text style={[styles.value, styles.textScheduledPrimary]}>{formatDateTime(details?.scheduledAt)}</Text></View>
              <View style={styles.row}><Text style={[styles.label, styles.textScheduledLabel]}>Partner Assignment</Text><Text style={[styles.value, styles.textScheduledPrimary]}>{details?.trackingStatus ?? details?.assignmentStatus ?? "-"}</Text></View>
              <View style={[styles.reminderBox, styles.reminderBoxScheduled]}>
                <MaterialCommunityIcon name="bell-outline" size={16} color={COLORS.goldSoft} />
                <Text style={styles.reminderText}>We will notify you before the service starts.</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.row}><Text style={styles.label}>Booking Type</Text><Text style={styles.value}>{bookingType || "-"}</Text></View>
              <View style={styles.row}><Text style={styles.label}>Scheduled At</Text><Text style={styles.value}>{formatDateTime(details?.scheduledAt)}</Text></View>
            </>
          )}
          <View style={styles.row}><Text style={[styles.label, isScheduledBooking && styles.textScheduledLabel]}>Address</Text><Text style={[styles.value, isScheduledBooking && styles.textScheduledPrimary]}>{details?.fullAddress ?? details?.address ?? "-"}</Text></View>
          <View style={styles.row}><Text style={[styles.label, isScheduledBooking && styles.textScheduledLabel]}>Amount Paid</Text><Text style={[styles.value, isScheduledBooking && styles.textScheduledPrimary]}>Rs {details?.totalAmount ?? details?.amount ?? "-"}</Text></View>
        </View>

        {Array.isArray(details?.statusHistory) && details.statusHistory.length > 0 ? (
          <View style={[styles.timelineCard, isScheduledBooking && styles.cardScheduled]}>
            <View style={styles.timelineHead}>
              <Text style={[styles.timelineTitle, isScheduledBooking && styles.textScheduledPrimary]}>{isInstantBooking ? "Live Status" : "Booking Timeline"}</Text>
              <View style={styles.statusPill}>
                <MaterialCommunityIcon name={isInstantBooking ? "radar" : "calendar-clock"} size={13} color={COLORS.goldSoft} />
                <Text style={styles.statusPillText}>{details?.trackingStatus ?? details?.status ?? "-"}</Text>
              </View>
            </View>
            <BookingTimeline history={details.statusHistory} compact />
          </View>
        ) : null}

        <Pressable style={[styles.primaryBtn, isScheduledBooking && styles.primaryBtnScheduled]} onPress={goNext} disabled={!bookingId}>
          <Text style={[styles.primaryBtnText, isScheduledBooking && styles.primaryBtnTextScheduled]}>{isScheduledBooking ? "View Booking" : "Track Booking"}</Text>
        </Pressable>

        {isScheduledBooking && meta.canReschedule ? (
          <Pressable style={[styles.secondaryBtn, styles.secondaryBtnScheduled]} onPress={onReschedule} disabled={!bookingId}>
            <Text style={[styles.secondaryBtnText, styles.secondaryBtnTextScheduled]}>Reschedule Booking</Text>
          </Pressable>
        ) : null}

        <Pressable style={[styles.secondaryBtn, isScheduledBooking && styles.secondaryBtnScheduled]} onPress={() => void onCallSupport()}>
          <Text style={[styles.secondaryBtnText, isScheduledBooking && styles.secondaryBtnTextScheduled]}>Call Support</Text>
        </Pressable>

        {meta.canRaiseIssue ? (
          <Pressable style={[styles.secondaryBtn, isScheduledBooking && styles.secondaryBtnScheduled]} onPress={() => navigation.navigate("Support")}>
            <Text style={[styles.secondaryBtnText, isScheduledBooking && styles.secondaryBtnTextScheduled]}>Raise Issue</Text>
          </Pressable>
        ) : null}

        {!isScheduledBooking ? (
          <Pressable
            style={styles.ghostBtn}
            onPress={() =>
              isInstantBooking
                ? navigation.navigate("Main", { screen: "Bookings" })
                : navigation.navigate("Support")
            }
          >
            <Text style={styles.ghostBtnText}>{isInstantBooking ? "Go to My Bookings" : "Open Support Tickets"}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </BookingStageShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: spacing.xl },
  card: {
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    borderRadius: radii.lg,
    backgroundColor: COLORS.white,
    padding: spacing.md + 2,
    gap: 10,
    ...shadows.sm,
  },
  cardScheduled: {
    borderColor: COLORS.goldSoft,
    backgroundColor: COLORS.navyDark,
  },
  successRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.xl + 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.offWhite,
  },
  iconWrapScheduled: {
    backgroundColor: "rgba(217,164,65,0.16)",
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
  },
  successTextWrap: { flex: 1 },
  successTitle: { color: bookingTheme.colors.textPrimary, fontSize: 16, fontWeight: "900" },
  successSub: { color: COLORS.slate600, fontSize: 12, fontWeight: "700", marginTop: 2 },
  line: { height: 1, backgroundColor: COLORS.borderSoft, marginVertical: 2 },
  lineScheduled: { backgroundColor: "rgba(217,164,65,0.35)" },
  row: { gap: 2, paddingVertical: 2 },
  label: { color: COLORS.slate500, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.3 },
  value: { color: bookingTheme.colors.textPrimary, fontSize: 13, fontWeight: "700" },
  textScheduledPrimary: { color: COLORS.white },
  textScheduledSecondary: { color: COLORS.neutral100 },
  textScheduledLabel: { color: COLORS.goldSoft },
  reminderBox: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    borderRadius: radii.md,
    backgroundColor: COLORS.navyDark,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  reminderBoxScheduled: {
    backgroundColor: "rgba(217,164,65,0.08)",
  },
  reminderText: { flex: 1, color: COLORS.white, fontSize: 12, fontWeight: "700", lineHeight: 17 },
  timelineCard: {
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    borderRadius: radii.lg,
    backgroundColor: COLORS.white,
    padding: spacing.md + 2,
    gap: 12,
    ...shadows.sm,
  },
  timelineHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  timelineTitle: { color: bookingTheme.colors.textPrimary, fontSize: 15, fontWeight: "900" },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: radii.pill,
    backgroundColor: COLORS.navyDark,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusPillText: { color: COLORS.goldSoft, fontSize: 11, fontWeight: "800" },
  timelineRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  timelineItem: { flex: 1, alignItems: "center", gap: 6 },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.slate300,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineDotActive: {
    borderColor: COLORS.green600,
    backgroundColor: COLORS.green600,
  },
  timelineLabel: { color: COLORS.slate500, fontSize: 10, fontWeight: "700", textAlign: "center", lineHeight: 14 },
  timelineLabelActive: { color: bookingTheme.colors.textPrimary },
  primaryBtn: { marginTop: spacing.md, backgroundColor: bookingTheme.colors.primaryBtn, borderRadius: radii.md, paddingVertical: spacing.md + 1, alignItems: "center", ...shadows.sm },
  primaryBtnText: { color: bookingTheme.colors.primaryBtnText, fontSize: 14, fontWeight: "900", letterSpacing: 0.2 },
  primaryBtnScheduled: {
    backgroundColor: COLORS.gold,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
  },
  primaryBtnTextScheduled: {
    color: COLORS.navyDark,
  },
  secondaryBtn: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: COLORS.blue400,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    backgroundColor: COLORS.offWhite,
  },
  secondaryBtnText: { color: COLORS.blue600, fontSize: 13, fontWeight: "800" },
  secondaryBtnScheduled: {
    borderColor: COLORS.goldSoft,
    backgroundColor: COLORS.navyDark,
  },
  secondaryBtnTextScheduled: {
    color: COLORS.goldSoft,
  },
  ghostBtn: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  ghostBtnText: { color: COLORS.slate700, fontSize: 13, fontWeight: "700" },
});







