import React from "react";
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { APP_CONFIG } from "../../constants/app";
import { COLORS } from "../../constants/colors";

export default function SupportScreen({ onLogout }: { onLogout?: () => Promise<void> | void }) {
  const handleLogout = async () => {
    if (!onLogout) return;
    try {
      await onLogout();
    } catch (error: any) {
      Alert.alert("Logout failed", error?.message ?? "Please try again.");
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.background }} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Support</Text>
      <Card title="FAQ" body="Find answers for payments, cancellations, and service start issues." />
      <Card title="Raise Ticket" body="Open a support ticket from upcoming backend ticket API integration." />
      <Card title="Contact Support" body={`${APP_CONFIG.supportPhone}\n${APP_CONFIG.supportEmail}`} />

      <TouchableOpacity style={styles.btn} onPress={() => Linking.openURL(`tel:${APP_CONFIG.supportPhone.replace(/\s+/g, "")}`)}>
        <Text style={styles.btnText}>Call Support</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={() => Linking.openURL(`mailto:${APP_CONFIG.supportEmail}`)}>
        <Text style={styles.btnText}>Email Support</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btn, styles.logoutBtn]} onPress={() => handleLogout()}>
        <Text style={styles.btnText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10 },
  title: { color: COLORS.textPrimary, fontSize: 24, fontWeight: "800" },
  card: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, backgroundColor: COLORS.surface, padding: 12 },
  cardTitle: { color: COLORS.textPrimary, fontWeight: "700" },
  cardBody: { color: COLORS.textSecondary, marginTop: 4 },
  btn: { borderRadius: 12, backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border, padding: 12, alignItems: "center" },
  logoutBtn: { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
  btnText: { color: COLORS.textPrimary, fontWeight: "700" },
});
