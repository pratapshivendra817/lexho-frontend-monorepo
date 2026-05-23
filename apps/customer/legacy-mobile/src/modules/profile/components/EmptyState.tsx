import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { CustomButton } from "./CustomButton";

type Props = {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
};

export const EmptyState = memo(function EmptyState({ title, subtitle, actionLabel, onAction }: Props) {
  return (
    <View style={styles.wrap}>
      <MaterialCommunityIcon name="account-off-outline" size={30} color="#94A3B8" />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {actionLabel && onAction ? <CustomButton label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5EFE8",
    backgroundColor: "#FFFFFF",
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  title: { fontSize: 16, fontWeight: "800", color: "#111827" },
  subtitle: { fontSize: 13, color: "#64748B", textAlign: "center" },
});
