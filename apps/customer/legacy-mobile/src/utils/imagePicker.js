import { Alert, PermissionsAndroid, Platform } from "react-native";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const MAX_SIZE = 5 * 1024 * 1024;

async function requestAndroidPermission(permission, title, message) {
  const alreadyGranted = await PermissionsAndroid.check(permission);
  if (alreadyGranted) return true;

  const status = await PermissionsAndroid.request(permission, {
    title,
    message,
    buttonPositive: "Allow",
    buttonNegative: "Deny",
  });
  return status === PermissionsAndroid.RESULTS.GRANTED;
}

async function ensurePickerPermissions(mode) {
  if (Platform.OS !== "android") return;

  if (mode === "camera") {
    const granted = await requestAndroidPermission(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      "Camera Permission",
      "Allow camera access to take a profile photo.",
    );
    if (!granted) throw new Error("Camera permission denied.");
    return;
  }

  const galleryPermission =
    Platform.Version >= 33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
  const granted = await requestAndroidPermission(
    galleryPermission,
    "Photos Permission",
    "Allow photo access to choose a profile picture.",
  );
  if (!granted) throw new Error("Photos permission denied.");
}

function normalizeImage(asset) {
  if (!asset?.uri) return null;
  const baseUri = String(asset.uri);
  const uri = Platform.OS === "android" ? baseUri : baseUri.replace(/^file:\/\//, "");
  return {
    uri,
    type: String(asset.type || "image/jpeg").toLowerCase(),
    name: String(asset.fileName || `profile-${Date.now()}.jpg`),
    size: Number(asset.fileSize || 0),
  };
}

function validateImage(file) {
  if (!file) return { ok: false, message: "No image selected." };
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, message: "Invalid image type. Allowed: JPEG, PNG, WEBP." };
  }
  if (file.size > MAX_SIZE) {
    return { ok: false, message: "Image size must be less than 5 MB." };
  }
  return { ok: true };
}

async function openPicker(mode) {
  await ensurePickerPermissions(mode);

  const options = {
    mediaType: "photo",
    quality: 0.75,
    maxWidth: 1440,
    maxHeight: 1440,
    includeExtra: false,
    selectionLimit: 1,
  };

  const result = mode === "camera" ? await launchCamera(options) : await launchImageLibrary(options);
  if (result?.didCancel) return null;
  if (result?.errorCode) {
    throw new Error(String(result.errorMessage || result.errorCode || "Failed to pick image"));
  }

  const image = normalizeImage(result?.assets?.[0]);
  const validation = validateImage(image);
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  return image;
}

export function showImagePickerActions({ onCamera, onGallery, onRemove }) {
  Alert.alert("Profile Photo", "Choose an option", [
    { text: "Take Photo", onPress: onCamera },
    { text: "Choose from Gallery", onPress: onGallery },
    { text: "Remove Photo", style: "destructive", onPress: onRemove },
    { text: "Cancel", style: "cancel" },
  ]);
}

export async function pickFromCamera() {
  return await openPicker("camera");
}

export async function pickFromGallery() {
  return await openPicker("gallery");
}
