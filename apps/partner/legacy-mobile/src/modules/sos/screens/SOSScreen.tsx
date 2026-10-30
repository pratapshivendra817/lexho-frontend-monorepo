import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, ToastAndroid, View } from "react-native";
import { Button, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../../constants/colors";
import PaymentHeader from "../../../components/payments/PaymentHeader";
import { captureSOSLocation, resolveSOSAddress } from "../services/SOSLocationService";
import { triggerSOS } from "../services/SOSApiService";
import type { SOSLocation } from "../types";

const SOS_COPY = {
  title: "Emergency SOS",
  captureFeedback: "Share your current location and send an SOS alert.",
  capturingLocation: "Capturing your current location...",
  queuedFeedback: "You are offline. Your SOS has been queued and will be sent automatically when the internet is back.",
  sentFeedback: "Your SOS alert has been sent successfully.\nYour current location has also been shared.",
  sentToast: "SOS sent successfully.",
  sentTitle: "SOS sent",
  sentAlertBody: "Your SOS alert has been sent successfully.",
  sendError: "Unable to send SOS",
  emergencyHelp: "Emergency help",
  sosSent: "SOS SENT",
  queued: "QUEUED",
  tryAgain: "TRY AGAIN",
  gettingLocation: "GETTING LOCATION",
  ready: "READY",
  locationCaptured: "Location captured",
  accuracy: "Accuracy",
  na: "N/A",
  optionalMessage: "Add a message (optional)",
  sendSosAgain: "Send SOS Again",
  sendNow: "Send SOS",
  viewHistory: "SOS History",
  manageContacts: "Emergency Contacts",
} as const;

export function SOSScreen({ route, navigation }: any) {
  const [status, setStatus] = useState<"ready" | "locating" | "sent" | "queued" | "failed">("ready");
  const [location, setLocation] = useState<SOSLocation | null>(null);
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState<string>(SOS_COPY.captureFeedback);
  const activating = useRef(false);
  const autoStarted = useRef(false);

  const activate = useCallback(async () => {
    if (activating.current) return;
    activating.current = true;
    setStatus("locating");
    setFeedback(SOS_COPY.capturingLocation);
    try {
      const current = await captureSOSLocation();
      setLocation(current);
      const address = await resolveSOSAddress(current);
      const result = await triggerSOS({
        latitude: current.latitude,
        longitude: current.longitude,
        accuracyMeters: current.accuracy,
        address,
        message: message.trim() || undefined,
      });
      if (result.queued) {
        setStatus("queued");
        setFeedback(SOS_COPY.queuedFeedback);
      } else {
        setStatus("sent");
        setFeedback(SOS_COPY.sentFeedback);
        if (Platform.OS === "android") ToastAndroid.show(SOS_COPY.sentToast, ToastAndroid.LONG);
        else Alert.alert(SOS_COPY.sentTitle, SOS_COPY.sentAlertBody);
      }
    } catch (error) {
      setStatus("failed");
      setFeedback(error instanceof Error ? error.message : SOS_COPY.sendError);
    } finally {
      activating.current = false;
    }
  }, [message]);

  useEffect(() => {
    if (route?.params?.autoActivate && !autoStarted.current) {
      autoStarted.current = true;
      void activate();
    }
  }, [activate, route?.params?.autoActivate]);

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <PaymentHeader title={SOS_COPY.title} onBack={() => navigation.goBack()} />
        <View style={styles.badge}><Text style={styles.badgeText}>SOS</Text></View>
        <Text style={styles.adminOnly}>{SOS_COPY.emergencyHelp}</Text>
        <View style={[styles.feedbackPill, status === "sent" && styles.feedbackPillSuccess, status === "queued" && styles.feedbackPillQueued, status === "failed" && styles.feedbackPillFailed]}>
          <Text style={[styles.feedbackPillText, status === "sent" && styles.feedbackPillSuccessText, status === "queued" && styles.feedbackPillQueuedText, status === "failed" && styles.feedbackPillFailedText]}>
            {status === "sent" ? SOS_COPY.sosSent : status === "queued" ? SOS_COPY.queued : status === "failed" ? SOS_COPY.tryAgain : status === "locating" ? SOS_COPY.gettingLocation : SOS_COPY.ready}
          </Text>
        </View>
        <Text style={styles.status}>{feedback}</Text>
        {location ? (
          <View style={[styles.fullBleed, styles.location]}>
            <Text style={styles.locationTitle}>{SOS_COPY.locationCaptured}</Text>
            <Text style={styles.locationValue}>{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</Text>
            <Text style={styles.locationMeta}>{`${SOS_COPY.accuracy}: ${location.accuracy == null ? SOS_COPY.na : `${Math.round(location.accuracy)} m`}`}</Text>
          </View>
        ) : null}
        <TextInput label={SOS_COPY.optionalMessage} value={message} onChangeText={setMessage} mode="outlined" multiline maxLength={500} style={[styles.fullBleed, styles.input]} textColor={COLORS.textPrimary} outlineColor={COLORS.accent} activeOutlineColor={COLORS.accent} theme={{ colors: { onSurfaceVariant: COLORS.accent, primary: COLORS.accent, background: COLORS.surface } }} />
        <Button mode="contained" buttonColor={status === "sent" ? COLORS.surfaceElevated : "#C62828"} loading={status === "locating"} disabled={status === "locating"} onPress={() => void activate()} style={[styles.fullBleed, styles.button, status === "locating" && styles.buttonDisabled, status === "sent" && styles.buttonSent]} contentStyle={styles.buttonContent} labelStyle={[styles.primaryButtonLabel, status === "sent" && styles.sentButtonLabel]}>
          {status === "sent" ? SOS_COPY.sendSosAgain : SOS_COPY.sendNow}
        </Button>
        <Button mode="outlined" textColor={COLORS.accent} onPress={() => navigation.navigate("SOSHistory")} style={[styles.fullBleed, styles.outlineButton]} contentStyle={styles.buttonContent} labelStyle={styles.outlineButtonLabel}>{SOS_COPY.viewHistory}</Button>
        <Button mode="outlined" textColor={COLORS.accent} onPress={() => navigation.navigate("EmergencyContacts")} style={[styles.fullBleed, styles.outlineButton]} contentStyle={styles.buttonContent} labelStyle={styles.outlineButtonLabel}>{SOS_COPY.manageContacts}</Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { alignItems: "center", padding: 18, paddingBottom: 32 },
  fullBleed: {
    alignSelf: "stretch",
    marginHorizontal: -18,
  },
  badge: {
    width: 110,
    height: 110,
    borderRadius: 55,
    marginTop: 18,
    backgroundColor: "#C62828",
    borderWidth: 2,
    borderColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#FFFFFF", fontSize: 34, fontWeight: "900" },
  adminOnly: { color: COLORS.accent, fontWeight: "800", marginTop: 14 },
  feedbackPill: {
    marginTop: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.accent,
    backgroundColor: "rgba(245, 215, 110, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  feedbackPillSuccess: { borderColor: COLORS.success, backgroundColor: "rgba(16, 185, 129, 0.12)" },
  feedbackPillQueued: { borderColor: "#D18C1D", backgroundColor: "rgba(209, 140, 29, 0.12)" },
  feedbackPillFailed: { borderColor: COLORS.error, backgroundColor: "rgba(239, 68, 68, 0.12)" },
  feedbackPillText: { color: COLORS.accent, fontWeight: "900", fontSize: 11, letterSpacing: 0.3 },
  feedbackPillSuccessText: { color: COLORS.success },
  feedbackPillQueuedText: { color: "#D9A441" },
  feedbackPillFailedText: { color: COLORS.error },
  status: { color: COLORS.textSecondary, textAlign: "center", lineHeight: 28, marginTop: 14, marginBottom: 16, fontSize: 16 },
  location: {
    width: "auto",
    padding: 16,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    marginBottom: 16,
  },
  locationTitle: { fontWeight: "900", marginBottom: 8, color: COLORS.accent, fontSize: 16 },
  locationValue: { color: COLORS.textPrimary, fontSize: 15, fontWeight: "700" },
  locationMeta: { color: COLORS.textSecondary, fontSize: 14, marginTop: 4 },
  input: { width: "auto", marginBottom: 16, backgroundColor: COLORS.surface },
  button: { width: "auto", marginBottom: 12, borderRadius: 16, overflow: "hidden" },
  buttonSent: {
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    backgroundColor: COLORS.surfaceElevated,
  },
  buttonDisabled: { opacity: 0.72 },
  outlineButton: {
    width: "auto",
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    backgroundColor: COLORS.surface,
  },
  buttonContent: { minHeight: 54 },
  primaryButtonLabel: { fontWeight: "900", fontSize: 16, letterSpacing: 0.2 },
  sentButtonLabel: { color: COLORS.accent },
  outlineButtonLabel: { fontWeight: "900", fontSize: 16 },
});
