import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { completeOrder, getPartnerOrderById, startOrder } from "../../services/partnerService";
import { COLORS } from "../../constants/colors";
import type { PartnerOrder } from "../../types/order";
import { OrderLifecycleTimeline } from "../../components/common/OrderLifecycleTimeline";
import { setTrackingContext } from "../../features/shift/locationTrackingManager";
import { PARTNER_ANALYTICS_EVENTS, trackEvent } from "../../services/firebaseAnalytics";

export default function ActiveJobScreen({ route, navigation }: any) {
  const orderId: number = route?.params?.orderId;
  const customerLatitude: number | undefined = route?.params?.customerLatitude;
  const customerLongitude: number | undefined = route?.params?.customerLongitude;
  const [order, setOrder] = useState<PartnerOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<"start" | "complete" | null>(null);
  const hasCustomerCoordinates = Number.isFinite(order?.latitude) && Number.isFinite(order?.longitude);
  const customerLat = order?.latitude;
  const customerLng = order?.longitude;

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      setOrder(await getPartnerOrderById(orderId));
    } catch {
      setOrder((prev) => prev ?? { id: orderId, status: "ACCEPTED" });
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load().catch(() => null);
  }, [load]);

  useEffect(() => {
    setTrackingContext({ bookingId: orderId, customerLatitude, customerLongitude });
    return () => setTrackingContext({});
  }, [customerLatitude, customerLongitude, orderId]);

  const onStart = async () => {
    if (!canStart(order)) return;
    setActionLoading("start");
    try {
      await startOrder(orderId);
      void trackEvent(PARTNER_ANALYTICS_EVENTS.orderStarted, { orderId });
      Alert.alert("Success", "Service started.");
      await load();
    } catch (error: any) {
      Alert.alert("Unable to start service", error?.message ?? "Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const onComplete = async () => {
    if (!canComplete(order)) return;
    setActionLoading("complete");
    try {
      await completeOrder(orderId);
      void trackEvent(PARTNER_ANALYTICS_EVENTS.orderCompleted, { orderId });
      Alert.alert("Success", "Service completed.");
      await load();
    } catch (error: any) {
      Alert.alert("Unable to complete service", error?.message ?? "Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load()} />}
    >
      <Text style={styles.title}>Active Job #{orderId}</Text>
      <Text style={styles.meta}>{order?.customerName ?? "Customer"} | {order?.address ?? "Address unavailable"}</Text>
      <View style={styles.fullBleed}>
        <OrderLifecycleTimeline order={order} />
      </View>
      {loading && !order ? <ActivityIndicator color={COLORS.secondary} /> : null}

      <TouchableOpacity style={[styles.btn, styles.fullBleed, styles.start, (!canStart(order) || actionLoading === "start") && styles.disabled]} disabled={!canStart(order) || actionLoading === "start"} onPress={onStart}>
        <Text style={styles.btnText}>{actionLoading === "start" ? "Starting..." : "Start Service"}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btn, styles.fullBleed, styles.complete, (!canComplete(order) || actionLoading === "complete") && styles.disabled]} disabled={!canComplete(order) || actionLoading === "complete"} onPress={onComplete}>
        <Text style={styles.btnText}>{actionLoading === "complete" ? "Completing..." : "Complete Service"}</Text>
      </TouchableOpacity>

      {hasCustomerCoordinates ? (
        <>
          <TouchableOpacity style={[styles.btn, styles.fullBleed]} onPress={() => Linking.openURL(`geo:${customerLat},${customerLng}?q=${customerLat},${customerLng}`)}>
            <Text style={styles.btnText}>Open Customer Location</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.fullBleed]}
            onPress={() =>
              navigation.navigate("RouteMap", {
                orderId,
                customerLatitude: customerLat,
                customerLongitude: customerLng,
              })
            }
          >
            <Text style={styles.btnText}>Open In-App Navigation</Text>
          </TouchableOpacity>
        </>
      ) : null}
    </ScrollView>
  );
}

function canStart(order: PartnerOrder | null) {
  return String(order?.status ?? "ACCEPTED").toUpperCase() === "ACCEPTED";
}

function canComplete(order: PartnerOrder | null) {
  return String(order?.status ?? "").toUpperCase() === "STARTED";
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  container: { padding: 16, gap: 12 },
  title: { color: COLORS.textPrimary, fontSize: 22, fontWeight: "800" },
  meta: { color: COLORS.textSecondary },
  fullBleed: { marginHorizontal: -16 },
  btn: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 14, alignItems: "center" },
  start: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  complete: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  disabled: { opacity: 0.55 },
  btnText: { color: COLORS.textPrimary, fontWeight: "700" },
});
