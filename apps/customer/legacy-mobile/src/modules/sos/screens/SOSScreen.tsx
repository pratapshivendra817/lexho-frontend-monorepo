import React, { useCallback, useEffect, useRef, useState } from "react";
import { Linking, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { Button } from "react-native-paper";
import { captureSOSLocation, watchSOSLocation } from "../services/SOSLocationService";
import { sendSOSEvent } from "../services/SOSApiService";
import type { SOSLocation } from "../types";

const EMERGENCY_NUMBER = "112";
let nextSosEventId = 0;
const eventId = () => {
  nextSosEventId += 1;
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `sos-${globalThis.crypto.randomUUID()}`;
  }
  return `sos-${Date.now()}-${nextSosEventId}`;
};
export function SOSScreen({ route, navigation }: any) {
  const [status, setStatus] = useState<"ready" | "locating" | "sent" | "queued" | "failed">("ready");
  const [location, setLocation] = useState<SOSLocation | null>(null);
  const [message, setMessage] = useState("Press send to capture and share your current location.");
  const activeId = useRef<string | null>(null);
  const stopWatch = useRef<null | (() => void)>(null);
  const activating = useRef(false);
  const autoStarted = useRef(false);

  const activate = useCallback(async () => {
    if (activating.current) return;
    activating.current = true;
    setStatus("locating"); setMessage("Capturing high-accuracy GPS location...");
    try {
      const current = await captureSOSLocation();
      const id = eventId(); activeId.current = id; setLocation(current);
      const result = await sendSOSEvent({ eventId: id, eventType: "ACTIVATE", location: current, createdAt: new Date().toISOString() });
      setStatus(result.queued ? "queued" : "sent"); setMessage(result.queued ? "You are offline. SOS is safely queued and will send automatically." : "SOS sent. Live location sharing is active.");
      stopWatch.current = await watchSOSLocation(next => { setLocation(next); void sendSOSEvent({ eventId: id, eventType: "LOCATION_UPDATE", location: next, createdAt: new Date().toISOString() }); }, error => setMessage(error.message));
    } catch (error) { setStatus("failed"); setMessage(error instanceof Error ? error.message : "Unable to send SOS"); } finally { activating.current = false; }
  }, []);

  useEffect(() => { if (route?.params?.autoActivate && !autoStarted.current) { autoStarted.current = true; void activate(); } return () => stopWatch.current?.(); }, [activate, route?.params?.autoActivate]);
  return <SafeAreaView style={styles.root}><View style={styles.badge}><Text style={styles.badgeText}>SOS</Text></View><Text style={styles.title}>Emergency Assistance</Text><Text style={styles.status}>{message}</Text>{location ? <View style={styles.location}><Text style={styles.locationTitle}>Current GPS</Text><Text>{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</Text><Text>Accuracy: {location.accuracy == null ? "N/A" : `${Math.round(location.accuracy)} m`}</Text></View> : null}<Button mode="contained" buttonColor="#C62828" loading={status === "locating"} disabled={status === "locating"} onPress={() => void activate()} style={styles.button}>Send SOS Now</Button><Button mode="outlined" textColor="#C62828" onPress={() => void Linking.openURL(`tel:${EMERGENCY_NUMBER}`)} style={styles.button}>Call Emergency {EMERGENCY_NUMBER}</Button><Button mode="text" onPress={() => navigation.navigate("EmergencyContacts")}>Manage Emergency Contacts</Button></SafeAreaView>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: "#FFF7F7", alignItems: "center", padding: 24 }, badge: { width: 110, height: 110, borderRadius: 55, marginTop: 40, backgroundColor: "#C62828", alignItems: "center", justifyContent: "center" }, badgeText: { color: "#FFFFFF", fontSize: 34, fontWeight: "900" }, title: { fontSize: 26, fontWeight: "900", color: "#271D1D", marginTop: 20 }, status: { color: "#5D4B4B", textAlign: "center", lineHeight: 21, marginVertical: 14 }, location: { width: "100%", padding: 16, borderRadius: 14, backgroundColor: "#FFFFFF", marginBottom: 16 }, locationTitle: { fontWeight: "800", marginBottom: 5 }, button: { width: "100%", marginBottom: 12 } });
