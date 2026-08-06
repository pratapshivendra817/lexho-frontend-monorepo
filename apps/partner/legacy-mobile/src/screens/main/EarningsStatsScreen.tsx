import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import { COLORS } from "../../constants/colors";
import { getPartnerEarningsSummary, getPartnerEarningsTransactions, getPartnerWithdrawalBalance } from "../../services/partnerService";
import type { PartnerEarningsSummary, PartnerEarningsTransaction } from "../../types/payment";
import { useAppFeedback } from "../../context/AppFeedbackContext";
import PaymentHeader from "../../components/payments/PaymentHeader";

const money = (value: number) => `INR ${value.toFixed(2)}`;

export default function EarningsStatsScreen({ navigation }: any) {
  const { toast } = useAppFeedback();
  const [summary, setSummary] = useState<PartnerEarningsSummary | null>(null);
  const [transactions, setTransactions] = useState<PartnerEarningsTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextSummary, nextTransactions] = await Promise.all([
        getPartnerEarningsSummary().then(async (summary) => {
          try {
            const balance = await getPartnerWithdrawalBalance();
            return {
              ...summary,
              availableBalance: balance.availableBalance,
              pendingSettlement: balance.reservedBalance,
            };
          } catch {
            return summary;
          }
        }),
        getPartnerEarningsTransactions({ page: 0, size: 20 }),
      ]);
      setSummary(nextSummary);
      setTransactions(nextTransactions);
    } catch (error: any) {
      toast(error?.message ?? "Unable to load earnings");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load().catch(() => null);
  }, [load]);

  return (
    <ScrollView
      testID="earnings-scroll"
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load()} />}
    >
      <PaymentHeader title="Earnings" onBack={() => navigation.goBack()} />
      <Text style={styles.subtitle}>Settled income after commission and refund reversals</Text>

      {!summary && loading ? <ActivityIndicator color={COLORS.secondary} /> : null}
      <View style={styles.summaryGrid}>
        <Summary label="Today" value={summary?.todaySettlement ?? 0} />
        <Summary label="This Week" value={summary?.weekSettlement ?? 0} />
        <Summary label="This Month" value={summary?.monthSettlement ?? 0} />
        <Summary label="Available" value={summary?.availableBalance ?? 0} />
        <Summary label="Pending" value={summary?.pendingSettlement ?? 0} />
        <Summary label="Lifetime" value={summary?.lifetimeSettlement ?? 0} />
      </View>

      <View style={styles.actions}>
        <Action icon="bank-transfer" label="Payouts" onPress={() => navigation.navigate("Payouts")} />
        <Action icon="bank-outline" label="Bank Account" onPress={() => navigation.navigate("BankAccount")} />
        <Action icon="cash-fast" label="Withdraw" onPress={() => navigation.navigate("Withdrawals")} />
      </View>

      <Text style={styles.sectionTitle}>Recent Transactions</Text>
      {transactions.length === 0 && !loading ? <Text style={styles.empty}>No earnings transactions yet.</Text> : null}
      {transactions.map((item) => (
        <View key={item.id} style={styles.row}>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>{item.description}</Text>
            <Text style={styles.meta}>
              {item.bookingId ? `Booking #${item.bookingId}` : item.type ?? "Settlement"}
              {item.createdAt ? ` | ${new Date(item.createdAt).toLocaleDateString()}` : ""}
            </Text>
          </View>
          <View style={styles.amountWrap}>
            <Text style={[styles.amount, item.amount < 0 && styles.negative]}>{money(item.amount)}</Text>
            {item.status ? <Text style={styles.meta}>{item.status}</Text> : null}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.summary}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{money(value)}</Text>
    </View>
  );
}

function Action({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.action} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <MaterialCommunityIcons name={icon} size={22} color={COLORS.secondary} />
      <Text style={styles.actionText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, gap: 12 },
  subtitle: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginHorizontal: -16 },
  summary: { width: "48%", minHeight: 88, padding: 12, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, backgroundColor: COLORS.surface },
  summaryLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: "700" },
  summaryValue: { color: COLORS.textPrimary, fontSize: 17, fontWeight: "800", marginTop: 8 },
  actions: { flexDirection: "row", gap: 8, marginHorizontal: -16 },
  action: { flex: 1, minHeight: 76, alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, backgroundColor: COLORS.surface },
  actionText: { color: COLORS.textPrimary, fontSize: 12, fontWeight: "700", textAlign: "center" },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 17, fontWeight: "800", marginTop: 4 },
  empty: { color: COLORS.textSecondary, paddingVertical: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 8, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowCopy: { flex: 1, gap: 4 },
  rowTitle: { color: COLORS.textPrimary, fontWeight: "700" },
  meta: { color: COLORS.textSecondary, fontSize: 11 },
  amountWrap: { alignItems: "flex-end", gap: 4 },
  amount: { color: COLORS.success, fontWeight: "800" },
  negative: { color: COLORS.danger },
});
