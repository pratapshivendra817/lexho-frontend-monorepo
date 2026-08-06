import React, { useState } from "react";
import { ActivityIndicator, Alert, FlatList, RefreshControl, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { acceptDispatchRequest, getCanonicalPartnerOrderId, getPartnerDispatchConfig, rejectDispatchRequest } from "../../services/partnerService";
import type { PartnerOrder } from "../../types/order";
import { COLORS } from "../../constants/colors";
import { useAppSelector } from "../../hooks/useRedux";
import { useRealtimeDispatchRequests } from "../../hooks/useRealtimeDispatchRequests";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { analyticsActions } from "../../redux/slices/analyticsSlice";
import { PARTNER_ANALYTICS_EVENTS, trackEvent } from "../../services/firebaseAnalytics";
import { enqueueAcceptOrder, enqueueRejectOrder } from "../../services/partnerActionQueueService";
import { useAppDispatch } from "../../hooks/useRedux";

export default function NewOrdersScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const profile = useAppSelector((s) => s.partner.profile);
  const online = useAppSelector((s) => s.partner.online);
  const networkOnline = useNetworkStatus();
  const [tick, setTick] = useState(0);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [expiryWarningSeconds, setExpiryWarningSeconds] = useState(30);
  const { orders, loading, error: loadError, lastFetchedAt, refresh } = useRealtimeDispatchRequests(online);

  React.useEffect(() => {
    const id = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, []);

  React.useEffect(() => {
    dispatch(analyticsActions.incrementOrdersReceived(orders.length));
  }, [dispatch, orders.length]);

  React.useEffect(() => {
    getPartnerDispatchConfig()
      .then((config) => setExpiryWarningSeconds(config.requestExpiryWarningSeconds))
      .catch(() => null);
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
      if (getRequestSecondsLeft(order, now) <= 0) return false;
      return true;
    });
  }, [online, orders, partnerSkills, tick]);

  const onAccept = async (order: PartnerOrder) => {
    if (!canAccept(order) || busyId) return;
    const requestId = order.requestId ?? order.id;
    setBusyId(requestId);
    try {
      let acceptResponse: unknown;
      if (!networkOnline) {
        await enqueueAcceptOrder(requestId);
      } else {
        acceptResponse = await acceptDispatchRequest(requestId);
      }
      const nextOrderId = resolveOrderIdFromAcceptResponse(acceptResponse, order);
      dispatch(analyticsActions.incrementOrdersAccepted(1));
      void trackEvent(PARTNER_ANALYTICS_EVENTS.orderAccepted, { orderId: nextOrderId });
      navigation.navigate("ActiveJob", {
        orderId: nextOrderId,
        customerLatitude: order.latitude,
        customerLongitude: order.longitude,
      });
      refresh().catch(() => null);
    } finally {
      setBusyId(null);
    }
  };

  const onReject = async (id: number) => {
    if (busyId) return;
    Alert.alert("Reject request", "Confirm rejection reason", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Not available",
        style: "destructive",
        onPress: async () => {
          setBusyId(id);
          try {
            if (!networkOnline) {
              await enqueueRejectOrder(id, "Not available");
            } else {
              await rejectDispatchRequest(id, "Not available");
            }
            dispatch(analyticsActions.incrementOrdersRejected(1));
            void trackEvent(PARTNER_ANALYTICS_EVENTS.orderRejected, { orderId: id });
            refresh().catch(() => null);
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
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
      refreshControl={<RefreshControl refreshing={Boolean(lastFetchedAt && loading)} onRefresh={() => refresh()} />}
      contentContainerStyle={{ paddingVertical: 16, gap: 12 }}
      ListEmptyComponent={
        loading && !lastFetchedAt ? (
          <View style={styles.placeholderWrap}>
            <OrderPlaceholderCard />
            <OrderPlaceholderCard />
          </View>
        ) : (
          <View style={styles.emptyWrap}>
            <Text style={styles.empty}>{loadError || "No new orders"}</Text>
            {!loadError ? <Text style={styles.emptyHint}>Make sure you are ONLINE and Shift is started.</Text> : null}
          </View>
        )
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.name}>{item.customerName ?? "Customer"}</Text>
            <TouchableOpacity style={styles.shareIconBtn} onPress={() => onShareOrder(item)} accessibilityLabel="Share order">
              <MaterialCommunityIcons name="share-variant" size={18} color={COLORS.secondary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.meta}>{item.address ?? "Address unavailable"}</Text>
          <Text style={styles.meta}>Category: {item.serviceCategory ?? item.serviceType ?? "-"}</Text>
          <Text style={styles.meta}>Sub-service: {item.subService ?? "-"}</Text>
          <Text style={styles.meta}>ETA: {item.etaMinutes ?? "-"} min</Text>
          <Text style={styles.meta}>Distance: {formatDistance(item.distance)}</Text>
          <View style={styles.dispatchRow}>
            <Badge label={`Priority: ${item.priority ?? "NORMAL"}`} tone={String(item.priority ?? "").toUpperCase() === "HIGH" || String(item.priority ?? "").toUpperCase() === "URGENT" ? "warn" : "neutral"} />
          <Badge label={`Expires in ${formatCountdown(getRequestSecondsLeft(item))}`} tone={getRequestSecondsLeft(item) <= expiryWarningSeconds ? "warn" : "neutral"} />
          </View>
          {getRequestSecondsLeft(item) <= expiryWarningSeconds ? (
            <Text style={styles.expiryWarn}>This request is expiring soon. Accept only if you can reach on time.</Text>
          ) : null}
          <Text style={styles.meta}>SLA: {item.slaMinutes ?? "-"} min</Text>
          <Text style={styles.meta}>Payout: INR {item.payout ?? item.amount ?? 0}</Text>
          <Text style={styles.meta}>Booking Type: {item.bookingType ?? "-"}</Text>
          <Text style={styles.meta}>Promised Start: {item.promisedStartTime ?? "-"}</Text>
          <TouchableOpacity
            style={styles.detailsBtn}
            onPress={() =>
              navigation.navigate("OrderDetails", {
                orderId: getCanonicalPartnerOrderId(item),
                requestId: item.requestId,
              })
            }
          >
            <Text style={styles.detailsBtnText}>View Details</Text>
          </TouchableOpacity>
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.btn, styles.accept, !canAccept(item) && styles.btnDisabled]}
              disabled={!networkOnline || !canAccept(item) || Boolean(busyId)}
              onPress={() => onAccept(item)}
            >
              {busyId === item.id ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.btnText}>Accept</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.reject, Boolean(busyId) && styles.btnDisabled]} disabled={Boolean(busyId)} onPress={() => onReject(item.requestId ?? item.id)}>
              <Text style={styles.btnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    />
  );
}

function resolveOrderIdFromAcceptResponse(response: unknown, order: PartnerOrder) {
  const payload = response && typeof response === "object" ? (response as Record<string, any>) : {};
  const nested = payload.data && typeof payload.data === "object" ? payload.data : {};
  const candidates = [
    nested.orderId,
    nested.bookingId,
    nested.id,
    nested.order?.id,
    nested.order?.orderId,
    nested.request?.orderId,
    nested.data?.id,
    payload.orderId,
    payload.bookingId,
    payload.id,
    payload.order?.id,
    payload.order?.orderId,
    getCanonicalPartnerOrderId(order),
    order.id,
  ];

  for (const candidate of candidates) {
    const parsed = Number(candidate);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  return order.id;
}

function OrderPlaceholderCard() {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.name}>Customer</Text>
        <TouchableOpacity style={styles.shareIconBtn} accessibilityLabel="Share order" activeOpacity={1}>
          <MaterialCommunityIcons name="share-variant" size={18} color={COLORS.secondary} />
        </TouchableOpacity>
      </View>
      <Text style={styles.meta}>Sector 104, Noida</Text>
      <Text style={styles.meta}>Category: -</Text>
      <Text style={styles.meta}>Sub-service: -</Text>
      <Text style={styles.meta}>ETA: - min</Text>
      <Text style={styles.meta}>Distance: -</Text>
      <View style={styles.dispatchRow}>
        <Badge label="Priority: NORMAL" tone="neutral" />
        <Badge label="Expires in --" tone="neutral" />
      </View>
      <Text style={styles.meta}>SLA: - min</Text>
      <Text style={styles.meta}>Payout: INR 0</Text>
      <Text style={styles.meta}>Booking Type: </Text>
      <Text style={styles.meta}>Promised Start: -</Text>
      <TouchableOpacity style={styles.detailsBtn} activeOpacity={1}>
        <Text style={styles.detailsBtnText}>View Details</Text>
      </TouchableOpacity>
      <View style={styles.row}>
        <View style={[styles.btn, styles.accept]}>
          <Text style={styles.btnText}>Accept</Text>
        </View>
        <View style={[styles.btn, styles.reject]}>
          <Text style={styles.btnText}>Reject</Text>
        </View>
      </View>
    </View>
  );
}

function canAccept(item: PartnerOrder) {
  if (item.available === false) return false;
  if (getRequestSecondsLeft(item) <= 0) return false;
  if (String(item.bookingType ?? "").toUpperCase() !== "INSTANT") return true;
  if (!item.promisedStartTime || item.etaMinutes == null) return true;
  const promised = new Date(item.promisedStartTime).getTime();
  if (!Number.isFinite(promised)) return true;
  const etaMs = Number(item.etaMinutes) * 60 * 1000;
  return Date.now() + etaMs <= promised;
}

function getRequestSecondsLeft(item: PartnerOrder, now = Date.now()) {
  const explicit = item.expiresAt ? new Date(item.expiresAt).getTime() : NaN;
  if (Number.isFinite(explicit)) return Math.max(0, Math.ceil((explicit - now) / 1000));
  if (item.expiresInSeconds != null && item.createdAt) {
    const created = new Date(item.createdAt).getTime();
    if (Number.isFinite(created)) {
      return Math.max(0, Math.ceil((created + item.expiresInSeconds * 1000 - now) / 1000));
    }
  }
  if (String(item.bookingType ?? "").toUpperCase() === "INSTANT" && item.promisedStartTime) {
    const promised = new Date(item.promisedStartTime).getTime();
    if (Number.isFinite(promised)) return Math.max(0, Math.ceil((promised - now) / 1000));
  }
  return Number.MAX_SAFE_INTEGER;
}

function formatCountdown(seconds: number) {
  if (seconds === Number.MAX_SAFE_INTEGER) return "--";
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

function formatDistance(value?: number) {
  if (value == null) return "-";
  return value >= 1000 ? `${(value / 1000).toFixed(1)} km` : `${Math.round(value)} m`;
}

function Badge({ label, tone }: { label: string; tone: "neutral" | "warn" }) {
  return (
    <View style={[styles.badge, tone === "warn" && styles.badgeWarn]}>
      <Text style={[styles.badgeText, tone === "warn" && styles.badgeTextWarn]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: COLORS.background },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 14, gap: 4 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  name: { color: COLORS.textPrimary, fontWeight: "800", fontSize: 16 },
  meta: { color: COLORS.textSecondary, fontSize: 12 },
  row: { flexDirection: "row", gap: 10, marginTop: 8 },
  dispatchRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  badge: { borderRadius: 999, borderWidth: 1, borderColor: COLORS.borderSoft, paddingHorizontal: 9, paddingVertical: 4, backgroundColor: COLORS.surfaceSoft },
  badgeWarn: { borderColor: COLORS.accent, backgroundColor: COLORS.surfaceElevated },
  badgeText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: "800" },
  badgeTextWarn: { color: COLORS.accent },
  expiryWarn: { color: COLORS.accent, fontSize: 12, fontWeight: "700", marginTop: 4 },
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
  shareIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { color: COLORS.textSecondary, textAlign: "center", marginTop: 40 },
  emptyWrap: { alignItems: "center", marginTop: 40, gap: 6 },
  emptyHint: { color: COLORS.textSecondary, fontSize: 12, textAlign: "center", opacity: 0.9 },
  placeholderWrap: { paddingHorizontal: 16, gap: 12 },
});
