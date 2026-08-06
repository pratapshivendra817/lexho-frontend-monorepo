import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { COLORS } from '../theme/colors';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { Controller, useForm, useWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Snackbar } from "react-native-paper";
import { GenderSelector } from "../components/GenderSelector";
import { ProfileImagePicker } from "../components/ProfileImagePicker";
import { createEditProfileStyles } from "../styles/editProfileStyles";
import {
  deleteCustomerProfileImage,
  getCustomerProfile,
  updateCustomerProfile,
  uploadCustomerProfileImage,
  uploadProfileImageWithFetch,
} from "../services/profileService";
import { pickFromCamera, pickFromGallery } from "../utils/imagePicker";

const schema = yup.object({
  fullName: yup.string().trim().required("Name is required").min(2, "Name should be at least 2 characters"),
  email: yup.string().trim().email("Enter a valid email").optional().nullable().transform((v) => (v ? v : "")),
  phoneNumber: yup.string().trim(),
  gender: yup.string().oneOf(["MALE", "FEMALE", "OTHER"], "Please choose a gender").required("Gender is required"),
});

type Gender = "MALE" | "FEMALE" | "OTHER";
type Profile = {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  gender: string;
  profileImageUrl: string;
};

function normalizeGender(value: unknown): Gender {
  const normalized = String(value ?? "").toUpperCase();
  return normalized === "MALE" || normalized === "FEMALE" || normalized === "OTHER" ? normalized : "OTHER";
}

function splitFullName(fullName: string) {
  const clean = String(fullName || "").trim().replace(/\s+/g, " ");
  if (!clean) return { firstName: "", lastName: "" };
  const parts = clean.split(" ");
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
}

function useDebouncedValue<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function SkeletonLoader({ styles }: { styles: any }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const translateX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-100, 220] });

  return (
    <View>
      {[1, 2, 3].map((item) => (
        <View key={item} style={styles.skeletonBlock}>
          <Animated.View style={[styles.skeletonShimmer, { transform: [{ translateX }] }]} />
        </View>
      ))}
    </View>
  );
}

export function EditProfileScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const colorScheme = useColorScheme();
  const styles = useMemo(() => createEditProfileStyles(colorScheme === "dark"), [colorScheme]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [snackbar, setSnackbar] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(16)).current;

  const {
    control,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: { fullName: "", email: "", phoneNumber: "", gender: "OTHER" as Gender },
    resolver: yupResolver(schema),
    mode: "onBlur",
  });

  const watchedFullName = useWatch({ control, name: "fullName" });
  const debouncedName = useDebouncedValue(watchedFullName, 280);

  const loadProfile = useCallback(async () => {
    setLoadingProfile(true);
    try {
      const data = await getCustomerProfile();
      setProfile(data);
      reset({
        fullName: data.fullName || "",
        email: data.email || "",
        phoneNumber: data.phoneNumber || "",
        gender: normalizeGender(data.gender),
      });
    } catch (error) {
      Alert.alert("Failed", error instanceof Error ? error.message : "Unable to load profile.");
    } finally {
      setLoadingProfile(false);
    }
  }, [reset]);

  useEffect(() => {
    void loadProfile();
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [fade, loadProfile, slide]);

  const onUpdate = handleSubmit(async (values) => {
    setSaving(true);
    try {
      const normalizedFullName = values.fullName.trim().replace(/\s+/g, " ");
      const { firstName, lastName } = splitFullName(normalizedFullName);
      const payload = {
        // Send both legacy and newer field variants for backend compatibility.
        fullName: normalizedFullName,
        name: normalizedFullName,
        firstName,
        lastName,
        email: values.email?.trim() || undefined,
        phoneNumber: values.phoneNumber?.trim() || undefined,
        gender: values.gender,
      };
      const updated = await updateCustomerProfile(payload);
      setProfile(updated);
      setSnackbar("Profile updated successfully");
    } catch (error) {
      Alert.alert("Update Failed", error instanceof Error ? error.message : "Please retry.");
    } finally {
      setSaving(false);
    }
  });

  const onPick = useCallback(async (mode: "camera" | "gallery") => {
    setImageLoading(true);
    try {
      const image = mode === "camera" ? await pickFromCamera() : await pickFromGallery();
      if (!image) return;

      // Primary axios path; fallback fetch path for stubborn Android multipart stacks.
      let updatedProfile;
      try {
        updatedProfile = await uploadCustomerProfileImage(image);
      } catch {
        updatedProfile = await uploadProfileImageWithFetch(image);
      }
      setProfile(updatedProfile);
      setSnackbar("Profile photo updated");
    } catch (error) {
      Alert.alert("Upload Failed", error instanceof Error ? error.message : "Unable to upload image.");
    } finally {
      setImageLoading(false);
    }
  }, []);

  const onRemovePhoto = useCallback(async () => {
    setImageLoading(true);
    try {
      const updated = await deleteCustomerProfileImage();
      setProfile(updated);
      setSnackbar("Profile photo removed");
    } catch (error) {
      Alert.alert("Remove Failed", error instanceof Error ? error.message : "Unable to remove profile photo.");
    } finally {
      setImageLoading(false);
    }
  }, []);

  return (
    <View style={styles.overlay}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboardContainer}>
        <Animated.View style={[styles.card, { opacity: fade, transform: [{ translateY: slide }] }]}>
          <View style={styles.topRow}>
            <Pressable onPress={() => navigation.goBack()} style={styles.closeBtn}>
              <MaterialCommunityIcon name="close" size={18} color={COLORS.offWhite} />
            </Pressable>
          </View>

          <Text style={styles.heading}>Edit Profile</Text>
          <Text style={styles.subHeading}>Keep your details up to date</Text>

          <ProfileImagePicker
            imageUrl={profile?.profileImageUrl}
            fullName={debouncedName || profile?.fullName}
            loading={imageLoading}
            onPickCamera={() => onPick("camera")}
            onPickGallery={() => onPick("gallery")}
            onRemove={onRemovePhoto}
            styles={styles}
          />

          {loadingProfile ? <SkeletonLoader styles={styles} /> : null}

          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.formScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formGroup}>
              <Text style={styles.label}>Name</Text>
              <Controller
                control={control}
                name="fullName"
                render={({ field: { value, onChange, onBlur } }) => (
                  <TextInput
                    value={value ?? ""}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Enter your name"
                    placeholderTextColor={COLORS.slate400}
                    style={[styles.input, errors.fullName ? styles.inputError : null]}
                  />
                )}
              />
              {errors.fullName?.message ? <Text style={styles.errorText}>{errors.fullName.message}</Text> : null}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email (Optional)</Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { value, onChange, onBlur } }) => (
                  <TextInput
                    value={value ?? ""}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="example@mail.com"
                    placeholderTextColor={COLORS.slate400}
                    style={[styles.input, errors.email ? styles.inputError : null]}
                  />
                )}
              />
              {errors.email?.message ? <Text style={styles.errorText}>{errors.email.message}</Text> : null}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <Controller
                control={control}
                name="phoneNumber"
                render={({ field: { value } }) => (
                  <TextInput value={value} editable={false} style={[styles.input, styles.inputReadonly]} />
                )}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Gender</Text>
              <Controller
                control={control}
                name="gender"
                render={({ field: { value, onChange } }) => (
                  <GenderSelector value={value} onChange={onChange} styles={styles} disabled={saving} />
                )}
              />
              {errors.gender?.message ? <Text style={styles.errorText}>{errors.gender.message}</Text> : null}
            </View>
          </ScrollView>

          <Pressable style={[styles.updateButton, saving ? styles.updateButtonDisabled : null]} onPress={onUpdate} disabled={saving || loadingProfile}>
            {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.updateButtonText}>Update</Text>}
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>

      <Snackbar visible={snackbar.length > 0} onDismiss={() => setSnackbar("")} duration={2200}>
        {snackbar}
      </Snackbar>
    </View>
  );
}

export default EditProfileScreen;


