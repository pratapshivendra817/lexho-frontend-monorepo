import { StyleSheet, TouchableOpacity, View } from "react-native";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { Text } from "react-native-paper";
import { COLORS } from '../theme/colors';

type Props = {
  label?: string;
  addressLine?: string;
  selected?: boolean;
  onPress?: () => void;
  onDelete?: () => void;
  darkTheme?: boolean;
};

export function AddressCard({ label, addressLine, selected, onPress, onDelete, darkTheme = false }: Props) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[styles.card, darkTheme && styles.cardDark, selected && (darkTheme ? styles.selectedDark : styles.selected)]}>
      <View style={styles.content}>
        <View style={styles.left}>
          <Text style={[styles.label, darkTheme && styles.labelDark]}>{label || "OTHER"}</Text>
          <Text style={[styles.address, darkTheme && styles.addressDark]}>{addressLine || "Address not available"}</Text>
        </View>
        <View style={styles.actions}>
          {selected ? <MaterialCommunityIcon name="check-circle" color={darkTheme ? COLORS.goldSoft : COLORS.green700} size={20} /> : null}
          <TouchableOpacity onPress={onDelete} hitSlop={8}>
            <MaterialCommunityIcon name="delete-outline" color={darkTheme ? COLORS.goldSoft : COLORS.error} size={20} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    padding: 12,
    marginBottom: 10,
    backgroundColor: COLORS.white,
  },
  cardDark: {
    borderColor: COLORS.goldSoft,
    backgroundColor: COLORS.navyDark,
  },
  selected: { borderColor: COLORS.green700, backgroundColor: COLORS.offWhite },
  selectedDark: { borderColor: COLORS.goldSoft, backgroundColor: COLORS.navyDark },
  content: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  left: { flex: 1, gap: 6 },
  label: { fontWeight: "700", color: COLORS.slate900 },
  labelDark: { color: COLORS.white },
  address: { color: COLORS.slate600 },
  addressDark: { color: COLORS.neutral100 },
  actions: { flexDirection: "row", alignItems: "center", gap: 10 },
});






