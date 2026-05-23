import { AppState, type AppStateStatus } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import Geolocation from "react-native-geolocation-service";

import { SHIFT_TRACKING } from "./constants";
import { enqueueLocation, flushLocationQueue } from "./locationQueue";
import { ensureLocationPermissions } from "./locationPermissionManager";
import { sendPartnerLocationApi } from "./shiftApi";
import type { LocationPayload } from "./types";

type TrackingCondition = {
  shiftStarted: boolean;
  online: boolean;
  locationEnabled: boolean;
};

let watchId: number | null = null;
let appStateSub: { remove: () => void } | null = null;
let netUnsub: (() => void) | null = null;
let currentCondition: TrackingCondition = { shiftStarted: false, online: false, locationEnabled: false };
let lastSentAt = 0;
let onLocationSent: ((timestamp: number) => void) | null = null;

const shouldTrack = (condition: TrackingCondition) =>
  condition.shiftStarted && condition.online && condition.locationEnabled;

async function pushLocation(payload: LocationPayload) {
  try {
    await sendPartnerLocationApi(payload);
    await flushLocationQueue();
    onLocationSent?.(Date.now());
  } catch {
    await enqueueLocation(payload);
  }
}

async function ensureGpsEnabled() {
  await new Promise<void>((resolve, reject) => {
    Geolocation.getCurrentPosition(
      () => resolve(),
      (error) => {
        // POSITION_UNAVAILABLE commonly means device location services are OFF.
        if (error?.code === 2) {
          reject(new Error("GPS is turned off. Please enable device location services."));
          return;
        }
        reject(new Error(error?.message || "Unable to access current location."));
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0,
      },
    );
  });
}

function stopWatch() {
  if (watchId !== null) {
    Geolocation.clearWatch(watchId);
    watchId = null;
  }
}

async function startWatch() {
  const hasPermission = await ensureLocationPermissions();
  if (!hasPermission) throw new Error("Location permission denied.");
  await ensureGpsEnabled();

  stopWatch();
  watchId = Geolocation.watchPosition(
    (position) => {
      const now = Date.now();
      if (now - lastSentAt < SHIFT_TRACKING.minIntervalMs) return;
      lastSentAt = now;
      const payload: LocationPayload = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        capturedAt: now,
      };
      pushLocation(payload).catch(() => null);
    },
    async () => {
      // no-op, queued retries will handle transient failures
    },
    {
      enableHighAccuracy: true,
      distanceFilter: SHIFT_TRACKING.minDistanceMeters,
      interval: SHIFT_TRACKING.minIntervalMs,
      fastestInterval: 15_000,
      showsBackgroundLocationIndicator: true,
      useSignificantChanges: false,
      forceRequestLocation: true,
    },
  );
}

function ensureLifecycleHandlers() {
  if (!appStateSub) {
    appStateSub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (!shouldTrack(currentCondition) || state === "active") return;
      // Keep watch active in background-capable mode; immediate flush when app returns.
    });
  }

  if (!netUnsub) {
    netUnsub = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        flushLocationQueue().catch(() => null);
      }
    });
  }
}

export async function syncTrackingByCondition(condition: TrackingCondition) {
  currentCondition = condition;
  ensureLifecycleHandlers();
  if (!shouldTrack(condition)) {
    stopWatch();
    return;
  }
  await startWatch();
}

export function stopTrackingAndCleanup() {
  stopWatch();
  if (appStateSub) {
    appStateSub.remove();
    appStateSub = null;
  }
  if (netUnsub) {
    netUnsub();
    netUnsub = null;
  }
}

export function isTrackingActive() {
  return watchId !== null;
}

export function setLocationSentHandler(handler: ((timestamp: number) => void) | null) {
  onLocationSent = handler;
}
