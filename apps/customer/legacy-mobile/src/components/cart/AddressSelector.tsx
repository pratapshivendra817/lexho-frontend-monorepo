import { Pressable, StyleSheet, Text, View } from "react-native";

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
  title: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DCE7F3",
    backgroundColor: "#FFFFFF",
    padding: 10,
  },
  cardSelected: { borderColor: "#0EA5E9", backgroundColor: "#EEF8FF" },
  addressLine: { color: "#0F172A", fontWeight: "700", fontSize: 13 },
  addressLineSelected: { color: "#0B3B79" },
  meta: { color: "#64748B", fontSize: 12, marginTop: 2 },
  error: { color: "#B91C1C", fontSize: 11, fontWeight: "600" },
});
