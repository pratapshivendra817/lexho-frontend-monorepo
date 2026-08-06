import { api, parseApiError, unwrapPayload } from "./client";
import { API_BASE_URL, DEV_LOGIN_BYPASS } from "../constants/env";
import { getToken } from "../utils/storage";
import { store } from "../redux/store";
import { Platform } from "react-native";
import type {
  AccountDeleteRequestPayload,
  ApiEnvelope,
  CustomerAddress,
  CustomerProfileContent,
  CustomerProfile,
  ImageUploadPayload,
  ProfileEmailPayload,
  ProfileUpdatePayload,
} from "../modules/profile/types";

const PROFILE_BASE = "/api/customer/profile";

function toProfile(input: any): CustomerProfile {
  return {
    id: String(input?.id ?? input?.customerId ?? ""),
    firstName: String(input?.firstName ?? "").trim(),
    lastName: String(input?.lastName ?? "").trim(),
    mobile: String(input?.mobile ?? input?.phone ?? "").trim(),
    email: String(input?.email ?? "").trim(),
    gender: String(input?.gender ?? "").toUpperCase() as CustomerProfile["gender"],
    dateOfBirth: String(input?.dateOfBirth ?? "").trim(),
    profileImageUrl: String(input?.profileImageUrl ?? input?.imageUrl ?? "").trim(),
  };
}
export async function getCustomerProfile() {
  try {
    const { data } = await api.get<ApiEnvelope<any>>(PROFILE_BASE);
    return toProfile(unwrapPayload<any>(data, {}));
  } catch (error) {
    throw new Error(parseApiError(error, "Failed to load profile"));
  }
}

export async function updateCustomerProfile(payload: ProfileUpdatePayload) {
  try {
    const { data } = await api.put<ApiEnvelope<any>>(PROFILE_BASE, payload);
    return toProfile(unwrapPayload<any>(data, {}));
  } catch (error) {
    throw new Error(parseApiError(error, "Failed to update profile"));
  }
}

export async function updateCustomerEmail(payload: ProfileEmailPayload) {
  try {
    const { data } = await api.patch<ApiEnvelope<any>>(`${PROFILE_BASE}/email`, payload);
    return toProfile(unwrapPayload<any>(data, {}));
  } catch (error) {
    throw new Error(parseApiError(error, "Failed to update email"));
  }
}

export async function uploadCustomerProfileImage(payload: ImageUploadPayload) {
  const normalizedType = String(payload.type ?? "").trim().toLowerCase();
  const allowedTypes = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
  if (!allowedTypes.has(normalizedType)) {
    throw new Error("Invalid image type. Allowed: image/jpeg, image/jpg, image/png, image/webp");
  }
  const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
  const imageSize = Number((payload as any).size ?? 0);
  if (Number.isFinite(imageSize) && imageSize > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("Invalid image size. Maximum allowed size is 5 MB.");
  }

  const uri = String(payload.uri ?? "").trim();
  if (!uri || uri.startsWith("image:file://")) {
    throw new Error("Invalid image uri. Please select image again from gallery.");
  }

  const token = (await getToken()) || store.getState()?.auth?.token || null;
  if (!token && !(DEV_LOGIN_BYPASS && __DEV__)) {
    throw new Error("Session expired. Please login again.");
  }

  const name = String(payload.name ?? "").trim() || "profile.jpg";
  const imageUri = Platform.OS === "android" ? uri : uri.replace(/^file:\/\//, "");
  const requestUrl = `${PROFILE_BASE}/image`;
  const absoluteUrl = `${String(API_BASE_URL ?? "").replace(/\/+$/, "")}${requestUrl}`;

  const formData = new FormData();
  formData.append("image", {
    uri: imageUri,
    type: normalizedType || "image/jpeg",
    name: name || "profile.jpg",
  } as any);

  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };

    const response = await fetch(absoluteUrl, {
      method: "POST",
      headers,
      body: formData,
    });
    const responseText = await response.text();

    let parsed: any = {};
    try {
      parsed = responseText ? JSON.parse(responseText) : {};
    } catch {
      parsed = {};
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error(`Upload unauthorized (401). Response: ${responseText}`);
      }
      if (response.status === 400) {
        throw new Error(`Invalid upload request (400). Response: ${responseText}`);
      }
      throw new Error(`Image upload failed (${response.status}). Response: ${responseText}`);
    }

    return toProfile(unwrapPayload<any>(parsed, {}));
  } catch (error: any) {
    throw new Error(String(error?.message ?? "Network request failed"));
  }
}

export async function deleteCustomerProfileImage() {
  try {
    const { data } = await api.delete<ApiEnvelope<any>>(`${PROFILE_BASE}/image`);
    return toProfile(unwrapPayload<any>(data, {}));
  } catch (error) {
    throw new Error(parseApiError(error, "Failed to remove image"));
  }
}

export async function getCustomerAddresses() {
  try {
    const { data } = await api.get<ApiEnvelope<CustomerAddress[]>>("/api/customer/addresses");
    const rows = unwrapPayload<CustomerAddress[]>(data, []);
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    throw new Error(parseApiError(error, "Failed to load addresses"));
  }
}

export async function requestAccountDelete(payload: AccountDeleteRequestPayload = {}) {
  try {
    const { data } = await api.post<ApiEnvelope<any>>("/api/customer/account-delete-request", payload);
    return unwrapPayload<any>(data, {});
  } catch (error) {
    throw new Error(parseApiError(error, "Failed to create delete-account request"));
  }
}

export async function getCustomerProfileContent(): Promise<CustomerProfileContent> {
  const normalizeContent = (input: any): CustomerProfileContent => {
    const source = input ?? {};
    return {
      aboutUs: String(source?.aboutUs ?? source?.about_us ?? "").trim(),
      termsOfService: String(source?.termsOfService ?? source?.terms_of_service ?? "").trim(),
      privacyPolicy: String(source?.privacyPolicy ?? source?.privacy_policy ?? "").trim(),
    };
  };

  const hasContent = (content: CustomerProfileContent) =>
    Boolean(content.aboutUs || content.termsOfService || content.privacyPolicy);

  const extractContent = (raw: any): CustomerProfileContent => {
    const unwrapped = unwrapPayload<any>(raw, {});
    const candidates = [
      unwrapped,
      unwrapped?.data,
      unwrapped?.payload,
      unwrapped?.result,
      unwrapped?.content,
      raw?.data,
      raw?.data?.data,
      raw?.data?.payload,
      raw?.data?.result,
      raw?.data?.content,
      raw?.payload,
      raw?.result,
      raw?.content,
      raw,
    ];

    for (const candidate of candidates) {
      const content = normalizeContent(candidate);
      if (hasContent(content)) return content;
    }

    return normalizeContent({});
  };

  try {
    const { data } = await api.get<ApiEnvelope<CustomerProfileContent>>(
      "/api/admin/profile-content",
      { headers: { "X-Skip-Authorization": "true" } },
    );
    return extractContent(data);
  } catch (error) {
    throw new Error(parseApiError(error, "Failed to load profile content"));
  }
}
