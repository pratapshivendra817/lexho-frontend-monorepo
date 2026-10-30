import { api, parseApiError } from "../api/client";
import { withRetry } from "../utils/retry";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LOCATION_API_PATH = "/api/v1/customer/location";
const REVERSE_GEOCODE_CACHE_KEY = "@lexho/customer/reverse-geocode-cache-v2";
const SERVICEABILITY_CACHE_KEY = "@lexho/customer/serviceability-cache-v2";
const REVERSE_GEOCODE_TTL_MS = 24 * 60 * 60 * 1000;
const SERVICEABILITY_TTL_MS = 10 * 60 * 1000;
const inMemoryReverseCache = new Map();
const inMemoryServiceabilityCache = new Map();
let reverseCacheLoaded = false;
let serviceabilityCacheLoaded = false;

function roundedGeoKey(latitude, longitude) {
  const lat = Number(latitude ?? 0);
  const lng = Number(longitude ?? 0);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "";
  return `${lat.toFixed(3)}:${lng.toFixed(3)}`;
}

function nowMs() {
  return Date.now();
}

async function hydrateCacheFromStorage(cacheKey, memoryCache, loadedFlagName) {
  if (loadedFlagName === "reverse" && reverseCacheLoaded) return;
  if (loadedFlagName === "serviceability" && serviceabilityCacheLoaded) return;
  try {
    const raw = await AsyncStorage.getItem(cacheKey);
    if (!raw) {
      if (loadedFlagName === "reverse") reverseCacheLoaded = true;
      if (loadedFlagName === "serviceability") serviceabilityCacheLoaded = true;
      return;
    }
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      Object.entries(parsed).forEach(([key, value]) => {
        memoryCache.set(key, value);
      });
    }
  } catch {
    // ignore cache hydration failures
  } finally {
    if (loadedFlagName === "reverse") reverseCacheLoaded = true;
    if (loadedFlagName === "serviceability") serviceabilityCacheLoaded = true;
  }
}

async function persistCacheToStorage(cacheKey, memoryCache) {
  try {
    const asObject = Object.fromEntries(memoryCache.entries());
    await AsyncStorage.setItem(cacheKey, JSON.stringify(asObject));
  } catch {
    // ignore storage errors
  }
}

export async function updateCurrentLocation(payload) {
  try {
    const requestBody = {
      ...(payload ?? {}),
      eventTimestampMs: Number(payload?.eventTimestampMs ?? Date.now()),
    };
    const { data } = await withRetry(() => api.post(`${LOCATION_API_PATH}/update`, requestBody));
    return data;
  } catch (error) {
    throw new Error(parseApiError(error, "Failed to update location"));
  }
}

export async function saveAddress(payload) {
  try {
    const requestBody = {
      type: payload?.type ?? payload?.label ?? "HOME",
      customLabel: payload?.customLabel ?? payload?.label ?? "",
      flatNo: payload?.flatNo ?? "",
      floor: payload?.floor ?? "",
      buildingName: payload?.buildingName ?? "",
      landmark: payload?.landmark ?? "",
      addressLine: payload?.addressLine ?? "",
      area: payload?.area ?? payload?.addressLine ?? "",
      sector: payload?.sector ?? "",
      latitude: payload?.latitude,
      longitude: payload?.longitude,
      city: payload?.city ?? "",
      state: payload?.state ?? "",
      country: payload?.country ?? "India",
      pincode: payload?.pincode ?? "",
      mobile: payload?.mobile ?? "",
    };
    const { data } = await withRetry(() => api.post(`${LOCATION_API_PATH}/save-address`, requestBody));
    return data;
  } catch (error) {
    throw new Error(parseApiError(error, "Failed to save address"));
  }
}

export async function updateAddress(payload) {
  try {
    const normalized = {
      id: String(payload?.id ?? ""),
      type: payload?.type ?? payload?.label,
      customLabel: payload?.customLabel ?? payload?.label ?? "",
      flatNo: payload?.flatNo ?? "",
      floor: payload?.floor ?? "",
      buildingName: payload?.buildingName ?? "",
      landmark: payload?.landmark ?? "",
      area: payload?.area ?? payload?.addressLine ?? "",
      sector: payload?.sector ?? "",
      city: payload?.city ?? "",
      state: payload?.state ?? "",
      country: payload?.country ?? "India",
      pincode: payload?.pincode ?? "",
      latitude: payload?.latitude,
      longitude: payload?.longitude,
      addressLine: payload?.addressLine ?? "",
      mobile: payload?.mobile ?? "",
    };

    const { data } = await withRetry(() =>
      api.put(`${LOCATION_API_PATH}/address/${encodeURIComponent(normalized.id)}`, normalized),
    );
    return data;
  } catch (error) {
    throw new Error(parseApiError(error, "Failed to update address"));
  }
}

export async function getCurrentAddress(_userId) {
  try {
    const { data } = await withRetry(() => api.get(`${LOCATION_API_PATH}/current`));
    return data;
  } catch (error) {
    throw new Error(parseApiError(error, "Failed to fetch current address"));
  }
}

export async function getAllAddresses(_userId, options = {}) {
  try {
    const params = {
      page: Number.isFinite(Number(options?.page)) ? Number(options.page) : 0,
      size: Number.isFinite(Number(options?.size)) ? Number(options.size) : 50,
      ...(String(options?.search ?? "").trim() ? { search: String(options.search).trim() } : {}),
    };
    const { data } = await withRetry(() => api.get(`${LOCATION_API_PATH}/all`, { params }));
    return data;
  } catch (error) {
    throw new Error(parseApiError(error, "Failed to fetch addresses"));
  }
}

export async function setDefaultAddress(addressId) {
  try {
    const { data } = await withRetry(() => api.patch(`${LOCATION_API_PATH}/default/${addressId}`));
    return data;
  } catch (error) {
    throw new Error(parseApiError(error, "Failed to set default address"));
  }
}

export async function deleteAddress(addressId) {
  try {
    const { data } = await withRetry(() => api.delete(`${LOCATION_API_PATH}/${addressId}`));
    return data;
  } catch (error) {
    throw new Error(parseApiError(error, "Failed to delete address"));
  }
}

export async function reverseGeocode(payload) {
  const latitude = Number(payload?.latitude ?? payload?.lat ?? 0);
  const longitude = Number(payload?.longitude ?? payload?.lng ?? 0);
  const geoKey = roundedGeoKey(latitude, longitude);

  await hydrateCacheFromStorage(REVERSE_GEOCODE_CACHE_KEY, inMemoryReverseCache, "reverse");
  const cached = geoKey ? inMemoryReverseCache.get(geoKey) : null;
  if (cached?.expiresAt && cached.expiresAt > nowMs()) {
    return cached.value;
  }

  try {
    const requestBody = {
      ...(payload ?? {}),
      eventTimestampMs: Number(payload?.eventTimestampMs ?? Date.now()),
    };
    const { data } = await withRetry(() => api.post(`${LOCATION_API_PATH}/reverse-geocode`, requestBody));
    if (geoKey) {
      inMemoryReverseCache.set(geoKey, {
        value: data,
        expiresAt: nowMs() + REVERSE_GEOCODE_TTL_MS,
      });
      void persistCacheToStorage(REVERSE_GEOCODE_CACHE_KEY, inMemoryReverseCache);
    }
    return data;
  } catch (error) {
    throw new Error(parseApiError(error, "Failed to reverse geocode location"));
  }
}

export async function checkServiceability(payload, options = {}) {
  const latitude = Number(payload?.latitude ?? payload?.lat ?? 0);
  const longitude = Number(payload?.longitude ?? payload?.lng ?? 0);
  const pincode = String(payload?.pincode ?? payload?.postalCode ?? "").trim();
  const geoKey = roundedGeoKey(latitude, longitude);
  const cacheKey = `${geoKey}:${pincode}`;

  await hydrateCacheFromStorage(SERVICEABILITY_CACHE_KEY, inMemoryServiceabilityCache, "serviceability");
  const cached = cacheKey ? inMemoryServiceabilityCache.get(cacheKey) : null;
  if (!options.forceRefresh && cached?.expiresAt && cached.expiresAt > nowMs()) {
    return cached.value;
  }

  try {
    const requestBody = {
      ...payload,
      latitude,
      longitude,
      lat: latitude,
      lng: longitude,
      pincode,
      eventTimestampMs: Number(payload?.eventTimestampMs ?? Date.now()),
    };
    const { data } = await withRetry(() => api.post(`${LOCATION_API_PATH}/serviceability/check`, requestBody));
    if (cacheKey) {
      inMemoryServiceabilityCache.set(cacheKey, {
        value: data,
        expiresAt: nowMs() + SERVICEABILITY_TTL_MS,
      });
      void persistCacheToStorage(SERVICEABILITY_CACHE_KEY, inMemoryServiceabilityCache);
    }
    return data;
  } catch (error) {
    throw new Error(parseApiError(error, "Failed to check serviceability"));
  }
}

export async function searchLocations(query) {
  const text = String(query ?? "").trim();
  if (!text) return [];
  const normalizedQuery = text.toLowerCase();

  const toRowsFromUnknown = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== "object") return [];

    const directCandidates = [
      payload?.data?.items,
      payload?.data?.results,
      payload?.data?.locations,
      payload?.data?.predictions,
      payload?.items,
      payload?.results,
      payload?.locations,
      payload?.predictions,
      payload?.content,
    ];
    for (const candidate of directCandidates) {
      if (Array.isArray(candidate)) return candidate;
    }
    return [];
  };

  const candidates = [
    `/api/v1/maps/geocode?q=${encodeURIComponent(text)}&limit=12`,
    `${LOCATION_API_PATH}/all?search=${encodeURIComponent(text)}`,
    `${LOCATION_API_PATH}/all?query=${encodeURIComponent(text)}`,
    `${LOCATION_API_PATH}/search?query=${encodeURIComponent(text)}`,
    `${LOCATION_API_PATH}/search?search=${encodeURIComponent(text)}`,
  ];

  for (const url of candidates) {
    try {
      const { data } = await withRetry(() => api.get(url));
      const rows = toRowsFromUnknown(data);
      if (rows.length > 0) return rows;
    } catch {
      // try next compatible endpoint signature
    }
  }

  const mapGeoRow = (row, index) => {
    const address = row?.address ?? {};
    const displayName = String(row?.display_name ?? "").trim();
    const postcode = String(address?.postcode ?? "").trim();
    const city = String(address?.city ?? address?.town ?? address?.village ?? "").trim();
    const state = String(address?.state ?? "").trim();
    const country = String(address?.country ?? "India").trim();

    return {
      id: String(row?.place_id ?? row?.osm_id ?? `geo-${index}`),
      addressId: String(row?.place_id ?? row?.osm_id ?? `geo-${index}`),
      label: "SEARCH",
      type: "SEARCH",
      addressLine: displayName,
      area: String(address?.suburb ?? address?.neighbourhood ?? "").trim(),
      city,
      state,
      country,
      pincode: postcode,
      latitude: Number(row?.lat ?? 0),
      longitude: Number(row?.lon ?? 0),
    };
  };

  // Fallback 1: Nominatim (India-filtered).
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=in&addressdetails=1&limit=12&q=${encodeURIComponent(text)}`,
      { headers: { Accept: "application/json", "Accept-Language": "en" } },
    );
    if (response.ok) {
      const rows = await response.json();
      if (Array.isArray(rows) && rows.length > 0) {
        return rows.map((row, index) => mapGeoRow(row, index));
      }
    }
  } catch {
    // try next fallback
  }

  // Fallback 2: maps.co geocoder (more tolerant on mobile clients).
  try {
    const response = await fetch(
      `https://geocode.maps.co/search?format=jsonv2&countrycodes=in&addressdetails=1&q=${encodeURIComponent(text)}`,
      { headers: { Accept: "application/json", "Accept-Language": "en" } },
    );
    if (!response.ok) return [];
    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length === 0) return [];
    return rows.slice(0, 12).map((row, index) => mapGeoRow(row, index));
  } catch {
    // fallback 3 below
  }

  // Fallback 3: local India city suggestions to avoid blank UX when network geocoders fail.
  const indiaCitySeed = [
    { city: "Indore", state: "Madhya Pradesh", latitude: 22.7196, longitude: 75.8577, pincode: "452001" },
    { city: "Bhopal", state: "Madhya Pradesh", latitude: 23.2599, longitude: 77.4126, pincode: "462001" },
    { city: "Delhi", state: "Delhi", latitude: 28.6139, longitude: 77.209, pincode: "110001" },
    { city: "Mumbai", state: "Maharashtra", latitude: 19.076, longitude: 72.8777, pincode: "400001" },
    { city: "Bengaluru", state: "Karnataka", latitude: 12.9716, longitude: 77.5946, pincode: "560001" },
    { city: "Hyderabad", state: "Telangana", latitude: 17.385, longitude: 78.4867, pincode: "500001" },
    { city: "Chennai", state: "Tamil Nadu", latitude: 13.0827, longitude: 80.2707, pincode: "600001" },
    { city: "Kolkata", state: "West Bengal", latitude: 22.5726, longitude: 88.3639, pincode: "700001" },
    { city: "Pune", state: "Maharashtra", latitude: 18.5204, longitude: 73.8567, pincode: "411001" },
    { city: "Jaipur", state: "Rajasthan", latitude: 26.9124, longitude: 75.7873, pincode: "302001" },
  ];

  const localMatches = indiaCitySeed
    .filter((row) => row.city.toLowerCase().includes(normalizedQuery) || row.state.toLowerCase().includes(normalizedQuery))
    .slice(0, 12)
    .map((row, index) => ({
      id: `local-city-${index}-${row.city.toLowerCase()}`,
      addressId: `local-city-${index}-${row.city.toLowerCase()}`,
      label: "SEARCH",
      type: "SEARCH",
      addressLine: `${row.city}, ${row.state}, India`,
      city: row.city,
      state: row.state,
      country: "India",
      pincode: row.pincode,
      latitude: row.latitude,
      longitude: row.longitude,
    }));

  return localMatches;
}
