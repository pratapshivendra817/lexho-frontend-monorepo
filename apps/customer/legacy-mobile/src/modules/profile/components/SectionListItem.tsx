import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";


import { COLORS } from '../../../theme/colors';

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
        <MaterialCommunityIcon name={icon} size={20} color={danger ? COLORS.danger : COLORS.white} />
      </View>
      <Text style={[styles.title, danger && styles.titleDanger]}>{title}</Text>
      <MaterialCommunityIcon name="chevron-right" size={22} color={danger ? COLORS.red700 : COLORS.white} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 12 },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(37, 99, 235, 0.18)",
  },
  iconWrapDanger: { backgroundColor: "rgba(220, 38, 38, 0.2)", borderColor: COLORS.goldSoft },
  title: { flex: 1, color: COLORS.white, fontSize: 15, fontWeight: "700" },
  titleDanger: { color: COLORS.red700 },
});







