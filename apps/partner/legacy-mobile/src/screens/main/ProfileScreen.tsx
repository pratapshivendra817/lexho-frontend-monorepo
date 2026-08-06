import React, { useCallback, useEffect, useRef, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { launchImageLibrary } from "react-native-image-picker";
import * as yup from "yup";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import {
  getPartnerProfile,
  updatePartnerProfile,
  uploadPartnerProfileImage,
} from "../../services/partnerService";
import { COLORS } from "../../constants/colors";
import { useAppFeedback } from "../../context/AppFeedbackContext";
import { canAttemptOnlineAction, enqueueProfileUpdate } from "../../services/partnerActionQueueService";

type ProfileForm = {
  fullName: string;
  phone: string;
  email: string;
  city: string;
  pincode: string;
  address: string;
};

const initialForm: ProfileForm = {
  fullName: "",
  phone: "",
  email: "",
  city: "",
  pincode: "",
  address: "",
};

const schema: yup.ObjectSchema<ProfileForm> = yup.object({
  fullName: yup.string().trim().required("Name is required").min(2, "Name should be at least 2 characters"),
  phone: yup.string().trim().matches(/^\d{10}$/, "Enter a valid 10 digit phone number").required("Phone is required"),
  email: yup.string().trim().email("Enter a valid email").required("Email is required"),
  city: yup.string().trim().required("City is required"),
  pincode: yup.string().trim().matches(/^\d{6}$/, "Enter a valid 6 digit pincode").required("Pincode is required"),
  address: yup.string().trim().required("Address is required"),
});

export default function ProfileScreen({ navigation }: any) {
  const { showLoader, hideLoader, toast } = useAppFeedback();
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState<ProfileForm>(initialForm);
  const formRef = useRef<ProfileForm>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileForm, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async (fallbackProfileImageUrl?: string, preservedValues?: Partial<ProfileForm>) => {
    try {
      showLoader();
      const data = await getPartnerProfile();
      setProfile({
        ...data,
        profileImageUrl: data.profileImageUrl ?? fallbackProfileImageUrl,
      });
      setForm((currentValues) => {
        const formValue = (key: keyof ProfileForm) => {
          const preserved = preservedValues?.[key]?.trim();
          if (preserved) return preserved;
          const current = currentValues[key]?.trim();
          return current ?? "";
        };
        const nextForm = {
          fullName: formValue("fullName") || data.fullName || data.name || "",
          phone: formValue("phone") || data.phone || data.mobile || "",
          email: formValue("email"),
          city: formValue("city"),
          pincode: formValue("pincode") || data.pincode || "",
          address: formValue("address") || data.address || "",
        };
        formRef.current = nextForm;
        return nextForm;
      });
    } catch (error: any) {
      toast(error?.message ?? "Unable to load profile");
    } finally {
      hideLoader();
    }
  }, [hideLoader, showLoader, toast]);

  useEffect(() => {
    load().catch(() => null);
  }, [load]);

  const setField = (key: keyof ProfileForm, value: string) => {
    formRef.current = { ...formRef.current, [key]: value };
    setForm(formRef.current);
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const onSave = async () => {
    try {
      const values = await schema.validate(formRef.current, { abortEarly: false });
      setErrors({});
      setIsSubmitting(true);
      showLoader();
      if (!canAttemptOnlineAction()) {
        await enqueueProfileUpdate(values as unknown as Record<string, unknown>);
        toast("Profile update queued. It will sync when internet returns.");
      } else {
        await updatePartnerProfile(values);
        toast("Profile updated successfully");
      }
      await load(undefined, values);
    } catch (error: any) {
      if (error instanceof yup.ValidationError) {
        const nextErrors: Partial<Record<keyof ProfileForm, string>> = {};
        error.inner.forEach((item) => {
          const path = item.path as keyof ProfileForm | undefined;
          if (path && !nextErrors[path]) {
            nextErrors[path] = item.message;
          }
        });
        setErrors(nextErrors);
        return;
      }
      toast(error?.message ?? "Unable to save profile");
    } finally {
      setIsSubmitting(false);
      hideLoader();
    }
  };

  const onImageUpload = async () => {
    try {
      const result = await launchImageLibrary({ mediaType: "photo", quality: 0.8 });
      const asset = result.assets?.[0];
      if (!asset?.uri) return;
      setProfile((prev: any) => ({ ...prev, profileImageUrl: asset.uri }));
      showLoader();
      const uploaded = await uploadPartnerProfileImage({ uri: asset.uri, type: asset.type, name: asset.fileName });
      const nextImageUrl =
        uploaded?.profileImageUrl ??
        uploaded?.imageUrl ??
        uploaded?.data?.profileImageUrl ??
        uploaded?.data?.imageUrl;
      if (typeof nextImageUrl === "string" && nextImageUrl.trim().length > 0) {
        setProfile((prev: any) => ({ ...prev, profileImageUrl: nextImageUrl.trim() }));
      }
      toast("Profile image updated");
      await load(typeof nextImageUrl === "string" && nextImageUrl.trim().length > 0 ? nextImageUrl.trim() : asset.uri, formRef.current);
    } catch (error: any) {
      toast(error?.message ?? "Unable to upload profile image");
    } finally {
      hideLoader();
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <View style={styles.profileHeader}>
        <TouchableOpacity
          testID="profile-upload-image-button"
          accessibilityLabel="Upload Profile Image"
          activeOpacity={0.86}
          style={styles.avatarFrame}
          onPress={onImageUpload}
        >
          {profile?.profileImageUrl ? (
            <Image testID="profile-avatar-image" source={{ uri: profile.profileImageUrl }} style={styles.avatar} />
          ) : (
            <View testID="profile-avatar-placeholder" style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>No Image</Text>
            </View>
          )}
          <View style={styles.cameraBadge}>
            <MaterialCommunityIcons name="camera" size={18} color={COLORS.background} />
          </View>
        </TouchableOpacity>
        <Text style={styles.profileName}>{profile?.fullName ?? profile?.name ?? "Partner"}</Text>
        {profile?.phone ?? profile?.mobile ? <Text style={styles.profileEmail}>{profile.phone ?? profile.mobile}</Text> : null}
      </View>

      <FormInput name="fullName" label="Full Name" value={form.fullName} onChangeText={(value: string) => setField("fullName", value)} error={errors.fullName} />
      <FormInput name="phone" label="Phone" value={form.phone} onChangeText={(value: string) => setField("phone", value)} keyboardType="phone-pad" error={errors.phone} />
      <FormInput name="email" label="Email" value={form.email} onChangeText={(value: string) => setField("email", value)} keyboardType="email-address" autoCapitalize="none" error={errors.email} />
      <FormInput name="city" label="City" value={form.city} onChangeText={(value: string) => setField("city", value)} error={errors.city} />
      <FormInput name="pincode" label="Pincode" value={form.pincode} onChangeText={(value: string) => setField("pincode", value)} keyboardType="number-pad" error={errors.pincode} />
      <FormInput name="address" label="Address" value={form.address} onChangeText={(value: string) => setField("address", value)} error={errors.address} />

      <TouchableOpacity testID="profile-save-button" style={[styles.btn, styles.primary, styles.fullBleedButton]} onPress={onSave} disabled={isSubmitting}>
        <Text style={styles.btnText}>{isSubmitting ? "Saving..." : "Save Profile"}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btn, styles.fullBleedButton]} onPress={() => navigation.navigate("OnboardingSubmit")}>
        <Text style={styles.btnText}>Submit Onboarding</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btn, styles.fullBleedButton]} onPress={() => navigation.navigate("KycStatus")}>
        <Text style={styles.btnText}>KYC Status</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btn, styles.fullBleedButton]} onPress={() => navigation.navigate("BankAccount")}>
        <Text style={styles.btnText}>Bank Verification</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btn, styles.fullBleedButton]} onPress={() => navigation.navigate("Ratings")}>
        <Text style={styles.btnText}>Ratings & Feedback</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btn, styles.fullBleedButton]} onPress={() => navigation.navigate("Shift")}>
        <Text style={styles.btnText}>Shift Settings</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function FormInput({ label, name, error, ...rest }: any) {
  return (
    <View style={styles.formInputBlock}>
      <Text style={styles.formInputLabel}>{label}</Text>
      <TextInput
        {...rest}
        accessibilityLabel={label}
        testID={`profile-${name}-input`}
        style={[styles.input, error ? styles.inputError : null]}
        placeholderTextColor={COLORS.textMuted}
      />
      {error ? <Text style={[styles.errorText, styles.formInputError]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#031B3F" },
  container: { padding: 16, gap: 12 },
  title: { color: COLORS.textPrimary, fontWeight: "800", fontSize: 24 },
  profileHeader: { alignItems: "center", gap: 6, marginTop: 4, marginBottom: 6 },
  avatarFrame: {
    width: 118,
    height: 118,
    borderRadius: 59,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: COLORS.secondary,
    backgroundColor: COLORS.surface,
    shadowColor: COLORS.secondary,
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  avatar: { width: 112, height: 112, borderRadius: 56 },
  avatarPlaceholder: { width: 112, height: 112, borderRadius: 56, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surface },
  avatarText: { color: COLORS.textSecondary, fontSize: 12 },
  cameraBadge: {
    position: "absolute",
    right: 2,
    bottom: 6,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.secondary,
    borderWidth: 2,
    borderColor: "#031B3F",
  },
  profileName: { color: COLORS.textPrimary, fontSize: 18, fontWeight: "800", marginTop: 4 },
  profileEmail: { color: COLORS.textSecondary, fontSize: 12, fontWeight: "600" },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, backgroundColor: COLORS.surface, color: COLORS.textPrimary, paddingHorizontal: 12, paddingVertical: 10 },
  inputError: { borderColor: COLORS.error },
  errorText: { color: COLORS.error, fontSize: 12 },
  btn: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, alignItems: "center", backgroundColor: COLORS.surfaceElevated },
  fullBleedButton: { marginHorizontal: -16, paddingHorizontal: 16 },
  formInputBlock: { gap: 6, marginHorizontal: -16 },
  formInputLabel: { color: COLORS.textSecondary, fontWeight: "700", marginHorizontal: 16 },
  formInputError: { marginHorizontal: 16 },
  primary: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  btnText: { color: COLORS.textPrimary, fontWeight: "700" },
});
