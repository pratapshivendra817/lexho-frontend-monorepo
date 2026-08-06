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


import { COLORS } from '../../theme/colors';

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

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

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
  const pickedAddressMeta = route?.params?.pickedAddressMeta ?? {};
  const isEdit = Boolean(existing?.id);
  const { control, setValue, handleSubmit, formState: { errors } } = useForm<Form>({
    mode: "onChange",
    resolver: zodResolver(schema),
    defaultValues: {
      type: String(existing?.label ?? "HOME").toUpperCase() === "OTHER" ? "OTHER" : "HOME",
      flatNo: String(existing?.flatNo ?? ""),
      floor: String(existing?.floor ?? ""),
      buildingName: String(existing?.buildingName ?? ""),
      landmark: firstText(pickedAddressMeta?.landmark, existing?.landmark),
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
      const effectiveCity = firstText(pickedAddressMeta?.city, existing?.city, currentAddress?.city);
      const effectiveState = firstText(pickedAddressMeta?.state, existing?.state, currentAddress?.state);
      const effectiveCountry = firstText(pickedAddressMeta?.country, existing?.country, currentAddress?.country, "India");
      const effectivePincode = firstText(pickedAddressMeta?.pincode, existing?.pincode, currentAddress?.pincode);
      const effectiveArea = firstText(pickedAddressMeta?.area, pickedAddressMeta?.sector, payload.addressLine);
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
            area: effectiveArea,
            sector: firstText(pickedAddressMeta?.sector),
            latitude: effectiveLat,
            longitude: effectiveLng,
            addressLine: payload.addressLine,
            city: effectiveCity,
            state: effectiveState,
            country: effectiveCountry,
            pincode: effectivePincode,
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
            area: effectiveArea,
            sector: firstText(pickedAddressMeta?.sector),
            addressLine: payload.addressLine,
            latitude: effectiveLat,
            longitude: effectiveLng,
            city: effectiveCity,
            state: effectiveState,
            country: effectiveCountry,
            pincode: effectivePincode,
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
          <Button
            mode={typeValue === "HOME" ? "contained" : "outlined"}
            buttonColor={COLORS.goldSoft}
            textColor={typeValue === "HOME" ? COLORS.navyDark : COLORS.goldSoft}
            style={styles.typeBtn}
            onPress={() => setValue("type", "HOME", { shouldValidate: true })}
          >
            Home
          </Button>
          <Button
            mode={typeValue === "OTHER" ? "contained" : "outlined"}
            buttonColor={COLORS.goldSoft}
            textColor={typeValue === "OTHER" ? COLORS.navyDark : COLORS.goldSoft}
            style={styles.typeBtn}
            onPress={() => setValue("type", "OTHER", { shouldValidate: true })}
          >
            Other
          </Button>
        </View>

        <Controller control={control} name="flatNo" render={({ field: { value, onChange } }) => (
          <TextInput mode="outlined" label="Flat/House No" value={value} onChangeText={onChange} textColor={COLORS.white} outlineColor={COLORS.goldSoft} activeOutlineColor={COLORS.goldSoft} theme={{ colors: { onSurfaceVariant: COLORS.white, primary: COLORS.goldSoft } }} style={styles.fieldInput} />
        )} />
        {errors.flatNo ? <Text style={styles.error}>{errors.flatNo.message}</Text> : null}

        <Controller control={control} name="floor" render={({ field: { value, onChange } }) => (
          <TextInput mode="outlined" label="Floor" value={value} onChangeText={onChange} textColor={COLORS.white} outlineColor={COLORS.goldSoft} activeOutlineColor={COLORS.goldSoft} theme={{ colors: { onSurfaceVariant: COLORS.white, primary: COLORS.goldSoft } }} style={styles.fieldInput} />
        )} />
        <Controller control={control} name="buildingName" render={({ field: { value, onChange } }) => (
          <TextInput mode="outlined" label="Apartment/Building Name" value={value} onChangeText={onChange} textColor={COLORS.white} outlineColor={COLORS.goldSoft} activeOutlineColor={COLORS.goldSoft} theme={{ colors: { onSurfaceVariant: COLORS.white, primary: COLORS.goldSoft } }} style={styles.fieldInput} />
        )} />
        {errors.buildingName ? <Text style={styles.error}>{errors.buildingName.message}</Text> : null}

        <Controller control={control} name="landmark" render={({ field: { value, onChange } }) => (
          <TextInput mode="outlined" label="Landmark" value={value} onChangeText={onChange} textColor={COLORS.white} outlineColor={COLORS.goldSoft} activeOutlineColor={COLORS.goldSoft} theme={{ colors: { onSurfaceVariant: COLORS.white, primary: COLORS.goldSoft } }} style={styles.fieldInput} />
        )} />
        <Controller control={control} name="addressLine" render={({ field: { value, onChange } }) => (
          <TextInput mode="outlined" label="Area/Sector/Locality" value={value} onChangeText={onChange} textColor={COLORS.white} outlineColor={COLORS.goldSoft} activeOutlineColor={COLORS.goldSoft} theme={{ colors: { onSurfaceVariant: COLORS.white, primary: COLORS.goldSoft } }} style={styles.fieldInput} />
        )} />
        {errors.addressLine ? <Text style={styles.error}>{errors.addressLine.message}</Text> : null}

        <Controller control={control} name="mobile" render={({ field: { value, onChange } }) => (
          <TextInput mode="outlined" label="Receiver Phone Number" keyboardType="phone-pad" value={value} onChangeText={onChange} maxLength={10} textColor={COLORS.white} outlineColor={COLORS.goldSoft} activeOutlineColor={COLORS.goldSoft} theme={{ colors: { onSurfaceVariant: COLORS.white, primary: COLORS.goldSoft } }} style={styles.fieldInput} />
        )} />
        {errors.mobile ? <Text style={styles.error}>{errors.mobile.message}</Text> : null}

        <Button
          mode="outlined"
          textColor={COLORS.goldSoft}
          style={styles.mapBtn}
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

        <Button
          mode="contained"
          buttonColor={COLORS.goldSoft}
          textColor={COLORS.navyDark}
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
  root: { flex: 1, backgroundColor: COLORS.navyDark },
  content: { flexGrow: 1, backgroundColor: COLORS.navyDark, paddingTop: 10, paddingBottom: 16, gap: 10 },
  toggleRow: { flexDirection: "row", gap: 10 },
  typeBtn: { borderWidth: 1, borderColor: COLORS.goldSoft, backgroundColor: COLORS.navyDark },
  fieldInput: { backgroundColor: COLORS.navyDark },
  mapBtn: { borderWidth: 1, borderColor: COLORS.goldSoft, backgroundColor: COLORS.navyDark },
  saveButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    borderRadius: 14,
    paddingVertical: 6,
    shadowColor: COLORS.goldSoft,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  error: { color: COLORS.danger },
});







