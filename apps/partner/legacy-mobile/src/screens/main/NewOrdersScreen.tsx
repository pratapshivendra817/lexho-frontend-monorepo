import React, { useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, RefreshControl, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { acceptDispatchRequest, acceptPartnerOrder, getCanonicalPartnerOrderId, getPartnerDispatchConfig, getOrderHistory, rejectDispatchRequest } from "../../services/partnerService";
import type { PartnerOrder } from "../../types/order";
import { COLORS } from "../../constants/colors";
import { useAppSelector } from "../../hooks/useRedux";
import { useRealtimeDispatchRequests } from "../../hooks/useRealtimeDispatchRequests";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { analyticsActions } from "../../redux/slices/analyticsSlice";
import { setActiveOrder } from "../../redux/slices/orderSlice";
import { PARTNER_ANALYTICS_EVENTS, trackEvent } from "../../services/firebaseAnalytics";
import { enqueueAcceptOrder, enqueueRejectOrder } from "../../services/partnerActionQueueService";
import { useAppDispatch } from "../../hooks/useRedux";
import { getBookingTypeLabel, getOrderPriorityLabel } from "../../utils/statusLabels";
import { getShiftState } from "../../features/shift/shiftStorage";
import { canReceiveNewBookings, getDispatchAvailabilityMessage, getAssignedActiveOrder } from "../../utils/partnerDispatch";

const NEW_ORDERS_COPY = {
  rejectReasonUnavailable: "Not available",
  rejectConfirmTitle: "Reject Order",
  rejectReasonPrompt: "Confirm rejection reason",
  cancel: "Cancel",
  shareTitle: "New Dispatch Request",
  bookingId: "Order ID",
  customer: "Customer",
  address: "Address",
  addressUnavailable: "Address unavailable",
  service: "Service",
  amount: "Payout",
  servicePrice: "Service price",
  currency: "INR",
  status: "Status",
  title: "Order",
  noOrders: "No orders available",
  emptyHint: "Make sure you are ONLINE and Shift is started.",
  shareAccessibility: "Share order",
  category: "Category",
  subService: "Sub-service",
  estimatedTime: "ETA",
  distance: "Distance",
  priority: "Priority",
  expiresIn: "Expires in",
  expiryWarning: "This request is expiring soon. Accept only if you can reach on time.",
  sla: "SLA",
  payout: "Payout",
  bookingType: "Booking Type",
  promisedStart: "Promised Start",
  viewDetails: "View Details",
  accept: "Accept",
  acceptBooking: "Accept Booking",
  reject: "Reject",
  activeJob: "Active Job",
  openActiveJob: "Open Active Job",
} as const;

export default function NewOrdersScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const online = useAppSelector((s) => s.partner.online);
  const activeOrder = useAppSelector((s) => s.orders.activeOrder);
  const networkOnline = useNetworkStatus();
  const [tick, setTick] = useState(0);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [sheetOrderId, setSheetOrderId] = useState<number | null>(null);
  const [expiryWarningSeconds, setExpiryWarningSeconds] = useState(30);
  const [shiftStarted, setShiftStarted] = useState(true);
  const dispatchEligible = canReceiveNewBookings({
    online,
    shiftStarted,
  });
  const availability = getDispatchAvailabilityMessage({
    online,
    shiftStarted,
  });
  const { orders, loading, error: loadError, lastFetchedAt, refresh } = useRealtimeDispatchRequests(dispatchEligible);

  // Assigned jobs must remain accessible after app restart and while offline.
  React.useEffect(() => {
    let cancelled = false;
    let running = false;
    const restoreAssignedJob = async () => {
      if (running) return;
      running = true;
      try {
        const history = await getOrderHistory();
        if (!cancelled) dispatch(setActiveOrder(getAssignedActiveOrder(history)));
      } catch {
        // Preserve the current job when the request fails.
      } finally {
        running = false;
      }
    };
    void restoreAssignedJob();
    const timer = setInterval(() => { void restoreAssignedJob(); }, 10000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [dispatch]);

  React.useEffect(() => {
    const id = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, []);

  React.useEffect(() => {
    getShiftState()
      .then((snapshot) => setShiftStarted(snapshot?.shiftStarted ?? true))
      .catch(() => setShiftStarted(true));
  }, []);

  React.useEffect(() => {
    dispatch(analyticsActions.incrementOrdersReceived(orders.length));
  }, [dispatch, orders.length]);

  React.useEffect(() => {
    getPartnerDispatchConfig()
      .then((config) => setExpiryWarningSeconds(config.requestExpiryWarningSeconds))
      .catch(() => null);
  }, []);

  const visibleOrders = React.useMemo(() => {
    if (!dispatchEligible) return [];
    const partnerSkills: string[] = [];
    const now = Date.now() + tick * 0;
    return orders.filter((order) => {
      const bookingType = String(order.bookingType ?? "").toUpperCase();
      const category = String(order.serviceCategory ?? order.serviceType ?? "").toUpperCase();
      const hasSkill = bookingType === "SUBSCRIPTION"
        || partnerSkills.length === 0
        || partnerSkills.some((skill) => category.includes(skill));
      if (!hasSkill) return false;
      if (order.available === false) return false;
      if (!isScheduledBooking(order) && getRequestSecondsLeft(order, now) <= 0) return false;
      return true;
    });
  }, [dispatchEligible, orders, tick]);

  React.useEffect(() => {
    if (!visibleOrders.length) {
      setSheetOrderId(null);
      return;
    }
    setSheetOrderId((current) => {
      if (current && visibleOrders.some((order) => (order.requestId ?? order.id) === current)) return current;
      return visibleOrders[0].requestId ?? visibleOrders[0].id;
    });
  }, [visibleOrders]);

  const onAccept = async (order: PartnerOrder) => {
    if (!canAccept(order) || busyId) return;
    const directOrderId = getCanonicalPartnerOrderId(order);
    const requestId = isScheduledBooking(order) ? directOrderId : order.requestId ?? directOrderId;
    setBusyId(requestId);
    try {
      let acceptResponse: unknown;
      if (!networkOnline) {
        await enqueueAcceptOrder(requestId);
      } else if (isScheduledBooking(order)) {
        acceptResponse = await acceptPartnerOrder(requestId);
      } else {
        acceptResponse = await acceptDispatchRequest(requestId);
      }
      const nextOrderId = resolveOrderIdFromAcceptResponse(acceptResponse, order);
      dispatch(setActiveOrder({ ...order, id: nextOrderId, orderId: nextOrderId, status: "ACCEPTED" }));
      dispatch(analyticsActions.incrementOrdersAccepted(1));
      void trackEvent(PARTNER_ANALYTICS_EVENTS.orderAccepted, { orderId: nextOrderId });
      if (String(order.bookingType ?? "").toUpperCase() === "INSTANT") {
        navigation.navigate("RouteMap", {
          orderId: nextOrderId,
          customerLatitude: order.latitude,
          customerLongitude: order.longitude,
        });
      } else {
        navigation.navigate("ActiveJob", {
          orderId: nextOrderId,
          customerLatitude: order.latitude,
          customerLongitude: order.longitude,
        });
      }
      refresh().catch(() => null);
    } finally {
      setSheetOrderId(null);
      setBusyId(null);
    }
  };

  const onReject = async (id: number) => {
    if (busyId) return;
    const rejectReason = NEW_ORDERS_COPY.rejectReasonUnavailable;
    Alert.alert(NEW_ORDERS_COPY.rejectConfirmTitle, NEW_ORDERS_COPY.rejectReasonPrompt, [
      { text: NEW_ORDERS_COPY.cancel, style: "cancel" },
      {
        text: rejectReason,
        style: "destructive",
        onPress: async () => {
          setBusyId(id);
          try {
            if (!networkOnline) {
              await enqueueRejectOrder(id, rejectReason);
            } else {
              await rejectDispatchRequest(id, rejectReason);
            }
            dispatch(analyticsActions.incrementOrdersRejected(1));
            void trackEvent(PARTNER_ANALYTICS_EVENTS.orderRejected, { orderId: id });
            refresh().catch(() => null);
          } finally {
            setSheetOrderId(null);
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const onShareOrder = async (item: PartnerOrder) => {
    const shareAddressLine = item.address
      ? `${NEW_ORDERS_COPY.address}: ${item.address}`
      : `${NEW_ORDERS_COPY.addressUnavailable}: -`;
    const message = [
      NEW_ORDERS_COPY.shareTitle,
      `${NEW_ORDERS_COPY.bookingId}: ${item.id}`,
      `${NEW_ORDERS_COPY.customer}: ${item.customerName ?? "-"}`,
      shareAddressLine,
      `${NEW_ORDERS_COPY.service}: ${item.serviceType ?? "-"}`,
      `${NEW_ORDERS_COPY.servicePrice}: ${formatServiceAmount(item)}`,
      `${NEW_ORDERS_COPY.status}: ${String(item.status ?? "-").toUpperCase() || "-"}`,
    ].join("\n");
    await Share.share({ title: `${NEW_ORDERS_COPY.title} #${item.id}`, message });
  };

  const sheetOrder = visibleOrders.find((order) => (order.requestId ?? order.id) === sheetOrderId) ?? null;

  return (
    <View style={styles.screen}>
      <FlatList
        data={visibleOrders}
        keyExtractor={(item) => String(item.id)}
        style={styles.list}
        refreshControl={<RefreshControl refreshing={Boolean(lastFetchedAt && loading)} onRefresh={() => refresh()} />}
        contentContainerStyle={{ paddingVertical: 16, gap: 12 }}
        ListHeaderComponent={
          <View style={styles.headerStack}>
            <View style={styles.availabilityCard}>
              <Text style={styles.availabilityTitle}>{availability.title}</Text>
              {availability.detail ? <Text style={styles.availabilityDetail}>{availability.detail}</Text> : null}
            </View>
            {activeOrder ? (
              <TouchableOpacity
                testID="new-orders-active-job-card"
                style={styles.activeJobCard}
                onPress={() =>
                  navigation.navigate("ActiveJob", {
                    orderId: activeOrder.orderId ?? activeOrder.id,
                    customerLatitude: activeOrder.latitude,
                    customerLongitude: activeOrder.longitude,
                  })
                }
              >
                <Text style={styles.activeJobTitle}>{NEW_ORDERS_COPY.activeJob}</Text>
                <Text style={styles.activeJobMeta}>{activeOrder.customerName ?? "-"}</Text>
                <Text style={styles.activeJobMeta}>{activeOrder.address ?? "-"}</Text>
                <Text style={styles.activeJobCta}>{NEW_ORDERS_COPY.openActiveJob}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loading && !lastFetchedAt ? (
            <View style={styles.placeholderWrap}>
              <OrderPlaceholderCard />
              <OrderPlaceholderCard />
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={styles.empty}>{loadError || NEW_ORDERS_COPY.noOrders}</Text>
              {!loadError ? (
                <Text style={styles.emptyHint}>
                  {dispatchEligible ? NEW_ORDERS_COPY.emptyHint : availability.detail || availability.title}
                </Text>
              ) : null}
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.name}>{item.customerName ?? NEW_ORDERS_COPY.customer}</Text>
              <TouchableOpacity style={styles.shareIconBtn} onPress={() => onShareOrder(item)} accessibilityLabel={NEW_ORDERS_COPY.shareAccessibility}>
                <MaterialCommunityIcons name="share-variant" size={18} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.meta}>{item.address ?? NEW_ORDERS_COPY.addressUnavailable}</Text>
            <Text style={styles.meta}>{`${NEW_ORDERS_COPY.category}: ${item.serviceCategory ?? item.serviceType ?? "-"}`}</Text>
            <Text style={styles.meta}>{`${NEW_ORDERS_COPY.subService}: ${item.subService ?? "-"}`}</Text>
            <Text style={styles.meta}>{`${NEW_ORDERS_COPY.estimatedTime}: ${item.etaMinutes ?? "-"} min`}</Text>
            <Text style={styles.meta}>{`${NEW_ORDERS_COPY.distance}: ${formatDistance(item.distance)}`}</Text>
            <View style={styles.dispatchRow}>
              <Badge label={`${NEW_ORDERS_COPY.priority}: ${getOrderPriorityLabel(item.priority, (_key, fallback) => fallback)}`} tone={String(item.priority ?? "").toUpperCase() === "HIGH" || String(item.priority ?? "").toUpperCase() === "URGENT" ? "warn" : "neutral"} />
              {isScheduledBooking(item) ? (
                <Badge label={NEW_ORDERS_COPY.bookingType + ": Scheduled"} tone="neutral" />
              ) : (
                <Badge label={`${NEW_ORDERS_COPY.expiresIn} ${formatCountdown(getRequestSecondsLeft(item))}`} tone={getRequestSecondsLeft(item) <= expiryWarningSeconds ? "warn" : "neutral"} />
              )}
            </View>
            {!isScheduledBooking(item) && getRequestSecondsLeft(item) <= expiryWarningSeconds ? (
              <Text style={styles.expiryWarn}>{NEW_ORDERS_COPY.expiryWarning}</Text>
            ) : null}
            <Text style={styles.meta}>{`${NEW_ORDERS_COPY.sla}: ${item.slaMinutes ?? "-"} min`}</Text>
            <Text style={styles.meta}>{`${NEW_ORDERS_COPY.servicePrice}: ${formatServiceAmount(item)}`}</Text>
            <Text style={styles.meta}>{`${NEW_ORDERS_COPY.bookingType}: ${getBookingTypeLabel(item.bookingType, (_key, fallback) => fallback)}`}</Text>
            <Text style={styles.meta}>{`${NEW_ORDERS_COPY.promisedStart}: ${item.promisedStartTime ?? "-"}`}</Text>
            {String(item.bookingType ?? "").toUpperCase() === "SCHEDULED" ? (
              <Text testID={`scheduled-booking-${item.id}`} style={styles.scheduledMeta}>
                Scheduled service: {item.scheduledDate ?? "-"} {item.scheduledTime ?? item.promisedStartTime ?? ""}
              </Text>
            ) : null}
            <TouchableOpacity
              style={styles.detailsBtn}
              onPress={() =>
                navigation.navigate("OrderDetails", {
                  orderId: getCanonicalPartnerOrderId(item),
                  requestId: item.requestId,
                })
              }
            >
              <Text style={styles.detailsBtnText}>{NEW_ORDERS_COPY.viewDetails}</Text>
            </TouchableOpacity>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.btn, styles.accept, !canAccept(item) && styles.btnDisabled]}
                disabled={!networkOnline || !canAccept(item) || Boolean(busyId)}
                onPress={() => onAccept(item)}
              >
                {busyId === item.id ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.btnText}>{NEW_ORDERS_COPY.accept}</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.reject, Boolean(busyId) && styles.btnDisabled]} disabled={Boolean(busyId)} onPress={() => onReject(item.requestId ?? item.id)}>
                <Text style={styles.btnText}>{NEW_ORDERS_COPY.reject}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
      <BookingRequestSheet
        order={sheetOrder}
        busy={Boolean(busyId)}
        networkOnline={networkOnline}
        onAccept={onAccept}
        onReject={(order) => onReject(order.requestId ?? order.id)}
      />
    </View>
  );
}

function BookingRequestSheet({
  order,
  busy,
  networkOnline,
  onAccept,
  onReject,
}: {
  order: PartnerOrder | null;
  busy: boolean;
  networkOnline: boolean;
  onAccept: (order: PartnerOrder) => void;
  onReject: (order: PartnerOrder) => void;
}) {
  return (
    <Modal visible={Boolean(order)} transparent animationType="slide" onRequestClose={() => undefined}>
      <View style={styles.sheetBackdrop}>
        {order ? (
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetLabel}>{NEW_ORDERS_COPY.service}</Text>
            <Text style={styles.sheetService}>{formatServiceName(order)}</Text>
            <View style={styles.sheetDetails}>
              <Text style={styles.sheetMeta}>{`${NEW_ORDERS_COPY.customer}: ${order.customerName ?? "-"}`}</Text>
              <Text style={styles.sheetMeta}>{`Date: ${formatRequestDate(order)}`}</Text>
              <Text style={styles.sheetMeta}>{`Time: ${formatRequestTime(order)}`}</Text>
            </View>
            <View style={styles.sheetDetails}>
              <Text style={styles.sheetLabel}>{NEW_ORDERS_COPY.address}:</Text>
              <Text style={styles.sheetAddress}>{order.address ?? NEW_ORDERS_COPY.addressUnavailable}</Text>
            </View>
            <View style={styles.sheetAmountRow}>
              <Text style={styles.sheetAmountLabel}>{`${NEW_ORDERS_COPY.servicePrice}:`}</Text>
              <Text style={styles.sheetAmount}>{formatServiceAmount(order)}</Text>
            </View>
            <View style={styles.sheetActions}>
              <TouchableOpacity
                testID="booking-request-sheet-reject"
                style={[styles.sheetBtn, styles.sheetReject, busy && styles.btnDisabled]}
                disabled={busy}
                onPress={() => onReject(order)}
              >
                <Text style={styles.sheetRejectText}>{NEW_ORDERS_COPY.reject}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="booking-request-sheet-accept"
                style={[styles.sheetBtn, styles.sheetAccept, (!networkOnline || busy || !canAccept(order)) && styles.btnDisabled]}
                disabled={!networkOnline || busy || !canAccept(order)}
                onPress={() => onAccept(order)}
              >
                <Text style={styles.sheetAcceptText}>{NEW_ORDERS_COPY.acceptBooking}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
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
        <Text style={styles.name}>{NEW_ORDERS_COPY.customer}</Text>
        <TouchableOpacity style={styles.shareIconBtn} accessibilityLabel={NEW_ORDERS_COPY.shareAccessibility} activeOpacity={1}>
          <MaterialCommunityIcons name="share-variant" size={18} color={COLORS.secondary} />
        </TouchableOpacity>
      </View>
      <Text style={styles.meta}>Sector 104, Noida</Text>
      <Text style={styles.meta}>{`${NEW_ORDERS_COPY.category}: -`}</Text>
      <Text style={styles.meta}>{`${NEW_ORDERS_COPY.subService}: -`}</Text>
      <Text style={styles.meta}>{`${NEW_ORDERS_COPY.estimatedTime}: - min`}</Text>
      <Text style={styles.meta}>{`${NEW_ORDERS_COPY.distance}: -`}</Text>
      <View style={styles.dispatchRow}>
        <Badge label={`${NEW_ORDERS_COPY.priority}: -`} tone="neutral" />
        <Badge label={`${NEW_ORDERS_COPY.expiresIn} --`} tone="neutral" />
      </View>
      <Text style={styles.meta}>{`${NEW_ORDERS_COPY.sla}: - min`}</Text>
      <Text style={styles.meta}>{`${NEW_ORDERS_COPY.servicePrice}: ${formatServiceAmount()}`}</Text>
      <Text style={styles.meta}>{`${NEW_ORDERS_COPY.bookingType}: -`}</Text>
      <Text style={styles.meta}>{`${NEW_ORDERS_COPY.promisedStart}: -`}</Text>
      <TouchableOpacity style={styles.detailsBtn} activeOpacity={1}>
        <Text style={styles.detailsBtnText}>{NEW_ORDERS_COPY.viewDetails}</Text>
      </TouchableOpacity>
      <View style={styles.row}>
        <View style={[styles.btn, styles.accept]}>
          <Text style={styles.btnText}>{NEW_ORDERS_COPY.accept}</Text>
        </View>
        <View style={[styles.btn, styles.reject]}>
          <Text style={styles.btnText}>{NEW_ORDERS_COPY.reject}</Text>
        </View>
      </View>
    </View>
  );
}

function formatServiceName(order: PartnerOrder) {
  const primary = order.serviceName ?? order.serviceType ?? order.serviceCategory ?? NEW_ORDERS_COPY.service;
  const secondary = order.subService;
  if (secondary && secondary !== primary) return `${primary} - ${secondary}`;
  return primary;
}

function formatServiceAmount(order?: Pick<PartnerOrder, "amount" | "payout" | "servicePrice">) {
  const amount = order?.servicePrice ?? order?.amount ?? order?.payout ?? 0;
  return `\u20B9${amount}`;
}

function formatRequestDate(order: PartnerOrder) {
  const source = order.scheduledDate ?? order.promisedStartTime ?? order.createdAt;
  if (!source) return "-";
  const date = new Date(source);
  if (!Number.isFinite(date.getTime())) return order.scheduledDate ?? "-";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatRequestTime(order: PartnerOrder) {
  if (order.scheduledTime) return order.scheduledTime;
  const source = order.promisedStartTime ?? order.createdAt;
  if (!source) return "-";
  const date = new Date(source);
  if (!Number.isFinite(date.getTime())) return "-";
  return date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

function canAccept(item: PartnerOrder) {
  if (item.available === false) return false;
  if (!isScheduledBooking(item) && getRequestSecondsLeft(item) <= 0) return false;
  if (String(item.bookingType ?? "").toUpperCase() !== "INSTANT") return true;
  if (!item.promisedStartTime || item.etaMinutes == null) return true;
  const promised = new Date(item.promisedStartTime).getTime();
  if (!Number.isFinite(promised)) return true;
  const etaMs = Number(item.etaMinutes) * 60 * 1000;
  return Date.now() + etaMs <= promised;
}

function isScheduledBooking(item: Pick<PartnerOrder, "bookingType">) {
  return String(item.bookingType ?? "").toUpperCase() === "SCHEDULED";
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
  screen: { flex: 1, backgroundColor: COLORS.background },
  list: { flex: 1, backgroundColor: COLORS.background },
  headerStack: { gap: 12, paddingHorizontal: 16, paddingBottom: 12 },
  availabilityCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 4,
  },
  availabilityTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: "800" },
  availabilityDetail: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 20 },
  activeJobCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.secondary,
    padding: 14,
    gap: 4,
  },
  activeJobTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: "800" },
  activeJobMeta: { color: COLORS.textSecondary, fontSize: 12 },
  activeJobCta: { color: COLORS.secondary, fontSize: 12, fontWeight: "900", marginTop: 4 },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 14, gap: 4 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  name: { color: COLORS.textPrimary, fontWeight: "800", fontSize: 16 },
  meta: { color: COLORS.textSecondary, fontSize: 12 },
  scheduledMeta: { color: COLORS.secondary, fontSize: 12, fontWeight: "800" },
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
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.36)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    gap: 10,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: COLORS.border,
    marginBottom: 4,
  },
  sheetLabel: { color: COLORS.textSecondary, fontSize: 13, fontWeight: "800" },
  sheetService: { color: COLORS.textPrimary, fontSize: 18, fontWeight: "900", lineHeight: 24 },
  sheetDetails: { gap: 4, marginTop: 4 },
  sheetMeta: { color: COLORS.textPrimary, fontSize: 14, fontWeight: "600" },
  sheetAddress: { color: COLORS.textPrimary, fontSize: 14, lineHeight: 20 },
  sheetAmountRow: { gap: 4, marginTop: 4 },
  sheetAmountLabel: { color: COLORS.textSecondary, fontSize: 13, fontWeight: "800" },
  sheetAmount: { color: COLORS.textPrimary, fontSize: 24, fontWeight: "900" },
  sheetActions: { flexDirection: "row", gap: 12, marginTop: 6 },
  sheetBtn: { flex: 1, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  sheetReject: { borderWidth: 1, borderColor: COLORS.danger, backgroundColor: COLORS.surface },
  sheetAccept: { backgroundColor: COLORS.success },
  sheetRejectText: { color: COLORS.danger, fontWeight: "800" },
  sheetAcceptText: { color: COLORS.white, fontWeight: "800" },
  empty: { color: COLORS.textSecondary, textAlign: "center", marginTop: 40 },
  emptyWrap: { alignItems: "center", marginTop: 40, gap: 6 },
  emptyHint: { color: COLORS.textSecondary, fontSize: 12, textAlign: "center", opacity: 0.9 },
  placeholderWrap: { paddingHorizontal: 16, gap: 12 },
});
