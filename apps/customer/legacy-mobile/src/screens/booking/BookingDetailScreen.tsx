import { useQuery } from "@tanstack/react-query";
import { ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Chip, Text } from "react-native-paper";

import { getBookingDetails } from "../../api/bookingExtrasApi";
import { getPaymentStatus } from "../../api/paymentExtrasApi";
import { CustomerReviewCard } from "../../components/booking/CustomerReviewCard";
import { BookingTimeline } from "../../components/booking/BookingTimeline";


import { COLORS } from '../../theme/colors';
import { radii, shadows, spacing } from "../../constants/theme";

function formatDate(value?: string) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
}

export function BookingDetailScreen({ route, navigation }: any) {
  const bookingId = String(route?.params?.bookingId ?? "");
  const detailsQuery = useQuery({
    queryKey: ["booking-details", bookingId],
    queryFn: () => getBookingDetails(bookingId),
    enabled: bookingId.length > 0,
  });
  const paymentQuery = useQuery({
    queryKey: ["booking-payment-status", bookingId],
    queryFn: () => getPaymentStatus(bookingId),
    enabled: bookingId.length > 0,
  });

  const booking = detailsQuery.data ?? null;
  const payment = paymentQuery.data?.data ?? paymentQuery.data ?? {};

  if (detailsQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.center}>
        <Text>Booking details not available.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>{booking.serviceName || "Service Booking"}</Text>
        <Chip style={styles.chip}>{String(booking.status ?? "PENDING")}</Chip>
        <Text style={styles.row}>Booking ID: {booking.id}</Text>
        <Text style={styles.row}>Created: {formatDate(booking.createdAt)}</Text>
        <Text style={styles.row}>Type: {booking.bookingType || "N/A"}</Text>
        <Text style={styles.row}>Partner: {booking.partnerName || "Not assigned"}</Text>
        <Text style={styles.row}>Partner Phone: {booking.partnerPhone || "N/A"}</Text>
        <Text style={styles.row}>ETA: {booking.etaMinutes != null ? `${booking.etaMinutes} min` : "N/A"}</Text>
        <Text style={styles.row}>Assignment: {booking.assignmentStatus || "N/A"}</Text>
        <Text style={styles.row}>Message: {booking.message || "N/A"}</Text>
        {booking.partnerName ? (
          <Button
            icon="phone"
            mode="contained"
            onPress={() => navigation.navigate("OutgoingCall", { bookingId: Number(booking.id ?? bookingId), partnerName: booking.partnerName })}
            style={styles.callButton}
          >
            Call Partner
          </Button>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Payment Breakdown</Text>
        <Text style={styles.row}>Amount: {booking.amount != null ? `INR ${booking.amount}` : "N/A"}</Text>
        <Text style={styles.row}>Total Amount: {booking.totalAmount != null ? `INR ${booking.totalAmount}` : "N/A"}</Text>
        <Text style={styles.row}>Payment Status: {String(payment?.status ?? payment?.paymentStatus ?? "N/A")}</Text>
        <Text style={styles.row}>Payment Mode: {String(payment?.mode ?? payment?.paymentMode ?? "N/A")}</Text>
        <Text style={styles.row}>Transaction: {String(payment?.transactionId ?? payment?.txnId ?? "N/A")}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Status Timeline</Text>
        <BookingTimeline history={booking.statusHistory} />
      </View>

      <CustomerReviewCard
        booking={booking}
        onSubmitted={() => {
          void detailsQuery.refetch();
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.offWhite },
  content: { padding: spacing.md + 2, gap: spacing.md },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: radii.md,
    padding: spacing.md + 2,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    ...shadows.sm,
  },
  title: { fontSize: 18, fontWeight: "800", color: COLORS.slate900 },
  chip: { alignSelf: "flex-start", marginBottom: spacing.xs },
  row: { fontSize: 14, color: COLORS.slate700 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: COLORS.slate900, marginBottom: spacing.xs },
  callButton: { marginTop: spacing.sm },
  timelineRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm + 2 },
  dot: { width: 10, height: 10, borderRadius: radii.pill, marginTop: 5, backgroundColor: COLORS.blue600 },
  timelineContent: { flex: 1, gap: 1 },
  timelineLabel: { fontSize: 13, fontWeight: "700", color: COLORS.slate800 },
  timelineValue: { fontSize: 13, color: COLORS.slate600 },
});
