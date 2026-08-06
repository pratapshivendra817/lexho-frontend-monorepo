import { memo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";


import { COLORS } from '../../../theme/colors';

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
      {loading ? <ActivityIndicator color={variant === "ghost" ? COLORS.navyDark : COLORS.white} /> : <Text style={[styles.label, variant === "ghost" && styles.ghostLabel]}>{label}</Text>}
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
  primary: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  ghost: { backgroundColor: COLORS.goldSoft, borderColor: COLORS.goldSoft },
  danger: { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
  disabled: { opacity: 0.65 },
  label: { color: COLORS.white, fontWeight: "800", fontSize: 15 },
  ghostLabel: { color: COLORS.navyDark },
});






