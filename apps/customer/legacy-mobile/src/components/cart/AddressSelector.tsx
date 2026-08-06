import { Pressable, StyleSheet, Text, View } from "react-native";


import { COLORS } from '../../theme/colors';

type Address = {
  id: number;
  fullAddress: string;
  city?: string;
  pincode?: string;
};

type AddressSelectorProps = {
  addresses: Address[];
  selectedAddressId: number | null;
  onSelect: (id: number) => void;
  showError?: boolean;
};

export function AddressSelector({ addresses, selectedAddressId, onSelect, showError = false }: AddressSelectorProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Select Address</Text>
      {addresses.map((address) => {
        const selected = selectedAddressId === address.id;
        return (
          <Pressable
            key={address.id}
            onPress={() => onSelect(address.id)}
            style={[styles.card, selected && styles.cardSelected]}
          >
            <Text style={[styles.addressLine, selected && styles.addressLineSelected]}>{address.fullAddress}</Text>
            <Text style={styles.meta}>{[address.city, address.pincode].filter(Boolean).join(" - ")}</Text>
          </Pressable>
        );
      })}
      {showError && !selectedAddressId ? <Text style={styles.error}>Please select an address to continue.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  title: { fontSize: 16, fontWeight: "800", color: COLORS.slate900 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    backgroundColor: COLORS.white,
    padding: 10,
  },
  cardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.offWhite },
  addressLine: { color: COLORS.slate900, fontWeight: "700", fontSize: 13 },
  addressLineSelected: { color: COLORS.primary },
  meta: { color: COLORS.slate500, fontSize: 12, marginTop: 2 },
  error: { color: COLORS.red700, fontSize: 11, fontWeight: "600" },
});






