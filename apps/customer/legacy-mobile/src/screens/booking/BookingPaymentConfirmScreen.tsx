import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { Text } from "react-native-paper";
import { BookingStageShell } from "../../components/booking/BookingStageShell";
import { bookingTheme } from "../../components/booking/bookingTheme";
import { useInstantBookingLifecycle } from "../../hooks/useInstantBookingLifecycle";

type BookingPaymentConfirmRoute = { params?: { bookingId?: string } };
const SUPPORT_NUMBER = "+917999700475";

function formatDateTime(value?: string) {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) return raw;
  return parsed.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function BookingPaymentConfirmScreen({ route, navigation }: { route: BookingPaymentConfirmRoute; navigation: any }) {
  const bookingId = String(route?.params?.bookingId ?? "").trim();
  const bookingQuery = useInstantBookingLifecycle(bookingId);
  const details = bookingQuery.data;
  const bookingType = String(details?.bookingType ?? "").toUpperCase();

  const goNext = () => {
    if (!bookingId) return;
    if (bookingType === "INSTANT") {
      navigation.replace("InstantBookingStatus", { bookingId });
      return;
    }
    navigation.replace("ScheduledBookingStatus", { bookingId });
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
    <BookingStageShell title="Booking Confirmed" subtitle="Payment received successfully. Your booking is now confirmed.">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.successRow}>
            <View style={styles.iconWrap}>
              <MaterialCommunityIcon name="check-circle" size={26} color="#16A34A" />
            </View>
            <View style={styles.successTextWrap}>
              <Text style={styles.successTitle}>Payment Successful</Text>
              <Text style={styles.successSub}>Booking ID: {(details?.id ?? bookingId) || "-"}</Text>
            </View>
          </View>
          <View style={styles.line} />

          <View style={styles.row}><Text style={styles.label}>Service</Text><Text style={styles.value}>{details?.serviceName ?? "-"}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Booking Type</Text><Text style={styles.value}>{bookingType || "-"}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Scheduled At</Text><Text style={styles.value}>{formatDateTime(details?.scheduledAt)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Address</Text><Text style={styles.value}>{details?.fullAddress ?? details?.address ?? "-"}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Amount Paid</Text><Text style={styles.value}>Rs {details?.totalAmount ?? details?.amount ?? "-"}</Text></View>
        </View>

        <Pressable style={styles.primaryBtn} onPress={goNext} disabled={!bookingId}>
          <Text style={styles.primaryBtnText}>Track Booking</Text>
        </Pressable>

        <Pressable style={styles.secondaryBtn} onPress={() => void onCallSupport()}>
          <Text style={styles.secondaryBtnText}>Call Support</Text>
        </Pressable>

        <Pressable style={styles.ghostBtn} onPress={() => navigation.navigate("Support")}>
          <Text style={styles.ghostBtnText}>Open Support Tickets</Text>
        </Pressable>
      </ScrollView>
    </BookingStageShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 20 },
  card: {
    borderWidth: 1,
    borderColor: "#D7E2F0",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    padding: 14,
    gap: 10,
  },
  successRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DCFCE7",
  },
  successTextWrap: { flex: 1 },
  successTitle: { color: bookingTheme.colors.textPrimary, fontSize: 16, fontWeight: "900" },
  successSub: { color: "#475569", fontSize: 12, fontWeight: "700", marginTop: 2 },
  line: { height: 1, backgroundColor: "#E2E8F0", marginVertical: 2 },
  row: { gap: 2, paddingVertical: 2 },
  label: { color: "#6B7B92", fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.3 },
  value: { color: bookingTheme.colors.textPrimary, fontSize: 13, fontWeight: "700" },
  primaryBtn: {
    marginTop: 12,
    backgroundColor: bookingTheme.colors.primaryBtn,
    borderRadius: bookingTheme.radius.button,
    paddingVertical: 13,
    alignItems: "center",
  },
  primaryBtnText: { color: bookingTheme.colors.primaryBtnText, fontSize: 14, fontWeight: "900", letterSpacing: 0.2 },
  secondaryBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: bookingTheme.radius.button,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#EFF6FF",
  },
  secondaryBtnText: { color: "#1D4ED8", fontSize: 13, fontWeight: "800" },
  ghostBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: bookingTheme.radius.button,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  ghostBtnText: { color: "#334155", fontSize: 13, fontWeight: "700" },
});
