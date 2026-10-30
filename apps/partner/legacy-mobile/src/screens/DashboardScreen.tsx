import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { PartnerOrder } from "../types/order";
import { acceptPartnerRequest, fetchPartnerRequests, rejectPartnerRequest } from "../services/partnerService";
import { COLORS } from "../constants/colors";
import { getOrderStatusLabel } from "../utils/statusLabels";

type Props = { onLogout: () => Promise<void> };

const DASHBOARD_COPY = {
  noPendingRequests: "No pending requests",
  customer: "Customer",
  service: "Service",
  currency: "INR",
  status: "Status",
  accept: "Accept",
  reject: "Reject",
} as const;

export default function DashboardScreen({ onLogout: _onLogout }: Props) {
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<PartnerOrder[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const rows = await fetchPartnerRequests({ status: "PENDING", page: 0, size: 20 });
      setOrders(rows as PartnerOrder[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => null);
  }, []);

  return (
    <FlatList
      testID="dashboard-list"
      data={orders}
      keyExtractor={(item) => String(item.id)}
      style={{ flex: 1, backgroundColor: COLORS.background }}
      refreshControl={<RefreshControl testID="dashboard-refresh-control" refreshing={loading} onRefresh={() => load()} />}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      ListEmptyComponent={loading ? <ActivityIndicator testID="dashboard-loading-indicator" color={COLORS.secondary} /> : <Text style={styles.empty}>{DASHBOARD_COPY.noPendingRequests}</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.name}>{item.customerName ?? DASHBOARD_COPY.customer}</Text>
          <Text style={styles.meta}>#{item.id} | {item.serviceType ?? DASHBOARD_COPY.service} | {DASHBOARD_COPY.currency} {item.amount ?? 0}</Text>
          <Text style={styles.meta}>{`${DASHBOARD_COPY.status}: ${getOrderStatusLabel(item.status, (_key, fallback) => fallback)}`}</Text>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.btn, styles.accept]} onPress={async () => { await acceptPartnerRequest(item.id); load().catch(() => null); }}>
              <Text style={styles.btnText}>{DASHBOARD_COPY.accept}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.reject]} onPress={async () => { await rejectPartnerRequest(item.id); load().catch(() => null); }}>
              <Text style={styles.btnText}>{DASHBOARD_COPY.reject}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, gap: 5 },
  name: { color: COLORS.textPrimary, fontWeight: "800" },
  meta: { color: COLORS.textSecondary, fontSize: 12 },
  row: { flexDirection: "row", gap: 8, marginTop: 6 },
  btn: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  accept: { backgroundColor: COLORS.success },
  reject: { backgroundColor: COLORS.danger },
  btnText: { color: COLORS.white, fontWeight: "700" },
  empty: { color: COLORS.textSecondary, textAlign: "center", marginTop: 40 },
});
