import React, { useState } from "react";
import { Alert, ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { keepLocalCopy, pick, types } from "@react-native-documents/picker";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import DeviceInfo from "react-native-device-info";
import { COLORS } from "../../constants/colors";
import { getReadableApiError } from "../../services/api";
import { getActiveServiceCategories, getPartnerOnboarding, submitPartnerOnboarding, type PartnerServiceCategoryOption } from "../../services/partnerService";

type FileValue = { uri: string; name?: string; type?: string };

const documentPickerTypes = (key: string) =>
  key === "selfie" ? [types.images] : [types.images, types.pdf];

const INDIAN_STATES = ["Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"];
const DOCUMENT_UPLOADS = [
  { key: "aadhaarFront", label: "Aadhaar front", required: true },
  { key: "aadhaarBack", label: "Aadhaar back", required: true },
  { key: "panCard", label: "PAN card", required: false },
  { key: "selfie", label: "Selfie", required: true },
  { key: "certificate", label: "Certificate (optional)", required: false },
];

export default function PartnerOnboardingScreen({ onLogout }: { onLogout?: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState("");
  const [genderOpen, setGenderOpen] = useState(false);
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [stateOpen, setStateOpen] = useState(false);
  const [pincode, setPincode] = useState("");
  const [serviceCategoryId, setServiceCategoryId] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<PartnerServiceCategoryOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [files, setFiles] = useState<Record<string, FileValue | undefined>>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState("PENDING");
  const [documentStatus, setDocumentStatus] = useState("PENDING");
  const [reviewNote, setReviewNote] = useState("");
  const [lastReviewedAt, setLastReviewedAt] = useState("");

  const loadExistingOnboarding = React.useCallback(async () => {
    try {
      const payload = await getPartnerOnboarding();
      const data = payload?.data ?? payload?.onboarding ?? payload;
      if (!data || typeof data !== "object") return;
      setApplicationStatus(String(data.applicationStatus ?? data.status ?? "PENDING").toUpperCase());
      setDocumentStatus(String(data.documentStatus ?? "PENDING").toUpperCase());
      setReviewNote(String(data.rejectionReason ?? data.reviewNote ?? data.note ?? ""));
      setLastReviewedAt(String(data.reviewedAt ?? data.updatedAt ?? data.submittedAt ?? ""));
      // Full name must always be entered manually during onboarding.
      setDateOfBirth(String(data.dateOfBirth ?? "")); setGender(String(data.gender ?? ""));
      setAddressLine1(String(data.addressLine1 ?? data.address ?? data.fullAddress ?? "")); setCity(String(data.city ?? ""));
      setState(String(data.state ?? "")); setPincode(String(data.pincode ?? data.pinCode ?? ""));
      const primaryCategoryId = String(data.serviceCategoryId ?? "");
      const selected = Array.isArray(data.skills) ? data.skills.map((item: unknown) => String(item)) : [];
      setServiceCategoryId(primaryCategoryId);
      setSelectedCategoryIds(selected.length > 0 ? selected.slice(0, 2) : primaryCategoryId ? [primaryCategoryId] : []);
      setAccountNumber(String(data.accountNumber ?? "")); setIfscCode(String(data.ifscCode ?? ""));
    } catch {
      // First-time partners may not have an onboarding record yet.
    }
  }, []);

  React.useEffect(() => {
    setCategoriesLoading(true);
    void getActiveServiceCategories()
      .then(setCategories)
      .catch((error) => Alert.alert("Service category", getReadableApiError(error, "Unable to load service categories")))
      .finally(() => setCategoriesLoading(false));
    void loadExistingOnboarding();
  }, [loadExistingOnboarding]);

  const refreshOnboarding = React.useCallback(async () => {
    setRefreshing(true);
    await loadExistingOnboarding();
    setRefreshing(false);
  }, [loadExistingOnboarding]);

  React.useEffect(() => {
    if (categories.length === 0 || selectedCategoryIds.length === 0) return;
    setSelectedCategoryIds((current) => current.map((value) => {
      const match = categories.find((category) => category.id === value || category.name.toLowerCase() === value.toLowerCase());
      return match?.id ?? value;
    }));
  }, [categories, selectedCategoryIds.length]);

  React.useEffect(() => {
    setServiceCategoryId(selectedCategoryIds[0] ?? "");
  }, [selectedCategoryIds]);

  const toggleCategory = (categoryId: string) => {
    setSelectedCategoryIds((current) => {
      if (current.includes(categoryId)) return current.filter((id) => id !== categoryId);
      if (current.length >= 2) {
        Alert.alert("Service category", "Maximum 2 service category select kar sakte hain.");
        return current;
      }
      return [...current, categoryId];
    });
  };

  const selectedCategoryLabel = selectedCategoryIds
    .map((id) => categories.find((category) => category.id === id)?.name ?? id)
    .join(", ");

  const onDateOfBirthChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (!selectedDate) return;
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const day = String(selectedDate.getDate()).padStart(2, "0");
    setDateOfBirth(`${year}-${month}-${day}`);
  };

  const choose = async (key: string) => {
    try {
      const selected = await pick({ type: documentPickerTypes(key), allowMultiSelection: false });
      const file = selected?.[0];
      if (file?.uri) {
        const fileName = file.name ?? `${key}.jpg`;
        const [localCopy] = await keepLocalCopy({
          destination: "cachesDirectory",
          files: [{ uri: file.uri, fileName }],
        });
        if (localCopy.status === "error") {
          throw new Error(localCopy.copyError);
        }
        setFiles((current) => ({
          ...current,
          [key]: {
            uri: localCopy.localUri,
            name: fileName,
            type: file.type ?? undefined,
          },
        }));
      }
    } catch (error: any) {
      if (!String(error?.code ?? "").toLowerCase().includes("cancel")) Alert.alert("Upload failed", "Document select नहीं हो सका।");
    }
  };

  const submit = async () => {
    const required = ["aadhaarFront", "aadhaarBack", "panCard", "selfie"];
    const selectedCategories = selectedCategoryIds.slice(0, 2);
    if (!name.trim() || !dateOfBirth.trim() || !gender.trim() || !addressLine1.trim() || !city.trim() || !state.trim() || !pincode.trim() || selectedCategories.length === 0 || !accountNumber.trim() || !ifscCode.trim() || required.some((key) => !files[key])) {
      Alert.alert("Details required", "Profile details और सभी required documents upload करें।");
      return;
    }
    try {
      setLoading(true);
      await submitPartnerOnboarding({ fullName: name.trim(), dateOfBirth: dateOfBirth.trim(), gender: gender.trim().toUpperCase(), addressLine1: addressLine1.trim(), city: city.trim(), state: state.trim(), pincode: pincode.trim(), serviceCategoryId: serviceCategoryId.trim() || selectedCategories[0], skills: selectedCategories, accountNumber: accountNumber.trim(), ifscCode: ifscCode.trim().toUpperCase() }, {
        aadhaarFront: files.aadhaarFront, aadhaarBack: files.aadhaarBack, panCard: files.panCard, selfie: files.selfie, certificate: files.certificate,
      });
      setApplicationStatus("PENDING");
      setDocumentStatus("UNDER_REVIEW");
      setReviewNote("");
      void loadExistingOnboarding();
      Alert.alert("Submitted", "आपका onboarding application review के लिए भेज दिया गया है।");
    } catch (error: any) {
      Alert.alert("Submission failed", getReadableApiError(error, error?.message ?? "Please try again."));
    } finally { setLoading(false); }
  };

  return <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingHorizontal: 0 }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refreshOnboarding()} tintColor={COLORS.secondary} colors={[COLORS.secondary]} />}>
    <Text style={styles.title}>Partner Onboarding</Text>
    <Text style={styles.subtitle}>अपनी details और documents submit करके partner बनें।</Text>
    <View style={styles.statusCard}>
      <View style={styles.statusHeader}>
        <View>
          <Text style={styles.statusLabel}>Current status</Text>
          <Text style={styles.statusTitle}>{statusLabel(applicationStatus)}</Text>
        </View>
        <StatusPill value={applicationStatus} />
      </View>
      <View style={styles.statusGrid}>
        <View style={styles.statusMetric}><Text style={styles.statusMetricLabel}>Application</Text><Text style={styles.statusMetricValue}>{statusLabel(applicationStatus)}</Text></View>
        <View style={styles.statusMetric}><Text style={styles.statusMetricLabel}>Documents</Text><Text style={styles.statusMetricValue}>{statusLabel(documentStatus)}</Text></View>
      </View>
      {reviewNote ? <Text style={styles.reviewNote}>{reviewNote}</Text> : null}
      {lastReviewedAt ? <Text style={styles.reviewMeta}>Last updated {formatStatusDate(lastReviewedAt)}</Text> : null}
    </View>
    <Text style={styles.section}>Full name</Text><TextInput style={styles.input} placeholder="Enter full name" placeholderTextColor={COLORS.textSecondary} value={name} onChangeText={setName} />
    <Text style={styles.section}>Date of birth</Text>
    <TouchableOpacity style={[styles.input, { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }]} onPress={() => setShowDatePicker(true)} activeOpacity={0.85}>
      <Text style={dateOfBirth ? styles.uploadText : styles.helper}>{dateOfBirth || "Select date of birth"}</Text>
      <MaterialCommunityIcons name="calendar-month-outline" size={22} color={COLORS.textSecondary} />
    </TouchableOpacity>
    {showDatePicker ? <DateTimePicker mode="date" value={dateOfBirth ? new Date(`${dateOfBirth}T00:00:00`) : new Date()} maximumDate={new Date()} display="default" onChange={onDateOfBirthChange} /> : null}
    <Text style={styles.section}>Gender</Text>
    <TouchableOpacity style={styles.dropdown} onPress={() => setGenderOpen((open) => !open)} activeOpacity={0.85}>
      <Text style={[styles.dropdownText, !gender && styles.dropdownPlaceholder]}>{gender || "Select gender"}</Text>
      <MaterialCommunityIcons name={genderOpen ? "chevron-up" : "chevron-down"} size={22} color={COLORS.textSecondary} />
    </TouchableOpacity>
    {genderOpen ? <View style={styles.categoryList}>
      {["MALE", "FEMALE", "OTHER"].map((option) => (
        <TouchableOpacity key={option} style={[styles.categoryOption, gender === option && styles.categoryOptionSelected]} onPress={() => { setGender(option); setGenderOpen(false); }} activeOpacity={0.85}>
          <Text style={[styles.categoryText, gender === option && styles.categoryTextSelected]}>{option}</Text>
          <MaterialCommunityIcons name={gender === option ? "check-circle" : "circle-outline"} size={22} color={gender === option ? COLORS.success : COLORS.textSecondary} />
        </TouchableOpacity>
      ))}
    </View> : null}
    <Text style={styles.section}>Address</Text><TextInput style={styles.input} placeholder="Enter address" placeholderTextColor={COLORS.textSecondary} value={addressLine1} onChangeText={setAddressLine1} />
    <Text style={styles.section}>City</Text><TextInput style={styles.input} placeholder="Enter city" placeholderTextColor={COLORS.textSecondary} value={city} onChangeText={setCity} />
    <Text style={styles.section}>State</Text>
    <TouchableOpacity style={styles.dropdown} onPress={() => setStateOpen((open) => !open)} activeOpacity={0.85}>
      <Text style={[styles.dropdownText, !state && styles.dropdownPlaceholder]}>{state || "Select state"}</Text>
      <MaterialCommunityIcons name={stateOpen ? "chevron-up" : "chevron-down"} size={22} color={COLORS.textSecondary} />
    </TouchableOpacity>
    {stateOpen ? <View style={styles.categoryList}>
      {INDIAN_STATES.map((option) => (
        <TouchableOpacity key={option} style={[styles.categoryOption, state === option && styles.categoryOptionSelected]} onPress={() => { setState(option); setStateOpen(false); }} activeOpacity={0.85}>
          <Text style={[styles.categoryText, state === option && styles.categoryTextSelected]}>{option}</Text>
          <MaterialCommunityIcons name={state === option ? "check-circle" : "circle-outline"} size={22} color={state === option ? COLORS.success : COLORS.textSecondary} />
        </TouchableOpacity>
      ))}
    </View> : null}
    <Text style={styles.section}>Pincode</Text><TextInput style={styles.input} placeholder="Enter pincode" placeholderTextColor={COLORS.textSecondary} keyboardType="number-pad" value={pincode} onChangeText={setPincode} />
    <Text style={styles.section}>Service category</Text>
    {categoriesLoading ? <ActivityIndicator color={COLORS.secondary} /> : null}
    <TouchableOpacity style={styles.dropdown} onPress={() => setCategoryOpen((open) => !open)} activeOpacity={0.85}>
      <Text style={[styles.dropdownText, !selectedCategoryLabel && styles.dropdownPlaceholder]}>{selectedCategoryLabel || "Select service category"}</Text>
      <MaterialCommunityIcons name={categoryOpen ? "chevron-up" : "chevron-down"} size={22} color={COLORS.textSecondary} />
    </TouchableOpacity>
    {categoryOpen ? <View style={styles.categoryList}>
      {categories.map((category) => {
        const selected = selectedCategoryIds.includes(category.id);
        return (
          <TouchableOpacity key={category.id} style={[styles.categoryOption, selected && styles.categoryOptionSelected]} onPress={() => toggleCategory(category.id)} activeOpacity={0.85}>
            <Text style={[styles.categoryText, selected && styles.categoryTextSelected]}>{category.name}</Text>
            <MaterialCommunityIcons name={selected ? "check-circle" : "circle-outline"} size={22} color={selected ? COLORS.success : COLORS.textSecondary} />
          </TouchableOpacity>
        );
      })}
    </View> : null}
    <Text style={styles.section}>Bank account number</Text><TextInput style={styles.input} placeholder="Enter bank account number" placeholderTextColor={COLORS.textSecondary} keyboardType="number-pad" value={accountNumber} onChangeText={setAccountNumber} />
    <Text style={styles.section}>IFSC code</Text><TextInput style={styles.input} placeholder="Enter IFSC code" placeholderTextColor={COLORS.textSecondary} autoCapitalize="characters" value={ifscCode} onChangeText={setIfscCode} />
    <Text style={styles.section}>Required documents</Text>
    <View style={{ gap: 4 }}>
      <Text style={styles.section}>Aadhaar front <Text style={{ color: "#B42318" }}>*</Text></Text>
      <TouchableOpacity style={styles.upload} onPress={() => void choose("aadhaarFront")}><Text style={styles.uploadText}>{files.aadhaarFront ? `✓ ${files.aadhaarFront.name ?? "Aadhaar front"}` : "Upload Aadhaar front"}</Text></TouchableOpacity>
      <Text style={styles.section}>Aadhaar back <Text style={{ color: "#B42318" }}>*</Text></Text>
      <TouchableOpacity style={styles.upload} onPress={() => void choose("aadhaarBack")}><Text style={styles.uploadText}>{files.aadhaarBack ? `✓ ${files.aadhaarBack.name ?? "Aadhaar back"}` : "Upload Aadhaar back"}</Text></TouchableOpacity>
      <Text style={styles.section}>PAN card</Text>
      <TouchableOpacity style={styles.upload} onPress={() => void choose("panCard")}><Text style={styles.uploadText}>{files.panCard ? `✓ ${files.panCard.name ?? "PAN card"}` : "Upload PAN card"}</Text></TouchableOpacity>
      <Text style={styles.section}>Selfie <Text style={{ color: "#B42318" }}>*</Text></Text>
      <TouchableOpacity style={styles.upload} onPress={() => void choose("selfie")}><Text style={styles.uploadText}>{files.selfie ? `✓ ${files.selfie.name ?? "Selfie"}` : "Upload Selfie"}</Text></TouchableOpacity>
      <Text style={styles.section}>Certificate (optional)</Text>
      <TouchableOpacity style={styles.upload} onPress={() => void choose("certificate")}><Text style={styles.uploadText}>{files.certificate ? `✓ ${files.certificate.name ?? "Certificate"}` : "Upload Certificate (optional)"}</Text></TouchableOpacity>
    </View>
    {false && DOCUMENT_UPLOADS.map(({ key, label, required }) => (
      <TouchableOpacity key={key} style={styles.upload} onPress={() => void choose(key)} activeOpacity={0.85}>
        <Text style={styles.uploadText}>{files[key] ? `✓ ${files[key]?.name ?? label}` : `Upload ${label}${required ? " *" : ""}`}</Text>
      </TouchableOpacity>
    ))}
    <TouchableOpacity style={styles.submit} onPress={() => void submit()} disabled={loading}>{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit onboarding</Text>}</TouchableOpacity>
    {onLogout ? <TouchableOpacity style={[styles.logout, { backgroundColor: "#B42318" }]} onPress={() => Alert.alert("Logout", "Are you sure you want to logout?", [{ text: "Cancel", style: "cancel" }, { text: "Logout", style: "destructive", onPress: () => void onLogout() }])} activeOpacity={0.85}>
      <Text style={[styles.logoutText, { color: "#fff" }]}>Logout</Text>
    </TouchableOpacity> : null}
    <Text style={styles.version}>Version {DeviceInfo.getVersion()}</Text>
  </ScrollView>;
}

function statusLabel(value: string) {
  return String(value || "PENDING").replace(/_/g, " ");
}

function formatStatusDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function StatusPill({ value }: { value: string }) {
  const normalized = String(value || "PENDING").toUpperCase();
  const tone = normalized === "APPROVED" || normalized === "VERIFIED"
    ? styles.statusPillSuccess
    : normalized === "REJECTED" || normalized === "BLOCKED"
      ? styles.statusPillDanger
      : styles.statusPillPending;
  return <Text style={[styles.statusPill, tone]}>{statusLabel(normalized)}</Text>;
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: COLORS.background }, content: { padding: 16, gap: 12 }, title: { color: COLORS.textPrimary, fontSize: 24, fontWeight: "800" }, subtitle: { color: COLORS.textSecondary, lineHeight: 21, marginBottom: 8 }, statusCard: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderRadius: 12, borderWidth: 1, gap: 12, padding: 14 }, statusHeader: { alignItems: "flex-start", flexDirection: "row", gap: 12, justifyContent: "space-between" }, statusLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: "700" }, statusTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: "900", marginTop: 2 }, statusPill: { borderRadius: 999, fontSize: 11, fontWeight: "900", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 5 }, statusPillSuccess: { backgroundColor: "rgba(16,185,129,0.16)", color: COLORS.success }, statusPillDanger: { backgroundColor: "rgba(180,35,24,0.14)", color: "#B42318" }, statusPillPending: { backgroundColor: COLORS.surfaceElevated, color: COLORS.secondary }, statusGrid: { flexDirection: "row", gap: 10 }, statusMetric: { backgroundColor: COLORS.surfaceSoft, borderRadius: 10, flex: 1, padding: 10 }, statusMetricLabel: { color: COLORS.textSecondary, fontSize: 11, fontWeight: "700" }, statusMetricValue: { color: COLORS.textPrimary, fontSize: 13, fontWeight: "900", marginTop: 3 }, reviewNote: { color: COLORS.textPrimary, lineHeight: 20 }, reviewMeta: { color: COLORS.textSecondary, fontSize: 12 }, input: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: 10, padding: 13, color: COLORS.textPrimary }, section: { color: COLORS.textPrimary, fontSize: 17, fontWeight: "800", marginTop: 8 }, helper: { color: COLORS.textSecondary, fontSize: 12, marginTop: -6 }, dropdown: { alignItems: "center", backgroundColor: COLORS.surface, borderColor: COLORS.border, borderRadius: 10, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", padding: 13 }, dropdownText: { color: COLORS.textPrimary, flex: 1, fontWeight: "700", paddingRight: 10 }, dropdownPlaceholder: { color: COLORS.textSecondary }, categoryList: { gap: 10 }, emptyText: { color: COLORS.textSecondary, paddingHorizontal: 2, paddingVertical: 6 }, categoryOption: { alignItems: "center", backgroundColor: COLORS.surface, borderColor: COLORS.borderSoft, borderRadius: 10, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", padding: 14 }, categoryOptionSelected: { backgroundColor: COLORS.surfaceElevated, borderColor: COLORS.success }, categoryText: { color: COLORS.textPrimary, flex: 1, fontWeight: "700", paddingRight: 10 }, categoryTextSelected: { color: COLORS.white }, upload: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: 10, padding: 14 }, uploadText: { color: COLORS.textPrimary, fontWeight: "700" }, submit: { backgroundColor: COLORS.secondary, borderRadius: 10, alignItems: "center", padding: 15, marginTop: 10 }, submitText: { color: "#fff", fontWeight: "800" }, logout: { alignItems: "center", borderColor: "#B42318", borderRadius: 10, borderWidth: 1, padding: 14, marginTop: 4 }, logoutText: { color: "#B42318", fontWeight: "800" }, version: { color: COLORS.textSecondary, fontSize: 12, textAlign: "center", marginTop: 2, marginBottom: 8 } });
