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

export function PerformanceDashboardScreen({ navigation }: any) {
  const [data, setData] = useState<PartnerPerformanceSummary | null>(null);
  const loader = useLoader(async () => setData(await getPartnerPerformanceSummary()));
  useInitialLoad(loader.load);
  return (
    <Screen title="Performance" navigation={navigation} loader={loader}>
      <View style={styles.grid}>
        <Metric label="Acceptance Rate" value={`${data?.acceptanceRate ?? 0}%`} />
        <Metric label="Completion Rate" value={`${data?.completionRate ?? 0}%`} />
        <Metric label="Cancellation Rate" value={`${data?.cancellationRate ?? 0}%`} danger />
        <Metric label="Rating" value={`${data?.rating ?? 0}/5`} />
        <Metric label="On-Time Arrival" value={`${data?.onTimeArrivalRate ?? 0}%`} />
      </View>
      <Text style={styles.hint}>Charts will appear here when trend data is available from backend.</Text>
    </Screen>
  );
}

export function RatingsScreen({ navigation }: any) {
  const [data, setData] = useState<PartnerRatingSummary | null>(null);
  const loader = useLoader(async () => setData(await getPartnerRatings()));
  useInitialLoad(loader.load);
  return (
    <Screen title="Ratings" navigation={navigation} loader={loader}>
      <View style={styles.heroCard}>
        <MaterialCommunityIcons name="star" size={30} color={COLORS.accent} />
        <Text style={styles.heroTitle}>{data?.averageRating ?? 0}/5</Text>
        <Text style={styles.hint}>{data?.totalReviews ?? 0} total reviews</Text>
      </View>
      {(data?.feedback ?? []).length === 0 ? <Empty text="No customer feedback yet." /> : null}
      {(data?.feedback ?? []).map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.cardTitle}>{item.customerName ?? "Customer"} | {item.rating}/5</Text>
          <Text style={styles.body}>{item.comment || "No written feedback"}</Text>
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
      toast("Enter start and end dates in YYYY-MM-DD format");
      return;
    }
    await applyPartnerLeave({ fromDate: startDate.trim(), toDate: endDate.trim(), reason: reason.trim() || undefined });
    setStartDate("");
    setEndDate("");
    setReason("");
    toast("Leave applied");
    await loader.load();
  };
  return (
    <Screen title="Leave" navigation={navigation} loader={loader}>
      <View style={[styles.card, styles.fullBleed]}>
        <Text style={styles.cardTitle}>Apply Leave</Text>
        <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} placeholder="Start date YYYY-MM-DD" placeholderTextColor={COLORS.textMuted} accessibilityLabel="Leave start date" />
        <TextInput style={styles.input} value={endDate} onChangeText={setEndDate} placeholder="End date YYYY-MM-DD" placeholderTextColor={COLORS.textMuted} accessibilityLabel="Leave end date" />
        <TextInput style={styles.input} value={reason} onChangeText={setReason} placeholder="Reason" placeholderTextColor={COLORS.textMuted} accessibilityLabel="Leave reason" />
        <TouchableOpacity testID="leave-apply-button" style={styles.primaryBtn} onPress={() => apply().catch((error) => toast(error?.message ?? "Unable to apply leave"))} accessibilityRole="button">
          <Text style={styles.primaryText}>Apply Leave</Text>
        </TouchableOpacity>
      </View>
      {items.length === 0 ? <Empty text="No leave history." /> : null}
      {items.map((item) => (
        <View key={item.id} style={[styles.card, styles.fullBleed]}>
          <Text style={styles.cardTitle}>{item.fromDate} to {item.toDate}</Text>
          <Text style={styles.body}>{item.reason || "No reason provided"}</Text>
          <Text style={styles.meta}>{item.status}</Text>
          {new Date(item.fromDate).getTime() > Date.now() && item.status !== "CANCELLED" ? (
            <TouchableOpacity testID={`leave-cancel-button-${item.id}`} style={styles.secondaryBtn} onPress={() => cancelPartnerLeave(item.id).then(loader.load).catch((error) => toast(error?.message ?? "Unable to cancel leave"))}>
              <Text style={styles.secondaryText}>Cancel Future Leave</Text>
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
    .filter(item => item.selected)
    .map(item => ({ pincode: item.pincode, city: item.city }))
    .filter(item => item.pincode && item.city);
  return (
    <Screen title="Service Areas" navigation={navigation} loader={loader}>
      {areas.length === 0 ? <Empty text="No service areas available." /> : null}
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
      <TouchableOpacity testID="service-area-save-button" style={styles.primaryBtn} onPress={() => updatePartnerServiceAreas(selectedAreas).then(() => toast("Service areas updated")).catch((error) => toast(error?.message ?? "Unable to update service areas"))}>
        <Text style={styles.primaryText}>Update Preferred Zones</Text>
      </TouchableOpacity>
    </Screen>
  );
}

export function WarningCenterScreen({ navigation }: any) {
  const [items, setItems] = useState<PartnerWarningItem[]>([]);
  const loader = useLoader(async () => setItems(await getPartnerWarnings()));
  useInitialLoad(loader.load);
  return (
    <Screen title="Warnings" navigation={navigation} loader={loader}>
      {items.length === 0 ? (
        <Empty
          text="No active warnings."
          detail="You're doing a great job. Keep maintaining high service quality."
        />
      ) : null}
      {items.map((item) => (
        <View key={item.id} style={[styles.card, item.active && styles.warningCard]}>
          <Text style={styles.meta}>Warning Type</Text>
          <Text style={styles.cardTitle}>{item.type}</Text>
          <Text style={styles.meta}>Reason</Text>
          <Text style={styles.body}>{item.reason}</Text>
          {item.status ? (
            <View style={styles.statusRow}>
              <Text style={styles.meta}>Status</Text>
              <Text style={[styles.statusValue, item.active && styles.warningStatusValue]}>{item.status}</Text>
            </View>
          ) : null}
          {item.guidance ? (
            <>
              <Text style={styles.meta}>Guidance</Text>
              <Text style={styles.hint}>{item.guidance}</Text>
            </>
          ) : null}
          {item.createdAt ? (
            <>
              <Text style={styles.meta}>Created Date</Text>
              <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString()}</Text>
            </>
          ) : null}
        </View>
      ))}
    </Screen>
  );
}

function Screen({ title, navigation, loader, children }: { title: string; navigation: any; loader: ReturnType<typeof useLoader>; children: React.ReactNode }) {
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
          <TouchableOpacity testID={`screen-retry-${title.toLowerCase()}`} style={styles.secondaryBtn} onPress={loader.load}>
            <Text style={styles.secondaryText}>Retry</Text>
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
      setError(nextError?.message ?? "Unable to load data");
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
