import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS } from "../../constants/colors";

export function ToastMessage({
  visible,
  message,
  onClose,
}: {
  visible: boolean;
  message: string;
  onClose: () => void;
}) {
  if (!visible) return null;
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onClose} style={styles.wrap}>
      <View style={styles.toast}>
        <Text style={styles.text}>{message}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 20,
    zIndex: 1000,
  },
  toast: {
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  text: {
    color: COLORS.textPrimary,
    fontWeight: "600",
    textAlign: "center",
  },
});
