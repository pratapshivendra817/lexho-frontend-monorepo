import { StyleSheet, TouchableOpacity, View } from "react-native";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { Text } from "react-native-paper";


import { COLORS } from '../theme/colors';

type Props = {
  addressLine?: string;
  onPressChange?: () => void;
};

export function Header({ addressLine, onPressChange }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.left}>
        <Text style={styles.label}>Current Address</Text>
        <TouchableOpacity onPress={onPressChange} activeOpacity={0.85} style={styles.row}>
          <Text style={styles.address} numberOfLines={1}>
            {addressLine || "Select your address"}
          </Text>
          <MaterialCommunityIcon name="chevron-down" size={18} color={COLORS.slate900} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
  },
  left: { gap: 6 },
  label: { color: COLORS.slate500, fontSize: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 4 },
  address: { color: COLORS.slate900, fontWeight: "700", fontSize: 16, flex: 1 },
});






