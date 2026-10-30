import React, { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import { COLORS } from "../../constants/colors";
import { getPartnerPayouts } from "../../services/partnerService";
import type { PartnerPayout } from "../../types/payment";
import { useAppFeedback } from "../../context/AppFeedbackContext";
import PaymentHeader from "../../components/payments/PaymentHeader";

const money = (value: number, currencyLabel: string) => `${currencyLabel} ${value.toFixed(2)}`;
const PAYOUTS_COPY = {
  currencyLabel: "INR",
  title: "Payout",
  titlePlural: "Payouts",
  historyTitle: "Payout History",
  settlement: "Settlement",
  status: "Status",
  subtitle: "Settlement ledger created after payment and service completion",
  empty: "No payouts available.",
  loadError: "Unable to load payouts",
} as const;

type TranslationResolver = (key: string, fallback: string) => string;

export function getPayoutListStatusLabel(status: string | undefined, tr: TranslationResolver): string {
  const normalizedStatus = String(status ?? "").trim();
  return tr(`payouts.status_${normalizedStatus.toLowerCase()}`, normalizedStatus || "-");
}

export function getPayoutListRowCopy(
  payout: PartnerPayout,
  t: (key: string) => string,
  tr: TranslationResolver,
): { title: string; dateLabel: string; statusLabel: string; amountLabel: string } {
  return {
    title: `${PAYOUTS_COPY.title} #${payout.id}`,
    dateLabel: payout.createdAt ? new Date(payout.createdAt).toLocaleDateString() : PAYOUTS_COPY.settlement,
    statusLabel: `${PAYOUTS_COPY.status}: ${getPayoutListStatusLabel(payout.status, tr)}`,
    amountLabel: money(payout.settlementAmount, PAYOUTS_COPY.currencyLabel),
  };
}

export default function PayoutsScreen({ navigation }: any) {
  const { toast } = useAppFeedback();
  const [rows, setRows] = useState<PartnerPayout[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await getPartnerPayouts({ page: 0, size: 20 }));
    } catch (error: any) {
      toast(error?.message ?? PAYOUTS_COPY.loadError);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load().catch(() => null);
  }, [load]);

  return (
    <View style={styles.root}>
      <PaymentHeader title={PAYOUTS_COPY.historyTitle} onBack={() => navigation.goBack()} />
      <Text style={styles.subtitle}>{PAYOUTS_COPY.subtitle}</Text>
      <FlatList
        testID="payouts-list"
        data={rows}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load()} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>{PAYOUTS_COPY.empty}</Text> : null}
        renderItem={({ item }) => {
          const copy = getPayoutListRowCopy(item, () => "", (_key, fallback) => fallback);
          return (
            <TouchableOpacity style={styles.row} onPress={() => navigation.navigate("PayoutDetail", { payoutId: item.id })}>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>{copy.title}</Text>
                <Text style={styles.meta}>{copy.dateLabel}</Text>
                <Text style={styles.meta}>{copy.statusLabel}</Text>
              </View>
              <View style={styles.amountWrap}>
                <Text style={styles.amount}>{copy.amountLabel}</Text>
                <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.textSecondary} />
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, backgroundColor: COLORS.background },
  subtitle: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 4 },
  list: { paddingTop: 12, paddingBottom: 24 },
  empty: { color: COLORS.textSecondary, paddingVertical: 16 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowCopy: { flex: 1, gap: 4 },
  rowTitle: { color: COLORS.textPrimary, fontWeight: "800" },
  meta: { color: COLORS.textSecondary, fontSize: 12 },
  amountWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
  amount: { color: COLORS.success, fontWeight: "800" },
});
