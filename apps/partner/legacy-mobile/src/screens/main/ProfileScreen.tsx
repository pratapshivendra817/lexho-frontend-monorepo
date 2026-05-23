import React, { useCallback, useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { launchImageLibrary } from "react-native-image-picker";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  getPartnerProfile,
  getPartnerSkills,
  getOrderHistory,
  updatePartnerProfile,
  updatePartnerSkills,
  uploadPartnerProfileImage,
} from "../../services/partnerService";
import { COLORS } from "../../constants/colors";
import { useAppFeedback } from "../../context/AppFeedbackContext";

type ProfileForm = {
  name: string;
  email: string;
  city: string;
  address: string;
  serviceCategory: string;
};

const schema: yup.ObjectSchema<ProfileForm> = yup.object({
  name: yup.string().trim().required("Name is required").min(2, "Name should be at least 2 characters"),
  email: yup.string().trim().email("Enter a valid email").required("Email is required"),
  city: yup.string().trim().required("City is required"),
  address: yup.string().trim().required("Address is required"),
  serviceCategory: yup.string().trim().required("Service category is required"),
});

export default function ProfileScreen({ navigation }: any) {
  const { showLoader, hideLoader, toast } = useAppFeedback();
  const [profile, setProfile] = useState<any>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [selectedSubServiceIds, setSelectedSubServiceIds] = useState<number[]>([]);
  const [categoryDraft, setCategoryDraft] = useState("");
  const [subServiceDraft, setSubServiceDraft] = useState("");
  const [categorySuggestions, setCategorySuggestions] = useState<number[]>([]);
  const [subServiceSuggestions, setSubServiceSuggestions] = useState<number[]>([]);
  const {
    control,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileForm>({
    resolver: yupResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      city: "",
      address: "",
      serviceCategory: "Cleaning",
    },
    mode: "onChange",
  });

  const load = useCallback(async () => {
    try {
      showLoader();
      const data = await getPartnerProfile();
      setProfile(data);
      reset({
        name: data.name ?? "",
        email: data.email ?? "",
        city: data.city ?? "",
        address: data.address ?? "",
        serviceCategory: data.serviceCategory ?? "Cleaning",
      });
      try {
        const skills = await getPartnerSkills();
        setSelectedCategoryIds(skills.categoryIds);
        setSelectedSubServiceIds(skills.subServiceIds);
      } catch {
        // Keep skills optional in profile load flow.
      }
      try {
        const history = await getOrderHistory({ page: 0, size: 50 });
        const cat = history
          .map((row) => Number((row as any)?.categoryId ?? (row as any)?.serviceCategoryId ?? 0))
          .filter((value) => Number.isFinite(value) && value > 0);
        const sub = history
          .map((row) => Number((row as any)?.subServiceId ?? (row as any)?.serviceId ?? 0))
          .filter((value) => Number.isFinite(value) && value > 0);
        setCategorySuggestions(Array.from(new Set(cat)).slice(0, 20));
        setSubServiceSuggestions(Array.from(new Set(sub)).slice(0, 20));
      } catch {
        // optional source for suggestions
      }
    } catch (error: any) {
      toast(error?.message ?? "Unable to load profile");
    } finally {
      hideLoader();
    }
  }, [hideLoader, reset, showLoader, toast]);

  useEffect(() => {
    load().catch(() => null);
  }, [load]);

  const onSave = async (values: ProfileForm) => {
    try {
      showLoader();
      await updatePartnerProfile(values);
      toast("Profile updated successfully");
      await load();
    } catch (error: any) {
      toast(error?.message ?? "Unable to save profile");
    } finally {
      hideLoader();
    }
  };

  const onSaveSkills = async () => {
    try {
      showLoader();
      await updatePartnerSkills({ categoryIds: selectedCategoryIds, subServiceIds: selectedSubServiceIds });
      toast("Skills updated");
      await load();
    } catch (error: any) {
      toast(error?.message ?? "Unable to save skills");
    } finally {
      hideLoader();
    }
  };

  const onImageUpload = async () => {
    try {
      const result = await launchImageLibrary({ mediaType: "photo", quality: 0.8 });
      const asset = result.assets?.[0];
      if (!asset?.uri) return;
      showLoader();
      await uploadPartnerProfileImage({ uri: asset.uri, type: asset.type, name: asset.fileName });
      toast("Profile image updated");
      await load();
    } catch (error: any) {
      toast(error?.message ?? "Unable to upload profile image");
    } finally {
      hideLoader();
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Profile</Text>
      {profile?.profileImageUrl ? <Image source={{ uri: profile.profileImageUrl }} style={styles.avatar} /> : <View style={styles.avatarPlaceholder}><Text style={styles.avatarText}>No Image</Text></View>}
      <TouchableOpacity style={styles.btn} onPress={onImageUpload}><Text style={styles.btnText}>Upload Profile Image</Text></TouchableOpacity>

      <FormInput control={control} name="name" label="Name" error={errors.name?.message} />
      <FormInput control={control} name="email" label="Email" keyboardType="email-address" autoCapitalize="none" error={errors.email?.message} />
      <FormInput control={control} name="city" label="City" error={errors.city?.message} />
      <FormInput control={control} name="address" label="Address" error={errors.address?.message} />
      <FormInput control={control} name="serviceCategory" label="Service Category" error={errors.serviceCategory?.message} />

      <Text style={styles.meta}>KYC Status: {profile?.kycStatus ?? "Pending"}</Text>

      <View style={styles.skillsCard}>
        <Text style={styles.skillsTitle}>Dispatch Skills</Text>
        <Text style={styles.skillsHint}>Choose category and sub-service IDs used for dispatch matching.</Text>

        <Text style={styles.skillsLabel}>Selected Categories</Text>
        <View style={styles.chipsWrap}>
          {selectedCategoryIds.map((id) => (
            <TouchableOpacity
              key={`cat-selected-${id}`}
              style={[styles.skillChip, styles.skillChipSelected]}
              onPress={() => setSelectedCategoryIds((prev) => prev.filter((value) => value !== id))}
            >
              <Text style={styles.skillChipText}>{`#${id} ×`}</Text>
            </TouchableOpacity>
          ))}
          {selectedCategoryIds.length === 0 ? <Text style={styles.emptySkillText}>No category selected</Text> : null}
        </View>
        <View style={styles.skillInputRow}>
          <TextInput
            value={categoryDraft}
            onChangeText={setCategoryDraft}
            keyboardType="number-pad"
            placeholder="Add category ID"
            placeholderTextColor={COLORS.textMuted}
            style={[styles.input, styles.skillInput]}
          />
          <TouchableOpacity
            style={[styles.btn, styles.skillAddBtn]}
            onPress={() => {
              const parsed = Number(categoryDraft.trim());
              if (!Number.isFinite(parsed) || parsed <= 0) return;
              setSelectedCategoryIds((prev) => (prev.includes(parsed) ? prev : [...prev, parsed]));
              setCategoryDraft("");
            }}
          >
            <Text style={styles.btnText}>Add</Text>
          </TouchableOpacity>
        </View>
        {categorySuggestions.length > 0 ? (
          <View style={styles.chipsWrap}>
            {categorySuggestions.map((id) => (
              <TouchableOpacity
                key={`cat-suggest-${id}`}
                style={[styles.skillChip, selectedCategoryIds.includes(id) ? styles.skillChipSelected : styles.skillChipMuted]}
                onPress={() =>
                  setSelectedCategoryIds((prev) =>
                    prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
                  )
                }
              >
                <Text style={styles.skillChipText}>{`#${id}`}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <Text style={styles.skillsLabel}>Selected Sub-services</Text>
        <View style={styles.chipsWrap}>
          {selectedSubServiceIds.map((id) => (
            <TouchableOpacity
              key={`sub-selected-${id}`}
              style={[styles.skillChip, styles.skillChipSelected]}
              onPress={() => setSelectedSubServiceIds((prev) => prev.filter((value) => value !== id))}
            >
              <Text style={styles.skillChipText}>{`#${id} ×`}</Text>
            </TouchableOpacity>
          ))}
          {selectedSubServiceIds.length === 0 ? <Text style={styles.emptySkillText}>No sub-service selected</Text> : null}
        </View>
        <View style={styles.skillInputRow}>
          <TextInput
            value={subServiceDraft}
            onChangeText={setSubServiceDraft}
            keyboardType="number-pad"
            placeholder="Add sub-service ID"
            placeholderTextColor={COLORS.textMuted}
            style={[styles.input, styles.skillInput]}
          />
          <TouchableOpacity
            style={[styles.btn, styles.skillAddBtn]}
            onPress={() => {
              const parsed = Number(subServiceDraft.trim());
              if (!Number.isFinite(parsed) || parsed <= 0) return;
              setSelectedSubServiceIds((prev) => (prev.includes(parsed) ? prev : [...prev, parsed]));
              setSubServiceDraft("");
            }}
          >
            <Text style={styles.btnText}>Add</Text>
          </TouchableOpacity>
        </View>
        {subServiceSuggestions.length > 0 ? (
          <View style={styles.chipsWrap}>
            {subServiceSuggestions.map((id) => (
              <TouchableOpacity
                key={`sub-suggest-${id}`}
                style={[styles.skillChip, selectedSubServiceIds.includes(id) ? styles.skillChipSelected : styles.skillChipMuted]}
                onPress={() =>
                  setSelectedSubServiceIds((prev) =>
                    prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
                  )
                }
              >
                <Text style={styles.skillChipText}>{`#${id}`}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
        <TouchableOpacity style={[styles.btn, styles.primary]} onPress={onSaveSkills}>
          <Text style={styles.btnText}>Save Skills</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[styles.btn, styles.primary]} onPress={handleSubmit(onSave)} disabled={isSubmitting}>
        <Text style={styles.btnText}>{isSubmitting ? "Saving..." : "Save Profile"}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate("OnboardingSubmit")}><Text style={styles.btnText}>Submit Onboarding</Text></TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate("DocumentUpload")}><Text style={styles.btnText}>Upload Documents</Text></TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate("Shift")}><Text style={styles.btnText}>Shift Settings</Text></TouchableOpacity>
    </ScrollView>
  );
}

function FormInput({ label, control, name, error, ...rest }: any) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: COLORS.textSecondary, fontWeight: "700" }}>{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            {...rest}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            style={[styles.input, error ? styles.inputError : null]}
            placeholderTextColor={COLORS.textMuted}
          />
        )}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  container: { padding: 16, gap: 12 },
  title: { color: COLORS.textPrimary, fontWeight: "800", fontSize: 24 },
  avatar: { width: 90, height: 90, borderRadius: 45, alignSelf: "center" },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, alignSelf: "center", alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surface },
  avatarText: { color: COLORS.textSecondary, fontSize: 12 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, backgroundColor: COLORS.surface, color: COLORS.textPrimary, paddingHorizontal: 12, paddingVertical: 10 },
  inputError: { borderColor: COLORS.error },
  errorText: { color: COLORS.error, fontSize: 12 },
  btn: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, alignItems: "center", backgroundColor: COLORS.surfaceElevated },
  primary: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  btnText: { color: COLORS.textPrimary, fontWeight: "700" },
  meta: { color: COLORS.textSecondary },
  skillsCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    padding: 12,
    gap: 8,
  },
  skillsTitle: { color: COLORS.textPrimary, fontWeight: "800" },
  skillsHint: { color: COLORS.textSecondary, fontSize: 12 },
  skillsLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: "700", marginTop: 4 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  skillChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  skillChipSelected: { borderColor: COLORS.secondary, backgroundColor: "rgba(11,185,131,0.18)" },
  skillChipMuted: { borderColor: COLORS.border, backgroundColor: COLORS.surfaceSoft },
  skillChipText: { color: COLORS.textPrimary, fontSize: 12, fontWeight: "700" },
  emptySkillText: { color: COLORS.textMuted, fontSize: 12 },
  skillInputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  skillInput: { flex: 1 },
  skillAddBtn: { paddingVertical: 10, paddingHorizontal: 14 },
});

