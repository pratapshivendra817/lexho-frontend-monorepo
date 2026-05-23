import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Button, Snackbar, Text, TextInput } from "react-native-paper";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { saveAddressThunk, updateAddressThunk } from "../../redux/locationSlice";
import { resolveUserIdFromAuth } from "../../utils/authUser";

function toReadableError(error: any, fallback: string) {
  const text = String(error?.message ?? fallback);
  if (text.toLowerCase().includes("request conflicts with existing data")) {
    return "Address already exists. Please edit the existing one.";
  }
  return text;
}

const schema = z.object({
  type: z.enum(["HOME", "OTHER"]),
  flatNo: z.string().min(1, "Flat/House No is required"),
  floor: z.string().optional(),
  buildingName: z.string().min(2, "Building name is required"),
  landmark: z.string().optional(),
  addressLine: z.string().min(4, "Area/Sector/Locality is required"),
  mobile: z.string().regex(/^\d{10}$/, "Enter valid 10-digit phone"),
});

type Form = z.infer<typeof schema>;

export function AddAddressDetailsScreen({ route, navigation }: any) {
  const dispatch = useAppDispatch();
  const authUserId = useAppSelector((s) => s.auth.user?.id ?? 0);
  const authMobile = useAppSelector((s) => s.auth.user?.mobile ?? "");
  const authToken = useAppSelector((s) => s.auth.token ?? "");
  const currentAddress = useAppSelector((s) => (s.location as any)?.currentAddress);
  const locationUserId = useMemo(() => resolveUserIdFromAuth(authUserId, String(authToken).trim()), [authToken, authUserId]);
  const existing = route?.params?.address;
  const pickedLocation = route?.params?.pickedLocation;
  const pickedAddressLine = route?.params?.pickedAddressLine;
  const isEdit = Boolean(existing?.id);
  const { control, setValue, handleSubmit, formState: { errors } } = useForm<Form>({
    mode: "onChange",
    resolver: zodResolver(schema),
    defaultValues: {
      type: String(existing?.label ?? "HOME").toUpperCase() === "OTHER" ? "OTHER" : "HOME",
      flatNo: String(existing?.flatNo ?? ""),
      floor: String(existing?.floor ?? ""),
      buildingName: String(existing?.buildingName ?? ""),
      landmark: String(existing?.landmark ?? ""),
      addressLine: String(pickedAddressLine ?? existing?.addressLine ?? currentAddress?.addressLine ?? ""),
      mobile: String(existing?.mobile ?? authMobile ?? ""),
    },
  });
  const typeValue = useWatch({ control, name: "type" });

  const mutation = useMutation({
    mutationFn: async (payload: Form) => {
      if (!Number.isFinite(locationUserId) || locationUserId <= 0) throw new Error("Login required");
      const lat = Number(existing?.latitude ?? currentAddress?.latitude ?? 0);
      const lng = Number(existing?.longitude ?? currentAddress?.longitude ?? 0);
      const effectiveLat = Number(pickedLocation?.latitude ?? lat ?? 0);
      const effectiveLng = Number(pickedLocation?.longitude ?? lng ?? 0);
      if (isEdit) {
        await dispatch(
          updateAddressThunk({
            userId: locationUserId,
            addressId: String(existing.id),
            label: payload.type,
            type: payload.type,
            customLabel: payload.type,
            flatNo: payload.flatNo,
            floor: payload.floor ?? "",
            buildingName: payload.buildingName,
            landmark: payload.landmark ?? "",
            area: payload.addressLine,
            sector: "",
            latitude: effectiveLat,
            longitude: effectiveLng,
            addressLine: payload.addressLine,
            city: String(existing?.city ?? currentAddress?.city ?? ""),
            state: String(existing?.state ?? currentAddress?.state ?? ""),
            country: String(existing?.country ?? currentAddress?.country ?? "India"),
            pincode: String(existing?.pincode ?? currentAddress?.pincode ?? ""),
            mobile: payload.mobile,
          }),
        ).unwrap();
      } else {
        await dispatch(
          saveAddressThunk({
            userId: locationUserId,
            label: payload.type,
            type: payload.type,
            customLabel: payload.type,
            flatNo: payload.flatNo,
            floor: payload.floor ?? "",
            buildingName: payload.buildingName,
            landmark: payload.landmark ?? "",
            area: payload.addressLine,
            sector: "",
            addressLine: payload.addressLine,
            latitude: effectiveLat,
            longitude: effectiveLng,
            city: String(currentAddress?.city ?? ""),
            state: String(currentAddress?.state ?? ""),
            country: String(currentAddress?.country ?? "India"),
            pincode: String(currentAddress?.pincode ?? ""),
            mobile: payload.mobile,
          }),
        ).unwrap();
      }
    },
    onSuccess: () => navigation.replace("LocationSearch"),
  });

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.toggleRow}>
          <Button mode={typeValue === "HOME" ? "contained" : "outlined"} buttonColor="#16A34A" onPress={() => setValue("type", "HOME", { shouldValidate: true })}>
            Home
          </Button>
          <Button mode={typeValue === "OTHER" ? "contained" : "outlined"} buttonColor="#16A34A" onPress={() => setValue("type", "OTHER", { shouldValidate: true })}>
            Other
          </Button>
        </View>

        <Controller control={control} name="flatNo" render={({ field: { value, onChange } }) => (
          <TextInput mode="flat" label="Flat/House No" value={value} onChangeText={onChange} />
        )} />
        {errors.flatNo ? <Text style={styles.error}>{errors.flatNo.message}</Text> : null}

        <Controller control={control} name="floor" render={({ field: { value, onChange } }) => (
          <TextInput mode="flat" label="Floor" value={value} onChangeText={onChange} />
        )} />
        <Controller control={control} name="buildingName" render={({ field: { value, onChange } }) => (
          <TextInput mode="flat" label="Apartment/Building Name" value={value} onChangeText={onChange} />
        )} />
        {errors.buildingName ? <Text style={styles.error}>{errors.buildingName.message}</Text> : null}

        <Controller control={control} name="landmark" render={({ field: { value, onChange } }) => (
          <TextInput mode="flat" label="Landmark" value={value} onChangeText={onChange} />
        )} />
        <Controller control={control} name="addressLine" render={({ field: { value, onChange } }) => (
          <TextInput mode="flat" label="Area/Sector/Locality" value={value} onChangeText={onChange} />
        )} />
        {errors.addressLine ? <Text style={styles.error}>{errors.addressLine.message}</Text> : null}

        <Controller control={control} name="mobile" render={({ field: { value, onChange } }) => (
          <TextInput mode="flat" label="Receiver Phone Number" keyboardType="phone-pad" value={value} onChangeText={onChange} maxLength={10} />
        )} />
        {errors.mobile ? <Text style={styles.error}>{errors.mobile.message}</Text> : null}

        <Button
          mode="outlined"
          onPress={() =>
            navigation.navigate("MapAddressPicker", {
              address: existing,
              initial: {
                latitude: Number(pickedLocation?.latitude ?? existing?.latitude ?? currentAddress?.latitude ?? 28.6139),
                longitude: Number(pickedLocation?.longitude ?? existing?.longitude ?? currentAddress?.longitude ?? 77.209),
              },
            })
          }
        >
          Pick Location On Map
        </Button>
        <Text style={styles.meta}>
          Selected: {Number(pickedLocation?.latitude ?? existing?.latitude ?? currentAddress?.latitude ?? 0).toFixed(6)},{" "}
          {Number(pickedLocation?.longitude ?? existing?.longitude ?? currentAddress?.longitude ?? 0).toFixed(6)}
        </Text>

        <Button
          mode="contained"
          buttonColor="#0F766E"
          textColor="#FFFFFF"
          style={styles.saveButton}
          disabled={mutation.isPending}
          loading={mutation.isPending}
          onPress={handleSubmit((v) => mutation.mutate(v))}
        >
          Save Address
        </Button>
      </ScrollView>
      <Snackbar visible={mutation.isError} onDismiss={() => mutation.reset()}>
        {mutation.error instanceof Error ? toReadableError(mutation.error, "Unable to save address") : "Unable to save address"}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FFFA" },
  content: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16, gap: 10 },
  toggleRow: { flexDirection: "row", gap: 10 },
  saveButton: {
    marginTop: 8,
    borderRadius: 14,
    paddingVertical: 6,
    shadowColor: "#0F766E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  meta: { color: "#334155", fontSize: 12 },
  error: { color: "#DC2626" },
});
