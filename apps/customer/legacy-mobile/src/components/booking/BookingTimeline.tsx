import { StyleSheet, View } from "react-native";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { Text } from "react-native-paper";
import type { BookingStatusHistoryDto } from "../../types/contracts";
import { COLORS } from "../../theme/colors";
import { radii, spacing } from "../../constants/theme";

function isDone(item: BookingStatusHistoryDto) {
  const status = String(item.status ?? "").toUpperCase();
  return item.completed === true || status === "DONE" || status === "COMPLETED";
}

function isActive(item: BookingStatusHistoryDto) {
  const status = String(item.status ?? "").toUpperCase();
  return item.active === true || status === "ACTIVE" || status === "CURRENT";
}

export function BookingTimeline({ history, compact = false }: { history?: BookingStatusHistoryDto[]; compact?: boolean }) {
  const rows = Array.isArray(history) ? history.filter((item) => String(item?.label ?? "").trim()) : [];
  if (rows.length === 0) return null;

  return (
    <View style={[styles.root, compact && styles.rootCompact]}>
      {rows.map((item, index) => {
        const done = isDone(item);
        const active = isActive(item);
        return (
          <View key={String(item.key ?? item.label ?? index)} style={styles.row}>
            <View style={[styles.dot, done && styles.dotDone, active && styles.dotActive]}>
              {done ? <MaterialCommunityIcon name="check" size={11} color={COLORS.white} /> : null}
            </View>
            <View style={styles.textWrap}>
              <Text style={[styles.label, (done || active) && styles.labelActive]}>{item.label}</Text>
              {item.timestamp ? <Text style={styles.time}>{item.timestamp}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  rootCompact: { gap: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 9 },
  dot: {
    width: 20,
    height: 20,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    backgroundColor: "rgba(217,164,65,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  dotDone: { backgroundColor: COLORS.green600, borderColor: COLORS.green600 },
  dotActive: { borderColor: COLORS.goldSoft, backgroundColor: "rgba(217,164,65,0.16)" },
  textWrap: { flex: 1 },
  label: { color: COLORS.neutral100, fontSize: 13, fontWeight: "700" },
  labelActive: { color: COLORS.white, fontWeight: "900" },
  time: { color: COLORS.goldSoft, fontSize: 11, fontWeight: "600", marginTop: 1 },
});
