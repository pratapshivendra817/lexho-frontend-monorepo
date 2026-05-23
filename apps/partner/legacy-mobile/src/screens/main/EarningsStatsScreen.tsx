import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { COLORS } from "../../constants/colors";
import { getDashboardStats } from "../../services/partnerService";
import type { PartnerDashboardStats } from "../../types/partner";

export default function EarningsStatsScreen() {
  const [stats, setStats] = useState<PartnerDashboardStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await getDashboardStats();
    setStats(data);
  }, []);

  useEffect(() => {
    load().catch(() => null);
  }, [load]);

  const onShareEarnings = async () => {
    const message = [
      "Earnings Summary",
      `Today Earnings: INR ${stats?.todayEarnings ?? 0}`,
      `Weekly Earnings: INR ${stats?.weeklyEarnings ?? 0}`,
      `Completed Deliveries: ${stats?.totalCompletedOrders ?? 0}`,
      `Active Deliveries: ${stats?.activeDeliveries ?? 0}`,
      `Total Online Hours: ${stats?.totalOnlineHours ?? 0}`,
    ].join("\n");
    await Share.share({ title: "Earnings Summary", message });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            try {
              await load();
            } finally {
              setRefreshing(false);
            }
          }}
        />
      }
    >
      <View style={styles.titleRow}>
        <Text style={styles.title}>Earnings & Stats</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={() => void onShareEarnings()}>
          <Text style={styles.shareText}>Share</Text>
        </TouchableOpacity>
      </View>
      <StatsCard label="Today Earnings" value={`INR ${stats?.todayEarnings ?? 0}`} />
      <StatsCard label="Completed Deliveries" value={String(stats?.totalCompletedOrders ?? 0)} />
      <StatsCard label="Active Deliveries" value={String(stats?.activeDeliveries ?? 0)} />
      <StatsCard label="Total Online Hours" value={String(stats?.totalOnlineHours ?? 0)} />
      <StatsCard label="Weekly Earnings" value={`INR ${stats?.weeklyEarnings ?? 0}`} />
      <StatsCard label="Pending Orders" value={String(stats?.pendingOrders ?? 0)} />
    </ScrollView>
  );
}

function StatsCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, gap: 10 },
  title: { color: COLORS.textPrimary, fontSize: 22, fontWeight: "800", marginBottom: 4 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  shareBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: COLORS.surfaceSoft,
  },
  shareText: { color: COLORS.textPrimary, fontWeight: "700", fontSize: 12 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  cardLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  cardValue: { color: COLORS.textPrimary, fontSize: 22, fontWeight: "800", marginTop: 6 },
});
