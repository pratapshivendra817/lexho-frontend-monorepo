import React, { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import { COLORS } from "../../constants/colors";
import { getPartnerPayouts } from "../../services/partnerService";
import type { PartnerPayout } from "../../types/payment";
import { useAppFeedback } from "../../context/AppFeedbackContext";
import PaymentHeader from "../../components/payments/PaymentHeader";

const money = (value: number) => `INR ${value.toFixed(2)}`;

export default function PayoutsScreen({ navigation }: any) {
  const { toast } = useAppFeedback();
  const [rows, setRows] = useState<PartnerPayout[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await getPartnerPayouts({ page: 0, size: 20 }));
    } catch (error: any) {
      toast(error?.message ?? "Unable to load payouts");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load().catch(() => null);
  }, [load]);

  return (
    <View style={styles.root}>
      <PaymentHeader title="Payout History" onBack={() => navigation.goBack()} />
      <Text style={styles.subtitle}>Settlement ledger created after payment and service completion</Text>
      <FlatList
        testID="payouts-list"
        data={rows}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load()} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No payouts available.</Text> : null}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => navigation.navigate("PayoutDetail", { payoutId: item.id })}>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>Payout #{item.id}</Text>
              <Text style={styles.meta}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "Settlement"}</Text>
              <Text style={styles.meta}>Status: {item.status}</Text>
            </View>
            <View style={styles.amountWrap}>
              <Text style={styles.amount}>{money(item.netAmount)}</Text>
              <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.textSecondary} />
            </View>
          </TouchableOpacity>
        )}
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
