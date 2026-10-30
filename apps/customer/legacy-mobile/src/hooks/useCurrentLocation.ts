import Geolocation from "react-native-geolocation-service";

export type Coordinates = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
  mocked?: boolean;
};

export async function getCurrentCoordinates(timeout = 15000): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Number(position.coords.accuracy ?? 0),
          timestamp: Number(position.timestamp ?? Date.now()),
          mocked: Boolean((position as any)?.mocked ?? (position?.coords as any)?.mocked ?? false),
        });
      },
      (error) => {
        reject(new Error(error.message || "Unable to fetch GPS location"));
      },
      {
        enableHighAccuracy: true,
        timeout,
        maximumAge: 0,
        forceRequestLocation: true,
        showLocationDialog: true,
      },
    );
  });
}

function positionToCoordinates(position: any): Coordinates {
  return {
    latitude: Number(position?.coords?.latitude ?? Number.NaN),
    longitude: Number(position?.coords?.longitude ?? Number.NaN),
    accuracy: Number(position?.coords?.accuracy ?? Number.POSITIVE_INFINITY),
    timestamp: Number(position?.timestamp ?? Date.now()),
    mocked: Boolean((position as any)?.mocked ?? position?.coords?.mocked ?? false),
  };
}

function isGpsUnavailableError(code: number, message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return (
    code === 2 ||
    lowerMessage.includes("provider") ||
    lowerMessage.includes("location service") ||
    lowerMessage.includes("disabled")
  );
}

function getSinglePosition(timeoutMs: number, enableHighAccuracy: boolean): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position) => {
        const coords = positionToCoordinates(position);
        if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) {
          reject(new Error("Unable to fetch GPS location"));
          return;
        }
        if (coords.mocked) {
          reject(new Error("Mock location detected. Please disable fake GPS and retry."));
          return;
        }
        resolve(coords);
      },
      (error) => {
        const code = Number((error as any)?.code ?? 0);
        const message = String(error?.message ?? "Unable to fetch GPS location");
        if (isGpsUnavailableError(code, message)) {
          reject(new Error("GPS disabled. Please enable location services."));
          return;
        }
        if (code === 3) {
          reject(new Error("Location timeout. Please retry or select manually."));
          return;
        }
        reject(new Error(message));
      },
      {
        enableHighAccuracy,
        timeout: timeoutMs,
        maximumAge: 0,
        forceRequestLocation: true,
        showLocationDialog: true,
      },
    );
  });
}

type BestCoordinatesOptions = {
  timeoutMs?: number;
  desiredAccuracyMeters?: number;
  maxAcceptedAccuracyMeters?: number;
  samples?: number;
  signal?: AbortSignal;
};

export async function getBestCurrentCoordinates(options: BestCoordinatesOptions = {}): Promise<Coordinates> {
  const timeoutMs = Number(options.timeoutMs ?? 15000);
  const desiredAccuracyMeters = Number(options.desiredAccuracyMeters ?? 30);
  // Android approximate location and indoor GPS commonly report 100-250m accuracy.
  // Treat that as usable current location instead of failing the flow repeatedly.
  const maxAcceptedAccuracyMeters = Math.max(250, Number(options.maxAcceptedAccuracyMeters ?? 100));
  const samples = Math.max(1, Number(options.samples ?? 4));

  return new Promise((resolve, reject) => {
    let watchId: number | null = null;
    let settled = false;
    let fallbackStarted = false;
    let collected = 0;
    let best: Coordinates | null = null;
    let timeoutRef: ReturnType<typeof setTimeout> | null = null;

    const maxLocationAgeMs = 30000;
    const maxOutlierJumpMeters = 700;
    const acceptedSamples: Coordinates[] = [];

    const toRadians = (value: number) => (value * Math.PI) / 180;
    const distanceMeters = (a: Coordinates, b: Coordinates) => {
      const earthRadius = 6371000;
      const dLat = toRadians(b.latitude - a.latitude);
      const dLon = toRadians(b.longitude - a.longitude);
      const lat1 = toRadians(a.latitude);
      const lat2 = toRadians(b.latitude);
      const h =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
      return 2 * earthRadius * Math.asin(Math.sqrt(h));
    };

    const finish = (value?: Coordinates, error?: Error) => {
      if (settled) return;
      settled = true;
      if (watchId !== null) (Geolocation as any).clearWatch(watchId);
      if (timeoutRef) clearTimeout(timeoutRef);
      if (abortListener) options.signal?.removeEventListener("abort", abortListener);
      if (value) {
        const accuracy = Number(value.accuracy);
        if (!Number.isFinite(accuracy) || accuracy <= 0 || accuracy > maxAcceptedAccuracyMeters) {
          reject(new Error("Location accuracy is too weak. Please move to an open area or confirm your location on the map."));
          return;
        }
        if (Date.now() - Number(value.timestamp ?? 0) > maxLocationAgeMs) {
          reject(new Error("Location reading is old. Please retry to get your current location."));
          return;
        }
        resolve(value);
        return;
      }
      reject(error ?? new Error("Unable to fetch GPS location"));
    };

    const fallbackToSinglePosition = async (error: Error) => {
      if (settled || fallbackStarted) return;
      fallbackStarted = true;
      if (watchId !== null) (Geolocation as any).clearWatch(watchId);
      if (timeoutRef) clearTimeout(timeoutRef);
      const fallbackTimeoutMs = Math.max(6000, Math.min(10000, Math.round(timeoutMs / 2)));
      try {
        const highAccuracy = await getSinglePosition(fallbackTimeoutMs, true);
        finish(highAccuracy);
      } catch {
        try {
          const balancedAccuracy = await getSinglePosition(fallbackTimeoutMs, false);
          finish(balancedAccuracy);
        } catch {
          finish(best ?? undefined, best ? undefined : error);
        }
      }
    };

    const abortListener = () => {
      finish(undefined, new Error("Location detection cancelled"));
    };
    if (options.signal) {
      if (options.signal.aborted) {
        finish(undefined, new Error("Location detection cancelled"));
        return;
      }
      options.signal.addEventListener("abort", abortListener, { once: true });
    }

    timeoutRef = setTimeout(() => {
      if (best) {
        finish(best);
        return;
      }
      void fallbackToSinglePosition(new Error("Location detection timed out. Please retry."));
    }, timeoutMs);

    watchId = (Geolocation as any).watchPosition(
      (position: any) => {
        if (settled) return;
        const sampleTimestamp = Number(position.timestamp ?? Date.now());
        const ageMs = Math.max(0, Date.now() - sampleTimestamp);
        if (ageMs > maxLocationAgeMs) {
          return;
        }

        const isMocked = Boolean((position as any)?.mocked ?? position?.coords?.mocked ?? false);
        if (isMocked) {
          finish(undefined, new Error("Mock location detected. Please disable fake GPS and retry."));
          return;
        }

        const candidate: Coordinates = { ...positionToCoordinates(position), timestamp: sampleTimestamp, mocked: isMocked };
        if (!Number.isFinite(candidate.latitude) || Math.abs(candidate.latitude) > 90 ||
            !Number.isFinite(candidate.longitude) || Math.abs(candidate.longitude) > 180 ||
            !Number.isFinite(candidate.accuracy) || Number(candidate.accuracy) <= 0) return;

        const lastAccepted = acceptedSamples[acceptedSamples.length - 1];
        if (lastAccepted) {
          const jumpMeters = distanceMeters(lastAccepted, candidate);
          if (jumpMeters > maxOutlierJumpMeters) {
            return;
          }
        }
        acceptedSamples.push(candidate);
        collected += 1;

        const candidateAccuracy = Number(candidate.accuracy ?? Number.POSITIVE_INFINITY);
        const bestAccuracy = Number(best?.accuracy ?? Number.POSITIVE_INFINITY);
        if (!best || candidateAccuracy < bestAccuracy) {
          best = candidate;
        }

        if (candidateAccuracy <= desiredAccuracyMeters) {
          finish(candidate);
          return;
        }

        if (collected >= samples && best) {
          const finalAccuracy = Number(best.accuracy ?? Number.POSITIVE_INFINITY);
          if (finalAccuracy <= maxAcceptedAccuracyMeters) {
            finish(best);
            return;
          }
          finish(
            undefined,
            new Error(
              `Location accuracy is too weak (${Math.round(finalAccuracy)}m). Please move to open area and retry.`,
            ),
          );
        }
      },
      (error: any) => {
        const code = Number((error as any)?.code ?? 0);
        const message = String(error?.message ?? "Unable to fetch GPS location");
        if (isGpsUnavailableError(code, message)) {
          finish(undefined, new Error("GPS disabled. Please enable location services."));
          return;
        }
        if (code === 3) {
          void fallbackToSinglePosition(new Error("Location timeout. Please retry or select manually."));
          return;
        }
        void fallbackToSinglePosition(new Error(message));
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 0,
        distanceFilter: 0,
        forceRequestLocation: true,
        showLocationDialog: true,
      },
    );
  });
}
