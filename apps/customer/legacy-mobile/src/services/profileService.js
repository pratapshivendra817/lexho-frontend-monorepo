import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../constants/env";

const BASE_URL = String(API_BASE_URL ?? "").replace(/\/+$/, "");
const TOKEN_KEY = "@lexho/customer/token";
const DEV_INTERNAL_TOKEN = "LexhoInternal@2026#Admin";

const profileHttp = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

profileHttp.interceptors.request.use(async (config) => {
  const headers = { ...(config.headers || {}) };
  const token = await AsyncStorage.getItem(TOKEN_KEY);

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else if (__DEV__) {
    headers["X-Internal-Token"] = DEV_INTERNAL_TOKEN;
  }

  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    delete headers["Content-Type"];
    delete headers["content-type"];
  }

  headers.Accept = "application/json";
  config.headers = headers;

  return config;
});

function unwrapPayload(payload) {
  return payload?.data?.data ?? payload?.data ?? payload;
}

function normalizeProfile(raw) {
  const source = raw || {};
  return {
    id: String(source.id ?? ""),
    fullName: String(source.fullName ?? source.name ?? "").trim(),
    phoneNumber: String(source.phoneNumber ?? source.mobileNumber ?? source.mobile ?? "").trim(),
    email: String(source.email ?? "").trim(),
    gender: String(source.gender ?? "").toUpperCase(),
    profileImageUrl: String(source.profileImageUrl ?? source.imageUrl ?? "").trim(),
  };
}

function asApiError(error, fallback) {
  const status = error?.response?.status;
  const message = error?.response?.data?.message || error?.message || fallback;
  if (status === 401) return "Session expired. Please login again.";
  if (status === 413) return "Image too large. Please select an image under 5 MB.";
  return message;
}

export async function getCustomerProfile() {
  try {
    const response = await profileHttp.get("/api/customer/profile");
    return normalizeProfile(unwrapPayload(response));
  } catch (error) {
    throw new Error(asApiError(error, "Failed to load profile."));
  }
}

export async function updateCustomerProfile(payload) {
  try {
    const response = await profileHttp.put("/api/customer/profile", payload);
    return normalizeProfile(unwrapPayload(response));
  } catch (error) {
    throw new Error(asApiError(error, "Failed to update profile."));
  }
}

export async function uploadCustomerProfileImage(image) {
  const formData = new FormData();
  formData.append("image", {
    uri: image.uri,
    type: image.type || "image/jpeg",
    name: image.name || "profile.jpg",
  });

  try {
    const response = await profileHttp.post("/api/customer/profile/image", formData, {
      transformRequest: [(data) => data],
    });
    return normalizeProfile(unwrapPayload(response));
  } catch (primaryError) {
    // Backend also supports 'file' key as fallback.
    try {
      const fallbackFormData = new FormData();
      fallbackFormData.append("file", {
        uri: image.uri,
        type: image.type || "image/jpeg",
        name: image.name || "profile.jpg",
      });
      const fallbackResponse = await profileHttp.post("/api/customer/profile/image", fallbackFormData, {
        transformRequest: [(data) => data],
      });
      return normalizeProfile(unwrapPayload(fallbackResponse));
    } catch (error) {
      throw new Error(asApiError(error, asApiError(primaryError, "Failed to upload profile image.")));
    }
  }
}

export async function deleteCustomerProfileImage() {
  try {
    const response = await profileHttp.delete("/api/customer/profile/image");
    return normalizeProfile(unwrapPayload(response));
  } catch (error) {
    throw new Error(asApiError(error, "Failed to remove profile image."));
  }
}

export async function uploadProfileImageWithFetch(image) {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const formData = new FormData();
  formData.append("image", {
    uri: image.uri,
    type: image.type || "image/jpeg",
    name: image.name || "profile.jpg",
  });

  const headers = {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : __DEV__ ? { "X-Internal-Token": DEV_INTERNAL_TOKEN } : {}),
  };

  const response = await fetch(`${BASE_URL}/api/customer/profile/image`, {
    method: "POST",
    headers,
    body: formData,
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Upload failed (${response.status}): ${text || "Unknown error"}`);
  }

  let parsed = {};
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = {};
  }

  return normalizeProfile(parsed?.data ? parsed : { data: parsed });
}
