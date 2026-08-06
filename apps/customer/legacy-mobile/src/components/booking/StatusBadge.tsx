import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { BookingStatus } from "../../types/bookingLifecycle";
import { COLORS } from '../../theme/colors';

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  CREATED: { bg: "rgba(217,164,65,0.14)", fg: COLORS.goldSoft },
  PAYMENT_PENDING: { bg: "rgba(217,164,65,0.14)", fg: COLORS.goldSoft },
  SEARCHING_PARTNER: { bg: "rgba(217,164,65,0.14)", fg: COLORS.goldSoft },
  PARTNER_ASSIGNED: { bg: "rgba(217,164,65,0.14)", fg: COLORS.goldSoft },
  PARTNER_ARRIVED: { bg: "rgba(217,164,65,0.14)", fg: COLORS.goldSoft },
  IN_PROGRESS: { bg: "rgba(217,164,65,0.14)", fg: COLORS.goldSoft },
  COMPLETED: { bg: "rgba(217,164,65,0.14)", fg: COLORS.goldSoft },
  CANCELLED: { bg: "rgba(176, 42, 55, 0.14)", fg: COLORS.error },
  EXPIRED: { bg: "rgba(148, 163, 184, 0.14)", fg: COLORS.neutral100 },
  PAYMENT_FAILED: { bg: "rgba(176, 42, 55, 0.14)", fg: COLORS.error },
};

export function StatusBadge({ status }: { status: BookingStatus | string }) {
  const ui = STATUS_COLORS[status] ?? STATUS_COLORS.CREATED;
  return (
    <View style={[styles.badge, { backgroundColor: ui.bg }]}>
      <Text style={[styles.text, { color: ui.fg }]}>{String(status).replaceAll("_", " ")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(217,164,65,0.45)",
  },
  text: { fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
});





