import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";

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
    backgroundColor: COLORS.secondary,
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  text: {
    color: COLORS.background,
    fontWeight: "800",
  },
});
