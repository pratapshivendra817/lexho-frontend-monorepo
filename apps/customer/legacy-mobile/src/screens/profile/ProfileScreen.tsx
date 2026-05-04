import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, Text, TextInput } from "react-native-paper";
import { StyleSheet, View } from "react-native";
import { getProfile, updateProfile } from "../../api/userApi";
import { useState } from "react";
import LinearGradient from "react-native-linear-gradient";
import { palette } from "../../constants/theme";

export function ProfileScreen({ navigation }: any) {
  const [name, setName] = useState("");
  const profile = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const update = useMutation({ mutationFn: () => updateProfile({ name: name.trim() }), onSuccess: () => profile.refetch() });
  const profileData = (profile.data ?? {}) as any;

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#0F172A", "#1E293B"]} style={styles.hero}>
        <Text style={styles.heroTitle}>{profileData?.name ?? "Your Profile"}</Text>
        <Text style={styles.heroSub}>{profileData?.mobile ?? "Add phone number for faster bookings"}</Text>
      </LinearGradient>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Profile Details</Text>
        <Text style={styles.fieldText}>Email: {profileData?.email ?? "Not available"}</Text>
        <Text style={styles.fieldText}>City: {profileData?.city ?? "Not set"}</Text>
        <TextInput mode="outlined" label="Update Name" value={name} onChangeText={setName} />
        <Button mode="contained-tonal" onPress={() => update.mutate()} loading={update.isPending} disabled={!name.trim()}>
          Save Name
        </Button>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Quick Actions</Text>
        <Button mode="outlined" onPress={() => navigation.navigate("Address")}>Manage Addresses</Button>
        <Button mode="outlined" onPress={() => navigation.navigate("Subscriptions")}>Subscriptions</Button>
        <Button mode="outlined" onPress={() => navigation.navigate("Referral")}>Referral</Button>
        <Button mode="outlined" onPress={() => navigation.navigate("Support")}>Support</Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, gap: 12, backgroundColor: palette.surfaceAlt },
  hero: { borderRadius: 18, padding: 16 },
  heroTitle: { color: "#F8FAFC", fontWeight: "800", fontSize: 18 },
  heroSub: { color: "#CBD5E1", marginTop: 4 },
  panel: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.borderSoft,
    backgroundColor: palette.card,
    padding: 14,
    gap: 10,
  },
  panelTitle: { color: palette.text, fontWeight: "800", fontSize: 15 },
  fieldText: { color: palette.muted, fontSize: 13 },
});
