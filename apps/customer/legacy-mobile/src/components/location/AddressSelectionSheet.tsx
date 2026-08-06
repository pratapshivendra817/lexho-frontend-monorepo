import { FlatList, StyleSheet, TouchableOpacity, View } from "react-native";
import { Button, Modal, Portal, Text } from "react-native-paper";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import type { LocationAddress } from "../../types/location";
import { COLORS } from '../../theme/colors';

type Props = {
  visible: boolean;
  addresses: LocationAddress[];
  selectedAddressId?: number;
  loading?: boolean;
  onClose: () => void;
  onSelect: (addressId: number) => void;
  onManagePress: () => void;
};

export function AddressSelectionSheet({
  visible,
  addresses,
  selectedAddressId,
  loading,
  onClose,
  onSelect,
  onManagePress,
}: Props) {
  return (
    <Portal>
      <Modal visible={visible} onDismiss={onClose} contentContainerStyle={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>Select Address</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <MaterialCommunityIcons name="close" size={20} color={COLORS.slate900} />
          </TouchableOpacity>
        </View>

        {loading ? <Text style={styles.subtle}>Loading addresses...</Text> : null}
        {!loading && addresses.length === 0 ? <Text style={styles.subtle}>No saved addresses yet.</Text> : null}

        <FlatList
          data={addresses}
          keyExtractor={(item) => String(item.id)}
          style={{ maxHeight: 260 }}
          renderItem={({ item }) => {
            const selected = Number(selectedAddressId ?? 0) === Number(item.id);
            return (
              <TouchableOpacity style={[styles.item, selected && styles.itemSelected]} onPress={() => onSelect(item.id)}>
                <View style={styles.itemLabelWrap}>
                  <Text style={styles.itemLabel}>{item.label || "Address"}</Text>
                  {selected ? <Text style={styles.badge}>Selected</Text> : null}
                </View>
                <Text numberOfLines={2} style={styles.itemAddress}>{item.addressLine || "No address line"}</Text>
              </TouchableOpacity>
            );
          }}
        />

        <Button mode="contained" buttonColor={COLORS.primary} onPress={onManagePress} style={styles.manageBtn}>
          Manage Addresses
        </Button>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    marginHorizontal: 14,
    marginTop: "auto",
    marginBottom: 14,
    padding: 16,
    gap: 12,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 20, fontWeight: "800", color: COLORS.slate900 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.borderSoft,
  },
  subtle: { color: COLORS.slate500, fontSize: 13 },
  item: {
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    borderRadius: 14,
    padding: 12,
    gap: 4,
    marginBottom: 10,
  },
  itemSelected: {
    borderColor: COLORS.blue400,
    backgroundColor: COLORS.offWhite,
  },
  itemLabelWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemLabel: { fontSize: 14, fontWeight: "700", color: COLORS.slate900 },
  badge: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.primary,
    backgroundColor: COLORS.offWhite,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  itemAddress: { fontSize: 12, color: COLORS.slate600 },
  manageBtn: { marginTop: 8, borderRadius: 999 },
});







