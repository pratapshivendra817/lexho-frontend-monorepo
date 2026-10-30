import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import { COLORS } from "../../constants/colors";
import { fetchPartnerRequestById, getCanonicalPartnerOrderId, getPartnerOrderById } from "../../services/partnerService";
import type { PartnerOrder } from "../../types/order";
import { OrderLifecycleTimeline } from "../../components/common/OrderLifecycleTimeline";
import { getOrderStatusLabel } from "../../utils/statusLabels";

const ORDER_DETAILS_COPY = {
  details: "Order Details",
  title: "Order",
  customer: "Customer",
  phone: "Phone",
  address: "Address",
  service: "Service",
  amount: "Payable Amount",
  status: "Status",
  currency: "INR",
  createdAt: "Created At",
  loadError: "Unable to load order",
  notFound: "Order not found",
  retry: "Retry",
  shareAccessibility: "Share order",
  chatWithCustomer: "Chat with Customer",
  callCustomer: "Call Customer",
  openActiveJob: "Open Active Job",
  activeJobAcceptanceHint: "Active job opens after acceptance",
  openRouteMap: "Open Route Map",
} as const;

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
      setError(nextError?.message ?? ORDER_DETAILS_COPY.loadError);
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
      `${ORDER_DETAILS_COPY.details} #${order.id}`,
      `${ORDER_DETAILS_COPY.customer}: ${order.customerName ?? "-"}`,
      `${ORDER_DETAILS_COPY.phone}: ${order.customerPhone ?? "-"}`,
      `${ORDER_DETAILS_COPY.address}: ${order.address ?? "-"}`,
      `${ORDER_DETAILS_COPY.service}: ${order.serviceType ?? "-"}`,
      `${ORDER_DETAILS_COPY.amount}: ${ORDER_DETAILS_COPY.currency} ${order.amount ?? 0}`,
      `${ORDER_DETAILS_COPY.status}: ${String(order.status ?? "-").toUpperCase() || "-"}`,
    ].join("\n");
    await Share.share({ title: `${ORDER_DETAILS_COPY.title} #${order.id}`, message });
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
        <Text style={styles.emptyText}>{error || ORDER_DETAILS_COPY.notFound}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load().catch(() => null)}>
          <Text style={styles.shareText}>{ORDER_DETAILS_COPY.retry}</Text>
        </TouchableOpacity>
      </View>
    );
  }
  const resolvedOrderId = getCanonicalPartnerOrderId(order) || orderId;
  const status = String(order.status).toUpperCase();
  const canOpenActiveJob = ["ACCEPTED", "ARRIVED", "STARTED", "IN_PROGRESS"].includes(status);
  const hasCustomerCoordinates = Number.isFinite(order.latitude) && Number.isFinite(order.longitude);

  return (
    <ScrollView
      testID="order-details-scroll"
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load()} />}
    >
      <View style={styles.titleRow}>
        <Text style={styles.title}>{`${ORDER_DETAILS_COPY.title} #${order.id}`}</Text>
        <TouchableOpacity style={styles.shareIconBtn} onPress={onShareDetails} accessibilityLabel={ORDER_DETAILS_COPY.shareAccessibility}>
          <MaterialCommunityIcons name="share-variant" size={18} color={COLORS.secondary} />
        </TouchableOpacity>
      </View>
      <Card label={ORDER_DETAILS_COPY.customer} value={order.customerName ?? "-"} />
      <Card label={ORDER_DETAILS_COPY.phone} value={order.customerPhone ?? "-"} />
      <Card label={ORDER_DETAILS_COPY.address} value={order.address ?? "-"} />
      <Card label={ORDER_DETAILS_COPY.service} value={order.serviceType ?? "-"} />
      <Card label={ORDER_DETAILS_COPY.amount} value={`${ORDER_DETAILS_COPY.currency} ${order.amount ?? 0}`} />
      <Card label={ORDER_DETAILS_COPY.status} value={getOrderStatusLabel(order.status, (_key, fallback) => fallback)} />
      <Card label={ORDER_DETAILS_COPY.createdAt} value={order.createdAt ?? "-"} />
      <View style={styles.fullBleed}>
        <OrderLifecycleTimeline order={order} />
      </View>

      <TouchableOpacity
        style={[styles.chatBtn, styles.fullBleed]}
        onPress={() => navigation.navigate("Chat", { orderId: resolvedOrderId, customerName: order.customerName })}
      >
        <Text style={styles.chatBtnText}>{ORDER_DETAILS_COPY.chatWithCustomer}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.callBtn, styles.fullBleed]}
        onPress={() => navigation.navigate("OutgoingCall", { orderId: resolvedOrderId, customerName: order.customerName })}
      >
        <Text style={styles.callBtnText}>{ORDER_DETAILS_COPY.callCustomer}</Text>
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
        <Text style={styles.primaryBtnText}>{canOpenActiveJob ? ORDER_DETAILS_COPY.openActiveJob : ORDER_DETAILS_COPY.activeJobAcceptanceHint}</Text>
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
        <Text style={styles.chatBtnText}>{ORDER_DETAILS_COPY.openRouteMap}</Text>
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
