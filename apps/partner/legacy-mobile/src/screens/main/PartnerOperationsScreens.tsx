import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { COLORS } from "../../constants/colors";
import PaymentHeader from "../../components/payments/PaymentHeader";
import {
  applyPartnerLeave,
  cancelPartnerLeave,
  getPartnerLeaves,
  getPartnerPerformanceSummary,
  getPartnerRatings,
  getPartnerServiceAreas,
  getPartnerWarnings,
  updatePartnerServiceAreas,
} from "../../services/partnerService";
import type { PartnerLeaveItem, PartnerPerformanceSummary, PartnerRatingSummary, PartnerServiceArea, PartnerWarningItem } from "../../types/partner";
import { useAppFeedback } from "../../context/AppFeedbackContext";
import { getLeaveStatusLabel, getWarningStatusLabel, getWarningTypeLabel } from "../../utils/statusLabels";

const PARTNER_OPERATIONS_COPY = {
  performanceTitle: "Performance Dashboard",
  acceptanceRate: "Acceptance Rate",
  jobCompletion: "Job Completion",
  cancellation: "Cancellation",
  customerRating: "Customer Rating",
  onTimeArrival: "On-Time Arrival",
  performanceHint: "Your latest performance summary is shown here.",
  ratingsTitle: "Ratings",
  totalReviews: "total reviews",
  noFeedbackYet: "No customer feedback yet.",
  customer: "Customer",
  noWrittenFeedback: "No written feedback",
  leaveTitle: "Leave",
  leaveInvalidDateRange: "Enter start and end dates in YYYY-MM-DD format",
  leaveApplied: "Leave applied",
  applyLeave: "Apply Leave",
  leaveStartPlaceholder: "Start date YYYY-MM-DD",
  leaveEndPlaceholder: "End date YYYY-MM-DD",
  leaveReason: "Reason",
  leaveNoHistory: "No leave history.",
  leaveNoReason: "No reason provided",
  cancelFutureLeave: "Cancel Future Leave",
  leaveCancelError: "Unable to cancel leave",
  leaveApplyError: "Unable to apply leave",
  leaveStartAccessibility: "Leave start date",
  leaveEndAccessibility: "Leave end date",
  leaveReasonAccessibility: "Leave reason",
  serviceAreasTitle: "Service Areas",
  noServiceAreas: "No service areas available.",
  serviceAreasUpdated: "Service areas updated",
  serviceAreasUpdateError: "Unable to update service areas",
  updatePreferredZones: "Update Preferred Zones",
  warningsTitle: "Warnings",
  noActiveWarnings: "No active warnings.",
  noActiveWarningsDetail: "You're doing a great job. Keep maintaining high service quality.",
  warningType: "Warning Type",
  reason: "Reason",
  status: "Status",
  guidance: "Guidance",
  createdDate: "Created Date",
  retry: "Retry",
  unableToLoadData: "Unable to load data",
} as const;

const passthroughTr = (_key: string, fallback: string) => fallback;
const SCREEN_RETRY_TEST_IDS: Record<string, string> = {
  [PARTNER_OPERATIONS_COPY.performanceTitle]: "screen-retry-performance",
  [PARTNER_OPERATIONS_COPY.ratingsTitle]: "screen-retry-ratings",
  [PARTNER_OPERATIONS_COPY.leaveTitle]: "screen-retry-leave",
  [PARTNER_OPERATIONS_COPY.serviceAreasTitle]: "screen-retry-service areas",
  [PARTNER_OPERATIONS_COPY.warningsTitle]: "screen-retry-warnings",
};

export function PerformanceDashboardScreen({ navigation }: any) {
  const [data, setData] = useState<PartnerPerformanceSummary | null>(null);
  const loader = useLoader(async () => setData(await getPartnerPerformanceSummary()));
  useInitialLoad(loader.load);
  return (
    <Screen title={PARTNER_OPERATIONS_COPY.performanceTitle} navigation={navigation} loader={loader}>
      <View style={styles.grid}>
        <Metric label={PARTNER_OPERATIONS_COPY.acceptanceRate} value={`${data?.acceptanceRate ?? 0}%`} />
        <Metric label={PARTNER_OPERATIONS_COPY.jobCompletion} value={`${data?.completionRate ?? 0}%`} />
        <Metric label={PARTNER_OPERATIONS_COPY.cancellation} value={`${data?.cancellationRate ?? 0}%`} danger />
        <Metric label={PARTNER_OPERATIONS_COPY.customerRating} value={`${data?.rating ?? 0}/5`} />
        <Metric label={PARTNER_OPERATIONS_COPY.onTimeArrival} value={`${data?.onTimeArrivalRate ?? 0}%`} />
      </View>
      <Text style={styles.hint}>{PARTNER_OPERATIONS_COPY.performanceHint}</Text>
    </Screen>
  );
}

export function RatingsScreen({ navigation }: any) {
  const [data, setData] = useState<PartnerRatingSummary | null>(null);
  const loader = useLoader(async () => setData(await getPartnerRatings()));
  useInitialLoad(loader.load);
  return (
    <Screen title={PARTNER_OPERATIONS_COPY.ratingsTitle} navigation={navigation} loader={loader}>
      <View style={styles.heroCard}>
        <MaterialCommunityIcons name="star" size={30} color={COLORS.accent} />
        <Text style={styles.heroTitle}>{data?.averageRating ?? 0}/5</Text>
        <Text style={styles.hint}>{`${data?.totalReviews ?? 0} ${PARTNER_OPERATIONS_COPY.totalReviews}`}</Text>
      </View>
      {(data?.feedback ?? []).length === 0 ? <Empty text={PARTNER_OPERATIONS_COPY.noFeedbackYet} /> : null}
      {(data?.feedback ?? []).map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.cardTitle}>{item.customerName ?? PARTNER_OPERATIONS_COPY.customer} | {item.rating}/5</Text>
          <Text style={styles.body}>{item.comment || PARTNER_OPERATIONS_COPY.noWrittenFeedback}</Text>
          {item.createdAt ? <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString()}</Text> : null}
        </View>
      ))}
    </Screen>
  );
}

export function LeaveManagementScreen({ navigation }: any) {
  const { toast } = useAppFeedback();
  const [items, setItems] = useState<PartnerLeaveItem[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const loader = useLoader(async () => setItems(await getPartnerLeaves()));
  useInitialLoad(loader.load);

  const apply = async () => {
    if (!startDate.trim() || !endDate.trim()) {
      toast(PARTNER_OPERATIONS_COPY.leaveInvalidDateRange);
      return;
    }
    await applyPartnerLeave({ fromDate: startDate.trim(), toDate: endDate.trim(), reason: reason.trim() || undefined });
    setStartDate("");
    setEndDate("");
    setReason("");
    toast(PARTNER_OPERATIONS_COPY.leaveApplied);
    await loader.load();
  };

  return (
    <Screen title={PARTNER_OPERATIONS_COPY.leaveTitle} navigation={navigation} loader={loader}>
      <View style={[styles.card, styles.fullBleed]}>
        <Text style={styles.cardTitle}>{PARTNER_OPERATIONS_COPY.applyLeave}</Text>
        <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} placeholder={PARTNER_OPERATIONS_COPY.leaveStartPlaceholder} placeholderTextColor={COLORS.textMuted} accessibilityLabel={PARTNER_OPERATIONS_COPY.leaveStartAccessibility} />
        <TextInput style={styles.input} value={endDate} onChangeText={setEndDate} placeholder={PARTNER_OPERATIONS_COPY.leaveEndPlaceholder} placeholderTextColor={COLORS.textMuted} accessibilityLabel={PARTNER_OPERATIONS_COPY.leaveEndAccessibility} />
        <TextInput style={styles.input} value={reason} onChangeText={setReason} placeholder={PARTNER_OPERATIONS_COPY.leaveReason} placeholderTextColor={COLORS.textMuted} accessibilityLabel={PARTNER_OPERATIONS_COPY.leaveReasonAccessibility} />
        <TouchableOpacity testID="leave-apply-button" style={styles.primaryBtn} onPress={() => apply().catch((error) => toast(error?.message ?? PARTNER_OPERATIONS_COPY.leaveApplyError))} accessibilityRole="button">
          <Text style={styles.primaryText}>{PARTNER_OPERATIONS_COPY.applyLeave}</Text>
        </TouchableOpacity>
      </View>
      {items.length === 0 ? <Empty text={PARTNER_OPERATIONS_COPY.leaveNoHistory} /> : null}
      {items.map((item) => (
        <View key={item.id} style={[styles.card, styles.fullBleed]}>
          <Text style={styles.cardTitle}>{item.fromDate} to {item.toDate}</Text>
          <Text style={styles.body}>{item.reason || PARTNER_OPERATIONS_COPY.leaveNoReason}</Text>
          <Text style={styles.meta}>{getLeaveStatusLabel(item.status, passthroughTr)}</Text>
          {new Date(item.fromDate).getTime() > Date.now() && String(item.status).toUpperCase() !== "CANCELLED" ? (
            <TouchableOpacity testID={`leave-cancel-button-${item.id}`} style={styles.secondaryBtn} onPress={() => cancelPartnerLeave(item.id).then(loader.load).catch((error) => toast(error?.message ?? PARTNER_OPERATIONS_COPY.leaveCancelError))}>
              <Text style={styles.secondaryText}>{PARTNER_OPERATIONS_COPY.cancelFutureLeave}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ))}
    </Screen>
  );
}

export function ServiceAreaManagementScreen({ navigation }: any) {
  const { toast } = useAppFeedback();
  const [areas, setAreas] = useState<PartnerServiceArea[]>([]);
  const loader = useLoader(async () => setAreas(await getPartnerServiceAreas()));
  useInitialLoad(loader.load);
  const selectedAreas = areas
    .filter((item) => item.selected)
    .map((item) => ({ pincode: item.pincode, city: item.city }))
    .filter((item) => item.pincode && item.city);

  return (
    <Screen title={PARTNER_OPERATIONS_COPY.serviceAreasTitle} navigation={navigation} loader={loader}>
      {areas.length === 0 ? <Empty text={PARTNER_OPERATIONS_COPY.noServiceAreas} /> : null}
      {areas.map((area) => (
        <TouchableOpacity
          key={area.id}
          testID={`service-area-toggle-${area.id}`}
          style={[styles.selectRow, area.selected && styles.selectRowActive]}
          onPress={() => setAreas((prev) => prev.map((item) => item.id === area.id ? { ...item, selected: !item.selected } : item))}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: area.selected }}
        >
          <Text style={styles.cardTitle}>{area.name}</Text>
          <MaterialCommunityIcons name={area.selected ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"} size={22} color={COLORS.secondary} />
        </TouchableOpacity>
      ))}
      <TouchableOpacity testID="service-area-save-button" style={styles.primaryBtn} onPress={() => updatePartnerServiceAreas(selectedAreas).then(() => toast(PARTNER_OPERATIONS_COPY.serviceAreasUpdated)).catch((error) => toast(error?.message ?? PARTNER_OPERATIONS_COPY.serviceAreasUpdateError))}>
        <Text style={styles.primaryText}>{PARTNER_OPERATIONS_COPY.updatePreferredZones}</Text>
      </TouchableOpacity>
    </Screen>
  );
}

export function WarningCenterScreen({ navigation }: any) {
  const [items, setItems] = useState<PartnerWarningItem[]>([]);
  const loader = useLoader(async () => setItems(await getPartnerWarnings()));
  useInitialLoad(loader.load);
  return (
    <Screen title={PARTNER_OPERATIONS_COPY.warningsTitle} navigation={navigation} loader={loader}>
      {items.length === 0 ? (
        <Empty
          text={PARTNER_OPERATIONS_COPY.noActiveWarnings}
          detail={PARTNER_OPERATIONS_COPY.noActiveWarningsDetail}
        />
      ) : null}
      {items.map((item) => (
        <View key={item.id} style={[styles.card, styles.fullBleed, item.active && styles.warningCard]}>
          <Text style={styles.meta}>{PARTNER_OPERATIONS_COPY.warningType}</Text>
          <Text style={styles.cardTitle}>{formatWarningType(item.type)}</Text>
          <Text style={styles.meta}>{PARTNER_OPERATIONS_COPY.reason}</Text>
          <Text style={styles.body}>{item.reason}</Text>
          {item.status ? (
            <View style={styles.statusRow}>
              <Text style={styles.meta}>{PARTNER_OPERATIONS_COPY.status}</Text>
              <Text style={[styles.statusValue, item.active && styles.warningStatusValue]}>{formatWarningStatus(item.status)}</Text>
            </View>
          ) : null}
          {item.guidance ? (
            <>
              <Text style={styles.meta}>{PARTNER_OPERATIONS_COPY.guidance}</Text>
              <Text style={styles.hint}>{item.guidance}</Text>
            </>
          ) : null}
          {item.createdAt ? (
            <>
              <Text style={styles.meta}>{PARTNER_OPERATIONS_COPY.createdDate}</Text>
              <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString()}</Text>
            </>
          ) : null}
        </View>
      ))}
    </Screen>
  );
}

function Screen({ title, navigation, loader, children }: { title: string; navigation: any; loader: ReturnType<typeof useLoader>; children: React.ReactNode }) {
  const retryTestId = SCREEN_RETRY_TEST_IDS[title] ?? `screen-retry-${title.toLowerCase()}`;
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loader.loading} onRefresh={() => loader.load()} />}
    >
      <PaymentHeader title={title} onBack={() => navigation.goBack()} />
      {loader.loading ? <ActivityIndicator color={COLORS.secondary} /> : null}
      {loader.error ? (
        <View style={styles.card}>
          <Text style={styles.body}>{loader.error}</Text>
          <TouchableOpacity testID={retryTestId} style={styles.secondaryBtn} onPress={loader.load}>
            <Text style={styles.secondaryText}>{PARTNER_OPERATIONS_COPY.retry}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {children}
    </ScrollView>
  );
}

function useLoader(fn: () => Promise<void>) {
  const fnRef = useRef(fn);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  fnRef.current = fn;
  const load = useCallback(async () => {
    setLoading(true);
    try {
      await fnRef.current();
      setError("");
    } catch (nextError: any) {
      setError(nextError?.message ?? PARTNER_OPERATIONS_COPY.unableToLoadData);
    } finally {
      setLoading(false);
    }
  }, []);
  return { loading, error, load };
}

function useInitialLoad(load: () => Promise<void>) {
  useEffect(() => {
    load().catch(() => null);
  }, [load]);
}

function Metric({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  const rawPercent = Number.parseFloat(value);
  const width = `${Math.max(0, Math.min(100, Number.isFinite(rawPercent) ? rawPercent : 70))}%` as `${number}%`;
  return (
    <View style={styles.metric}>
      <Text style={styles.meta}>{label}</Text>
      <Text style={[styles.metricValue, danger && styles.danger]}>{value}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, danger && styles.barDanger, { width }]} />
      </View>
    </View>
  );
}

function Empty({ text, detail }: { text: string; detail?: string }) {
  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.empty}>{text}</Text>
      {detail ? <Text style={styles.emptyDetail}>{detail}</Text> : null}
    </View>
  );
}

function formatWarningType(type: string | undefined) {
  const normalized = String(type ?? "").trim().toUpperCase();
  if (["WARNING", "SUSPENSION", "BLOCKED"].includes(normalized)) {
    return getWarningTypeLabel(type, passthroughTr);
  }
  return String(type ?? "").trim() || "-";
}

function formatWarningStatus(status: string | undefined) {
  const normalized = String(status ?? "").trim().toUpperCase();
  if (["ACTIVE", "RESOLVED", "CLOSED", "PENDING", "APPROVED", "REJECTED"].includes(normalized)) {
    return normalized;
  }
  return String(status ?? "").trim() || "-";
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, gap: 12 },
  fullBleed: { marginHorizontal: -16 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginHorizontal: -16 },
  metric: { width: "48%", borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, gap: 8 },
  metricValue: { color: COLORS.textPrimary, fontSize: 20, fontWeight: "900" },
  danger: { color: COLORS.danger },
  barTrack: { height: 6, borderRadius: 999, backgroundColor: COLORS.surfaceSoft, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 999, backgroundColor: COLORS.secondary },
  barDanger: { backgroundColor: COLORS.danger },
  card: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, borderRadius: 14, padding: 12, gap: 8 },
  heroCard: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, borderRadius: 14, padding: 18, gap: 6, alignItems: "center" },
  heroTitle: { color: COLORS.textPrimary, fontSize: 28, fontWeight: "900" },
  cardTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: "900" },
  body: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19 },
  meta: { color: COLORS.textSecondary, fontSize: 12, fontWeight: "700" },
  hint: { color: COLORS.textMuted, fontSize: 12, lineHeight: 18 },
  emptyWrap: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, borderRadius: 14, padding: 18, gap: 6 },
  empty: { color: COLORS.textPrimary, textAlign: "center", fontSize: 16, fontWeight: "800" },
  emptyDetail: { color: COLORS.textSecondary, textAlign: "center", fontSize: 13, lineHeight: 19 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, backgroundColor: COLORS.surfaceSoft, color: COLORS.textPrimary, paddingHorizontal: 12, paddingVertical: 10 },
  primaryBtn: { borderRadius: 12, backgroundColor: COLORS.secondary, paddingVertical: 13, alignItems: "center" },
  primaryText: { color: COLORS.background, fontWeight: "900" },
  secondaryBtn: { alignSelf: "flex-start", borderWidth: 1, borderColor: COLORS.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: COLORS.surfaceSoft },
  secondaryText: { color: COLORS.textPrimary, fontWeight: "800" },
  selectRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: COLORS.borderSoft, backgroundColor: COLORS.surface, borderRadius: 12, padding: 12 },
  selectRowActive: { borderColor: COLORS.border, backgroundColor: COLORS.surfaceElevated },
  warningCard: { borderColor: COLORS.danger },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  statusValue: { color: COLORS.textPrimary, fontSize: 12, fontWeight: "900" },
  warningStatusValue: { color: COLORS.danger },
});
