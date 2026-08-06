import { api } from "@/api/axios";

export type ScaleProfile = "1k" | "10k" | "100k";

export async function getScaleProfile() {
  const { data } = await api.get("/api/v1/admin/scale/profile");
  return data;
}

export async function setScaleProfile(profile: ScaleProfile, dryRun: boolean) {
  const { data } = await api.post("/api/v1/admin/scale/profile", null, {
    params: { profile, dryRun },
  });
  return data;
}

export async function addRestrictedArea(lat: number, lng: number, precision: number) {
  const { data } = await api.post("/api/v1/admin/serviceability/restricted-area", null, {
    params: { lat, lng, precision },
  });
  return data;
}

export async function deleteRestrictedArea(geohash: string) {
  const { data } = await api.delete("/api/v1/admin/serviceability/restricted-area", {
    params: { geohash },
  });
  return data;
}

export async function replayGeoEventDlq(maxMessages: number) {
  const { data } = await api.post("/api/v1/admin/geo/events/dlq/replay", null, {
    params: { maxMessages },
  });
  return data;
}
