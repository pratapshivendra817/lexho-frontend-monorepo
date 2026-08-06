import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { COLORS } from "../../constants/colors";

export default function BackgroundLocationEducationScreen({ navigation }: any) {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Allow Background Location</Text>
      <Text style={styles.body}>
        We use background location only while you are on shift and online so customers and dispatch can see accurate arrival progress.
      </Text>
      <Text style={styles.bullet}>- Accurate live tracking during active jobs</Text>
      <Text style={styles.bullet}>- Better ETA and route updates</Text>
      <Text style={styles.bullet}>- Faster support during emergency or route issues</Text>
      <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()}>
        <Text style={styles.primaryButtonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background, padding: 24, justifyContent: "center", gap: 12 },
  title: { color: COLORS.textPrimary, fontSize: 26, fontWeight: "800" },
  body: { color: COLORS.textSecondary, lineHeight: 22 },
  bullet: { color: COLORS.textPrimary, fontWeight: "600" },
  primaryButton: {
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: COLORS.secondary,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: { color: COLORS.background, fontWeight: "800" },
});

