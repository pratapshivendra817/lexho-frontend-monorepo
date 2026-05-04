import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";

export default function Button({ title, onPress, loading }: any) {
  return (
    <TouchableOpacity style={styles.btn} onPress={onPress} disabled={loading}>
      <Text style={styles.text}>
        {loading ? "Please wait..." : title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: "#2563EB",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  text: {
    color: "#fff",
    fontWeight: "600",
  },
});