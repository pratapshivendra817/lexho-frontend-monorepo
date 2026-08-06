import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { COLORS } from "../../theme/colors";
import { radii, shadows, spacing } from "../../constants/theme";

type ComingSoonRoute = { params?: { addressLine?: string; pincode?: string } };

export function ComingSoonScreen({ route, navigation }: { route: ComingSoonRoute; navigation: any }) {
  const addressLine = String(route?.params?.addressLine ?? "").trim();
  const pincode = String(route?.params?.pincode ?? "").trim();

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcon name="map-marker-alert-outline" size={30} color={COLORS.gold} />
        </View>
        <Text style={styles.title}>Service Not Available Yet</Text>
        <Text style={styles.subtitle}>
          We are expanding quickly and this location will be available soon.
        </Text>
        {addressLine ? <Text style={styles.meta}>Area: {addressLine}</Text> : null}
        {pincode ? <Text style={styles.meta}>Pincode: {pincode}</Text> : null}

        <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate("LocationSearch")}>
          <Text style={styles.primaryBtnText}>Choose Another Location</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate("Main")}>
          <Text style={styles.secondaryBtnText}>Back To Home</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.navyDark,
    padding: spacing.lg,
    justifyContent: "center",
  },
  card: {
    borderRadius: radii.lg,
    backgroundColor: COLORS.navyDark,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.sm + 2,
    ...shadows.md,
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: radii.pill,
    backgroundColor: "rgba(217,164,65,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  title: { color: COLORS.white, fontSize: 22, fontWeight: "900", textAlign: "center" },
  subtitle: { color: COLORS.neutral100, fontSize: 14, textAlign: "center", lineHeight: 20 },
  meta: { color: COLORS.goldSoft, fontSize: 13, fontWeight: "700", textAlign: "center" },
  primaryBtn: {
    marginTop: spacing.sm,
    width: "100%",
    borderRadius: radii.md,
    backgroundColor: COLORS.goldSoft,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  primaryBtnText: { color: COLORS.navyDark, fontSize: 14, fontWeight: "800" },
  secondaryBtn: {
    width: "100%",
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    borderRadius: radii.md,
    backgroundColor: COLORS.navyDark,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  secondaryBtnText: { color: COLORS.goldSoft, fontSize: 14, fontWeight: "700" },
});
