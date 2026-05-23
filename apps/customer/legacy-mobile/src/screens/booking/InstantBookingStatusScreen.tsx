import { useMutation } from "@tanstack/react-query";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { useEffect, useMemo, useRef } from "react";
import { cancelBooking } from "../../api/bookingExtrasApi";
import { useInstantBookingLifecycle } from "../../hooks/useInstantBookingLifecycle";
import { useBookingLifecycleNavigation } from "../../hooks/useBookingLifecycleNavigation";
import { ENABLE_LIVE_TRACKING } from "../../constants/env";
import { BookingStageShell } from "../../components/booking/BookingStageShell";
import { StatusBadge } from "../../components/booking/StatusBadge";
import { bookingTheme } from "../../components/booking/bookingTheme";

type InstantBookingStatusRoute = { params?: { bookingId?: string } };

function getStateLabel(assignmentStatus?: string) {
  const state = String(assignmentStatus ?? "SEARCHING_PARTNER").toUpperCase();
  if (state === "PARTNER_ASSIGNED") return "Partner assigned";
  if (state === "PARTNER_ON_THE_WAY") return "Partner on the way";
  if (state === "ARRIVED") return "Partner arrived";
  if (state === "INSTANT_FAILED") return "Instant unavailable";
  return "Searching nearby partners...";
}

function getMessage(assignmentStatus?: string, message?: string) {
  const state = String(assignmentStatus ?? "SEARCHING_PARTNER").toUpperCase();
  if (message) return message;
  if (state === "PARTNER_ASSIGNED") return "Your partner accepted the booking. Service will start soon.";
  if (state === "PARTNER_ON_THE_WAY") return "Your partner is on the way.";
  if (state === "ARRIVED") return "Your partner has arrived.";
  if (state === "INSTANT_FAILED") return "No partner available right now. Please book a scheduled slot.";
  return "We are matching your request with nearby qualified partners.";
}

const FLOW_STEPS = ["BOOKED", "PARTNER_ASSIGNED", "ON_THE_WAY", "IN_PROGRESS", "DONE"] as const;

function resolveStepIndex(status?: string, assignmentStatus?: string) {
  const a = String(assignmentStatus ?? "").toUpperCase();
  const s = String(status ?? "").toUpperCase();
  if (a === "PARTNER_ARRIVED" || a === "ARRIVED") return 2;
  if (a === "PARTNER_ON_THE_WAY") return 2;
  if (s === "IN_PROGRESS" || a === "IN_PROGRESS") return 3;
  if (s === "COMPLETED" || a === "COMPLETED") return 4;
  if (a === "PARTNER_ASSIGNED" || s === "PARTNER_ASSIGNED") return 1;
  return 0;
}

function toReadableDateTime(value?: string) {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
}

export function InstantBookingStatusScreen({ route, navigation }: { route: InstantBookingStatusRoute; navigation: any }) {
  const bookingId = String(route?.params?.bookingId ?? "").trim();
  const mountedAtRef = useRef(Date.now());
  const sawSearchingRef = useRef(false);

  const bookingQuery = useInstantBookingLifecycle(bookingId);
  const details = bookingQuery.data;
  const assignment = String(details?.assignmentStatus ?? "SEARCHING_PARTNER").toUpperCase();
  const currentStep = resolveStepIndex(details?.status, details?.assignmentStatus);
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
      Alert.alert("Cancelled", "Booking cancelled successfully.");
      void bookingQuery.refetch();
    },
    onError: (e: any) => {
      Alert.alert("Cancel failed", String(e?.message ?? "Unable to cancel booking."));
    },
  });

  useEffect(() => {
    if (assignment === "SEARCHING_PARTNER") sawSearchingRef.current = true;
  }, [assignment]);

  const detailsForNavigation = useMemo(() => {
    const elapsedMs = Date.now() - mountedAtRef.current;
    const shouldHold =
      sawSearchingRef.current &&
      (assignment === "PARTNER_ASSIGNED" || assignment === "ASSIGNED" || assignment === "ACCEPTED") &&
      elapsedMs < 30000;
    if (!shouldHold || !details) return details;
    return { ...details, assignmentStatus: "SEARCHING_PARTNER" as any };
  }, [assignment, details]);

  useBookingLifecycleNavigation({
    bookingId,
    details: detailsForNavigation,
    navigation,
    currentRouteName: "InstantBookingStatus",
  });
  const title = getStateLabel(assignment);
  const message = getMessage(assignment, details?.message);

  return (
    <BookingStageShell title="My Booking" subtitle={message}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.filterRow}>
          {["CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((item) => {
            const active = statusForBadge.includes(item) || assignment.includes(item);
            return (
              <View key={item} style={[styles.filterChip, active && styles.filterChipActive]}>
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{item.replace("_", " ")}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <StatusBadge status={statusForBadge} />
            <View style={[styles.modePill, bookingQuery.wsConnected ? styles.modePillWs : styles.modePillPoll]}>
              <MaterialCommunityIcon
                name={bookingQuery.wsConnected ? "access-point-network" : "sync"}
                size={12}
                color={bookingQuery.wsConnected ? "#166534" : "#334155"}
              />
              <Text style={styles.modePillText}>{bookingQuery.wsConnected ? "Realtime WS" : "Polling"}</Text>
            </View>
          </View>

          {assignment === "SEARCHING_PARTNER" ? <ActivityIndicator style={styles.loader} /> : null}

          <Text style={styles.serviceName}>{details?.serviceName ?? "Service Booking"}</Text>
          <View style={styles.metaLine}>
            <MaterialCommunityIcon name="calendar-clock-outline" size={14} color="#475569" />
            <Text style={styles.row}>{toReadableDateTime(details?.scheduledAt ?? details?.promisedStartTime)}</Text>
          </View>
          <View style={styles.metaLine}>
            <MaterialCommunityIcon name="map-marker-outline" size={14} color="#475569" />
            <Text style={styles.row}>{details?.fullAddress ?? details?.address ?? "-"}</Text>
          </View>

          <View style={styles.partnerRow}>
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
                    <MaterialCommunityIcon name="star" size={12} color="#A16207" />
                    <Text style={styles.ratingText}>{partnerRating.toFixed(1)}</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <View style={styles.actionRow}>
              <Pressable
                style={styles.actionBtn}
                onPress={async () => {
                  if (!partnerPhone) return Alert.alert("Partner phone missing", "Phone number not available yet.");
                  await Linking.openURL(`tel:${partnerPhone}`);
                }}
              >
                <MaterialCommunityIcon name="phone" size={18} color="#065F46" />
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
                <MaterialCommunityIcon name="chat-outline" size={18} color="#1E293B" />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.progressWrap}>
          {FLOW_STEPS.map((step, index) => {
            const active = index <= currentStep;
            return (
              <View key={step} style={styles.stepItem}>
                <View style={[styles.stepDot, active && styles.stepDotActive]} />
                <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{step.replaceAll("_", " ")}</Text>
              </View>
            );
          })}
        </View>

        {assignment === "PARTNER_ASSIGNED" ? (
          <Pressable
            style={styles.primaryBtn}
            onPress={() =>
              ENABLE_LIVE_TRACKING
                ? navigation.navigate("LiveTracking", { bookingId: details?.id ?? bookingId })
                : navigation.navigate("Main", { screen: "Bookings" })
            }
          >
            <Text style={styles.primaryBtnText}>Track Booking</Text>
          </Pressable>
        ) : null}

        {assignment === "INSTANT_FAILED" ? (
          <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate("CartCrud")}>
            <Text style={styles.primaryBtnText}>Book Scheduled Slot</Text>
          </Pressable>
        ) : null}

        <View style={styles.bottomActions}>
          <Pressable
            style={[styles.secondaryBtn, cancelMutation.isPending && styles.disabledBtn]}
            onPress={() => {
              if (cancelMutation.isPending) return;
              cancelMutation.mutate();
            }}
          >
            <Text style={styles.secondaryBtnText}>{cancelMutation.isPending ? "Cancelling..." : "Cancel"}</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate("CartCrud")}>
            <Text style={styles.secondaryBtnText}>Reschedule</Text>
          </Pressable>
        </View>

        <Pressable style={styles.secondaryBtn} onPress={() => bookingQuery.refetch()}>
          <Text style={styles.secondaryBtnText}>Refresh Status</Text>
        </Pressable>

        {bookingQuery.isError ? <Text style={styles.error}>Unable to fetch booking status. Please retry.</Text> : null}
      </ScrollView>
    </BookingStageShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: { gap: 12, paddingBottom: 20 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: {
    borderWidth: 1,
    borderColor: bookingTheme.colors.secondaryBtnBorder,
    borderRadius: bookingTheme.radius.button,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#FFFFFF",
  },
  filterChipActive: { borderColor: "#059669", backgroundColor: "#DCFCE7" },
  filterChipText: { color: bookingTheme.colors.secondaryBtnText, fontSize: 11, fontWeight: "800" },
  filterChipTextActive: { color: "#065F46" },
  heroCard: {
    borderWidth: 1,
    borderColor: "#D7E2F0",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    padding: 14,
    gap: 9,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modePill: {
    alignSelf: "flex-end",
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    borderRadius: bookingTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  modePillWs: { backgroundColor: "#DCFCE7" },
  modePillPoll: { backgroundColor: "#E2E8F0" },
  modePillText: { color: bookingTheme.colors.textPrimary, fontSize: 11, fontWeight: "800", letterSpacing: 0.2 },
  loader: { marginTop: 6 },
  card: { gap: 8 },
  row: { color: bookingTheme.colors.textMuted, fontSize: 13, fontWeight: "700" },
  serviceName: { color: bookingTheme.colors.textPrimary, fontSize: 18, fontWeight: "900" },
  metaLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  partnerRow: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 10 },
  partnerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#E0F2FE", alignItems: "center", justifyContent: "center" },
  partnerAvatarImage: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#E2E8F0" },
  partnerAvatarText: { color: "#0F172A", fontSize: 18, fontWeight: "900" },
  partnerInfo: { flex: 1, gap: 2 },
  partnerMetaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  partnerName: { color: bookingTheme.colors.textPrimary, fontSize: 14, fontWeight: "900" },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 999,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ratingText: { color: "#92400E", fontSize: 11, fontWeight: "800" },
  actionRow: { flexDirection: "row", gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: bookingTheme.colors.secondaryBtnBorder, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
  progressWrap: {
    marginTop: 2,
    borderWidth: 1,
    borderColor: "#DCE5F2",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  stepItem: { alignItems: "center", flex: 1, gap: 5 },
  stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#CBD5E1" },
  stepDotActive: { backgroundColor: "#16A34A" },
  stepLabel: { color: "#64748B", fontSize: 9, fontWeight: "700", textAlign: "center" },
  stepLabelActive: { color: "#166534" },
  primaryBtn: {
    backgroundColor: bookingTheme.colors.primaryBtn,
    borderRadius: bookingTheme.radius.button,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 6,
  },
  primaryBtnText: { color: bookingTheme.colors.primaryBtnText, fontSize: 14, fontWeight: "900", letterSpacing: 0.2 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: bookingTheme.colors.secondaryBtnBorder,
    borderRadius: bookingTheme.radius.button,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  secondaryBtnText: { color: bookingTheme.colors.secondaryBtnText, fontSize: 13, fontWeight: "800" },
  bottomActions: { flexDirection: "row", gap: 8 },
  disabledBtn: { opacity: 0.7 },
  error: { color: bookingTheme.colors.danger, fontWeight: "800" },
});
