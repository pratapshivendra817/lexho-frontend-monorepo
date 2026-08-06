import React, { useCallback, useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { COLORS } from "../../constants/colors";
import { createPartnerWithdrawal, getPartnerWithdrawalBalance, getPartnerWithdrawals } from "../../services/partnerService";
import type { PartnerWithdrawal, PartnerWithdrawalBalance } from "../../types/payment";
import { useAppFeedback } from "../../context/AppFeedbackContext";
import PaymentHeader from "../../components/payments/PaymentHeader";

export const money = (value: number) => `INR ${value.toFixed(2)}`;

export function normalizeWithdrawalAmountInput(value: string) {
  return value.replace(/[^0-9.]/g, "");
}

export function validateWithdrawalAmount(amount: string, availableBalance: number) {
  const value = Number(amount);

  if (!Number.isFinite(value) || value <= 0) {
    return { error: "Enter a valid withdrawal amount" as const, value };
  }

  if (value > availableBalance) {
    return { error: "Amount cannot exceed available balance" as const, value };
  }

  return { error: null, value };
}

export default function WithdrawalsScreen({ navigation }: any) {
  const { toast } = useAppFeedback();
  const [balance, setBalance] = useState<PartnerWithdrawalBalance | null>(null);
  const [rows, setRows] = useState<PartnerWithdrawal[]>([]);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextBalance, nextRows] = await Promise.all([
        getPartnerWithdrawalBalance(),
        getPartnerWithdrawals({ page: 0, size: 20 }),
      ]);
      setBalance(nextBalance);
      setRows(nextRows);
    } catch (error: any) {
      toast(error?.message ?? "Unable to load withdrawals");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load().catch(() => null);
  }, [load]);

  const submit = async () => {
    const { error, value } = validateWithdrawalAmount(amount, balance?.availableBalance ?? 0);
    if (error) {
      toast(error);
      return;
    }

    setSubmitting(true);
    try {
      await createPartnerWithdrawal(value);
      setAmount("");
      toast("Withdrawal requested");
      await load();
    } catch (error: any) {
      toast(error?.message ?? "Unable to request withdrawal");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        testID="withdrawals-scroll"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load()} />}
      >
        <PaymentHeader title="Withdrawals" onBack={() => navigation.goBack()} />
        <Text style={styles.subtitle}>Available balance already accounts for refund reversals and reserved withdrawals.</Text>
        <View style={[styles.balanceRow, styles.fullBleed]}>
          <Balance label="Available" value={balance?.availableBalance ?? 0} emphasis />
          <Balance label="Reserved" value={balance?.reservedBalance ?? 0} />
        </View>
        <Text style={styles.meta}>Settled balance: {money(balance?.settledBalance ?? 0)}</Text>

        <Text style={styles.sectionTitle}>Request Withdrawal</Text>
        <TextInput
          value={amount}
          onChangeText={(value) => setAmount(normalizeWithdrawalAmountInput(value))}
          keyboardType="decimal-pad"
          placeholder="Amount"
          placeholderTextColor={COLORS.textMuted}
          style={[styles.input, styles.fullBleed]}
          accessibilityLabel="Withdrawal amount"
        />
        <TouchableOpacity style={[styles.button, styles.fullBleed, submitting && styles.disabled]} disabled={submitting} onPress={submit}>
          <Text style={styles.buttonText}>{submitting ? "Submitting..." : "Request Withdrawal"}</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Withdrawal History</Text>
        {rows.length === 0 && !loading ? <Text style={styles.meta}>No withdrawal requests yet.</Text> : null}
        {rows.map((item) => (
          <View key={item.id} style={[styles.historyCard, styles.fullBleed]}>
            <View style={styles.historyRow}>
              <View style={styles.historyCopy}>
                <Text style={styles.rowTitle}>Withdrawal #{item.id}</Text>
                <Text style={styles.meta}>{item.requestedAt ? new Date(item.requestedAt).toLocaleDateString() : "Requested"}</Text>
              </View>
              <View style={styles.amountWrap}>
                <Text style={styles.rowAmount}>{money(item.amount)}</Text>
                <StatusPill status={item.status} />
              </View>
            </View>
            <View style={styles.timeline}>
              {withdrawalTimeline(item).map((step, index) => (
                <View key={step.label} style={styles.timelineStep}>
                  <View style={[styles.timelineDot, step.done && styles.timelineDotDone]} />
                  <View style={styles.timelineTextWrap}>
                    <Text style={[styles.timelineLabel, step.done && styles.timelineLabelDone]}>{step.label}</Text>
                    <Text style={styles.meta}>{step.at ? new Date(step.at).toLocaleString() : step.caption}</Text>
                  </View>
                  {index < 3 ? <View style={styles.timelineLine} /> : null}
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Balance({ label, value, emphasis = false }: { label: string; value: number; emphasis?: boolean }) {
  return (
    <View style={styles.balance}>
      <Text style={styles.meta}>{label}</Text>
      <Text style={[styles.balanceValue, emphasis && styles.emphasis]}>{money(value)}</Text>
    </View>
  );
}

function StatusPill({ status }: { status?: string }) {
  const value = String(status || "PENDING").toUpperCase();
  const success = value === "APPROVED" || value === "COMPLETED";
  const rejected = value === "REJECTED";
  return (
    <View style={[styles.statusPill, success && styles.statusSuccess, rejected && styles.statusRejected]}>
      <Text style={[styles.statusText, success && styles.statusSuccessText, rejected && styles.statusRejectedText]}>{value}</Text>
    </View>
  );
}

export function withdrawalTimeline(item: PartnerWithdrawal) {
  const status = String(item.status || "PENDING").toUpperCase();
  return [
    { label: "Pending", done: true, at: item.requestedAt, caption: "Requested" },
    { label: "Approved", done: ["APPROVED", "COMPLETED"].includes(status), caption: "Awaiting approval" },
    { label: "Rejected", done: status === "REJECTED", caption: "No rejection" },
    { label: "Completed", done: status === "COMPLETED", at: item.processedAt, caption: "Settlement pending" },
  ];
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, gap: 12 },
  fullBleed: { marginHorizontal: -16 },
  subtitle: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19 },
  balanceRow: { flexDirection: "row", gap: 10 },
  balance: { flex: 1, minHeight: 82, justifyContent: "center", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  balanceValue: { color: COLORS.textPrimary, fontSize: 16, fontWeight: "800", marginTop: 8 },
  emphasis: { color: COLORS.success },
  meta: { color: COLORS.textSecondary, fontSize: 12 },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 17, fontWeight: "800", marginTop: 8 },
  input: { minHeight: 48, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, color: COLORS.textPrimary, backgroundColor: COLORS.surface },
  button: { minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: COLORS.secondary },
  disabled: { opacity: 0.55 },
  buttonText: { color: COLORS.background, fontWeight: "800" },
  historyCard: { gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  historyRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  historyCopy: { flex: 1, gap: 4 },
  rowTitle: { color: COLORS.textPrimary, fontWeight: "700" },
  amountWrap: { alignItems: "flex-end", gap: 4 },
  rowAmount: { color: COLORS.textPrimary, fontWeight: "800" },
  statusPill: { borderRadius: 999, borderWidth: 1, borderColor: COLORS.accent, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: "rgba(245, 215, 110, 0.12)" },
  statusSuccess: { borderColor: COLORS.success, backgroundColor: "rgba(16, 185, 129, 0.12)" },
  statusRejected: { borderColor: COLORS.error, backgroundColor: "rgba(239, 68, 68, 0.12)" },
  statusText: { color: COLORS.accent, fontSize: 10, fontWeight: "800" },
  statusSuccessText: { color: COLORS.success },
  statusRejectedText: { color: COLORS.error },
  timeline: { gap: 8 },
  timelineStep: { minHeight: 28, flexDirection: "row", alignItems: "flex-start", gap: 8, position: "relative" },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  timelineDotDone: { borderColor: COLORS.success, backgroundColor: COLORS.success },
  timelineLine: { position: "absolute", left: 4, top: 16, bottom: -8, width: 1, backgroundColor: COLORS.border },
  timelineTextWrap: { flex: 1 },
  timelineLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: "700" },
  timelineLabelDone: { color: COLORS.textPrimary },
});
