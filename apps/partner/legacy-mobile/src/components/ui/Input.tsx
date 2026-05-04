import React from "react";
import { TextInput, StyleSheet } from "react-native";

export default function Input(props: any) {
  return <TextInput {...props} style={styles.input} />;
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
  },
});