import { ScrollView, StyleSheet, View } from "react-native";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { Button, Snackbar, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";

export function ComingSoonScreen({ navigation, route }: any) {
  const [showSnack, setShowSnack] = useState(false);
  const addressLine = String(route?.params?.addressLine ?? "").trim();

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <MaterialCommunityIcon name="map-marker-radius-outline" size={56} color="#16A34A" />
          <Text style={styles.title}>WE ARE COMING SOON</Text>
          <Text style={styles.subtitle}>We&apos;re currently live in select areas and expanding quickly.</Text>
          {addressLine ? <Text style={styles.address}>{addressLine}</Text> : null}
        </View>

        <View style={styles.actions}>
          <Button mode="contained" buttonColor="#16A34A" onPress={() => setShowSnack(true)}>
            Notify Me
          </Button>
          <Button mode="outlined" textColor="#166534" onPress={() => navigation.replace("LocationSearch")}>
            Change Location
          </Button>
        </View>

      </ScrollView>

      <Snackbar visible={showSnack} onDismiss={() => setShowSnack(false)}>
        We&apos;ll notify you when your area goes live.
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F0FDF4" },
  content: { padding: 16, gap: 14 },
  hero: { alignItems: "center", marginTop: 30, gap: 10 },
  title: { fontSize: 30, fontWeight: "900", color: "#14532D", textAlign: "center" },
  subtitle: { color: "#4D7C0F", fontSize: 14, textAlign: "center" },
  address: { color: "#166534", fontWeight: "700", textAlign: "center" },
  actions: { gap: 10, marginTop: 8 },
});
