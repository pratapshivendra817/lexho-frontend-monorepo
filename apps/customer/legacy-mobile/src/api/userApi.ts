import { api, parseApiError } from "./client";
import type { ProfileResponse, UpdateProfileRequest } from "../types/contracts";

export async function getProfile(): Promise<ProfileResponse> {
  try { const { data } = await api.get("/api/user/profile"); return data as ProfileResponse; }
  catch (error) { throw new Error(parseApiError(error, "Failed to load profile")); }
}

export async function updateProfile(payload: UpdateProfileRequest) {
  try { const { data } = await api.put("/api/user/profile/update", payload); return data as ProfileResponse; }
  catch (error) { throw new Error(parseApiError(error, "Failed to update profile")); }
}
