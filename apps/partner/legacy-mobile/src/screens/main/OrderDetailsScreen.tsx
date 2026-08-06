import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import { COLORS } from "../../constants/colors";
import { fetchPartnerRequestById, getCanonicalPartnerOrderId, getPartnerOrderById } from "../../services/partnerService";
import type { PartnerOrder } from "../../types/order";
import { OrderLifecycleTimeline } from "../../components/common/OrderLifecycleTimeline";

export default function OrderDetailsScreen({ route, navigation }: any) {
  const orderId: number = route?.params?.orderId;
  const requestId: number | undefined = route?.params?.requestId;
  const [order, setOrder] = useState<PartnerOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      let data: PartnerOrder;
      if (requestId) {
        try {
          data = await fetchPartnerRequestById(requestId);
        } catch {
          data = await getPartnerOrderById(orderId);
        }
      } else {
        data = await getPartnerOrderById(orderId);
      }
      setOrder(data);
      setError("");
    } catch (nextError: any) {
      setError(nextError?.message ?? "Unable to load order");
    } finally {
      setLoading(false);
    }
  }, [orderId, requestId]);

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
      <View testID="order-details-loading" style={styles.loaderWrap}>
        <ActivityIndicator color={COLORS.secondary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.loaderWrap}>
        <Text style={styles.emptyText}>{error || "Order not found"}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load().catch(() => null)}>
          <Text style={styles.shareText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  const resolvedOrderId = getCanonicalPartnerOrderId(order) || orderId;
  const canOpenActiveJob = ["ACCEPTED", "STARTED"].includes(String(order.status).toUpperCase());
  const hasCustomerCoordinates = Number.isFinite(order.latitude) && Number.isFinite(order.longitude);

  return (
    <ScrollView
      testID="order-details-scroll"
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load()} />}
    >
      <View style={styles.titleRow}>
        <Text style={styles.title}>Order #{order.id}</Text>
        <TouchableOpacity style={styles.shareIconBtn} onPress={onShareDetails} accessibilityLabel="Share order">
          <MaterialCommunityIcons name="share-variant" size={18} color={COLORS.secondary} />
        </TouchableOpacity>
      </View>
      <Card label="Customer" value={order.customerName ?? "-"} />
      <Card label="Phone" value={order.customerPhone ?? "-"} />
      <Card label="Address" value={order.address ?? "-"} />
      <Card label="Service" value={order.serviceType ?? "-"} />
      <Card label="Amount" value={`INR ${order.amount ?? 0}`} />
      <Card label="Status" value={order.status} />
      <Card label="Created At" value={order.createdAt ?? "-"} />
      <View style={styles.fullBleed}>
        <OrderLifecycleTimeline order={order} />
      </View>

      <TouchableOpacity
        style={[styles.chatBtn, styles.fullBleed]}
        onPress={() => navigation.navigate("Chat", { orderId: resolvedOrderId, customerName: order.customerName })}
      >
        <Text style={styles.chatBtnText}>Chat with Customer</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.callBtn, styles.fullBleed]}
        onPress={() => navigation.navigate("OutgoingCall", { orderId: resolvedOrderId, customerName: order.customerName })}
      >
        <Text style={styles.callBtnText}>Call Customer</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.primaryBtn, styles.fullBleed, !canOpenActiveJob && styles.primaryBtnDisabled]}
        disabled={!canOpenActiveJob}
        onPress={() =>
          navigation.navigate("ActiveJob", {
            orderId: resolvedOrderId,
            customerLatitude: order.latitude,
            customerLongitude: order.longitude,
          })
        }
      >
        <Text style={styles.primaryBtnText}>{canOpenActiveJob ? "Open Active Job" : "Active job opens after acceptance"}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.chatBtn, styles.fullBleed, !hasCustomerCoordinates && styles.primaryBtnDisabled]}
        disabled={!hasCustomerCoordinates}
        onPress={() =>
          navigation.navigate("RouteMap", {
            orderId: resolvedOrderId,
            customerLatitude: order.latitude,
            customerLongitude: order.longitude,
          })
        }
      >
        <Text style={styles.chatBtnText}>Open Route Map</Text>
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
  retryBtn: { marginTop: 12, borderWidth: 1, borderColor: COLORS.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: COLORS.surfaceSoft },
  title: { color: COLORS.textPrimary, fontSize: 22, fontWeight: "800", marginBottom: 4 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 },
  shareIconBtn: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 17,
    backgroundColor: COLORS.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  shareText: { color: COLORS.textPrimary, fontWeight: "700", fontSize: 12 },
  fullBleed: { marginHorizontal: -16 },
  card: {
    marginHorizontal: -16,
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
  primaryBtnDisabled: { opacity: 0.55 },
  primaryBtnText: { color: COLORS.background, fontWeight: "800" },
  chatBtn: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceElevated, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  chatBtnText: { color: COLORS.accent, fontWeight: "800" },
  callBtn: { backgroundColor: COLORS.success, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  callBtnText: { color: COLORS.background, fontWeight: "900" },
});
