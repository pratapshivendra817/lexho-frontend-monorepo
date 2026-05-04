import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { FlatList, StyleSheet, View } from "react-native";
import { Button, Card, Snackbar, Text, TextInput } from "react-native-paper";
import { z } from "zod";
import { addAddress, deleteAddress, setDefaultAddress } from "../../api/addressApi";
import { EmptyStateCard } from "../../components/common/EmptyStateCard";
import { SkeletonList } from "../../components/common/SkeletonList";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { fetchAddresses } from "../../redux/addressSlice";

const schema = z.object({
  label: z.string().min(2, "Label required"),
  line1: z.string().min(5, "Address line required"),
  city: z.string().min(2, "City required"),
});

type Form = z.infer<typeof schema>;

export function AddressScreen() {
  const dispatch = useAppDispatch();
  const { list, loading, error } = useAppSelector((s) => s.address);
  const { control, handleSubmit, reset, formState: { errors } } = useForm<Form>({
    defaultValues: { label: "", line1: "", city: "" },
    resolver: zodResolver(schema),
  });

  useEffect(() => { dispatch(fetchAddresses()); }, [dispatch]);

  const onSubmit = async (values: Form) => {
    await addAddress(values);
    reset();
    dispatch(fetchAddresses());
  };

  const makeDefault = async (id: string) => { await setDefaultAddress(id); dispatch(fetchAddresses()); };
  const remove = async (id: string) => { await deleteAddress(id); dispatch(fetchAddresses()); };

  return (
    <View style={styles.root}>
      <Card style={styles.formCard}>
        <Card.Title title="Add New Address" />
        <Card.Content style={styles.formContent}>
          <Controller control={control} name="label" render={({ field: { value, onChange } }) => <TextInput mode="outlined" label="Label (Home/Work)" value={value} onChangeText={onChange} />} />
          {errors.label ? <Text style={styles.err}>{errors.label.message}</Text> : null}
          <Controller control={control} name="line1" render={({ field: { value, onChange } }) => <TextInput mode="outlined" label="Address Line" value={value} onChangeText={onChange} />} />
          {errors.line1 ? <Text style={styles.err}>{errors.line1.message}</Text> : null}
          <Controller control={control} name="city" render={({ field: { value, onChange } }) => <TextInput mode="outlined" label="City" value={value} onChangeText={onChange} />} />
          {errors.city ? <Text style={styles.err}>{errors.city.message}</Text> : null}
          <Button mode="contained" onPress={handleSubmit(onSubmit)}>Save Address</Button>
        </Card.Content>
      </Card>

      {loading ? <SkeletonList rows={3} /> : null}
      {!loading && list.length === 0 ? <EmptyStateCard title="No addresses yet" subtitle="Add your first address for faster checkout." /> : null}
      {error ? <Text style={styles.err}>{error}</Text> : null}

      <FlatList
        data={list}
        keyExtractor={(item, i) => String(item?.id ?? i)}
        renderItem={({ item }) => (
          <Card style={styles.itemCard}>
            <Card.Content>
              <Text style={styles.itemTitle}>{item?.label ?? "Address"}</Text>
              <Text>{item?.line1 ?? ""}</Text>
              <Text>{item?.city ?? ""}</Text>
              <View style={styles.actions}>
                <Button compact onPress={() => makeDefault(String(item?.id))}>Set Default</Button>
                <Button compact textColor="#DC2626" onPress={() => remove(String(item?.id))}>Delete</Button>
              </View>
            </Card.Content>
          </Card>
        )}
      />

      <Snackbar visible={Boolean(error)} onDismiss={() => {}}>{error ?? "Address error"}</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, gap: 10 },
  formCard: { borderRadius: 16 },
  formContent: { gap: 8 },
  itemCard: { marginTop: 10, borderRadius: 14 },
  itemTitle: { fontWeight: "700" },
  actions: { flexDirection: "row", marginTop: 6 },
  err: { color: "#DC2626" },
});
