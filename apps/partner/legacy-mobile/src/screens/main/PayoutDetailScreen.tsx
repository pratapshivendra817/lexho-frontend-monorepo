import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { COLORS } from "../../constants/colors";
import { getPartnerPayoutById } from "../../services/partnerService";
import type { PartnerPayout } from "../../types/payment";
import { useAppFeedback } from "../../context/AppFeedbackContext";
import PaymentHeader from "../../components/payments/PaymentHeader";

const money = (value: number, currencyLabel: string) => `${currencyLabel} ${value.toFixed(2)}`;
const PAYOUT_DETAIL_COPY = {
  currencyLabel: "INR",
  title: "Payout",
  notFound: "Payout not found.",
  loadError: "Unable to load payout",
  settlementAmount: "Settlement Amount",
  createdAt: "Created At",
  settledAt: "Settled At",
} as const;

type TranslationResolver = (key: string, fallback: string) => string;

export function getPayoutStatusLabel(status: string | undefined, tr: TranslationResolver): string {
  const normalizedStatus = String(status ?? "").trim();
  return tr(`payouts.status_${normalizedStatus.toLowerCase()}`, normalizedStatus || "-");
}

export function getPayoutDetailRows(
  payout: PartnerPayout,
  tr: TranslationResolver,
): Array<{ label: string; value: string; strong?: boolean }> {
  return [
    { label: PAYOUT_DETAIL_COPY.settlementAmount, value: money(payout.settlementAmount, PAYOUT_DETAIL_COPY.currencyLabel), strong: true },
    { label: PAYOUT_DETAIL_COPY.createdAt, value: payout.createdAt ? new Date(payout.createdAt).toLocaleString() : "-" },
    { label: PAYOUT_DETAIL_COPY.settledAt, value: payout.settledAt ? new Date(payout.settledAt).toLocaleString() : "-" },
  ];
}

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
      toast(error?.message ?? PAYOUT_DETAIL_COPY.loadError);
    } finally {
      setLoading(false);
    }
  }, [payoutId, toast]);

  useEffect(() => {
    load().catch(() => null);
  }, [load]);

  if (!payout && loading) return <View style={styles.center}><ActivityIndicator testID="payout-detail-loading" color={COLORS.secondary} /></View>;
  if (!payout) return <View style={styles.center}><Text style={styles.meta}>{PAYOUT_DETAIL_COPY.notFound}</Text></View>;
  const payoutStatus = getPayoutStatusLabel(payout.status, (_key, fallback) => fallback);
  const payoutRows = getPayoutDetailRows(payout, (_key, fallback) => fallback);

  return (
    <ScrollView testID="payout-detail-scroll" style={styles.root} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load()} />}>
      <PaymentHeader title={`${PAYOUT_DETAIL_COPY.title} #${payout.id}`} onBack={() => navigation.goBack()} />
      <Text style={styles.status}>{payoutStatus}</Text>
      {payoutRows.map((row) => (
        <Line key={row.label} label={row.label} value={row.value} strong={row.strong} />
      ))}
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
