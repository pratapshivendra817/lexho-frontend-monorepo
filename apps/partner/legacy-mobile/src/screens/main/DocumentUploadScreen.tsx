import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import { useForm, Controller } from "react-hook-form";
import { uploadPartnerDocuments } from "../../services/partnerService";
import { COLORS } from "../../constants/colors";
import { useAppFeedback } from "../../context/AppFeedbackContext";

type UploadForm = {
  aadhaarFront: PickedFile | null;
  aadhaarBack: PickedFile | null;
  pan: PickedFile | null;
  profilePhoto: PickedFile | null;
};

type PickedFile = { uri: string; type?: string; fileName?: string };

export default function DocumentUploadScreen() {
  const { showLoader, hideLoader, toast } = useAppFeedback();
  const [progress, setProgress] = useState(0);
  const {
    control,
    setValue,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UploadForm>({
    defaultValues: { aadhaarFront: null, aadhaarBack: null, pan: null, profilePhoto: null },
  });

  const files = watch();

  const pickImage = async (key: keyof UploadForm, fromCamera: boolean) => {
    const fn = fromCamera ? launchCamera : launchImageLibrary;
    const result = await fn({ mediaType: "photo", quality: 0.8, selectionLimit: 1 });
    const asset = result.assets?.[0];
    if (asset?.uri) {
      const file: PickedFile = { uri: asset.uri, type: asset.type, fileName: asset.fileName };
      setValue(key, file, { shouldValidate: true, shouldDirty: true });
    }
  };

  const upload = async (values: UploadForm) => {
    try {
      if (!values.aadhaarFront || !values.aadhaarBack || !values.pan || !values.profilePhoto) {
        toast("Aadhaar front/back, PAN and profile photo are required");
        return;
      }
      setProgress(0);
      showLoader();
      await uploadPartnerDocuments({
        aadhaarFront: { uri: values.aadhaarFront.uri, type: values.aadhaarFront.type, name: values.aadhaarFront.fileName },
        aadhaarBack: { uri: values.aadhaarBack.uri, type: values.aadhaarBack.type, name: values.aadhaarBack.fileName },
        pan: { uri: values.pan.uri, type: values.pan.type, name: values.pan.fileName },
        profilePhoto: { uri: values.profilePhoto.uri, type: values.profilePhoto.type, name: values.profilePhoto.fileName },
      }, setProgress);
      toast("Documents uploaded successfully");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to upload documents";
      toast(message);
    } finally {
      hideLoader();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Document Upload</Text>
      {(["aadhaarFront", "aadhaarBack", "pan", "profilePhoto"] as Array<keyof UploadForm>).map((key) => (
        <Controller
          key={key}
          control={control}
          name={key}
          render={() => (
            <View style={[styles.card, errors[key] ? styles.cardError : null]}>
              <Text style={styles.label}>{key.replace(/([A-Z])/g, " $1").toUpperCase()} *</Text>
              <Text style={styles.meta}>{files[key]?.fileName ?? "No file selected"}</Text>
              <View style={styles.row}>
                <TouchableOpacity style={styles.btn} onPress={() => pickImage(key, true)}><Text style={styles.btnText}>Camera</Text></TouchableOpacity>
                <TouchableOpacity style={styles.btn} onPress={() => pickImage(key, false)}><Text style={styles.btnText}>Gallery</Text></TouchableOpacity>
              </View>
              {errors[key]?.message ? <Text style={styles.errorText}>{errors[key]?.message as string}</Text> : null}
            </View>
          )}
        />
      ))}
      <Text style={styles.meta}>Note: Aadhaar/PAN should be selected as PDF files where available in picker.</Text>
      <Text style={styles.progress}>Upload Progress: {progress}%</Text>
      <TouchableOpacity style={[styles.btn, styles.upload]} onPress={handleSubmit(upload)} disabled={isSubmitting}>
        <Text style={styles.btnText}>{isSubmitting ? "Uploading..." : "Upload Documents"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16, gap: 10 },
  title: { color: COLORS.textPrimary, fontSize: 24, fontWeight: "800" },
  card: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, gap: 6 },
  cardError: { borderColor: COLORS.error },
  label: { color: COLORS.textPrimary, fontWeight: "700" },
  meta: { color: COLORS.textSecondary, fontSize: 12 },
  row: { flexDirection: "row", gap: 8 },
  btn: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: "center", backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border },
  upload: { marginTop: 8, backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  btnText: { color: COLORS.textPrimary, fontWeight: "700" },
  progress: { color: COLORS.textSecondary, fontSize: 12, textAlign: "right" },
  errorText: { color: COLORS.error, fontSize: 12 },
});
