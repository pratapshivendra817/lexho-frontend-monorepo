import { useMutation } from "@tanstack/react-query";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useState } from "react";
import { rescheduleBooking } from "../../api/bookingExtrasApi";
import { getApiErrorCode } from "../../api/client";
import { getAvailableTimeSlots } from "../../api/cartApi";
import { BookingStageShell } from "../../components/booking/BookingStageShell";
import { TimePicker } from "../../components/cart/TimePicker";
import { bookingTheme } from "../../components/booking/bookingTheme";
import { trackBookingRescheduled } from "../../services/customerAnalyticsEvents";
import { captureFrontendError } from "../../services/monitoring";
import { radii, shadows, spacing } from "../../constants/theme";

type ScheduledRescheduleRoute = { params?: { bookingId?: string; currentScheduledAt?: string } };


import { COLORS } from '../../theme/colors';

function formatDateTime(value?: string | null) {
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

function toMinuteKey(value?: string | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) return raw;
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  const hh = String(parsed.getHours()).padStart(2, "0");
  const mm = String(parsed.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

export function ScheduledRescheduleScreen({ route, navigation }: { route: ScheduledRescheduleRoute; navigation: any }) {
  const bookingId = String(route?.params?.bookingId ?? "").trim();
  const initialScheduledTime = String(route?.params?.currentScheduledAt ?? "").trim() || null;
  const [scheduledTime, setScheduledTime] = useState<string | null>(initialScheduledTime);

  const rescheduleMutation = useMutation({
    mutationFn: async () => {
      if (!bookingId) throw new Error("Booking id missing.");
      if (!scheduledTime) throw new Error("Please select a new slot.");
      if (toMinuteKey(scheduledTime) === toMinuteKey(initialScheduledTime)) {
        throw new Error("Please select a different slot from the current one.");
      }
      const [date, time] = scheduledTime.split("T");
      if (!date || !time) throw new Error("Please select a valid date and time slot.");
      const availableSlots = await getAvailableTimeSlots(date);
      const selectedSlot = availableSlots.find((row) => {
        const startTime = String(row.slot ?? "").split("-")[0]?.trim();
        return row.available !== false && startTime === time.slice(0, 5);
      });
      if (!selectedSlot) throw new Error("That slot is no longer available. Please choose another slot.");
      return rescheduleBooking(bookingId, { date, slot: selectedSlot.slot });
    },
    onSuccess: (updated) => {
      void trackBookingRescheduled({ booking_id: bookingId, source: "scheduled_reschedule" });
      Alert.alert("Rescheduled", "Your booking has been rescheduled successfully.");
      navigation.replace("ScheduledBookingStatus", { bookingId: updated?.id ?? bookingId });
    },
    onError: (e: any) => {
      captureFrontendError(e, {
        screenName: "ScheduledReschedule",
        userAction: "reschedule_booking",
        apiEndpoint: `/api/bookings/${bookingId}/reschedule`,
        errorCode: getApiErrorCode(e) || "RESCHEDULE_BOOKING_FAILED",
      });
      Alert.alert("Reschedule failed", String(e?.message ?? "Could not reschedule booking."));
    },
  });

  return (
    <BookingStageShell title="Reschedule Booking" subtitle="Choose a new date and start time for your service.">
      <View style={styles.card}>
        <View style={styles.rowLine}>
          <Text style={styles.rowLabel}>Booking ID</Text>
          <Text style={styles.rowValue}>{bookingId || "-"}</Text>
        </View>
        <View style={styles.rowLine}>
          <Text style={styles.rowLabel}>Current Slot</Text>
          <Text style={styles.rowValue}>{formatDateTime(initialScheduledTime)}</Text>
        </View>
        <View style={styles.rowLine}>
          <Text style={styles.rowLabel}>New Slot</Text>
          <Text style={styles.rowValue}>{formatDateTime(scheduledTime)}</Text>
        </View>
      </View>

      <TimePicker
        value={scheduledTime}
        onChange={setScheduledTime}
        loadSlots={getAvailableTimeSlots}
        showError={Boolean(!scheduledTime)}
        infoText="Pick a future slot. Reschedule is subject to partner availability."
        dateWindowDays={7}
      />

      <Pressable
        style={[styles.primaryBtn, (!scheduledTime || rescheduleMutation.isPending) && styles.disabledBtn]}
        disabled={!scheduledTime || rescheduleMutation.isPending}
        onPress={() => rescheduleMutation.mutate()}
      >
        <Text style={styles.primaryBtnText}>{rescheduleMutation.isPending ? "Rescheduling..." : "Confirm Reschedule"}</Text>
      </Pressable>
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
  rowLine: { gap: 2, paddingVertical: 3 },
  rowLabel: { color: COLORS.slate500, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.3 },
  rowValue: { color: bookingTheme.colors.textPrimary, fontSize: 13, fontWeight: "700" },
  primaryBtn: { backgroundColor: bookingTheme.colors.primaryBtn, borderRadius: radii.md, paddingVertical: spacing.md + 1, alignItems: "center", ...shadows.sm },
  primaryBtnText: { color: bookingTheme.colors.primaryBtnText, fontSize: 14, fontWeight: "900", letterSpacing: 0.2 },
  disabledBtn: { opacity: 0.7 },
});





