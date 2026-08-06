import React, { useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { Card, Text } from "react-native-paper";
import { COLORS } from "../../../constants/colors";
import PaymentHeader from "../../../components/payments/PaymentHeader";
import { getSOSHistory } from "../services/SOSApiService";
import type { SOSIncident } from "../types";

export function SOSHistoryScreen({ navigation }: any) {
  const [rows, setRows] = useState<SOSIncident[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const load = async () => { setLoading(true); setError(""); try { setRows(await getSOSHistory()); } catch { setError("Unable to load SOS history."); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  return <View style={styles.root}><PaymentHeader title="SOS History" onBack={() => navigation.goBack()} />{error ? <Text style={styles.error}>{error}</Text> : null}<FlatList style={styles.fullBleed} data={rows} keyExtractor={(item, index) => item.eventId || String(index)} contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={COLORS.accent} colors={[COLORS.accent]} />} ListEmptyComponent={!loading ? <Text style={styles.empty}>No SOS incidents found.</Text> : null} renderItem={({ item }) => <Card style={styles.card}><Card.Content style={styles.cardContent}><View style={styles.row}><Text variant="titleMedium" style={styles.cardTitle}>Emergency SOS</Text><StatusPill status={item.status} /></View><Text style={styles.meta}>Event: {item.eventId || "-"}</Text><Text style={styles.meta}>{item.address || `${item.latitude}, ${item.longitude}`}</Text>{item.message ? <Text style={styles.message}>Message: {item.message}</Text> : null}<Text style={styles.timestamp}>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}</Text></Card.Content></Card>} /></View>;
}

function StatusPill({ status }: { status?: string }) {
  const value = String(status || "TRIGGERED").toUpperCase();
  const isResolved = value === "RESOLVED";
  const isAcknowledged = value === "ACKNOWLEDGED";
  return (
    <View style={[styles.statusPill, isResolved && styles.statusPillResolved, isAcknowledged && styles.statusPillAcknowledged]}>
      <Text style={[styles.statusPillText, isResolved && styles.statusPillResolvedText, isAcknowledged && styles.statusPillAcknowledgedText]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 18, backgroundColor: COLORS.background },
  fullBleed: {
    alignSelf: "stretch",
    marginHorizontal: -18,
  },
  listContent: { paddingTop: 10, paddingBottom: 28 },
  card: {
    width: "100%",
    marginBottom: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    borderRadius: 24,
    overflow: "hidden",
  },
  cardContent: { paddingVertical: 16, gap: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  cardTitle: { color: COLORS.textPrimary, fontWeight: "800" },
  statusPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.accent,
    backgroundColor: "rgba(245, 215, 110, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusPillResolved: {
    borderColor: COLORS.success,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
  },
  statusPillAcknowledged: {
    borderColor: "#D18C1D",
    backgroundColor: "rgba(209, 140, 29, 0.12)",
  },
  statusPillText: { color: COLORS.accent, fontWeight: "900", fontSize: 11 },
  statusPillResolvedText: { color: COLORS.success },
  statusPillAcknowledgedText: { color: "#D9A441" },
  meta: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 18 },
  message: { color: COLORS.textPrimary, fontSize: 13, lineHeight: 19 },
  timestamp: { color: COLORS.accent, fontSize: 12, fontWeight: "700", marginTop: 2 },
  error: { color: COLORS.error, marginTop: 12, marginBottom: 2 },
  empty: { textAlign: "center", marginTop: 30, color: COLORS.accent, fontSize: 14, fontWeight: "700" },
});
