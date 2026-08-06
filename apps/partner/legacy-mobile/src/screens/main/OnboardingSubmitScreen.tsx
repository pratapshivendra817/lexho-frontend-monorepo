import React, { useEffect, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { TextInputProps } from "react-native";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { getPartnerProfile, submitPartnerOnboarding, uploadPartnerDocuments } from "../../services/partnerService";
import { COLORS } from "../../constants/colors";
import { useAppFeedback } from "../../context/AppFeedbackContext";

type FormState = {
  fullName: string;
  email: string;
  phoneNumber: string;
  gender: "Select" | "Male" | "Female" | "Other";
  dateOfBirth: string;
  currentCity: string;
  currentState: string;
  currentFullAddress: string;
  serviceType: "Select" | "Cleaning" | "Cook" | "Both";
  accountNumber: string;
  ifscCode: string;
};

const initialForm: FormState = {
  fullName: "",
  email: "",
  phoneNumber: "",
  gender: "Select",
  dateOfBirth: "1995-06-15",
  currentCity: "",
  currentState: "",
  currentFullAddress: "",
  serviceType: "Select",
  accountNumber: "",
  ifscCode: "",
};

type UploadDocKey = "aadhaar" | "pan" | "selfie" | "certificate";
type UploadDocFile = { uri: string; type?: string; fileName?: string; fileSize?: number };
type UploadFormState = Record<UploadDocKey, UploadDocFile | null>;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const initialDocs: UploadFormState = {
  aadhaar: null,
  pan: null,
  selfie: null,
  certificate: null,
};

const DOC_LABELS: Record<UploadDocKey, string> = {
  aadhaar: "AADHAAR",
  pan: "PAN",
  selfie: "SELFIE",
  certificate: "CERTIFICATE (OPTIONAL)",
};

const firstFilled = (...values: Array<string | undefined>) => values.find((value) => value?.trim())?.trim() ?? "";

const addressWithPincode = (address?: string, pincode?: string) => {
  const cleanAddress = address?.trim() ?? "";
  const cleanPincode = pincode?.trim() ?? "";
  if (!cleanPincode || cleanAddress.includes(cleanPincode)) return cleanAddress;
  if (!cleanAddress) return cleanPincode;
  return `${cleanAddress}, ${cleanPincode}`;
};

export default function OnboardingSubmitScreen() {
  const { showLoader, hideLoader, toast } = useAppFeedback();
  const [form, setForm] = useState<FormState>(initialForm);
  const [docs, setDocs] = useState<UploadFormState>(initialDocs);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [showServiceTypeDropdown, setShowServiceTypeDropdown] = useState(false);

  useEffect(() => {
    let mounted = true;

    getPartnerProfile()
      .then((profile) => {
        if (!mounted) return;
        setForm((prev) => ({
          ...prev,
          fullName: prev.fullName || firstFilled(profile.fullName, profile.name),
          email: prev.email || firstFilled(profile.email),
          phoneNumber: prev.phoneNumber || firstFilled(profile.phone, profile.mobile),
          currentCity: prev.currentCity || firstFilled(profile.city),
          currentFullAddress: prev.currentFullAddress || addressWithPincode(profile.address, profile.pincode),
        }));
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async () => {
    if (!form.fullName.trim() || !form.email.trim() || !form.phoneNumber.trim()) {
      toast("Full name, email, phone number are required");
      return;
    }
    if (form.gender === "Select") {
      toast("Please select gender");
      return;
    }
    if (form.serviceType === "Select") {
      toast("Please select service type");
      return;
    }

    try {
      showLoader();
      await submitPartnerOnboarding({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim(),
        gender:
          form.gender === "Male"
            ? "MALE"
            : form.gender === "Female"
              ? "FEMALE"
              : "OTHER",
        dateOfBirth: form.dateOfBirth.trim(),
        currentCity: form.currentCity.trim(),
        currentState: form.currentState.trim(),
        currentFullAddress: form.currentFullAddress.trim(),
        serviceAreas: form.serviceType === "Both" ? ["Cleaning", "Cook"] : [form.serviceType],
        accountNumber: form.accountNumber.trim(),
        ifscCode: form.ifscCode.trim(),
      });
      toast("Onboarding submitted successfully");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to submit onboarding";
      toast(message);
    } finally {
      hideLoader();
    }
  };

  const onDobChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowDobPicker(false);
    if (event.type === "dismissed" || !selectedDate) return;
    const yyyy = selectedDate.getFullYear();
    const mm = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const dd = String(selectedDate.getDate()).padStart(2, "0");
    setField("dateOfBirth", `${yyyy}-${mm}-${dd}`);
  };

  const pickDoc = async (key: UploadDocKey, fromCamera: boolean) => {
    const fn = fromCamera ? launchCamera : launchImageLibrary;
    const result = await fn({ mediaType: "photo", quality: 0.8, selectionLimit: 1 });
    const asset = result.assets?.[0];
    if (asset?.uri) {
      const type = String(asset.type ?? "").toLowerCase();
      if (type && !ALLOWED_IMAGE_TYPES.includes(type)) {
        toast("Unsupported image. Upload JPG, PNG, or WEBP.");
        return;
      }
      if (asset.fileSize && asset.fileSize > MAX_UPLOAD_BYTES) {
        toast("File too large. Maximum allowed size is 5 MB.");
        return;
      }
      setDocs((prev) => ({
        ...prev,
        [key]: { uri: asset.uri, type: asset.type, fileName: asset.fileName, fileSize: asset.fileSize },
      }));
    }
  };

  const uploadDocs = async () => {
    if (!docs.aadhaar || !docs.pan || !docs.selfie) {
      toast("Aadhaar, PAN and selfie are required");
      return;
    }
    try {
      setUploadProgress(0);
      setUploadingDocs(true);
      showLoader();
      await uploadPartnerDocuments(
        {
          aadhaar: { uri: docs.aadhaar.uri, type: docs.aadhaar.type, name: docs.aadhaar.fileName },
          pan: { uri: docs.pan.uri, type: docs.pan.type, name: docs.pan.fileName },
          selfie: { uri: docs.selfie.uri, type: docs.selfie.type, name: docs.selfie.fileName },
          certificate: docs.certificate
            ? { uri: docs.certificate.uri, type: docs.certificate.type, name: docs.certificate.fileName }
            : null,
        },
        setUploadProgress,
      );
      toast("Documents uploaded successfully");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to upload documents";
      toast(message);
    } finally {
      hideLoader();
      setUploadingDocs(false);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Partner Onboarding</Text>
      <Text style={styles.subtitle}>Fill all mandatory details and submit onboarding request.</Text>

      <Input label="Full Name" value={form.fullName} onChangeText={(v) => setField("fullName", v)} />
      <Input label="Email" value={form.email} onChangeText={(v) => setField("email", v)} keyboardType="email-address" />
      <Input label="Phone Number" value={form.phoneNumber} onChangeText={(v) => setField("phoneNumber", v)} keyboardType="phone-pad" />
      <View style={styles.fieldWrap}>
        <Text style={styles.label}>Gender *</Text>
        <TouchableOpacity style={styles.selectBtn} onPress={() => setShowGenderDropdown((v) => !v)}>
          <Text style={styles.selectText}>{form.gender}</Text>
          <Text style={styles.selectArrow}>{showGenderDropdown ? "▲" : "▼"}</Text>
        </TouchableOpacity>
        {showGenderDropdown ? (
          <View style={styles.dropdown}>
            {(["Select", "Male", "Female", "Other"] as FormState["gender"][]).map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.dropdownItem}
                onPress={() => {
                  setField("gender", option);
                  setShowGenderDropdown(false);
                }}
              >
                <Text style={styles.dropdownItemText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>
      <View style={styles.fieldWrap}>
        <Text style={styles.label}>Date Of Birth *</Text>
        <TouchableOpacity style={styles.selectBtn} onPress={() => setShowDobPicker(true)}>
          <Text style={styles.selectText}>{form.dateOfBirth || "Select date"}</Text>
          <Text style={styles.selectArrow}>DATE</Text>
        </TouchableOpacity>
      </View>
      {showDobPicker ? (
        <DateTimePicker
          value={form.dateOfBirth ? new Date(form.dateOfBirth) : new Date("1995-06-15")}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          maximumDate={new Date()}
          onChange={onDobChange}
        />
      ) : null}
      <Input label="Current City" value={form.currentCity} onChangeText={(v) => setField("currentCity", v)} />
      <Input label="Current State" value={form.currentState} onChangeText={(v) => setField("currentState", v)} />
      <Input label="Current Full Address" value={form.currentFullAddress} onChangeText={(v) => setField("currentFullAddress", v)} />
      <View style={styles.fieldWrap}>
        <Text style={styles.label}>Service Type *</Text>
        <TouchableOpacity style={styles.selectBtn} onPress={() => setShowServiceTypeDropdown((v) => !v)}>
          <Text style={styles.selectText}>{form.serviceType}</Text>
          <Text style={styles.selectArrow}>{showServiceTypeDropdown ? "▲" : "▼"}</Text>
        </TouchableOpacity>
        {showServiceTypeDropdown ? (
          <View style={styles.dropdown}>
            {(["Select", "Cleaning", "Cook", "Both"] as FormState["serviceType"][]).map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.dropdownItem}
                onPress={() => {
                  setField("serviceType", option);
                  setShowServiceTypeDropdown(false);
                }}
              >
                <Text style={styles.dropdownItemText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>
      <Input label="Account Number" value={form.accountNumber} onChangeText={(v) => setField("accountNumber", v)} keyboardType="number-pad" />
      <Input label="IFSC Code" value={form.ifscCode} onChangeText={(v) => setField("ifscCode", v)} autoCapitalize="characters" />

      <View style={styles.docsSection}>
        <Text style={styles.docsSectionTitle}>Upload Documents</Text>
        {(["aadhaar", "pan", "selfie", "certificate"] as UploadDocKey[]).map((key) => (
          <View key={key} style={styles.docCard}>
            <Text style={styles.docLabel}>{DOC_LABELS[key]} {key === "certificate" ? "" : "*"}</Text>
            <Text style={styles.docMeta}>{docs[key]?.fileName ?? "No file selected"}</Text>
            <View style={styles.docBtnRow}>
              <>
                <TouchableOpacity style={styles.docBtn} onPress={() => pickDoc(key, true)}>
                  <Text style={styles.docBtnText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.docBtn} onPress={() => pickDoc(key, false)}>
                  <Text style={styles.docBtnText}>Gallery</Text>
                </TouchableOpacity>
              </>
            </View>
            {docs[key] ? (
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => setDocs((prev) => ({ ...prev, [key]: null }))}
              >
                <Text style={styles.removeBtnText}>Remove</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ))}
        <Text style={styles.progress}>Upload Progress: {uploadProgress}%</Text>
        <TouchableOpacity style={[styles.submitBtn, styles.uploadBtn]} onPress={uploadDocs} disabled={uploadingDocs}>
          <Text style={styles.submitText}>{uploadingDocs ? "Uploading..." : "Upload Documents"}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.submitBtn} onPress={submit}>
        <Text style={styles.submitText}>Submit Onboarding</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Input({ label, ...props }: { label: string } & TextInputProps) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        style={styles.input}
        placeholderTextColor={COLORS.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  container: { padding: 16, gap: 10 },
  title: { color: COLORS.textPrimary, fontSize: 24, fontWeight: "800" },
  subtitle: { color: COLORS.textSecondary, marginBottom: 4 },
  fieldWrap: { gap: 6, marginHorizontal: -16 },
  label: { color: COLORS.textSecondary, fontWeight: "700", fontSize: 12, marginHorizontal: 16 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    color: COLORS.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectText: { color: COLORS.textPrimary, fontWeight: "600" },
  selectArrow: { color: COLORS.textSecondary, fontSize: 12 },
  dropdown: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: COLORS.surface,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dropdownItemText: { color: COLORS.textPrimary, fontWeight: "600" },
  submitBtn: {
    marginTop: 8,
    marginHorizontal: -16,
    borderRadius: 10,
    backgroundColor: COLORS.secondary,
    alignItems: "center",
    paddingVertical: 12,
  },
  submitText: { color: COLORS.textPrimary, fontWeight: "800" },
  docsSection: { marginTop: 4, marginHorizontal: -16, gap: 8 },
  docsSectionTitle: { color: COLORS.textPrimary, fontWeight: "800", fontSize: 14, marginHorizontal: 16 },
  docCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  docLabel: { color: COLORS.textPrimary, fontWeight: "700", fontSize: 12 },
  docMeta: { color: COLORS.textSecondary, fontSize: 12 },
  docBtnRow: { flexDirection: "row", gap: 8 },
  docBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  docBtnWide: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  docBtnText: { color: COLORS.textPrimary, fontWeight: "700" },
  removeBtn: {
    marginTop: 4,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: COLORS.surface,
  },
  removeBtnText: { color: COLORS.error, fontWeight: "700" },
  uploadBtn: { marginTop: 2, marginHorizontal: 0 },
  progress: { color: COLORS.textSecondary, fontSize: 12, textAlign: "right", marginHorizontal: 16 },
});
