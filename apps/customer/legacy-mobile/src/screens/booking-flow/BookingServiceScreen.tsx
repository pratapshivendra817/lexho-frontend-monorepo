import { useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { ServiceCard } from "../../components/ServiceCard";

export function BookingServiceScreen({ navigation }: any) {
  const [serviceIdInput, setServiceIdInput] = useState("");
  const parsedServiceId = useMemo(() => Number(serviceIdInput), [serviceIdInput]);

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Select Service</Text>
      <TextInput
        mode="outlined"
        label="Service ID"
        value={serviceIdInput}
        onChangeText={setServiceIdInput}
        keyboardType="number-pad"
      />
      <FlatList
        data={[]}
        keyExtractor={(item: any, index) => String(item?.id ?? index)}
        renderItem={({ item }: any) => <ServiceCard service={item} onPress={() => navigation.navigate("BookingSlot", { serviceId: item.id })} />}
        ListEmptyComponent={<Text style={styles.helper}>Service listing should come from API. Enter service ID to continue.</Text>}
      />
      <Button
        mode="contained"
        disabled={!Number.isFinite(parsedServiceId) || parsedServiceId <= 0}
        onPress={() => navigation.navigate("BookingSlot", { serviceId: parsedServiceId })}
      >
        Continue
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff", padding: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: "700", color: "#0f172a" },
  helper: { color: "#64748b", marginTop: 8 },
});
