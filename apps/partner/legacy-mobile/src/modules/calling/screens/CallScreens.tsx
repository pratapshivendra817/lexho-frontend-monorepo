import React, { useEffect } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

import { useAppSelector } from "../../../hooks/useRedux";
import { CallControls } from "../components/CallControls";
import { CallTimer } from "../components/CallTimer";
import { useCallLifecycle } from "../hooks/useCallLifecycle";
import { useWebRTCCall } from "../hooks/useWebRTCCall";

const CALL_SCREEN_COPY = {
  unknownCaller: "Unknown caller",
  noLongerAvailable: "Call no longer available",
  incomingAudioCall: "Incoming audio call",
  decline: "Decline",
  accept: "Accept",
  customer: "Customer",
  ringing: "Ringing",
  calling: "Calling...",
  cancel: "Cancel",
  audioCall: "Audio call",
  reconnecting: "Reconnecting...",
  connected: "Connected",
  callEnded: "Call ended",
  userBusy: "User is busy",
  connectionFailed: "Connection failed",
  close: "Close",
} as const;

const Shell = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) => (
  <SafeAreaView style={styles.root}>
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{title.slice(0, 1).toUpperCase()}</Text>
    </View>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>{subtitle}</Text>
    <View style={styles.controls}>{children}</View>
  </SafeAreaView>
);

export function IncomingCallScreen({ navigation }: any) {
  const { call, accept, reject } = useWebRTCCall();

  if (!call) {
    return (
      <Shell
        title={CALL_SCREEN_COPY.unknownCaller}
        subtitle={CALL_SCREEN_COPY.noLongerAvailable}
      />
    );
  }

  return (
    <Shell title={call.participant.name} subtitle={CALL_SCREEN_COPY.incomingAudioCall}>
      <View style={styles.row}>
        <Pressable style={[styles.action, styles.reject]} onPress={() => void reject().finally(() => navigation.goBack())}>
          <Text style={styles.actionText}>{CALL_SCREEN_COPY.decline}</Text>
        </Pressable>
        <Pressable style={[styles.action, styles.accept]} onPress={() => void accept().then(() => navigation.replace("ActiveCall")).catch(() => null)}>
          <Text style={styles.actionText}>{CALL_SCREEN_COPY.accept}</Text>
        </Pressable>
      </View>
    </Shell>
  );
}

export function OutgoingCallScreen({ route, navigation }: any) {
  const { call, start, end } = useWebRTCCall();

  useEffect(() => {
    if (!call) {
      void start(Number(route.params.orderId ?? route.params.bookingId), route.params.customerName).catch(() => navigation.replace("MissedCall"));
    }
  }, [call, navigation, route.params, start]);

  useEffect(() => {
    if (call?.status === "connected") navigation.replace("ActiveCall");
  }, [call?.status, navigation]);

  return (
    <Shell
      title={call?.participant.name ?? route.params.customerName ?? CALL_SCREEN_COPY.customer}
      subtitle={call?.status === "ringing" ? CALL_SCREEN_COPY.ringing : CALL_SCREEN_COPY.calling}
    >
      <Pressable style={[styles.action, styles.reject]} onPress={() => void end().finally(() => navigation.goBack())}>
        <Text style={styles.actionText}>{CALL_SCREEN_COPY.cancel}</Text>
      </Pressable>
    </Shell>
  );
}

export function ActiveCallScreen({ navigation }: any) {
  useCallLifecycle();
  const seconds = useAppSelector((state) => state.calling.durationSeconds);
  const { call, muted, speaker, toggleMute, toggleSpeaker, end } = useWebRTCCall();

  useEffect(() => {
    if (call && ["ended", "failed", "busy", "missed"].includes(call.status)) navigation.replace("MissedCall");
  }, [call, navigation]);

  return (
    <Shell title={call?.participant.name ?? CALL_SCREEN_COPY.audioCall} subtitle={call?.status === "reconnecting" ? CALL_SCREEN_COPY.reconnecting : CALL_SCREEN_COPY.connected}>
      <CallTimer seconds={seconds} />
      <CallControls muted={muted} speaker={speaker} onMute={toggleMute} onSpeaker={toggleSpeaker} onEnd={() => void end().finally(() => navigation.goBack())} />
    </Shell>
  );
}

export function MissedCallScreen({ navigation }: any) {
  const call = useAppSelector((state) => state.calling.current);

  return (
    <Shell
      title={call?.participant.name ?? CALL_SCREEN_COPY.callEnded}
      subtitle={call?.status === "busy" ? CALL_SCREEN_COPY.userBusy : call?.status === "failed" ? CALL_SCREEN_COPY.connectionFailed : CALL_SCREEN_COPY.callEnded}
    >
      <Pressable style={styles.secondary} onPress={() => navigation.goBack()}>
        <Text style={styles.secondaryText}>{CALL_SCREEN_COPY.close}</Text>
      </Pressable>
    </Shell>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#07162F", alignItems: "center", justifyContent: "center", padding: 24 },
  avatar: { width: 112, height: 112, borderRadius: 56, backgroundColor: "#C9A227", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#07162F", fontSize: 42, fontWeight: "800" },
  title: { color: "#FFFFFF", fontSize: 28, fontWeight: "800", marginTop: 24 },
  subtitle: { color: "#B7C2D3", fontSize: 16, marginTop: 8 },
  controls: { position: "absolute", bottom: 72, alignItems: "center", gap: 24 },
  row: { flexDirection: "row", gap: 40 },
  action: { minWidth: 112, padding: 16, borderRadius: 32, alignItems: "center" },
  reject: { backgroundColor: "#C83D4D" },
  accept: { backgroundColor: "#2E9B63" },
  actionText: { color: "#FFFFFF", fontWeight: "800" },
  secondary: { paddingHorizontal: 30, paddingVertical: 14, borderRadius: 24, borderWidth: 1, borderColor: "#C9A227" },
  secondaryText: { color: "#C9A227", fontWeight: "700" },
});
