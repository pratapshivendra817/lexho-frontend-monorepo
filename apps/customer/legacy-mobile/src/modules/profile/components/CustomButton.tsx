import { memo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "ghost" | "danger";
};

export const CustomButton = memo(function CustomButton({ label, onPress, loading = false, disabled = false, variant = "primary" }: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.base, styles[variant], isDisabled && styles.disabled]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? <ActivityIndicator color={variant === "ghost" ? "#047857" : "#FFFFFF"} /> : <Text style={[styles.label, variant === "ghost" && styles.ghostLabel]}>{label}</Text>}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  primary: { backgroundColor: "#0F9D58", borderColor: "#0F9D58" },
  ghost: { backgroundColor: "#ECFDF3", borderColor: "#A7F3D0" },
  danger: { backgroundColor: "#DC2626", borderColor: "#DC2626" },
  disabled: { opacity: 0.65 },
  label: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  ghostLabel: { color: "#047857" },
});
