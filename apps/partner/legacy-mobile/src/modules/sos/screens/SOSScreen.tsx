import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Platform, SafeAreaView, ScrollView, StyleSheet, Text, ToastAndroid, View } from "react-native";
import { Button, TextInput } from "react-native-paper";
import { COLORS } from "../../../constants/colors";
import PaymentHeader from "../../../components/payments/PaymentHeader";
import { captureSOSLocation, resolveSOSAddress } from "../services/SOSLocationService";
import { triggerSOS } from "../services/SOSApiService";
import type { SOSLocation } from "../types";

export function SOSScreen({ route, navigation }: any) {
  const [status, setStatus] = useState<"ready" | "locating" | "sent" | "queued" | "failed">("ready");
  const [location, setLocation] = useState<SOSLocation | null>(null);
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState("Capture your current location and alert the admin team.");
  const activating = useRef(false);
  const autoStarted = useRef(false);

  const activate = useCallback(async () => {
    if (activating.current) return;
    activating.current = true;
    setStatus("locating");
    setFeedback("Capturing high-accuracy GPS location...");
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
        setFeedback("You are offline. SOS is queued and will alert the admin team automatically when connectivity returns.");
      } else {
        setStatus("sent");
        setFeedback("SOS alert sent to admin team.\nYour live location has been shared.\nOur admin team will review and take necessary action.");
        if (Platform.OS === "android") ToastAndroid.show("SOS sent. Admin team has been alerted.", ToastAndroid.LONG);
        else Alert.alert("SOS sent", "Admin team has been alerted.");
      }
    } catch (error) {
      setStatus("failed");
      setFeedback(error instanceof Error ? error.message : "Unable to send SOS");
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
        <PaymentHeader title="Emergency Assistance" onBack={() => navigation.goBack()} />
        <View style={styles.badge}><Text style={styles.badgeText}>SOS</Text></View>
        <Text style={styles.adminOnly}>Admin escalation only</Text>
        <View style={[styles.feedbackPill, status === "sent" && styles.feedbackPillSuccess, status === "queued" && styles.feedbackPillQueued, status === "failed" && styles.feedbackPillFailed]}>
          <Text style={[styles.feedbackPillText, status === "sent" && styles.feedbackPillSuccessText, status === "queued" && styles.feedbackPillQueuedText, status === "failed" && styles.feedbackPillFailedText]}>
            {status === "sent" ? "ADMIN ALERTED" : status === "queued" ? "QUEUED" : status === "failed" ? "RETRY NEEDED" : status === "locating" ? "CAPTURING LOCATION" : "READY"}
          </Text>
        </View>
        <Text style={styles.status}>{feedback}</Text>
        {location ? (
          <View style={[styles.fullBleed, styles.location]}>
            <Text style={styles.locationTitle}>Location captured successfully</Text>
            <Text style={styles.locationValue}>{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</Text>
            <Text style={styles.locationMeta}>Accuracy: {location.accuracy == null ? "N/A" : `${Math.round(location.accuracy)} m`}</Text>
          </View>
        ) : null}
        <TextInput label="Optional message" value={message} onChangeText={setMessage} mode="outlined" multiline maxLength={500} style={[styles.fullBleed, styles.input]} textColor={COLORS.textPrimary} outlineColor={COLORS.accent} activeOutlineColor={COLORS.accent} theme={{ colors: { onSurfaceVariant: COLORS.accent, primary: COLORS.accent, background: COLORS.surface } }} />
        <Button mode="contained" buttonColor={status === "sent" ? COLORS.surfaceElevated : "#C62828"} loading={status === "locating"} disabled={status === "locating" || status === "sent"} onPress={() => void activate()} style={[styles.fullBleed, styles.button, status === "locating" && styles.buttonDisabled, status === "sent" && styles.buttonSent]} contentStyle={styles.buttonContent} labelStyle={[styles.primaryButtonLabel, status === "sent" && styles.sentButtonLabel]}>
          {status === "sent" ? "SOS Sent" : "Send SOS Now"}
        </Button>
        <Button mode="outlined" textColor={COLORS.accent} onPress={() => navigation.navigate("SOSHistory")} style={[styles.fullBleed, styles.outlineButton]} contentStyle={styles.buttonContent} labelStyle={styles.outlineButtonLabel}>View SOS History</Button>
        <Button mode="outlined" textColor={COLORS.accent} onPress={() => navigation.navigate("EmergencyContacts")} style={[styles.fullBleed, styles.outlineButton]} contentStyle={styles.buttonContent} labelStyle={styles.outlineButtonLabel}>Manage Emergency Contacts</Button>
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
