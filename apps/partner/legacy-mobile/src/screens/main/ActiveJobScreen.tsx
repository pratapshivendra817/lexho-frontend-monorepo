import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import {
  getPartnerOrderById,
  markOrderArrived,
  requestOrderCompletePin,
  verifyOrderCompletePin,
  verifyOrderStartPin,
} from "../../services/partnerService";
import { COLORS } from "../../constants/colors";
import type { PartnerOrder } from "../../types/order";
import { OrderLifecycleTimeline } from "../../components/common/OrderLifecycleTimeline";
import { setTrackingContext } from "../../features/shift/locationTrackingManager";
import { PARTNER_ANALYTICS_EVENTS, trackEvent } from "../../services/firebaseAnalytics";
import { useAppDispatch } from "../../hooks/useRedux";
import { setActiveOrder } from "../../redux/slices/orderSlice";
import { isActiveOrderStatus } from "../../utils/partnerDispatch";

const ACTIVE_JOB_COPY = {
  activeJobTitle: "Active Job",
  customer: "Customer",
  addressUnavailable: "Address unavailable",
  success: "Success",
  retry: "Please try again.",
  markArrived: "Mark Arrived",
  markingArrival: "Marking arrival...",
  arrivalMarked: "Arrival marked successfully.",
  arriveErrorTitle: "Unable to mark arrival",
  startPinTitle: "Start Service PIN",
  startPinHint: "Ask the customer for the start PIN and verify it here.",
  startPinWaiting: "Start PIN can be verified after arrival.",
  pinPlaceholder: "Enter PIN",
  startService: "Start Service",
  starting: "Starting...",
  startPinRequiredTitle: "Start PIN required",
  startPinRequiredBody: "Enter the customer start PIN to begin service.",
  startErrorTitle: "Unable to start service",
  serviceStarted: "Service started.",
  completePinTitle: "Complete Service PIN",
  completePinHint: "Request the completion PIN first, then verify it to complete service.",
  completePinReady: "Customer should now see the completion PIN. Enter it below to finish.",
  requestCompletePin: "Request Complete PIN",
  requestingCompletePin: "Requesting PIN...",
  completePinRequested: "Ask the customer for the completion PIN.",
  completePinRequestErrorTitle: "Unable to request complete PIN",
  completeService: "Complete Service",
  completing: "Completing...",
  completePinRequiredTitle: "Completion PIN required",
  completePinRequiredBody: "Enter the customer completion PIN to finish service.",
  completeErrorTitle: "Unable to complete service",
  serviceCompleted: "Service completed.",
  openCustomerLocation: "Open Customer Location",
  openInAppNavigation: "Open In-App Navigation",
} as const;

export default function ActiveJobScreen({ route, navigation }: any) {
  const dispatch = useAppDispatch();
  const orderId: number = route?.params?.orderId;
  const customerLatitude: number | undefined = route?.params?.customerLatitude;
  const customerLongitude: number | undefined = route?.params?.customerLongitude;
  const [order, setOrder] = useState<PartnerOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<"arrive" | "start" | "complete-pin" | "complete" | null>(null);
  const [startPin, setStartPin] = useState("");
  const [completePin, setCompletePin] = useState("");
  const [completePinRequested, setCompletePinRequested] = useState(false);
  const hasCustomerCoordinates = Number.isFinite(order?.latitude) && Number.isFinite(order?.longitude);
  const customerLat = order?.latitude;
  const customerLng = order?.longitude;
  const normalizedStatus = getOrderLifecycleStatus(order);

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const nextOrder = await getPartnerOrderById(orderId);
      setOrder(nextOrder);
      dispatch(setActiveOrder(isActiveOrderStatus(nextOrder.status) ? nextOrder : null));
    } catch {
      setOrder((prev) => getFallbackOrder(prev, orderId));
    } finally {
      setLoading(false);
    }
  }, [dispatch, orderId]);

  useEffect(() => {
    load().catch(() => null);
  }, [load]);

  useEffect(() => {
    setTrackingContext({ bookingId: orderId, customerLatitude, customerLongitude });
    return () => setTrackingContext({});
  }, [customerLatitude, customerLongitude, orderId]);

  const onArrive = async () => {
    if (!canArrive(order)) return;
    setActionLoading("arrive");
    try {
      await markOrderArrived(orderId);
      Alert.alert(ACTIVE_JOB_COPY.success, ACTIVE_JOB_COPY.arrivalMarked);
      await load();
    } catch (error: any) {
      Alert.alert(ACTIVE_JOB_COPY.arriveErrorTitle, error?.message ?? ACTIVE_JOB_COPY.retry);
    } finally {
      setActionLoading(null);
    }
  };

  const onStart = async () => {
    if (!canStart(order)) return;
    const startPinValidation = getStartPinValidation(startPin);
    if (startPinValidation) {
      Alert.alert(startPinValidation.title, startPinValidation.message);
      return;
    }
    const pin = startPin.trim();
    setActionLoading("start");
    try {
      await verifyOrderStartPin(orderId, pin);
      void trackEvent(PARTNER_ANALYTICS_EVENTS.orderStarted, { orderId });
      Alert.alert(ACTIVE_JOB_COPY.success, ACTIVE_JOB_COPY.serviceStarted);
      setStartPin("");
      setCompletePinRequested(false);
      await load();
    } catch (error: any) {
      Alert.alert(ACTIVE_JOB_COPY.startErrorTitle, error?.message ?? ACTIVE_JOB_COPY.retry);
    } finally {
      setActionLoading(null);
    }
  };

  const onRequestCompletePin = async () => {
    if (!canRequestCompletePin(order)) return;
    setActionLoading("complete-pin");
    try {
      await requestOrderCompletePin(orderId);
      setCompletePinRequested(true);
      Alert.alert(ACTIVE_JOB_COPY.success, ACTIVE_JOB_COPY.completePinRequested);
      await load();
    } catch (error: any) {
      Alert.alert(ACTIVE_JOB_COPY.completePinRequestErrorTitle, error?.message ?? ACTIVE_JOB_COPY.retry);
    } finally {
      setActionLoading(null);
    }
  };

  const onComplete = async () => {
    if (!canComplete(order)) return;
    const completePinValidation = getCompletePinValidation(completePin);
    if (completePinValidation) {
      Alert.alert(completePinValidation.title, completePinValidation.message);
      return;
    }
    const pin = completePin.trim();
    setActionLoading("complete");
    try {
      await verifyOrderCompletePin(orderId, pin);
      void trackEvent(PARTNER_ANALYTICS_EVENTS.orderCompleted, { orderId });
      Alert.alert(ACTIVE_JOB_COPY.success, ACTIVE_JOB_COPY.serviceCompleted);
      setCompletePin("");
      setCompletePinRequested(false);
      await load();
    } catch (error: any) {
      Alert.alert(ACTIVE_JOB_COPY.completeErrorTitle, error?.message ?? ACTIVE_JOB_COPY.retry);
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
      <Text testID="active-job-title" style={styles.title}>{`${ACTIVE_JOB_COPY.activeJobTitle} #${orderId}`}</Text>
      <Text style={styles.meta}>{order?.customerName ?? ACTIVE_JOB_COPY.customer} | {order?.address ?? ACTIVE_JOB_COPY.addressUnavailable}</Text>
      <View style={styles.fullBleed}>
        <OrderLifecycleTimeline order={order} />
      </View>
      {loading && !order ? <ActivityIndicator color={COLORS.secondary} /> : null}

      {canArrive(order) ? (
        <TouchableOpacity
          testID="mark-arrived-button"
          style={[styles.btn, styles.fullBleed, styles.arrive, actionLoading === "arrive" && styles.disabled]}
          disabled={actionLoading === "arrive"}
          onPress={onArrive}
        >
          <Text style={styles.btnText}>{actionLoading === "arrive" ? ACTIVE_JOB_COPY.markingArrival : ACTIVE_JOB_COPY.markArrived}</Text>
        </TouchableOpacity>
      ) : null}

      <View style={[styles.pinCard, styles.fullBleed]}>
        <Text style={styles.pinTitle}>{ACTIVE_JOB_COPY.startPinTitle}</Text>
        <Text style={styles.pinHint}>
          {getStartPinHint(normalizedStatus)}
        </Text>
        <TextInput
          testID="start-pin-input"
          value={startPin}
          onChangeText={setStartPin}
          editable={canStart(order) && actionLoading !== "start"}
          keyboardType="number-pad"
          placeholder={ACTIVE_JOB_COPY.pinPlaceholder}
          placeholderTextColor={COLORS.textMuted}
          style={[styles.pinInput, (!canStart(order) || actionLoading === "start") && styles.disabledInput]}
        />
        <TouchableOpacity
          testID="start-service-button"
          style={[styles.btn, styles.start, (!canStart(order) || actionLoading === "start") && styles.disabled]}
          disabled={!canStart(order) || actionLoading === "start"}
          onPress={onStart}
        >
          <Text style={styles.btnText}>{actionLoading === "start" ? ACTIVE_JOB_COPY.starting : ACTIVE_JOB_COPY.startService}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.pinCard, styles.fullBleed]}>
        <Text style={styles.pinTitle}>{ACTIVE_JOB_COPY.completePinTitle}</Text>
        <Text style={styles.pinHint}>
          {getCompletePinHint(completePinRequested)}
        </Text>
        <TouchableOpacity
          testID="request-complete-pin-button"
          style={[styles.btn, styles.requestCompletePin, (!canRequestCompletePin(order) || actionLoading === "complete-pin") && styles.disabled]}
          disabled={!canRequestCompletePin(order) || actionLoading === "complete-pin"}
          onPress={onRequestCompletePin}
        >
          <Text style={styles.btnText}>{actionLoading === "complete-pin" ? ACTIVE_JOB_COPY.requestingCompletePin : ACTIVE_JOB_COPY.requestCompletePin}</Text>
        </TouchableOpacity>
        <TextInput
          testID="complete-pin-input"
          value={completePin}
          onChangeText={setCompletePin}
          editable={canComplete(order) && actionLoading !== "complete"}
          keyboardType="number-pad"
          placeholder={ACTIVE_JOB_COPY.pinPlaceholder}
          placeholderTextColor={COLORS.textMuted}
          style={[styles.pinInput, (!canComplete(order) || actionLoading === "complete") && styles.disabledInput]}
        />
        <TouchableOpacity
          testID="complete-service-button"
          style={[styles.btn, styles.complete, (!canComplete(order) || actionLoading === "complete") && styles.disabled]}
          disabled={!canComplete(order) || actionLoading === "complete"}
          onPress={onComplete}
        >
          <Text style={styles.btnText}>{actionLoading === "complete" ? ACTIVE_JOB_COPY.completing : ACTIVE_JOB_COPY.completeService}</Text>
        </TouchableOpacity>
      </View>

      {hasCustomerCoordinates ? (
        <>
          <TouchableOpacity style={[styles.btn, styles.fullBleed]} onPress={() => Linking.openURL(`geo:${customerLat},${customerLng}?q=${customerLat},${customerLng}`)}>
            <Text style={styles.btnText}>{ACTIVE_JOB_COPY.openCustomerLocation}</Text>
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
            <Text style={styles.btnText}>{ACTIVE_JOB_COPY.openInAppNavigation}</Text>
          </TouchableOpacity>
        </>
      ) : null}
    </ScrollView>
  );
}

export function normalizeLifecycleStatus(status: string | undefined) {
  const normalized = String(status ?? "ACCEPTED").toUpperCase();
  return ["STARTED", "SERVICE_STARTED"].includes(normalized) ? "IN_PROGRESS" : normalized;
}

export function getFallbackOrder(previousOrder: PartnerOrder | null, orderId: number): PartnerOrder {
  return previousOrder ?? { id: orderId, status: "ACCEPTED" };
}

export function getStartPinHint(
  normalizedStatus: string,
) {
  return normalizedStatus === "ARRIVED"
    ? ACTIVE_JOB_COPY.startPinHint
    : ACTIVE_JOB_COPY.startPinWaiting;
}

export function getCompletePinHint(
  completePinRequested: boolean,
) {
  return completePinRequested
    ? ACTIVE_JOB_COPY.completePinReady
    : ACTIVE_JOB_COPY.completePinHint;
}

export function getStartPinValidation(
  pin: string,
) {
  if (pin.trim()) return null;
  return {
    title: ACTIVE_JOB_COPY.startPinRequiredTitle,
    message: ACTIVE_JOB_COPY.startPinRequiredBody,
  };
}

export function getCompletePinValidation(
  pin: string,
) {
  if (pin.trim()) return null;
  return {
    title: ACTIVE_JOB_COPY.completePinRequiredTitle,
    message: ACTIVE_JOB_COPY.completePinRequiredBody,
  };
}

export function canArrive(order: PartnerOrder | null) {
  if (!order) return false;
  const statuses = getOrderStatuses(order);
  const hasPostArrivalStatus = statuses.some((status) =>
    ["ARRIVED", "PARTNER_ARRIVED", "IN_PROGRESS", "COMPLETED", "SERVICE_COMPLETED", "CANCELLED", "REJECTED", "EXPIRED"].includes(status),
  );
  return !hasPostArrivalStatus && ["ACCEPTED", "PARTNER_ACCEPTED", "PARTNER_ASSIGNED", "ASSIGNED"].includes(getOrderLifecycleStatus(order));
}

export function canStart(order: PartnerOrder | null) {
  return ["ARRIVED", "PARTNER_ARRIVED"].includes(getOrderLifecycleStatus(order));
}

export function canRequestCompletePin(order: PartnerOrder | null) {
  return getOrderLifecycleStatus(order) === "IN_PROGRESS";
}

export function canComplete(order: PartnerOrder | null) {
  return getOrderLifecycleStatus(order) === "IN_PROGRESS";
}

function getOrderLifecycleStatus(order: PartnerOrder | null) {
  return normalizeLifecycleStatus(order?.assignmentStatus || order?.status);
}

function getOrderStatuses(order: PartnerOrder | null) {
  return [order?.status, order?.assignmentStatus].filter(Boolean).map((status) => normalizeLifecycleStatus(status));
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  container: { padding: 16, gap: 12 },
  title: { color: COLORS.textPrimary, fontSize: 22, fontWeight: "800" },
  meta: { color: COLORS.textSecondary },
  fullBleed: { marginHorizontal: -16 },
  btn: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 14, alignItems: "center" },
  arrive: { backgroundColor: COLORS.surfaceElevated, borderColor: COLORS.accent },
  start: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  requestCompletePin: { backgroundColor: COLORS.surfaceElevated, borderColor: COLORS.secondary },
  complete: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  disabled: { opacity: 0.55 },
  btnText: { color: COLORS.textPrimary, fontWeight: "700" },
  pinCard: { gap: 10, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, backgroundColor: COLORS.surface, padding: 14 },
  pinTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: "800" },
  pinHint: { color: COLORS.textSecondary, fontSize: 12 },
  pinInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceSoft,
    color: COLORS.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  disabledInput: { opacity: 0.6 },
});
