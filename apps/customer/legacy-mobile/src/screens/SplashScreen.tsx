import { ImageBackground, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { COLORS } from '../theme/colors';

export function SplashScreen() {
  return (
    <ImageBackground
      source={require("../assets/images/splash-lexho.jpeg")}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <View style={styles.bottomContent}>
          <Text style={styles.brand}>Lexho</Text>
          <Text style={styles.tagline}>CokAtHome</Text>
          <Text style={styles.subTagline}>Cleaning Service</Text>
          <ActivityIndicator style={styles.spinner} size="small" color={COLORS.white} />
          <Text style={styles.helper}>Loading your experience...</Text>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.52)",
    justifyContent: "flex-end",
    paddingHorizontal: 24,
    paddingBottom: 54,
  },
  bottomContent: {
    alignItems: "center",
  },
  brand: {
    color: COLORS.white,
    fontSize: 58,
    lineHeight: 60,
    fontWeight: "800",
  },
  tagline: {
    marginTop: 6,
    color: COLORS.borderSoft,
    fontSize: 24,
    fontWeight: "700",
  },
  subTagline: {
    marginTop: 4,
    color: COLORS.offWhite,
    fontSize: 17,
    fontWeight: "500",
  },
  spinner: {
    marginTop: 22,
  },
  helper: {
    marginTop: 12,
    color: COLORS.neutral200,
    fontSize: 15,
  },
});






