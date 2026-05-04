import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";

export default function StatusScreen() {
  const status = "PENDING"; // API se aayega

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Status: {status}</Text>
      <Text style={styles.subtitle}>Your onboarding is under review.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  subtitle: {
    marginTop: 8,
    color: COLORS.textSecondary,
  },
});
