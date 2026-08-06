import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { COLORS } from "../../constants/colors";

export default function RootDetectionWarningScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Device Not Supported</Text>
      <Text style={styles.body}>
        Sensitive partner actions are blocked on rooted devices or when developer-mode risk is detected. Please use a secure device to continue.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { color: COLORS.textPrimary, fontSize: 24, fontWeight: "800", marginBottom: 12, textAlign: "center" },
  body: { color: COLORS.textSecondary, textAlign: "center", lineHeight: 22 },
});

