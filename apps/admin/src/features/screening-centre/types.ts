export type ScreeningCentreMapProvider = "google" | "mapbox" | "osm";

export type AdminScreeningCentre = {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  mapProvider: ScreeningCentreMapProvider;
  placeId: string;
  landmark: string;
  entranceInfo: string;
  active: boolean;
  updatedAt?: string;
};

export const defaultAdminScreeningCentre: AdminScreeningCentre = {
  name: "",
  address: "",
  latitude: 28.6139,
  longitude: 77.209,
  phone: "",
  mapProvider: "google",
  placeId: "",
  landmark: "",
  entranceInfo: "",
  active: true,
};
