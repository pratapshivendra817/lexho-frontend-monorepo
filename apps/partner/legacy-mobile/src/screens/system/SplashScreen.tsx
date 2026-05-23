import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../constants/colors";

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Lexho Partner</Text>
      <Text style={styles.subtitle}>Preparing your workspace</Text>
      <ActivityIndicator color={COLORS.secondary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
    gap: 14,
  },
  logo: {
    color: COLORS.textPrimary,
    fontWeight: "800",
    fontSize: 30,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
});
