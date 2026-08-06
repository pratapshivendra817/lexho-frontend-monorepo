import React from "react";
import { TextInput, StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";

export default function Input(props: any) {
  return <TextInput placeholderTextColor={COLORS.textMuted} {...props} style={[styles.input, props.style]} />;
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    color: COLORS.textPrimary,
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
  },
});
