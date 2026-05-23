import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Chip, Text } from "react-native-paper";

import { getBookingDetails } from "../../api/bookingExtrasApi";
import { getPaymentStatus } from "../../api/paymentExtrasApi";

function formatDate(value?: string) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
}

export function BookingDetailScreen({ route }: any) {
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
  const timeline = useMemo(() => {
    if (!booking) return [];
    return [
      { label: "Booking Created", value: formatDate(booking.createdAt) },
      { label: "Scheduled At", value: formatDate(booking.scheduledAt) },
      { label: "Service Completed", value: formatDate(booking.completedAt) },
      { label: "Current Status", value: String(booking.status ?? "PENDING") },
      { label: "Assignment Status", value: String(booking.assignmentStatus ?? "N/A") },
    ].filter((item) => item.value && item.value !== "N/A");
  }, [booking]);
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
        {timeline.map((item) => (
          <View key={item.label} style={styles.timelineRow}>
            <View style={styles.dot} />
            <View style={styles.timelineContent}>
              <Text style={styles.timelineLabel}>{item.label}</Text>
              <Text style={styles.timelineValue}>{item.value}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F1F5F9" },
  content: { padding: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  title: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  chip: { alignSelf: "flex-start", marginBottom: 4 },
  row: { fontSize: 14, color: "#334155" },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A", marginBottom: 4 },
  timelineRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 999, marginTop: 5, backgroundColor: "#2563EB" },
  timelineContent: { flex: 1, gap: 1 },
  timelineLabel: { fontSize: 13, fontWeight: "700", color: "#1E293B" },
  timelineValue: { fontSize: 13, color: "#475569" },
});
