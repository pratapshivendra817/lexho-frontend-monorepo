import { PermissionsAndroid, Platform } from "react-native";
import Geolocation from "react-native-geolocation-service";

import { sendDispatchLocation } from "./partnerService";

export type DeviceLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
};

let trackingTimer: ReturnType<typeof setInterval> | null = null;
let lastResolvedPincode: {
  pincode: string;
  latitude: number;
  longitude: number;
  timestamp: number;
} | null = null;
let pendingPincodeCandidate: { pincode: string; seenCount: number; firstSeenAt: number } | null = null;
let lastResolvedMeta: { label: string | null; provider: string | null; confidence: "HIGH" | "MEDIUM" | "LOW" } | null = null;
let lastAcceptedPoint: DeviceLocation | null = null;
const PINCODE_CACHE_MS = 5 * 60 * 1000;
const PINCODE_STICKY_DISTANCE_METERS = 120;
const LOCATION_REFRESH_DISTANCE_METERS = 150;
const LOCATION_META_CACHE_MS = 2 * 60 * 1000;
const LOCATION_SETTLE_DELAY_MS = 3500;
const PINCODE_SWITCH_STABLE_MS = 45 * 1000;
const OUTLIER_JUMP_METERS = 300;
const OUTLIER_WINDOW_MS = 10000;

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function distanceInMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const earthRadius = 6371000;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const sinDlat = Math.sin(dLat / 2);
  const sinDlng = Math.sin(dLng / 2);
  const h = sinDlat * sinDlat + Math.cos(lat1) * Math.cos(lat2) * sinDlng * sinDlng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return earthRadius * c;
}

function resolveStablePincode(rawPincode: string | null, latitude: number, longitude: number): string | null {
  const now = Date.now();
  if (rawPincode) {
    const normalized = String(rawPincode).trim();
    if (normalized.length > 0) {
      if (lastResolvedPincode && lastResolvedPincode.pincode !== normalized) {
        if (!pendingPincodeCandidate || pendingPincodeCandidate.pincode !== normalized) {
          pendingPincodeCandidate = { pincode: normalized, seenCount: 1, firstSeenAt: now };
          return lastResolvedPincode.pincode;
        }
        pendingPincodeCandidate.seenCount += 1;
        const stableLongEnough = now - pendingPincodeCandidate.firstSeenAt >= PINCODE_SWITCH_STABLE_MS;
        if (pendingPincodeCandidate.seenCount < 2 || !stableLongEnough) {
          return lastResolvedPincode.pincode;
        }
      }
      lastResolvedPincode = {
        pincode: normalized,
        latitude,
        longitude,
        timestamp: now,
      };
      pendingPincodeCandidate = null;
      return normalized;
    }
  }

  if (!lastResolvedPincode) return null;
  if (now - lastResolvedPincode.timestamp > PINCODE_CACHE_MS) return null;

  const drift = distanceInMeters(latitude, longitude, lastResolvedPincode.latitude, lastResolvedPincode.longitude);
  if (drift <= PINCODE_STICKY_DISTANCE_METERS) {
    return lastResolvedPincode.pincode;
  }

  return null;
}

function isOutlierJump(current: DeviceLocation) {
  if (!lastAcceptedPoint) return false;
  const deltaMs = Math.abs(current.timestamp - lastAcceptedPoint.timestamp);
  if (deltaMs > OUTLIER_WINDOW_MS) return false;
  const jumpMeters = distanceInMeters(
    lastAcceptedPoint.latitude,
    lastAcceptedPoint.longitude,
    current.latitude,
    current.longitude,
  );
  return jumpMeters > OUTLIER_JUMP_METERS;
}

async function reverseGeocodeLabel(
  latitude: number,
  longitude: number,
): Promise<{ label: string | null; provider: string | null }> {
  const fetchJsonWithTimeout = async (url: string, timeoutMs = 4500) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal });
      if (!response.ok) return null;
      return response.json();
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    const bdcUrl =
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
    const bdcRaw = await fetchJsonWithTimeout(bdcUrl);
    if (bdcRaw) {
      const bdcPayload = bdcRaw as {
        localityInfo?: {
          administrative?: Array<{ name?: string; order?: number; description?: string }>;
        };
        locality?: string;
        principalSubdivision?: string;
        city?: string;
      };
      const sectorFromAdmin =
        bdcPayload?.localityInfo?.administrative?.find((item) => {
          const name = String(item?.name ?? "").toLowerCase();
          return name.includes("sector");
        })?.name ?? null;
      const city = bdcPayload?.locality ?? bdcPayload?.city ?? null;
      const state = bdcPayload?.principalSubdivision ?? null;
      if (sectorFromAdmin && city) return { label: `${sectorFromAdmin}, ${city}`, provider: "bigdatacloud" };
      if (sectorFromAdmin) return { label: sectorFromAdmin, provider: "bigdatacloud" };
      if (city && state) return { label: `${city}, ${state}`, provider: "bigdatacloud" };
      if (city) return { label: city, provider: "bigdatacloud" };
      if (state) return { label: state, provider: "bigdatacloud" };
    }
  } catch {
    // Try next reverse-geocoding provider.
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
    const raw = await fetchJsonWithTimeout(url);
    if (!raw) return { label: null, provider: null };
    const payload = raw as {
      address?: Record<string, string | undefined>;
      display_name?: string;
    };
    const address = payload?.address ?? {};
    const sectorLike =
      address.suburb ??
      address.neighbourhood ??
      address.quarter ??
      address.residential ??
      null;
    const locality =
      address.city_district ??
      address.village ??
      address.town ??
      address.city ??
      null;
    const region = address.state ?? address.county ?? null;
    if (sectorLike && locality) return { label: `${sectorLike}, ${locality}`, provider: "nominatim" };
    if (sectorLike && region) return { label: `${sectorLike}, ${region}`, provider: "nominatim" };
    if (sectorLike) return { label: sectorLike, provider: "nominatim" };
    if (locality && region) return { label: `${locality}, ${region}`, provider: "nominatim" };
    if (locality) return { label: locality, provider: "nominatim" };
    if (region) return { label: region, provider: "nominatim" };
    if (typeof payload.display_name === "string" && payload.display_name.trim().length > 0) {
      return { label: payload.display_name.split(",").slice(0, 2).join(",").trim(), provider: "nominatim" };
    }
    return { label: null, provider: null };
  } catch {
    return { label: null, provider: null };
  }
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(() => resolve(), ms);
  });
}

async function getSettledCurrentLocation() {
  const first = await getCurrentLocation();
  try {
    await delay(LOCATION_SETTLE_DELAY_MS);
    const second = await getCurrentLocation();
    const firstAcc = typeof first.accuracy === "number" ? first.accuracy : Number.POSITIVE_INFINITY;
    const secondAcc = typeof second.accuracy === "number" ? second.accuracy : Number.POSITIVE_INFINITY;
    return secondAcc <= firstAcc ? second : first;
  } catch {
    return first;
  }
}

async function getTrustedCurrentLocation() {
  let attempts = 0;
  let best: DeviceLocation | null = null;
  while (attempts < 3) {
    const next = await getSettledCurrentLocation();
    if (!best) best = next;
    const bestAcc = typeof best.accuracy === "number" ? best.accuracy : Number.POSITIVE_INFINITY;
    const nextAcc = typeof next.accuracy === "number" ? next.accuracy : Number.POSITIVE_INFINITY;
    if (nextAcc < bestAcc) best = next;
    if (nextAcc <= 30) break;
    attempts += 1;
    if (attempts < 3) await delay(5000);
  }
  return best as DeviceLocation;
}

export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === "ios") {
    const status = await Geolocation.requestAuthorization("whenInUse");
    return status === "granted";
  }

  const fineGranted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: "Location Permission",
      message: "Location access is required to send live delivery updates.",
      buttonPositive: "Allow",
    },
  );
  if (fineGranted === PermissionsAndroid.RESULTS.GRANTED) return true;

  const coarseGranted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    {
      title: "Approximate Location Permission",
      message: "Approximate location helps to show your current area.",
      buttonPositive: "Allow",
    },
  );
  return coarseGranted === PermissionsAndroid.RESULTS.GRANTED;
}

async function postCurrentLocation() {
  const current = await getCurrentLocation();
  await sendDispatchLocation({
    latitude: current.latitude,
    longitude: current.longitude,
    accuracy: current.accuracy ?? 0,
    accuracyMeters: current.accuracy ?? undefined,
    source: "gps",
    trackingState: "AVAILABLE",
    mockLocation: false,
    rootedDevice: false,
    gpsEnabled: true,
  });
}

export async function getCurrentLocation(): Promise<DeviceLocation> {
  const isAccurateEnough = (point: DeviceLocation) =>
    typeof point.accuracy !== "number" || !Number.isFinite(point.accuracy) || point.accuracy <= 80;

  const tryRead = (enableHighAccuracy: boolean, timeout: number, maximumAge: number) =>
    new Promise<DeviceLocation>((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          const point = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy ?? null,
            timestamp: position.timestamp || Date.now(),
          };
          if (!isAccurateEnough(point)) {
            reject(new Error("Low GPS accuracy. Please wait for better location signal."));
            return;
          }
          resolve(point);
        },
        (error) => reject(error),
        {
          enableHighAccuracy,
          timeout,
          maximumAge,
        },
      );
    });

  try {
    // Always prefer a fresh, high-accuracy fix to avoid stale/incorrect sectors.
    return await tryRead(true, 20000, 0);
  } catch {
    // Fallback: balanced accuracy can succeed when GPS is weak/off indoors.
    return tryRead(false, 25000, 0);
  }
}

export async function startLocationTracking(intervalMs = 30000) {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) {
    throw new Error("Location permission denied.");
  }

  await postCurrentLocation();

  if (trackingTimer) {
    clearInterval(trackingTimer);
  }

  trackingTimer = setInterval(() => {
    postCurrentLocation().catch(() => null);
  }, intervalMs);
}

export async function detectAndSyncCurrentLocation(requireBackendSync = false): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
  label: string | null;
  pincode: string | null;
  provider: string | null;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  boundaryVerifying: boolean;
  trustedAt: number;
}> {
  const granted = await requestLocationPermission();
  if (!granted) {
    throw new Error("Location permission denied.");
  }

  const location = await getTrustedCurrentLocation();
  if (isOutlierJump(location) && lastAcceptedPoint) {
    // Ignore sudden GPS spikes and keep last trusted point.
    location.latitude = lastAcceptedPoint.latitude;
    location.longitude = lastAcceptedPoint.longitude;
    location.accuracy = lastAcceptedPoint.accuracy;
    location.timestamp = lastAcceptedPoint.timestamp;
  }
  let label: string | null = null;
  let pincode: string | null = null;
  let provider: string | null = null;
  let confidence: "HIGH" | "MEDIUM" | "LOW" = "LOW";

  const canReuseRecentMeta =
    lastResolvedPincode &&
    Date.now() - lastResolvedPincode.timestamp <= LOCATION_META_CACHE_MS &&
    distanceInMeters(location.latitude, location.longitude, lastResolvedPincode.latitude, lastResolvedPincode.longitude) <=
      LOCATION_REFRESH_DISTANCE_METERS;
  try {
    const locationResp = await sendDispatchLocation({
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy ?? 0,
      accuracyMeters: location.accuracy ?? undefined,
      source: "gps",
      trackingState: "AVAILABLE",
      mockLocation: false,
      rootedDevice: false,
      gpsEnabled: true,
    });
    const city =
      locationResp?.data?.city ??
      locationResp?.city ??
      locationResp?.data?.district ??
      locationResp?.district ??
      locationResp?.data?.locality ??
      locationResp?.locality ??
      null;
    const state =
      locationResp?.data?.state ??
      locationResp?.state ??
      locationResp?.data?.region ??
      locationResp?.region ??
      null;
    pincode =
      locationResp?.data?.pincode ??
      locationResp?.pincode ??
      locationResp?.data?.postalCode ??
      locationResp?.postalCode ??
      null;
    if (city && state) label = `${String(city)}, ${String(state)}`;
    else if (city) label = String(city);
    else if (state) label = String(state);
    else if (pincode) label = `Pincode ${String(pincode)}`;
    if (label) provider = "backend";
  } catch (error) {
    if (requireBackendSync) {
      throw Object.assign(new Error(error instanceof Error ? error.message : "Unable to sync location. Please retry."), {
        code: "LOCATION_SYNC_FAILED",
      });
    }
    // Keep null label; caller can fallback to coordinates.
  }

  if (!label) {
    if (canReuseRecentMeta && lastResolvedMeta) {
      label = lastResolvedMeta.label;
      provider = lastResolvedMeta.provider;
      confidence = lastResolvedMeta.confidence;
    } else {
      const geocoded = await reverseGeocodeLabel(location.latitude, location.longitude);
      label = geocoded.label;
      provider = geocoded.provider;
    }
  }

  const rawPincode = pincode ? String(pincode) : null;
  const previousResolved = lastResolvedPincode?.pincode ?? null;
  const stablePincode = resolveStablePincode(rawPincode, location.latitude, location.longitude);
  const boundaryVerifying =
    Boolean(previousResolved) && Boolean(rawPincode) && previousResolved !== rawPincode && stablePincode === previousResolved;
  const acc = location.accuracy ?? 9999;
  if (provider === "backend" && acc <= 25) confidence = "HIGH";
  else if (acc <= 50) confidence = "MEDIUM";
  else confidence = "LOW";

  lastResolvedMeta = { label, provider, confidence };
  lastAcceptedPoint = { ...location };
  return {
    latitude: location.latitude,
    longitude: location.longitude,
    accuracy: location.accuracy,
    timestamp: location.timestamp,
    label,
    pincode: stablePincode,
    provider,
    confidence,
    boundaryVerifying,
    trustedAt: Date.now(),
  };
}

export function stopLocationTracking() {
  if (trackingTimer) {
    clearInterval(trackingTimer);
    trackingTimer = null;
  }
}

export function isLocationTrackingRunning() {
  return Boolean(trackingTimer);
}
