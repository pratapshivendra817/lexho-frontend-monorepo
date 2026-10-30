import { useMutation } from "@tanstack/react-query";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { BookingStageShell } from "../../components/booking/BookingStageShell";
import { cancelBooking } from "../../api/bookingExtrasApi";
import { useInstantBookingLifecycle } from "../../hooks/useInstantBookingLifecycle";
import { useBookingLifecycleNavigation } from "../../hooks/useBookingLifecycleNavigation";
import { getBookingMeta } from "../../utils/bookingMeta";
import { getApiErrorCode } from "../../api/client";
import { trackBookingCancelled } from "../../services/customerAnalyticsEvents";
import { captureFrontendError } from "../../services/monitoring";
import { radii, shadows, spacing } from "../../constants/theme";

type ScheduledBookingStatusRoute = { params?: { bookingId?: string } };


import { COLORS } from '../../theme/colors';

function formatDateTime(value?: string) {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) return raw;
  return parsed.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function ScheduledBookingStatusScreen({ route, navigation }: { route: ScheduledBookingStatusRoute; navigation: any }) {
  const bookingId = String(route?.params?.bookingId ?? "").trim();
  const bookingQuery = useInstantBookingLifecycle(bookingId);
  useBookingLifecycleNavigation({
    bookingId,
    details: bookingQuery.data,
    navigation,
    currentRouteName: "ScheduledBookingStatus",
  });

  const details = bookingQuery.data;
  const meta = getBookingMeta(details);
  const cancelMutation = useMutation({
    mutationFn: async () => cancelBooking(bookingId),
    onSuccess: () => {
      void trackBookingCancelled({ booking_id: bookingId, source: "scheduled_status" });
      Alert.alert("Booking cancelled", "Your scheduled booking has been cancelled.");
      void bookingQuery.refetch();
      navigation.navigate("Main", { screen: "Bookings" });
    },
    onError: (e: any) => {
      captureFrontendError(e, {
        screenName: "ScheduledBookingStatus",
        userAction: "cancel_booking",
        apiEndpoint: `/api/bookings/cancel/${bookingId}`,
        errorCode: getApiErrorCode(e) || "CANCEL_BOOKING_FAILED",
      });
      Alert.alert("Cancel failed", String(e?.message ?? "Could not cancel booking."));
    },
  });

  return (
    <BookingStageShell fullWidth title="Scheduled Booking" subtitle="Your booking is confirmed. Track updates here.">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroCard}>
          <View style={styles.card}>
            <View style={styles.rowLine}><Text style={styles.rowLabel}>Booking ID</Text><Text style={styles.rowValue}>{details?.id ?? bookingId}</Text></View>
            <View style={styles.rowLine}><Text style={styles.rowLabel}>Service</Text><Text style={styles.rowValue}>{details?.serviceName ?? "-"}</Text></View>
            <View style={styles.rowLine}>
              <Text style={styles.rowLabel}>Scheduled At</Text>
              <View style={styles.rowInline}><MaterialCommunityIcon name="calendar-clock-outline" size={14} color={COLORS.goldSoft} /><Text style={styles.rowValue}>{formatDateTime(details?.scheduledAt)}</Text></View>
            </View>
            <View style={styles.rowLine}>
              <Text style={styles.rowLabel}>Address</Text>
              <View style={styles.rowInline}><MaterialCommunityIcon name="map-marker-outline" size={14} color={COLORS.goldSoft} /><Text style={styles.rowValue}>{details?.fullAddress ?? details?.address ?? "-"}</Text></View>
            </View>
            <View style={styles.rowLine}><Text style={styles.rowLabel}>Amount</Text><Text style={styles.rowValue}>Rs {details?.totalAmount ?? details?.amount ?? "-"}</Text></View>
          </View>
        </View>

        <Pressable style={styles.primaryBtn} onPress={() => void bookingQuery.refetch()}>
          <Text style={styles.primaryBtnText}>Refresh Status</Text>
        </Pressable>

        {meta.canCancel ? (
          <Pressable
            style={[styles.dangerBtn, cancelMutation.isPending && styles.disabledBtn]}
            onPress={() => {
              if (cancelMutation.isPending || !bookingId) return;
              cancelMutation.mutate();
            }}
          >
            <Text style={styles.dangerBtnText}>{cancelMutation.isPending ? "Cancelling..." : "Cancel Booking"}</Text>
          </Pressable>
        ) : null}

        {meta.canReschedule ? (
          <Pressable
            style={styles.secondaryBtn}
            onPress={() =>
              navigation.navigate("ScheduledReschedule", {
                bookingId: details?.id ?? bookingId,
                currentScheduledAt: details?.scheduledAt,
              })
            }
          >
            <Text style={styles.secondaryBtnText}>Reschedule Booking</Text>
          </Pressable>
        ) : null}

        <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate("Main", { screen: "Bookings" })}>
          <Text style={styles.secondaryBtnText}>Go To Bookings</Text>
        </Pressable>
      </ScrollView>
    </BookingStageShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: { gap: spacing.md, paddingBottom: spacing.xl },
  heroCard: {
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    borderRadius: radii.lg,
    backgroundColor: COLORS.navyDark,
    padding: spacing.md + 2,
    gap: 10,
    ...shadows.sm,
  },
  card: {
    gap: 8,
  },
  rowLine: { gap: 2, paddingVertical: 3 },
  rowInline: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowLabel: { color: COLORS.goldSoft, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.3 },
  rowValue: { color: COLORS.white, fontSize: 13, fontWeight: "700" },
  primaryBtn: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.goldSoft,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: spacing.md + 1,
    alignItems: "center",
    ...shadows.sm,
  },
  primaryBtnText: { color: COLORS.navyDark, fontSize: 14, fontWeight: "900", letterSpacing: 0.2 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    backgroundColor: COLORS.navyDark,
  },
  secondaryBtnText: { color: COLORS.goldSoft, fontSize: 13, fontWeight: "800" },
  dangerBtn: {
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    backgroundColor: "rgba(176, 42, 55, 0.12)",
  },
  dangerBtnText: { color: COLORS.error, fontSize: 13, fontWeight: "800" },
  disabledBtn: { opacity: 0.7 },
});







