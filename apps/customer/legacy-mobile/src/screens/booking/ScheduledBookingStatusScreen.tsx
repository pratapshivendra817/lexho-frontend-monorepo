import { useMutation } from "@tanstack/react-query";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { BookingStageShell } from "../../components/booking/BookingStageShell";
import { StatusBadge } from "../../components/booking/StatusBadge";
import { bookingTheme } from "../../components/booking/bookingTheme";
import { cancelBooking } from "../../api/bookingExtrasApi";
import { useInstantBookingLifecycle } from "../../hooks/useInstantBookingLifecycle";
import { useBookingLifecycleNavigation } from "../../hooks/useBookingLifecycleNavigation";

type ScheduledBookingStatusRoute = { params?: { bookingId?: string } };

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

function isTerminal(status?: string) {
  const value = String(status ?? "").toUpperCase();
  return value === "COMPLETED" || value === "CANCELLED" || value === "EXPIRED";
}

function isReschedulable(status?: string) {
  const value = String(status ?? "").toUpperCase();
  return value === "CREATED" || value === "SCHEDULED" || value === "CONFIRMED" || value === "PAYMENT_PENDING" || value === "BOOKING_PROCESSING";
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
  const currentStatus = String(details?.status ?? details?.assignmentStatus ?? "CREATED").toUpperCase();
  const cancellable = !isTerminal(currentStatus);
  const reschedulable = isReschedulable(currentStatus);
  const cancelMutation = useMutation({
    mutationFn: async () => cancelBooking(bookingId),
    onSuccess: () => {
      Alert.alert("Booking cancelled", "Your scheduled booking has been cancelled.");
      void bookingQuery.refetch();
      navigation.navigate("Main", { screen: "Bookings" });
    },
    onError: (e: any) => {
      Alert.alert("Cancel failed", String(e?.message ?? "Could not cancel booking."));
    },
  });

  return (
    <BookingStageShell title="Scheduled Booking" subtitle="Your booking is confirmed. Track updates here.">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <StatusBadge status={currentStatus} />
            <View style={styles.modePill}>
              <MaterialCommunityIcon name="calendar-check-outline" size={12} color="#334155" />
              <Text style={styles.modePillText}>Scheduled</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.rowLine}><Text style={styles.rowLabel}>Booking ID</Text><Text style={styles.rowValue}>{details?.id ?? bookingId}</Text></View>
            <View style={styles.rowLine}><Text style={styles.rowLabel}>Service</Text><Text style={styles.rowValue}>{details?.serviceName ?? "-"}</Text></View>
            <View style={styles.rowLine}>
              <Text style={styles.rowLabel}>Scheduled At</Text>
              <View style={styles.rowInline}><MaterialCommunityIcon name="calendar-clock-outline" size={14} color="#64748B" /><Text style={styles.rowValue}>{formatDateTime(details?.scheduledAt)}</Text></View>
            </View>
            <View style={styles.rowLine}>
              <Text style={styles.rowLabel}>Address</Text>
              <View style={styles.rowInline}><MaterialCommunityIcon name="map-marker-outline" size={14} color="#64748B" /><Text style={styles.rowValue}>{details?.fullAddress ?? details?.address ?? "-"}</Text></View>
            </View>
            <View style={styles.rowLine}><Text style={styles.rowLabel}>Amount</Text><Text style={styles.rowValue}>Rs {details?.totalAmount ?? details?.amount ?? "-"}</Text></View>
          </View>
        </View>

        <Pressable style={styles.primaryBtn} onPress={() => void bookingQuery.refetch()}>
          <Text style={styles.primaryBtnText}>Refresh Status</Text>
        </Pressable>

        {cancellable ? (
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

        {reschedulable ? (
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
  scrollContent: { gap: 12, paddingBottom: 20 },
  heroCard: {
    borderWidth: 1,
    borderColor: "#D7E2F0",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    padding: 14,
    gap: 10,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modePill: { flexDirection: "row", gap: 4, alignItems: "center", borderRadius: bookingTheme.radius.pill, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: "#E2E8F0" },
  modePillText: { color: bookingTheme.colors.textPrimary, fontSize: 11, fontWeight: "800", letterSpacing: 0.2 },
  card: {
    gap: 8,
  },
  rowLine: { gap: 2, paddingVertical: 3 },
  rowInline: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowLabel: { color: "#6B7B92", fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.3 },
  rowValue: { color: bookingTheme.colors.textPrimary, fontSize: 13, fontWeight: "700" },
  primaryBtn: {
    backgroundColor: bookingTheme.colors.primaryBtn,
    borderRadius: bookingTheme.radius.button,
    paddingVertical: 13,
    alignItems: "center",
  },
  primaryBtnText: { color: bookingTheme.colors.primaryBtnText, fontSize: 14, fontWeight: "900", letterSpacing: 0.2 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: bookingTheme.colors.secondaryBtnBorder,
    borderRadius: bookingTheme.radius.button,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  secondaryBtnText: { color: bookingTheme.colors.secondaryBtnText, fontSize: 13, fontWeight: "800" },
  dangerBtn: {
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: bookingTheme.radius.button,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#FEF2F2",
  },
  dangerBtnText: { color: bookingTheme.colors.danger, fontSize: 13, fontWeight: "800" },
  disabledBtn: { opacity: 0.7 },
});
