import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";

type Props = {
  title: string;
  icon: string;
  onPress: () => void;
  danger?: boolean;
};

export const SectionListItem = memo(function SectionListItem({ title, icon, onPress, danger = false }: Props) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={[styles.iconWrap, danger && styles.iconWrapDanger]}>
        <MaterialCommunityIcon name={icon} size={20} color={danger ? "#DC2626" : "#15803D"} />
      </View>
      <Text style={[styles.title, danger && styles.titleDanger]}>{title}</Text>
      <MaterialCommunityIcon name="chevron-right" size={22} color="#9CA3AF" />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 12 },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFDF3",
  },
  iconWrapDanger: { backgroundColor: "#FEE2E2" },
  title: { flex: 1, color: "#111827", fontSize: 15, fontWeight: "700" },
  titleDanger: { color: "#B91C1C" },
});
