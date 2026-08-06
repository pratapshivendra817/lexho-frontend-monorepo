import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { Text } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";
import { BookingStageShell } from "../../components/booking/BookingStageShell";
import { bookingTheme } from "../../components/booking/bookingTheme";
import { getSubscriptionDetails } from "../../api/subscriptionApi";
import { COLORS } from "../../theme/colors";
import { radii, shadows, spacing } from "../../constants/theme";

type SubscriptionConfirmedRoute = { params?: { bookingId?: string; subscriptionId?: string } };

const SUPPORT_NUMBER = "+917999700475";

function asText(value: unknown, fallback = "-") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function formatDate(value?: string | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) return raw;
  return parsed.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function formatServiceType(value?: string | null) {
  const raw = String(value ?? "").trim().toUpperCase();
  if (raw === "COOK") return "Cook";
  if (raw === "CLEANING") return "Cleaning";
  return raw ? raw.charAt(0) + raw.slice(1).toLowerCase() : "-";
}

function getPlanLabel(details: any) {
  const frequencyLabel = asText(details?.frequencyLabel, "");
  if (frequencyLabel) return frequencyLabel;
  const days = Array.isArray(details?.frequencyDays) ? details.frequencyDays.filter(Boolean).join(", ") : "";
  if (days) return days;
  return asText(details?.planName ?? details?.subscriptionPlan ?? details?.frequency, "-");
}

export function SubscriptionConfirmedScreen({ route, navigation }: { route: SubscriptionConfirmedRoute; navigation: any }) {
  const subscriptionIdParam = String(route?.params?.subscriptionId ?? route?.params?.bookingId ?? "").trim();
  const detailsQuery = useQuery({
    queryKey: ["subscription-details", subscriptionIdParam],
    queryFn: () => getSubscriptionDetails(subscriptionIdParam),
    enabled: subscriptionIdParam.length > 0,
  });
  const details = (detailsQuery.data ?? {}) as any;
  const subscriptionId = asText(details?.id ?? subscriptionIdParam);
  const serviceType = formatServiceType(details?.serviceType);
  const viewSubscription = () => {
    if (!subscriptionIdParam) return;
    navigation.navigate("SubscriptionPlan", { subscriptionId: subscriptionIdParam });
  };

  const onCallSupport = async () => {
    const phone = `tel:${SUPPORT_NUMBER}`;
    try {
      const canOpen = await Linking.canOpenURL(phone);
      if (!canOpen) {
        Alert.alert("Call unavailable", `Please dial ${SUPPORT_NUMBER} manually.`);
        return;
      }
      await Linking.openURL(phone);
    } catch {
      Alert.alert("Call failed", `Please dial ${SUPPORT_NUMBER} manually.`);
    }
  };

  return (
    <BookingStageShell title="Subscription Confirmed" subtitle="Payment received. Your recurring service plan is now active.">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, styles.cardDark]}>
          <View style={styles.successRow}>
            <View style={[styles.iconWrap, styles.iconWrapDark]}>
              <MaterialCommunityIcon name="calendar-refresh" size={26} color={COLORS.goldSoft} />
            </View>
            <View style={styles.successTextWrap}>
              <Text style={[styles.successTitle, styles.textDarkPrimary]}>Payment Successful</Text>
              <Text style={[styles.successSub, styles.textDarkSecondary]}>Subscription ID: {subscriptionId}</Text>
            </View>
          </View>
          <View style={[styles.line, styles.lineDark]} />

          <View style={styles.row}><Text style={[styles.label, styles.textDarkLabel]}>Service Type</Text><Text style={[styles.value, styles.textDarkPrimary]}>{serviceType}</Text></View>
          <View style={styles.row}><Text style={[styles.label, styles.textDarkLabel]}>Plan</Text><Text style={[styles.value, styles.textDarkPrimary]}>{getPlanLabel(details)}</Text></View>
          <View style={styles.row}><Text style={[styles.label, styles.textDarkLabel]}>Start Date</Text><Text style={[styles.value, styles.textDarkPrimary]}>{formatDate(details?.startDate)}</Text></View>
          <View style={styles.row}><Text style={[styles.label, styles.textDarkLabel]}>End Date</Text><Text style={[styles.value, styles.textDarkPrimary]}>{formatDate(details?.endDate)}</Text></View>
          <View style={styles.row}><Text style={[styles.label, styles.textDarkLabel]}>Visits Count</Text><Text style={[styles.value, styles.textDarkPrimary]}>{asText(details?.visits ?? details?.visitCount)}</Text></View>
          <View style={styles.row}><Text style={[styles.label, styles.textDarkLabel]}>Time Slot</Text><Text style={[styles.value, styles.textDarkPrimary]}>{asText(details?.timeSlot)}</Text></View>
          <View style={styles.row}><Text style={[styles.label, styles.textDarkLabel]}>Address</Text><Text style={[styles.value, styles.textDarkPrimary]}>{asText(details?.fullAddress ?? details?.address)}</Text></View>
          <View style={styles.row}><Text style={[styles.label, styles.textDarkLabel]}>Amount Paid</Text><Text style={[styles.value, styles.textDarkPrimary]}>Rs {asText(details?.totalAmount ?? details?.amount)}</Text></View>
          <View style={styles.row}><Text style={[styles.label, styles.textDarkLabel]}>Next Service Date</Text><Text style={[styles.value, styles.textDarkPrimary]}>{formatDate(details?.nextServiceDate ?? details?.nextVisitDate ?? details?.startDate)}</Text></View>
        </View>

        <View style={[styles.timelineCard, styles.cardDark]}>
          <Text style={[styles.timelineTitle, styles.textDarkPrimary]}>Subscription Timeline</Text>
          {["Plan active", "Upcoming visits", "Partner assignment", "Service completion"].map((label, index) => (
            <View key={label} style={styles.timelineRow}>
              <View style={[styles.timelineDot, styles.timelineDotDark, index === 0 && styles.timelineDotActive]}>
                {index === 0 ? <MaterialCommunityIcon name="check" size={10} color={COLORS.white} /> : null}
              </View>
              <Text style={[styles.timelineLabel, styles.textDarkSecondary, index === 0 && styles.timelineLabelActiveDark]}>{label}</Text>
            </View>
          ))}
        </View>

        <Pressable style={[styles.primaryBtn, styles.primaryBtnDark]} onPress={viewSubscription} disabled={!subscriptionIdParam}>
          <Text style={[styles.primaryBtnText, styles.primaryBtnTextDark]}>View Subscription</Text>
        </Pressable>

        <Pressable style={[styles.secondaryBtn, styles.secondaryBtnDark]} onPress={() => navigation.navigate("Main", { screen: "Bookings" })}>
          <Text style={[styles.secondaryBtnText, styles.secondaryBtnTextDark]}>Manage Schedule</Text>
        </Pressable>

        <Pressable style={[styles.secondaryBtn, styles.secondaryBtnDark]} onPress={() => void onCallSupport()}>
          <Text style={[styles.secondaryBtnText, styles.secondaryBtnTextDark]}>Call Support</Text>
        </Pressable>
      </ScrollView>
    </BookingStageShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: spacing.xl },
  card: {
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    borderRadius: radii.lg,
    backgroundColor: COLORS.white,
    padding: spacing.md + 2,
    gap: 10,
    ...shadows.sm,
  },
  cardDark: {
    borderColor: COLORS.goldSoft,
    backgroundColor: COLORS.navyDark,
  },
  successRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.xl + 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.offWhite,
  },
  iconWrapDark: {
    backgroundColor: "rgba(217,164,65,0.16)",
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
  },
  successTextWrap: { flex: 1 },
  successTitle: { color: bookingTheme.colors.textPrimary, fontSize: 16, fontWeight: "900" },
  successSub: { color: COLORS.slate600, fontSize: 12, fontWeight: "700", marginTop: 2 },
  line: { height: 1, backgroundColor: COLORS.borderSoft, marginVertical: 2 },
  lineDark: { backgroundColor: "rgba(217,164,65,0.35)" },
  row: { gap: 2, paddingVertical: 2 },
  label: { color: COLORS.slate500, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.3 },
  value: { color: bookingTheme.colors.textPrimary, fontSize: 13, fontWeight: "700" },
  textDarkPrimary: { color: COLORS.white },
  textDarkSecondary: { color: COLORS.neutral100 },
  textDarkLabel: { color: COLORS.goldSoft },
  timelineCard: {
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    borderRadius: radii.lg,
    backgroundColor: COLORS.white,
    padding: spacing.md + 2,
    gap: 12,
    ...shadows.sm,
  },
  timelineTitle: { color: bookingTheme.colors.textPrimary, fontSize: 15, fontWeight: "900" },
  timelineRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.slate300,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineDotDark: {
    borderColor: COLORS.goldSoft,
    backgroundColor: "rgba(217,164,65,0.08)",
  },
  timelineDotActive: { borderColor: COLORS.green600, backgroundColor: COLORS.green600 },
  timelineLabel: { color: COLORS.slate500, fontSize: 12, fontWeight: "700" },
  timelineLabelActive: { color: bookingTheme.colors.textPrimary },
  timelineLabelActiveDark: { color: COLORS.white },
  primaryBtn: { marginTop: spacing.md, backgroundColor: bookingTheme.colors.primaryBtn, borderRadius: radii.md, paddingVertical: spacing.md + 1, alignItems: "center", ...shadows.sm },
  primaryBtnText: { color: bookingTheme.colors.primaryBtnText, fontSize: 14, fontWeight: "900", letterSpacing: 0.2 },
  primaryBtnDark: {
    backgroundColor: COLORS.gold,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
  },
  primaryBtnTextDark: { color: COLORS.navyDark },
  secondaryBtn: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: COLORS.blue400,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    backgroundColor: COLORS.offWhite,
  },
  secondaryBtnText: { color: COLORS.blue600, fontSize: 13, fontWeight: "800" },
  secondaryBtnDark: {
    borderColor: COLORS.goldSoft,
    backgroundColor: COLORS.navyDark,
  },
  secondaryBtnTextDark: { color: COLORS.goldSoft },
});
