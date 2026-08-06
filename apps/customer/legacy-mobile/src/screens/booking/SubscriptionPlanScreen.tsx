import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pressable, SectionList, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiErrorCode } from "../../api/client";
import { cancelSubscription, getSubscriptionDetails, pauseSubscription, resumeSubscription } from "../../api/subscriptionApi";
import { getSubscriptionVisits } from "../../api/subscriptionVisitsApi";
import type { SubscriptionVisitDto } from "../../types/contracts";
import { BookingTimeline } from "../../components/booking/BookingTimeline";
import { trackSubscriptionCancelled, trackSubscriptionPaused } from "../../services/customerAnalyticsEvents";
import { captureFrontendError, trackBusinessEvent } from "../../services/monitoring";
import { COLORS } from "../../theme/colors";
import { radii, shadows, spacing } from "../../constants/theme";

type SubscriptionPlanRoute = { params?: { subscriptionId?: string; bookingId?: string } };

function formatDate(value?: string) {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) return raw;
  return parsed.toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
}

function sectionFor(visit: SubscriptionVisitDto) {
  return String(visit.section ?? "Subscription Visits").trim() || "Subscription Visits";
}

export function SubscriptionPlanScreen({ route }: { route: SubscriptionPlanRoute; navigation: any }) {
  const subscriptionId = String(route?.params?.subscriptionId ?? route?.params?.bookingId ?? "").trim();
  const queryClient = useQueryClient();
  const visitsQuery = useQuery({
    queryKey: ["subscription-visits", subscriptionId],
    queryFn: () => getSubscriptionVisits(subscriptionId),
    enabled: subscriptionId.length > 0,
  });
  const detailsQuery = useQuery({
    queryKey: ["subscription-details", subscriptionId],
    queryFn: () => getSubscriptionDetails(subscriptionId),
    enabled: subscriptionId.length > 0,
  });
  const subscription = detailsQuery.data;
  const refreshSubscription = () => {
    queryClient.invalidateQueries({ queryKey: ["subscription-details", subscriptionId] }).catch(() => null);
    queryClient.invalidateQueries({ queryKey: ["subscription-visits", subscriptionId] }).catch(() => null);
  };
  const pauseMutation = useMutation({
    mutationFn: () => pauseSubscription(subscriptionId),
    onSuccess: () => {
      void trackSubscriptionPaused({ subscription_id: subscriptionId });
      refreshSubscription();
    },
    onError: (error: any) => {
      captureFrontendError(error, {
        screenName: "SubscriptionPlan",
        userAction: "pause_subscription",
        apiEndpoint: `/api/subscriptions/${subscriptionId}/pause`,
        errorCode: getApiErrorCode(error) || "SUBSCRIPTION_PAUSE_FAILED",
      });
    },
  });
  const resumeMutation = useMutation({
    mutationFn: () => resumeSubscription(subscriptionId),
    onSuccess: () => {
      void trackBusinessEvent("subscription_resumed", { subscription_id: subscriptionId });
      refreshSubscription();
    },
    onError: (error: any) => {
      captureFrontendError(error, {
        screenName: "SubscriptionPlan",
        userAction: "resume_subscription",
        apiEndpoint: `/api/subscriptions/${subscriptionId}/resume`,
        errorCode: getApiErrorCode(error) || "SUBSCRIPTION_RESUME_FAILED",
      });
    },
  });
  const cancelMutation = useMutation({
    mutationFn: () => cancelSubscription(subscriptionId),
    onSuccess: () => {
      void trackSubscriptionCancelled({ subscription_id: subscriptionId });
      refreshSubscription();
    },
    onError: (error: any) => {
      captureFrontendError(error, {
        screenName: "SubscriptionPlan",
        userAction: "cancel_subscription",
        apiEndpoint: `/api/subscriptions/${subscriptionId}/cancel`,
        errorCode: getApiErrorCode(error) || "SUBSCRIPTION_CANCEL_FAILED",
      });
    },
  });

  const sections = useMemo(() => {
    const buckets: Record<string, SubscriptionVisitDto[]> = {
      "Upcoming Visits": [],
      "Completed Visits": [],
      "Cancelled Visits": [],
    };
    (visitsQuery.data ?? []).forEach((visit) => buckets[sectionFor(visit)].push(visit));
    return Object.keys(buckets).map((title) => ({ title, data: buckets[title] })).filter((section) => section.data.length > 0);
  }, [visitsQuery.data]);

  if (visitsQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SectionList
      style={styles.root}
      contentContainerStyle={styles.content}
      sections={sections}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.headerCard}>
          <Text style={styles.title}>View Plan</Text>
          <Text style={styles.row}>Plan: {subscription?.planName ?? subscription?.frequencyLabel ?? "-"}</Text>
          <Text style={styles.row}>Next Visit: {subscription?.nextVisitDate ?? subscription?.nextServiceDate ?? "-"}</Text>
          <View style={styles.actions}>
            {subscription?.canPause ? <Pressable style={styles.actionBtn} onPress={() => pauseMutation.mutate()}><Text style={styles.actionText}>Pause</Text></Pressable> : null}
            {subscription?.canResume ? <Pressable style={styles.actionBtn} onPress={() => resumeMutation.mutate()}><Text style={styles.actionText}>Resume</Text></Pressable> : null}
            {subscription?.canCancel ? <Pressable style={styles.actionBtn} onPress={() => cancelMutation.mutate()}><Text style={styles.actionText}>Cancel</Text></Pressable> : null}
          </View>
        </View>
      }
      ListEmptyComponent={<Text style={styles.empty}>No visit history available.</Text>}
      renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title}</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.service}>{item.serviceName ?? "Subscription visit"}</Text>
          <Text style={styles.row}>Visit ID: {item.id}</Text>
          <Text style={styles.row}>Scheduled: {formatDate(item.scheduledAt)}</Text>
          <Text style={styles.row}>Status: {item.status ?? "-"}</Text>
          <Text style={styles.row}>Partner: {item.partnerName ?? "-"}</Text>
          <BookingTimeline history={item.statusHistory} compact />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.offWhite },
  content: { padding: spacing.md + 2, gap: spacing.sm, paddingBottom: spacing.xl },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.offWhite },
  title: { color: COLORS.slate900, fontSize: 22, fontWeight: "900", marginBottom: spacing.sm },
  headerCard: { borderRadius: radii.md, borderWidth: 1, borderColor: COLORS.borderSoft, backgroundColor: COLORS.white, padding: spacing.md, gap: spacing.xs, ...shadows.sm },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.xs },
  actionBtn: { borderRadius: radii.md, borderWidth: 1, borderColor: COLORS.goldSoft, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: COLORS.offWhite },
  actionText: { color: COLORS.slate900, fontSize: 12, fontWeight: "900" },
  sectionTitle: { color: COLORS.slate700, fontSize: 12, fontWeight: "900", textTransform: "uppercase", marginTop: spacing.sm },
  card: { borderRadius: radii.md, borderWidth: 1, borderColor: COLORS.borderSoft, backgroundColor: COLORS.white, padding: spacing.md, gap: 5, ...shadows.sm },
  service: { color: COLORS.slate900, fontSize: 15, fontWeight: "900" },
  row: { color: COLORS.slate700, fontSize: 13, fontWeight: "700" },
  empty: { color: COLORS.slate700, fontSize: 14, fontWeight: "700" },
});
