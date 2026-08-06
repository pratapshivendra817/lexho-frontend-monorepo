import React from "react";
import { StyleSheet, Text, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { COLORS } from "../../constants/colors";
import type { PartnerOrder } from "../../types/order";

const STEPS = [
  { key: "NEW", label: "Order Created", timeKey: "createdAt" },
  { key: "ACCEPTED", label: "Accepted", timeKey: "acceptedAt" },
  { key: "STARTED", label: "Started", timeKey: "startedAt" },
  { key: "COMPLETED", label: "Completed", timeKey: "completedAt" },
] as const;

const orderRank: Record<string, number> = { NEW: 0, PENDING: 0, ACCEPTED: 1, STARTED: 2, COMPLETED: 3 };

export function OrderLifecycleTimeline({ order }: { order?: Partial<PartnerOrder> | null }) {
  const auditEvents = order?.timeline ?? [];
  if (auditEvents.length > 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Order Timeline</Text>
        {auditEvents.map(event => (
          <View key={event.id} style={styles.row}>
            <View style={[styles.iconWrap, styles.iconDone]}>
              <MaterialCommunityIcons name="check" size={14} color={COLORS.background} />
            </View>
            <View style={styles.copy}>
              <Text style={[styles.label, styles.labelDone]}>
                {[event.fromStatus, event.toStatus].filter(Boolean).join(" -> ")}
              </Text>
              {event.remarks ? <Text style={styles.remarks}>{event.remarks}</Text> : null}
              <Text style={styles.time}>
                {[event.actorType, event.actorId].filter(Boolean).join(" #") || "System"} | {formatDateTime(event.timestamp)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  }

  const rank = orderRank[String(order?.status ?? "NEW").toUpperCase()] ?? 0;
  const rejected = String(order?.status ?? "").toUpperCase() === "REJECTED";
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Order Timeline</Text>
      {STEPS.map((step, index) => {
        const done = index <= rank;
        const rawTime = order?.[step.timeKey as keyof PartnerOrder] as string | undefined;
        return (
          <View key={step.key} style={styles.row}>
            <View style={[styles.iconWrap, done && styles.iconDone]}>
              <MaterialCommunityIcons name={done ? "check" : "clock-outline"} size={14} color={done ? COLORS.background : COLORS.textMuted} />
            </View>
            <View style={styles.copy}>
              <Text style={[styles.label, done && styles.labelDone]}>{step.label}</Text>
              <Text style={styles.time}>{formatDateTime(rawTime)}</Text>
            </View>
          </View>
        );
      })}
      {rejected ? (
        <View style={styles.row}>
          <View style={[styles.iconWrap, styles.rejectedIcon]}>
            <MaterialCommunityIcons name="close" size={14} color={COLORS.white} />
          </View>
          <View style={styles.copy}>
            <Text style={[styles.label, styles.rejectedLabel]}>Rejected</Text>
            <Text style={styles.time}>{formatDateTime(order?.rejectedAt)}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function formatDateTime(value?: string) {
  if (!value) return "Pending";
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, backgroundColor: COLORS.surface, padding: 12, gap: 10 },
  title: { color: COLORS.textPrimary, fontSize: 16, fontWeight: "800" },
  row: { flexDirection: "row", gap: 10, alignItems: "center" },
  iconWrap: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: COLORS.borderSoft, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surfaceSoft },
  iconDone: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  copy: { flex: 1, gap: 2 },
  label: { color: COLORS.textSecondary, fontWeight: "700" },
  labelDone: { color: COLORS.textPrimary },
  time: { color: COLORS.textMuted, fontSize: 11 },
  remarks: { color: COLORS.textSecondary, fontSize: 12 },
  rejectedIcon: { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
  rejectedLabel: { color: COLORS.danger },
});
