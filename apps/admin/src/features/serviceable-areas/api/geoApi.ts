import { api } from "@/api/axios";

type GeoCityPayload = {
  name: string;
  state: string;
  country: string;
  active: boolean;
};

type GeoZonePayload = {
  cityId: number;
  name: string;
  polygonJson: string;
  active: boolean;
};

export async function getGeoCities() {
  const { data } = await api.get("/api/v1/admin/geo/cities");
  return data;
}

export async function createGeoCity(payload: GeoCityPayload) {
  const { data } = await api.post("/api/v1/admin/geo/cities", payload);
  return data;
}

export async function updateGeoCity(id: string | number, payload: GeoCityPayload) {
  const { data } = await api.put(`/api/v1/admin/geo/cities/${id}`, payload);
  return data;
}

export async function deleteGeoCity(id: string | number) {
  const { data } = await api.delete(`/api/v1/admin/geo/cities/${id}`);
  return data;
}

export async function getGeoZones(cityId?: string | number) {
  const { data } = await api.get("/api/v1/admin/geo/zones", {
    params: cityId != null ? { cityId } : undefined,
  });
  return data;
}

export async function createGeoZone(payload: GeoZonePayload) {
  const { data } = await api.post("/api/v1/admin/geo/zones", payload);
  return data;
}

export async function updateGeoZone(id: string | number, payload: GeoZonePayload) {
  try {
    const { data } = await api.put(`/api/admin/geo/zones/${id}`, payload);
    return data;
  } catch {
    const { data } = await api.put(`/api/v1/admin/geo/zones/${id}`, payload);
    return data;
  }
}

export async function deleteGeoZone(id: string | number) {
  const { data } = await api.delete(`/api/v1/admin/geo/zones/${id}`);
  return data;
}
