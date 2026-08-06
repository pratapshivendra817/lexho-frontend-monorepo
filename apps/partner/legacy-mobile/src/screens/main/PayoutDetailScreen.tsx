import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { COLORS } from "../../constants/colors";
import { getPartnerPayoutById } from "../../services/partnerService";
import type { PartnerPayout } from "../../types/payment";
import { useAppFeedback } from "../../context/AppFeedbackContext";
import PaymentHeader from "../../components/payments/PaymentHeader";

const money = (value: number) => `INR ${value.toFixed(2)}`;

export default function PayoutDetailScreen({ route, navigation }: any) {
  const payoutId = String(route?.params?.payoutId ?? "");
  const { toast } = useAppFeedback();
  const [payout, setPayout] = useState<PartnerPayout | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!payoutId) return;
    setLoading(true);
    try {
      setPayout(await getPartnerPayoutById(payoutId));
    } catch (error: any) {
      toast(error?.message ?? "Unable to load payout");
    } finally {
      setLoading(false);
    }
  }, [payoutId, toast]);

  useEffect(() => {
    load().catch(() => null);
  }, [load]);

  if (!payout && loading) return <View style={styles.center}><ActivityIndicator testID="payout-detail-loading" color={COLORS.secondary} /></View>;
  if (!payout) return <View style={styles.center}><Text style={styles.meta}>Payout not found.</Text></View>;

  return (
    <ScrollView testID="payout-detail-scroll" style={styles.root} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load()} />}>
      <PaymentHeader title={`Payout #${payout.id}`} onBack={() => navigation.goBack()} />
      <Text style={styles.status}>{payout.status}</Text>
      <Line label="Gross Amount" value={money(payout.grossAmount)} />
      <Line label="Commission" value={money(payout.commissionAmount)} />
      <Line label="Refund Reversal" value={money(payout.reversalAmount)} />
      <Line label="Net Settlement" value={money(payout.netAmount)} strong />
      <Line label="Created At" value={payout.createdAt ? new Date(payout.createdAt).toLocaleString() : "-"} />
      <Line label="Settled At" value={payout.settledAt ? new Date(payout.settledAt).toLocaleString() : "-"} />
    </ScrollView>
  );
}

function Line({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.line}>
      <Text style={styles.meta}>{label}</Text>
      <Text style={[styles.value, strong && styles.strong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, gap: 10 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background },
  status: { alignSelf: "flex-start", color: COLORS.secondary, fontWeight: "800", borderWidth: 1, borderColor: COLORS.secondary, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  line: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  meta: { color: COLORS.textSecondary },
  value: { color: COLORS.textPrimary, flexShrink: 1, textAlign: "right", fontWeight: "600" },
  strong: { color: COLORS.success, fontSize: 16, fontWeight: "800" },
});
