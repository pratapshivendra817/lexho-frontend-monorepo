import React, { useState } from "react";
import { FlatList, RefreshControl, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { acceptDispatchRequest, rejectDispatchRequest } from "../../services/partnerService";
import type { PartnerOrder } from "../../types/order";
import { COLORS } from "../../constants/colors";
import { useAppSelector } from "../../hooks/useRedux";
import { useRealtimeDispatchRequests } from "../../hooks/useRealtimeDispatchRequests";

export default function NewOrdersScreen() {
  const navigation = useNavigation<any>();
  const profile = useAppSelector((s) => s.partner.profile);
  const online = useAppSelector((s) => s.partner.online);
  const [tick, setTick] = useState(0);
  const { orders, loading, error: loadError, lastFetchedAt, diagText, refresh, wsConnected } = useRealtimeDispatchRequests(online);

  React.useEffect(() => {
    const id = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const partnerSkills = React.useMemo(() => {
    const raw = String(profile?.serviceCategory ?? "").trim();
    if (!raw) return [];
    return raw.split(/[|,/]/).map((v) => v.trim().toUpperCase()).filter(Boolean);
  }, [profile?.serviceCategory]);

  const visibleOrders = React.useMemo(() => {
    const now = Date.now() + tick * 0;
    return orders.filter((order) => {
      const category = String(order.serviceCategory ?? order.serviceType ?? "").toUpperCase();
      const hasSkill = partnerSkills.length === 0 || partnerSkills.some((skill) => category.includes(skill));
      if (!hasSkill) return false;
      if (order.available === false) return false;
      if (!online) return false;
      if (String(order.bookingType ?? "").toUpperCase() === "INSTANT" && order.promisedStartTime) {
        const promised = new Date(order.promisedStartTime).getTime();
        if (Number.isFinite(promised) && promised <= now) return false;
      }
      return true;
    });
  }, [online, orders, partnerSkills, tick]);

  const onAccept = async (id: number) => {
    await acceptDispatchRequest(id);
    navigation.navigate("ActiveJob", { orderId: id });
    refresh().catch(() => null);
  };

  const onReject = async (id: number) => {
    await rejectDispatchRequest(id);
    refresh().catch(() => null);
  };

  const onShareOrder = async (item: PartnerOrder) => {
    const message = [
      "New Dispatch Request",
      `Order ID: ${item.id}`,
      `Customer: ${item.customerName ?? "-"}`,
      `Address: ${item.address ?? "-"}`,
      `Service: ${item.serviceType ?? "-"}`,
      `Payout: INR ${item.payout ?? item.amount ?? 0}`,
      `Status: ${item.status}`,
    ].join("\n");
    await Share.share({ title: `Order #${item.id}`, message });
  };

  return (
    <FlatList
      data={visibleOrders}
      keyExtractor={(item) => String(item.id)}
      style={styles.list}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => refresh()} />}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          <View style={[styles.modePill, wsConnected ? styles.modePillWs : styles.modePillPoll]}>
            <Text style={styles.modePillText}>{wsConnected ? "Realtime: WS Connected" : "Realtime: Polling"}</Text>
          </View>
          <Text style={styles.empty}>{loadError || "No new orders"}</Text>
          {!loadError ? <Text style={styles.emptyHint}>Make sure you are ONLINE and Shift is started.</Text> : null}
          {lastFetchedAt ? (
            <Text style={styles.emptyHint}>Last fetch: {new Date(lastFetchedAt).toLocaleTimeString()} | Count: {orders.length}</Text>
          ) : null}
          {diagText ? <Text style={styles.emptyHint}>{diagText}</Text> : null}
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.name}>{item.customerName ?? "Customer"}</Text>
          <Text style={styles.meta}>{item.address ?? "Address unavailable"}</Text>
          <Text style={styles.meta}>Category: {item.serviceCategory ?? item.serviceType ?? "-"}</Text>
          <Text style={styles.meta}>Sub-service: {item.subService ?? "-"}</Text>
          <Text style={styles.meta}>ETA: {item.etaMinutes ?? "-"} min</Text>
          <Text style={styles.meta}>SLA: {item.slaMinutes ?? "-"} min</Text>
          <Text style={styles.meta}>Payout: INR {item.payout ?? item.amount ?? 0}</Text>
          <Text style={styles.meta}>Booking Type: {item.bookingType ?? "-"}</Text>
          <Text style={styles.meta}>Promised Start: {item.promisedStartTime ?? "-"}</Text>
          <TouchableOpacity style={styles.detailsBtn} onPress={() => navigation.navigate("OrderDetails", { orderId: item.id })}>
            <Text style={styles.detailsBtnText}>View Details</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn} onPress={() => void onShareOrder(item)}>
            <Text style={styles.shareBtnText}>Share</Text>
          </TouchableOpacity>
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.btn, styles.accept, !canAccept(item) && styles.btnDisabled]}
              disabled={!canAccept(item)}
              onPress={() => onAccept(item.id)}
            >
              <Text style={styles.btnText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.reject]} onPress={() => onReject(item.id)}>
              <Text style={styles.btnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    />
  );
}

function canAccept(item: PartnerOrder) {
  if (item.available === false) return false;
  if (String(item.bookingType ?? "").toUpperCase() !== "INSTANT") return true;
  if (!item.promisedStartTime || item.etaMinutes == null) return true;
  const promised = new Date(item.promisedStartTime).getTime();
  if (!Number.isFinite(promised)) return true;
  const etaMs = Number(item.etaMinutes) * 60 * 1000;
  return Date.now() + etaMs <= promised;
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: COLORS.background },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 14, gap: 4 },
  name: { color: COLORS.textPrimary, fontWeight: "800", fontSize: 16 },
  meta: { color: COLORS.textSecondary, fontSize: 12 },
  row: { flexDirection: "row", gap: 10, marginTop: 8 },
  btn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  btnDisabled: { opacity: 0.45 },
  accept: { backgroundColor: COLORS.success },
  reject: { backgroundColor: COLORS.danger },
  btnText: { color: COLORS.white, fontWeight: "700" },
  detailsBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
  },
  detailsBtnText: { color: COLORS.textPrimary, fontWeight: "700", fontSize: 12 },
  shareBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
  },
  shareBtnText: { color: COLORS.textPrimary, fontWeight: "700", fontSize: 12 },
  empty: { color: COLORS.textSecondary, textAlign: "center", marginTop: 40 },
  emptyWrap: { alignItems: "center", marginTop: 40, gap: 6 },
  emptyHint: { color: COLORS.textSecondary, fontSize: 12, textAlign: "center", opacity: 0.9 },
  modePill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  modePillWs: { backgroundColor: "#DCFCE7" },
  modePillPoll: { backgroundColor: "#E2E8F0" },
  modePillText: { color: "#0F172A", fontSize: 11, fontWeight: "800" },
});
