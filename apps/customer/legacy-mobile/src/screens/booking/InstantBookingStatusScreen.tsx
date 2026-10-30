import { useMutation } from "@tanstack/react-query";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useMemo } from "react";
import { cancelBooking } from "../../api/bookingExtrasApi";
import { useInstantBookingLifecycle } from "../../hooks/useInstantBookingLifecycle";
import { resolveLifecycleTarget, useBookingLifecycleNavigation } from "../../hooks/useBookingLifecycleNavigation";
import { getBookingMeta } from "../../utils/bookingMeta";
import { BookingTimeline } from "../../components/booking/BookingTimeline";
import { getApiErrorCode } from "../../api/client";
import { trackBookingCancelled } from "../../services/customerAnalyticsEvents";
import { captureFrontendError } from "../../services/monitoring";
import { BookingStageShell } from "../../components/booking/BookingStageShell";
import { StatusBadge } from "../../components/booking/StatusBadge";
import { AssignedPartnerMap } from "../../components/booking/AssignedPartnerMap";
import { bookingTheme } from "../../components/booking/bookingTheme";
import { COLORS } from '../../theme/colors';
import { radii, shadows, spacing } from "../../constants/theme";

type InstantBookingStatusRoute = { params?: { bookingId?: string; serviceName?: string; address?: string; amount?: number; currency?: string; scheduledAt?: string } };

function toReadableDateTime(value?: string) {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
}

export function InstantBookingStatusScreen({ route, navigation }: { route: InstantBookingStatusRoute; navigation: any }) {
  const bookingId = String(route?.params?.bookingId ?? "").trim();

  const bookingQuery = useInstantBookingLifecycle(bookingId);
  const routeFallback = route?.params ?? {};
  const details: any = bookingQuery.data ? { ...routeFallback, ...bookingQuery.data } : { id: bookingId, ...routeFallback };
  const meta = getBookingMeta(details);
  const statusForBadge = String(details?.assignmentStatus ?? details?.status ?? "SEARCHING_PARTNER").toUpperCase();
  const partnerPhone = String(details?.partnerPhone ?? "").trim();
  const partnerName = String(details?.partnerName ?? "").trim() || "Partner";
  const partnerProfileImage = String(details?.partnerProfileImage ?? "").trim();
  const partnerRating = Number(details?.partnerRating ?? 0);

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const id = String(details?.id ?? bookingId).trim();
      if (!id) throw new Error("Booking id missing.");
      return cancelBooking(id);
    },
    onSuccess: () => {
      void trackBookingCancelled({ booking_id: String(details?.id ?? bookingId), source: "instant_status" });
      Alert.alert("Cancelled", "Booking cancelled successfully.");
      void bookingQuery.refetch();
    },
    onError: (e: any) => {
      captureFrontendError(e, {
        screenName: "InstantBookingStatus",
        userAction: "cancel_booking",
        apiEndpoint: `/api/bookings/cancel/${String(details?.id ?? bookingId)}`,
        errorCode: getApiErrorCode(e) || "CANCEL_BOOKING_FAILED",
      });
      Alert.alert("Cancel failed", String(e?.message ?? "Unable to cancel booking."));
    },
  });

  const detailsForNavigation = useMemo(() => {
    const shouldHold = false;
    if (!shouldHold || !details) return details;
    return { ...details, assignmentStatus: "SEARCHING_PARTNER" as any };
  }, [details]);

  useBookingLifecycleNavigation({
    bookingId,
    details: detailsForNavigation,
    navigation,
    currentRouteName: "InstantBookingStatus",
  });
  const message = details?.message ?? "We are matching your request with nearby qualified partners.";

  return (
    <BookingStageShell title="My Booking" subtitle={message}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <StatusBadge status={statusForBadge} />
            <View style={[styles.modePill, bookingQuery.wsConnected ? styles.modePillWs : styles.modePillPoll]}>
              <MaterialCommunityIcon
                name={bookingQuery.wsConnected ? "access-point-network" : "sync"}
                size={12}
                color={bookingQuery.wsConnected ? COLORS.goldSoft : COLORS.goldSoft}
              />
              <Text style={styles.modePillText}>{bookingQuery.wsConnected ? "Realtime WS" : "Polling"}</Text>
            </View>
          </View>

          <Text style={styles.serviceName}>{details?.serviceName ?? "Service Booking"}</Text>
          <View style={styles.metaLine}>
            <MaterialCommunityIcon name="cash" size={14} color={COLORS.goldSoft} />
            <Text style={styles.row}>{details?.currency ?? "Rs"} {details?.totalAmount ?? details?.amount ?? details?.price ?? "-"}</Text>
          </View>
          <View style={styles.metaLine}>
            <MaterialCommunityIcon name="calendar-clock-outline" size={14} color={COLORS.goldSoft} />
            <Text style={styles.row}>{toReadableDateTime(details?.scheduledAt ?? details?.promisedStartTime)}</Text>
          </View>
          <View style={styles.metaLine}>
            <MaterialCommunityIcon name="map-marker-outline" size={14} color={COLORS.goldSoft} />
            <Text style={[styles.row, styles.address]}>{details?.fullAddress || details?.address || "-"}</Text>
          </View>

          {details?.partnerId || statusForBadge === "PARTNER_ASSIGNED" ? <View style={styles.partnerRow}>
            {partnerProfileImage ? (
              <Image source={{ uri: partnerProfileImage }} style={styles.partnerAvatarImage} resizeMode="cover" />
            ) : (
              <View style={styles.partnerAvatar}>
                <Text style={styles.partnerAvatarText}>{partnerName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.partnerInfo}>
              <Text style={styles.partnerName}>{partnerName}</Text>
              <View style={styles.partnerMetaRow}>
                <Text style={styles.row}>ETA {details?.etaMinutes != null ? `${details.etaMinutes} mins` : "N/A"}</Text>
                {partnerRating > 0 ? (
                  <View style={styles.ratingPill}>
                    <MaterialCommunityIcon name="star" size={12} color={COLORS.warning} />
                    <Text style={styles.ratingText}>{partnerRating.toFixed(1)}</Text>
                  </View>
                ) : null}
              </View>
            </View>
            {meta.canCallPartner ? (
            <View style={styles.actionRow}>
              <Pressable
                style={styles.actionBtn}
                onPress={async () => {
                  if (!partnerPhone) return Alert.alert("Partner phone missing", "Phone number not available yet.");
                  await Linking.openURL(`tel:${partnerPhone}`);
                }}
              >
                <MaterialCommunityIcon name="phone" size={18} color={COLORS.goldSoft} />
              </Pressable>
              <Pressable
                style={styles.actionBtn}
                onPress={async () => {
                  if (!partnerPhone) return Alert.alert("Partner phone missing", "Phone number not available yet.");
                  const digits = partnerPhone.replace(/\D+/g, "");
                  const url = `https://wa.me/${digits}`;
                  await Linking.openURL(url);
                }}
              >
                <MaterialCommunityIcon name="chat-outline" size={18} color={COLORS.goldSoft} />
              </Pressable>
            </View>
            ) : null}
          </View> : null}
        </View>

        {statusForBadge === "PARTNER_ASSIGNED" ? <AssignedPartnerMap booking={details} /> : null}

        <View style={styles.progressWrap}>
          <BookingTimeline history={details?.statusHistory} compact />
        </View>

        {meta.canTrackPartner ? (
          <Pressable
            style={styles.primaryBtn}
            onPress={async () => {
              const latest = await bookingQuery.refetch();
              const target = resolveLifecycleTarget((latest.data ?? details) as any);
              navigation.navigate(target.name ?? "BookingDetail", { bookingId: String(details?.id ?? bookingId) });
            }}
          >
            <Text style={styles.primaryBtnText}>Track Booking</Text>
          </Pressable>
        ) : null}

        <View style={styles.bottomActions}>
          {meta.canCancel ? (
          <Pressable
            style={[styles.secondaryBtn, cancelMutation.isPending && styles.disabledBtn]}
            onPress={() => {
              if (cancelMutation.isPending) return;
              cancelMutation.mutate();
            }}
          >
            <Text style={styles.secondaryBtnText}>{cancelMutation.isPending ? "Cancelling..." : "Cancel"}</Text>
          </Pressable>
          ) : null}
          {meta.canReschedule ? (
          <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate("CartCrud")}>
            <Text style={styles.secondaryBtnText}>Reschedule</Text>
          </Pressable>
          ) : null}
        </View>

        {meta.canRaiseIssue ? (
          <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate("Support")}>
            <Text style={styles.secondaryBtnText}>Raise Issue</Text>
          </Pressable>
        ) : null}

        <Pressable style={styles.secondaryBtn} onPress={() => bookingQuery.refetch()}>
          <Text style={styles.secondaryBtnText}>Refresh Status</Text>
        </Pressable>

        {bookingQuery.isError ? <Text style={styles.error}>Unable to fetch booking status. Please retry.</Text> : null}
      </ScrollView>
    </BookingStageShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: { gap: spacing.md, paddingBottom: spacing.xl },
  heroCard: {
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    borderRadius: radii.lg,
    backgroundColor: COLORS.navyDark,
    padding: spacing.md + 2,
    gap: 9,
    ...shadows.sm,
  },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modePill: {
    alignSelf: "flex-end",
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
  },
  modePillWs: { backgroundColor: "rgba(217,164,65,0.12)" },
  modePillPoll: { backgroundColor: "rgba(217,164,65,0.08)" },
  modePillText: { color: bookingTheme.colors.textPrimary, fontSize: 11, fontWeight: "800", letterSpacing: 0.2 },
  loader: { marginTop: 6 },
  card: { gap: 8 },
  row: { color: bookingTheme.colors.textMuted, fontSize: 13, fontWeight: "700" },
  address: { flex: 1, lineHeight: 20 },
  serviceName: { color: bookingTheme.colors.textPrimary, fontSize: 18, fontWeight: "900" },
  metaLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  partnerRow: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 10 },
  partnerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(217,164,65,0.12)",
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  partnerAvatarImage: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(217,164,65,0.12)", borderWidth: 1, borderColor: COLORS.goldSoft },
  partnerAvatarText: { color: COLORS.goldSoft, fontSize: 18, fontWeight: "900" },
  partnerInfo: { flex: 1, gap: 2 },
  partnerMetaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  partnerName: { color: bookingTheme.colors.textPrimary, fontSize: 14, fontWeight: "900" },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: radii.pill,
    backgroundColor: "rgba(217,164,65,0.12)",
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    paddingHorizontal: spacing.sm - 2,
    paddingVertical: spacing.xs - 2,
  },
  ratingText: { color: COLORS.warning, fontSize: 11, fontWeight: "800" },
  actionRow: { flexDirection: "row", gap: 8 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: bookingTheme.colors.secondaryBtnBorder,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.navyDark,
  },
  progressWrap: {
    marginTop: 2,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    borderRadius: radii.md,
    backgroundColor: COLORS.navyDark,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
    ...shadows.sm,
  },
  stepItem: { alignItems: "center", flex: 1, gap: 5 },
  stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.slate300 },
  stepDotActive: { backgroundColor: COLORS.green600 },
  stepLabel: { color: COLORS.slate500, fontSize: 9, fontWeight: "700", textAlign: "center" },
  stepLabelActive: { color: COLORS.green700 },
  primaryBtn: { backgroundColor: bookingTheme.colors.primaryBtn, borderRadius: radii.md, paddingVertical: spacing.md + 1, alignItems: "center", marginTop: 6, ...shadows.sm },
  primaryBtnText: { color: bookingTheme.colors.primaryBtnText, fontSize: 14, fontWeight: "900", letterSpacing: 0.2 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: bookingTheme.colors.secondaryBtnBorder,
    borderRadius: radii.pill,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.md + 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.navyDark,
    minHeight: 50,
  },
  secondaryBtnText: { color: bookingTheme.colors.secondaryBtnText, fontSize: 13, fontWeight: "800" },
  bottomActions: { flexDirection: "row", gap: 10 },
  disabledBtn: { opacity: 0.7 },
  error: { color: bookingTheme.colors.danger, fontWeight: "800" },
});







