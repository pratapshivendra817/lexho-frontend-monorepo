import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../constants/colors";
import { useAppDispatch, useAppSelector } from "../../hooks/useRedux";
import { clearCurrentCall, hangUpCall, setCallMuted, setCallSpeaker, startOutgoingCall } from "../../redux/slices/callSlice";
import { CallControls } from "./CallControls";

const OUTGOING_CALL_COPY = {
  customer: "Customer",
  orderCall: "Order call",
  callingCustomer: "Calling customer",
  order: "Order",
} as const;

export default function OutgoingCallScreen({ route, navigation }: any) {
  const orderId = Number(route?.params?.orderId);
  const customerName = String(route?.params?.customerName ?? OUTGOING_CALL_COPY.customer);
  const dispatch = useAppDispatch();
  const { current, muted, speaker, loading, error } = useAppSelector(state => state.calls);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!current && orderId) dispatch(startOutgoingCall(orderId));
  }, [current, dispatch, orderId]);

  useEffect(() => {
    if (current?.status !== "active") return;
    const timer = setInterval(() => setDuration(value => value + 1), 1000);
    return () => clearInterval(timer);
  }, [current?.status]);

  useEffect(() => {
    if (current && ["ended", "failed", "missed"].includes(current.status)) {
      const timer = setTimeout(() => {
        dispatch(clearCurrentCall());
        navigation.goBack();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [current, dispatch, navigation]);

  const end = () => dispatch(hangUpCall("HANGUP")).finally(() => {
    dispatch(clearCurrentCall());
    navigation.goBack();
  });
  const displayName = current?.customerName || customerName;
  const rawStatus = current?.status ?? (loading ? "connecting" : "failed");
  const status = current?.status === "active" ? formatDuration(duration) : rawStatus;

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>{current?.direction === "incoming" ? OUTGOING_CALL_COPY.orderCall : OUTGOING_CALL_COPY.callingCustomer}</Text>
      <View style={styles.avatar}><Text style={styles.avatarText}>{displayName.slice(0, 1).toUpperCase()}</Text></View>
      <Text style={styles.name}>{displayName}</Text>
      <Text style={styles.order}>{`${OUTGOING_CALL_COPY.order} #${current?.orderId ?? orderId}`}</Text>
      <View style={styles.statusRow}>
        {loading ? <ActivityIndicator color={COLORS.secondary} size="small" /> : null}
        <Text style={styles.status}>{status}</Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.controls}>
        <CallControls
          muted={muted}
          speaker={speaker}
          onMute={() => dispatch(setCallMuted(!muted))}
          onSpeaker={() => dispatch(setCallSpeaker(!speaker))}
          onEnd={end}
        />
      </View>
    </View>
  );
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center", padding: 24 },
  eyebrow: { color: COLORS.accent, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1, marginBottom: 28 },
  avatar: { width: 124, height: 124, borderRadius: 62, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surfaceElevated, borderWidth: 2, borderColor: COLORS.border },
  avatarText: { color: COLORS.secondary, fontSize: 48, fontWeight: "900" },
  name: { color: COLORS.textPrimary, fontSize: 28, fontWeight: "900", marginTop: 20 },
  order: { color: COLORS.textSecondary, marginTop: 5 },
  statusRow: { minHeight: 26, flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 },
  status: { color: COLORS.textMuted, textTransform: "capitalize" },
  error: { color: COLORS.danger, marginTop: 10, textAlign: "center" },
  controls: { marginTop: 80 },
});
