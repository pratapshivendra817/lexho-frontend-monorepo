import { ImageBackground, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";

export function SplashScreen() {
  return (
    <ImageBackground source={require("../../assets/images/splash-lexho.jpeg")} style={styles.root} resizeMode="cover">
      <View style={styles.overlay}>
        <Text style={styles.brand}>Lexho</Text>
        <Text style={styles.tagline}>CokAtHome</Text>
        <Text style={styles.subtitle}>Cleaning Service</Text>
        <ActivityIndicator style={styles.loader} color="#fff" />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: { flex: 1, justifyContent: "flex-end", alignItems: "center", paddingBottom: 56, backgroundColor: "rgba(2,6,23,0.45)" },
  brand: { color: "#fff", fontSize: 54, fontWeight: "900" },
  tagline: { color: "#E2E8F0", fontSize: 24, fontWeight: "700" },
  subtitle: { color: "#F8FAFC", fontSize: 16, marginTop: 4 },
  loader: { marginTop: 14 },
});
