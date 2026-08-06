import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../constants/colors";

export function OfflineBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>You are offline. Some actions may be delayed.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  text: {
    color: COLORS.accent,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
  },
});
