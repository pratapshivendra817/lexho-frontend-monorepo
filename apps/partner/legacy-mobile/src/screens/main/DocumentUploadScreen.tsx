import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import { useForm, Controller } from "react-hook-form";
import { uploadPartnerDocuments } from "../../services/partnerService";
import { COLORS } from "../../constants/colors";
import { useAppFeedback } from "../../context/AppFeedbackContext";

type UploadForm = {
  aadhaar: PickedFile | null;
  pan: PickedFile | null;
  selfie: PickedFile | null;
  certificate: PickedFile | null;
};

type PickedFile = { uri: string; type?: string; fileName?: string; fileSize?: number };

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

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
    defaultValues: { aadhaar: null, pan: null, selfie: null, certificate: null },
  });

  const files = watch();

  const pickImage = async (key: keyof UploadForm, fromCamera: boolean) => {
    const fn = fromCamera ? launchCamera : launchImageLibrary;
    const result = await fn({ mediaType: "photo", quality: 0.8, selectionLimit: 1 });
    const asset = result.assets?.[0];
    if (asset?.uri) {
      const type = String(asset.type ?? "").toLowerCase();
      if (type && !ALLOWED_TYPES.includes(type)) {
        toast("Unsupported file. Upload JPG, PNG, or WEBP.");
        return;
      }
      if (asset.fileSize && asset.fileSize > MAX_FILE_BYTES) {
        toast("File too large. Maximum allowed size is 5 MB.");
        return;
      }
      const file: PickedFile = { uri: asset.uri, type: asset.type, fileName: asset.fileName, fileSize: asset.fileSize };
      setValue(key, file, { shouldValidate: true, shouldDirty: true });
    }
  };

  const upload = async (values: UploadForm) => {
    try {
      if (!values.aadhaar || !values.pan || !values.selfie) {
        toast("Aadhaar, PAN and selfie are required");
        return;
      }
      setProgress(0);
      showLoader();
      await uploadPartnerDocuments({
        aadhaar: { uri: values.aadhaar.uri, type: values.aadhaar.type, name: values.aadhaar.fileName },
        pan: { uri: values.pan.uri, type: values.pan.type, name: values.pan.fileName },
        selfie: { uri: values.selfie.uri, type: values.selfie.type, name: values.selfie.fileName },
        certificate: values.certificate
          ? { uri: values.certificate.uri, type: values.certificate.type, name: values.certificate.fileName }
          : null,
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
      {(["aadhaar", "pan", "selfie", "certificate"] as Array<keyof UploadForm>).map((key) => (
        <Controller
          key={key}
          control={control}
          name={key}
          render={() => (
            <View style={[styles.card, errors[key] ? styles.cardError : null]}>
              <Text style={styles.label}>
                {key.replace(/([A-Z])/g, " $1").toUpperCase()} {key === "certificate" ? "(OPTIONAL)" : "*"}
              </Text>
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
      <Text style={styles.meta}>Allowed: JPG, PNG, WEBP. Maximum size: 5 MB per file.</Text>
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
