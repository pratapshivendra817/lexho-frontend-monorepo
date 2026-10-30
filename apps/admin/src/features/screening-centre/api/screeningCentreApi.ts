import { api } from "@/api/axios";

import {
  defaultAdminScreeningCentre,
  type AdminScreeningCentre,
  type ScreeningCentreMapProvider,
} from "../types";

const STORAGE_KEY = "admin.screening-centre.active";

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const asString = (value: unknown): string =>
  typeof value === "string" || typeof value === "number" ? String(value).trim() : "";

const asNumber = (value: unknown, fallback: number): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const asBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === "boolean" ? value : fallback;

const asMapProvider = (value: unknown): ScreeningCentreMapProvider => {
  const normalized = asString(value).toLowerCase();
  return normalized === "mapbox" || normalized === "osm" ? normalized : "google";
};

export function normalizeScreeningCentre(input: unknown): AdminScreeningCentre {
  const source = asRecord(input);
  return {
    name: asString(source.name),
    address: asString(source.address),
    latitude: asNumber(source.latitude, defaultAdminScreeningCentre.latitude),
    longitude: asNumber(source.longitude, defaultAdminScreeningCentre.longitude),
    phone: asString(source.phone),
    mapProvider: asMapProvider(source.mapProvider),
    placeId: asString(source.placeId),
    landmark: asString(source.landmark),
    entranceInfo: asString(source.entranceInfo),
    active: asBoolean(source.active, true),
    updatedAt: asString(source.updatedAt) || undefined,
  };
}

function readLocalSnapshot(): AdminScreeningCentre {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultAdminScreeningCentre;
    return {
      ...defaultAdminScreeningCentre,
      ...normalizeScreeningCentre(JSON.parse(raw)),
    };
  } catch {
    return defaultAdminScreeningCentre;
  }
}

function writeLocalSnapshot(value: AdminScreeningCentre) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

function extractPayload(data: unknown) {
  const root = asRecord(data);
  const nestedData = asRecord(root.data);
  const pageData = asRecord(nestedData.data);
  return pageData.name
    ? pageData
    : nestedData.name
      ? nestedData
      : root.name
        ? root
        : {};
}

export async function getAdminScreeningCentre(): Promise<AdminScreeningCentre> {
  try {
    const { data } = await api.get("/api/v1/admin/screening-centre");
    const next = {
      ...defaultAdminScreeningCentre,
      ...normalizeScreeningCentre(extractPayload(data)),
    };
    writeLocalSnapshot(next);
    return next;
  } catch {
    return readLocalSnapshot();
  }
}

export async function updateAdminScreeningCentre(
  payload: AdminScreeningCentre,
): Promise<AdminScreeningCentre> {
  try {
    const { data } = await api.put("/api/v1/admin/screening-centre", payload);
    const next = {
      ...payload,
      ...normalizeScreeningCentre(extractPayload(data)),
    };
    writeLocalSnapshot(next);
    return next;
  } catch {
    const next = { ...payload, updatedAt: new Date().toISOString() };
    writeLocalSnapshot(next);
    return next;
  }
}

export async function updateAdminScreeningCentreStatus(active: boolean) {
  try {
    const { data } = await api.patch("/api/v1/admin/screening-centre/status", { active });
    const next = {
      ...readLocalSnapshot(),
      ...normalizeScreeningCentre(extractPayload(data)),
      active,
    };
    writeLocalSnapshot(next);
    return next;
  } catch {
    const next = {
      ...readLocalSnapshot(),
      active,
      updatedAt: new Date().toISOString(),
    };
    writeLocalSnapshot(next);
    return next;
  }
}
