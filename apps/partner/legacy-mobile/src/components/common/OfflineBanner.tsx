import React from "react";
import { StyleSheet, Text, View } from "react-native";

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
    backgroundColor: "#7f1d1d",
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  text: {
    color: "#fee2e2",
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
  },
});
