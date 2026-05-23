import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { COLORS } from "../../constants/colors";
import { getPartnerOrderById } from "../../services/partnerService";
import type { PartnerOrder } from "../../types/order";

export default function OrderDetailsScreen({ route, navigation }: any) {
  const orderId: number = route?.params?.orderId;
  const [order, setOrder] = useState<PartnerOrder | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const data = await getPartnerOrderById(orderId);
      setOrder(data);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load().catch(() => null);
  }, [load]);

  const onShareDetails = async () => {
    if (!order) return;
    const message = [
      `Order Details #${order.id}`,
      `Customer: ${order.customerName ?? "-"}`,
      `Phone: ${order.customerPhone ?? "-"}`,
      `Address: ${order.address ?? "-"}`,
      `Service: ${order.serviceType ?? "-"}`,
      `Amount: INR ${order.amount ?? 0}`,
      `Status: ${order.status}`,
    ].join("\n");
    await Share.share({ title: `Order #${order.id}`, message });
  };

  if (loading && !order) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator color={COLORS.secondary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.loaderWrap}>
        <Text style={styles.emptyText}>Order not found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load()} />}
    >
      <View style={styles.titleRow}>
        <Text style={styles.title}>Order #{order.id}</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={() => void onShareDetails()}>
          <Text style={styles.shareText}>Share</Text>
        </TouchableOpacity>
      </View>
      <Card label="Customer" value={order.customerName ?? "-"} />
      <Card label="Phone" value={order.customerPhone ?? "-"} />
      <Card label="Address" value={order.address ?? "-"} />
      <Card label="Service" value={order.serviceType ?? "-"} />
      <Card label="Amount" value={`INR ${order.amount ?? 0}`} />
      <Card label="Status" value={order.status} />
      <Card label="Created At" value={order.createdAt ?? "-"} />

      <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate("ActiveJob", { orderId: order.id })}>
        <Text style={styles.primaryBtnText}>Open Active Delivery</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Card({ label, value }: { label: string; value: string }) {
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
  loaderWrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background },
  emptyText: { color: COLORS.textSecondary },
  title: { color: COLORS.textPrimary, fontSize: 22, fontWeight: "800", marginBottom: 4 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 },
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
    padding: 12,
    gap: 4,
  },
  cardLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  cardValue: { color: COLORS.textPrimary, fontSize: 14, fontWeight: "600" },
  primaryBtn: {
    marginTop: 8,
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryBtnText: { color: COLORS.background, fontWeight: "800" },
});
