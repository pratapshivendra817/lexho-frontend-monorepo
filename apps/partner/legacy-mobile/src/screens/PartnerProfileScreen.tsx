import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../constants/colors";
import { getAdminProfile } from "../utils/storage";

type Props = {
  onLogout: () => Promise<void>;
};

export default function PartnerProfileScreen({ onLogout }: Props) {
  const [email, setEmail] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const profile = await getAdminProfile();
      if (active) {
        setEmail(profile?.email || "");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await onLogout();
    } catch {
      // Keep the user on the screen and restore the button if logout fails.
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Partner Profile</Text>
        <Text testID="partner-profile-email" style={styles.subtitle}>{email || "Logged in partner"}</Text>
        <TouchableOpacity testID="partner-profile-logout-button" style={styles.logoutBtn} onPress={handleLogout} disabled={loggingOut}>
          {loggingOut ? <ActivityIndicator testID="partner-profile-logout-spinner" color={COLORS.white} /> : <Text style={styles.logoutText}>Logout</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, padding: 16, justifyContent: "center" },
  title: { color: COLORS.textPrimary, fontSize: 24, fontWeight: "800" },
  subtitle: { color: COLORS.textSecondary, marginTop: 8, marginBottom: 16 },
  logoutBtn: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  logoutText: { color: COLORS.white, fontWeight: "700" },
});
