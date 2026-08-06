import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { COLORS } from "../../constants/colors";
import { useAppDispatch, useAppSelector } from "../../hooks/useRedux";
import { acceptIncomingCall, clearCurrentCall, rejectIncomingCall, timeoutIncomingCall } from "../../redux/slices/callSlice";

const RING_SECONDS = 30;

export default function IncomingCallScreen({ navigation }: any) {
  const dispatch = useAppDispatch();
  const { current, offerSdp, loading, error } = useAppSelector(state => state.calls);
  const [seconds, setSeconds] = useState(() => {
    const expiresAt = Date.parse(String(current?.expiresAt ?? ""));
    return Number.isFinite(expiresAt) ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)) : RING_SECONDS;
  });

  useEffect(() => {
    if (!current || current.status !== "ringing") return;
    const timer = setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [current]);

  useEffect(() => {
    if (seconds > 0 || !current) return;
    dispatch(timeoutIncomingCall()).finally(() => navigation.goBack());
  }, [current, dispatch, navigation, seconds]);

  useEffect(() => {
    if (current?.status === "active") navigation.replace("OutgoingCall", { callId: current.callId, orderId: current.orderId });
  }, [current, navigation]);

  const decline = () => dispatch(rejectIncomingCall("DECLINED")).finally(() => {
    dispatch(clearCurrentCall());
    navigation.goBack();
  });

  if (!current) return <View style={styles.container}><Text style={styles.status}>Call is no longer available.</Text></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>Incoming order call</Text>
      <View style={styles.avatar}><Text style={styles.avatarText}>{current.customerName.slice(0, 1).toUpperCase()}</Text></View>
      <Text style={styles.name}>{current.customerName}</Text>
      <Text style={styles.order}>{`Order #${current.orderId}`}</Text>
      <Text style={styles.status}>{offerSdp ? `Ringing • ${seconds}s` : "Connecting secure call..."}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.action, styles.decline]} onPress={decline} accessibilityLabel="Decline call">
          <MaterialCommunityIcons name="phone-hangup" size={30} color={COLORS.white} />
          <Text style={styles.actionLabel}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.action, styles.accept, (!offerSdp || loading) && styles.disabled]}
          disabled={!offerSdp || loading}
          onPress={() => dispatch(acceptIncomingCall())}
          accessibilityLabel="Accept call"
        >
          {loading ? <ActivityIndicator color={COLORS.background} /> : <MaterialCommunityIcons name="phone" size={30} color={COLORS.background} />}
          <Text style={[styles.actionLabel, styles.acceptLabel]}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center", padding: 24 },
  eyebrow: { color: COLORS.accent, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1, marginBottom: 28 },
  avatar: { width: 118, height: 118, borderRadius: 59, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surfaceElevated, borderWidth: 2, borderColor: COLORS.border },
  avatarText: { color: COLORS.secondary, fontSize: 46, fontWeight: "900" },
  name: { color: COLORS.textPrimary, fontSize: 28, fontWeight: "900", marginTop: 20 },
  order: { color: COLORS.textSecondary, fontSize: 15, marginTop: 5 },
  status: { color: COLORS.textMuted, marginTop: 12 },
  error: { color: COLORS.danger, marginTop: 10, textAlign: "center" },
  actions: { flexDirection: "row", gap: 50, marginTop: 70 },
  action: { width: 82, height: 82, borderRadius: 41, alignItems: "center", justifyContent: "center", gap: 2 },
  decline: { backgroundColor: COLORS.danger },
  accept: { backgroundColor: COLORS.success },
  disabled: { opacity: 0.45 },
  actionLabel: { color: COLORS.white, fontSize: 11, fontWeight: "800" },
  acceptLabel: { color: COLORS.background },
});
