import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useQueryClient } from "@tanstack/react-query";

import { CustomerReviewCard } from "../../components/booking/CustomerReviewCard";
import { StatusBadge } from "../../components/booking/StatusBadge";
import { BookingStatus } from "../../types/bookingLifecycle";
import { BookingStageShell } from "../../components/booking/BookingStageShell";
import { useInstantBookingLifecycle } from "../../hooks/useInstantBookingLifecycle";
import { useBookingLifecycleNavigation } from "../../hooks/useBookingLifecycleNavigation";
import { bookingTheme } from "../../components/booking/bookingTheme";
import { radii, shadows, spacing } from "../../constants/theme";
import { useEffect } from "react";
import { trackBookingCompleted } from "../../services/customerAnalyticsEvents";

type ServiceCompletedRoute = { params?: { bookingId?: string } };


export function ServiceCompletedScreen({ route, navigation }: { route: ServiceCompletedRoute; navigation: any }) {
  const bookingId = String(route?.params?.bookingId ?? "").trim();
  const queryClient = useQueryClient();
  const bookingQuery = useInstantBookingLifecycle(bookingId);
  useBookingLifecycleNavigation({
    bookingId,
    details: bookingQuery.data,
    navigation,
    currentRouteName: "ServiceCompleted",
  });

  useEffect(() => {
    if (!bookingId) return;
    void trackBookingCompleted({
      booking_id: bookingId,
      amount: bookingQuery.data?.totalAmount ?? bookingQuery.data?.amount,
      source: "service_completed_screen",
    });
  }, [bookingId, bookingQuery.data?.amount, bookingQuery.data?.totalAmount]);

  return (
    <BookingStageShell title="Service Completed" subtitle="Everything is done. Please share your rating for this service.">
      <StatusBadge status={BookingStatus.COMPLETED} />
      <View style={styles.card}>
        <Text style={styles.row}>Booking ID: {bookingQuery.data?.id ?? bookingId}</Text>
        <Text style={styles.row}>Total Amount: Rs {bookingQuery.data?.totalAmount ?? bookingQuery.data?.amount ?? "-"}</Text>
      </View>
      <CustomerReviewCard
        booking={bookingQuery.data}
        onSubmitted={() => {
          void queryClient.invalidateQueries({ queryKey: ["instant-booking-status", bookingId] });
        }}
      />
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





