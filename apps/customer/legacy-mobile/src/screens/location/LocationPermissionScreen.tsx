import { useCallback, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { Button, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { openLocationSettings, requestLocationPermission } from "../../hooks/useLocationPermission";
import { COLORS } from '../../theme/colors';

export function LocationPermissionScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const [showDeniedSheet, setShowDeniedSheet] = useState(false);

  const onUseCurrentLocation = useCallback(async () => {
    setLoading(true);
    try {
      const permission = await requestLocationPermission();
      if (permission === "granted") {
        navigation.replace("DetectingLocation");
        return;
      }
      if (permission === "blocked") {
        await openLocationSettings();
        return;
      }
      setShowDeniedSheet(true);
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.illustrationWrap}>
        <View style={styles.illustrationCircle}>
          <MaterialCommunityIcon name="crosshairs-gps" size={72} color={COLORS.green600} />
        </View>
      </View>
      <Text style={styles.title}>What&apos;s your location?</Text>
      <Text style={styles.subtitle}>We need your location to show serviceable hubs.</Text>

      <View style={styles.actions}>
        <Button mode="contained" buttonColor={COLORS.green600} loading={loading} onPress={() => void onUseCurrentLocation()}>
          Use Current Location
        </Button>
        <Button mode="outlined" textColor={COLORS.green700} onPress={() => navigation.navigate("LocationSearch")}>
          Enter location manually
        </Button>
      </View>

      <Modal visible={showDeniedSheet} transparent animationType="slide" onRequestClose={() => setShowDeniedSheet(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setShowDeniedSheet(false)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <Text style={styles.sheetTitle}>Location permission is required</Text>
            <Text style={styles.sheetSubtitle}>Please allow location access to continue.</Text>
            <View style={styles.sheetActions}>
              <Button mode="outlined" onPress={() => setShowDeniedSheet(false)}>
                Cancel
              </Button>
              <Button mode="contained" buttonColor={COLORS.green600} onPress={() => void onUseCurrentLocation()}>
                Retry
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.offWhite, padding: 20 },
  illustrationWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  illustrationCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.offWhite,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 28, fontWeight: "800", color: COLORS.green700, textAlign: "center" },
  subtitle: { marginTop: 10, fontSize: 15, color: COLORS.green700, textAlign: "center" },
  actions: { marginTop: 28, gap: 12 },
  sheetBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: { backgroundColor: COLORS.white, padding: 18, borderTopLeftRadius: 20, borderTopRightRadius: 20, gap: 10 },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: COLORS.green700 },
  sheetSubtitle: { color: COLORS.green700 },
  sheetActions: { marginTop: 8, flexDirection: "row", justifyContent: "flex-end", gap: 8 },
});







