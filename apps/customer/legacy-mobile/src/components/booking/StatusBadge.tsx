import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { BookingStatus } from "../../types/bookingLifecycle";

const COLORS: Record<string, { bg: string; fg: string }> = {
  CREATED: { bg: "#E2E8F0", fg: "#0F172A" },
  PAYMENT_PENDING: { bg: "#FFF7ED", fg: "#9A3412" },
  SEARCHING_PARTNER: { bg: "#DBEAFE", fg: "#1D4ED8" },
  PARTNER_ASSIGNED: { bg: "#DCFCE7", fg: "#166534" },
  PARTNER_ARRIVED: { bg: "#D1FAE5", fg: "#065F46" },
  IN_PROGRESS: { bg: "#E0F2FE", fg: "#0C4A6E" },
  COMPLETED: { bg: "#ECFDF5", fg: "#047857" },
  CANCELLED: { bg: "#FEE2E2", fg: "#B91C1C" },
  EXPIRED: { bg: "#F1F5F9", fg: "#334155" },
  PAYMENT_FAILED: { bg: "#FEE2E2", fg: "#B91C1C" },
};

export function StatusBadge({ status }: { status: BookingStatus | string }) {
  const ui = COLORS[status] ?? COLORS.CREATED;
  return (
    <View style={[styles.badge, { backgroundColor: ui.bg }]}>
      <Text style={[styles.text, { color: ui.fg }]}>{String(status).replaceAll("_", " ")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  text: { fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
});
