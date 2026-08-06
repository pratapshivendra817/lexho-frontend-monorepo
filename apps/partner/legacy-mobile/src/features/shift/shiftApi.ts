import API, { getReadableApiError } from "../../services/api";
import type { LocationPayload } from "./types";
import type { ShiftHistoryItem } from "./types";

export type StartShiftPayload = {
  shiftDate?: string;
  startTime?: string;
  endTime?: string;
};

type ApiEnvelope = {
  success?: boolean;
  message?: string;
  data?: unknown;
};

const readEnvelope = (payload: unknown): ApiEnvelope => {
  if (!payload || typeof payload !== "object") return {};
  return payload as ApiEnvelope;
};

const assertContractSuccess = (payload: unknown, expectedMessages: string[], fallbackError: string) => {
  const envelope = readEnvelope(payload);
  if (envelope.success !== true) {
    throw new Error(fallbackError);
  }
  // Backends can return different success messages across environments.
  // Treat success=true as source of truth instead of hard message matching.
};

export async function startShiftApi(payload?: StartShiftPayload) {
  const payloadCandidates = payload
    ? [
        payload,
        {
          shiftStartDate: payload.shiftDate,
          startTime: payload.startTime,
          endTime: payload.endTime,
        },
        {
          date: payload.shiftDate,
          start: payload.startTime,
          end: payload.endTime,
        },
        {
          shiftDate: payload.shiftDate,
          shiftStartTime: payload.startTime,
          shiftEndTime: payload.endTime,
        },
      ]
    : [];

  try {
    // Some backends accept shift-start only as an empty body.
    try {
      const { data } = await API.post("/api/partner/dispatch/shift/start");
      assertContractSuccess(data, ["Partner shift started"], "Shift start failed");
      return data;
    } catch {
      try {
        const { data } = await API.post("/api/v1/partner/dispatch/shift/start");
        assertContractSuccess(data, ["Partner shift started"], "Shift start failed");
        return data;
      } catch {
        // Try payload variants if no-body request fails.
      }
    }

    let lastError: unknown;
    for (const candidate of payloadCandidates) {
      try {
        const { data } = await API.post("/api/partner/dispatch/shift/start", candidate);
        assertContractSuccess(data, ["Partner shift started"], "Shift start failed");
        return data;
      } catch (error) {
        lastError = error;
        try {
          const { data } = await API.post("/api/v1/partner/dispatch/shift/start", candidate);
          assertContractSuccess(data, ["Partner shift started"], "Shift start failed");
          return data;
        } catch {
          // continue trying other payloads
        }
      }
    }

    throw lastError ?? new Error("Unable to start shift");
  } catch (error) {
    throw new Error(getReadableApiError(error, "Unable to start shift"));
  }
}

export async function endShiftApi() {
  try {
    let data: unknown;
    try {
      ({ data } = await API.post("/api/v1/partner/dispatch/shift/end", {
        shiftEnd: new Date().toISOString(),
      }));
    } catch {
      ({ data } = await API.post("/api/partner/dispatch/shift/end", {
        shiftEnd: new Date().toISOString(),
      }));
    }
    assertContractSuccess(data, [], "Shift end failed");
    return data;
  } catch (error) {
    throw new Error(getReadableApiError(error, "Unable to end shift"));
  }
}

export async function setPartnerAvailabilityApi(online: boolean, maxActiveJobs?: number) {
  const payloadCandidates = [
    { online, maxActiveJobs },
    { isOnline: online, maxActiveJobs },
    { available: online, maxActiveJobs },
    { online, isOnline: online, available: online, maxActiveJobs },
  ];

  try {
    let dispatchUpdated = false;
    let lastDispatchError: unknown;
    for (const payload of payloadCandidates) {
      try {
        const { data } = await API.put("/api/v1/partner/dispatch/availability", payload);
        assertContractSuccess(data, ["Partner availability updated"], "Availability update failed");
        dispatchUpdated = true;
        break;
      } catch (error) {
        lastDispatchError = error;
        try {
          const { data } = await API.put("/api/partner/dispatch/availability", payload);
          assertContractSuccess(data, ["Partner availability updated"], "Availability update failed");
          dispatchUpdated = true;
          break;
        } catch {
          // continue
        }
      }
    }
    if (!dispatchUpdated) {
      for (const payload of payloadCandidates) {
        try {
          const { data } = await API.patch("/api/v1/partner/dispatch/availability", payload);
          assertContractSuccess(data, ["Partner availability updated"], "Availability update failed");
          dispatchUpdated = true;
          break;
        } catch {
          try {
            const { data } = await API.patch("/api/partner/dispatch/availability", payload);
            assertContractSuccess(data, ["Partner availability updated"], "Availability update failed");
            dispatchUpdated = true;
            break;
          } catch {
            // try next
          }
        }
      }
    }

    if (!dispatchUpdated) {
      throw lastDispatchError;
    }

    // Keep partner availability in sync when endpoint exists.
    for (const payload of payloadCandidates) {
      try {
        await API.put("/api/v1/partner/availability", payload);
        break;
      } catch {
        try {
          await API.put("/api/partner/availability", payload);
          break;
        } catch {
          // optional sync call
        }
      }
    }
  } catch (error) {
    throw new Error(getReadableApiError(error, "Unable to update availability"));
  }
}

export async function sendPartnerLocationApi(payload: LocationPayload) {
  try {
    const requestPayload = {
      latitude: payload.latitude,
      longitude: payload.longitude,
      source: payload.source ?? "gps",
      trackingState: payload.trackingState,
      bookingId: payload.bookingId,
      customerLatitude: payload.customerLatitude,
      customerLongitude: payload.customerLongitude,
      accuracyMeters: payload.accuracyMeters ?? payload.accuracy,
      speedKmh: payload.speedKmh,
      headingDegrees: payload.headingDegrees,
      mockLocation: payload.mockLocation,
      rootedDevice: payload.rootedDevice,
      gpsEnabled: payload.gpsEnabled ?? true,
    };

    let data: unknown;
    try {
      ({ data } = await API.post("/api/v1/partner/dispatch/location", requestPayload));
    } catch {
      ({ data } = await API.post("/api/partner/dispatch/location", {
        ...requestPayload,
        accuracy: payload.accuracy,
      }));
    }
    assertContractSuccess(data, ["Partner location updated"], "Location update failed");
  } catch (error) {
    throw new Error(getReadableApiError(error, "Unable to send location update"));
  }
}

const parseArray = (payload: unknown): Record<string, unknown>[] => {
  const root = (payload ?? {}) as Record<string, unknown>;
  const data = (root.data ?? root) as Record<string, unknown>;
  const direct = Array.isArray(data) ? data : null;
  if (direct) return direct as Record<string, unknown>[];
  if (Array.isArray(data.content)) return data.content as Record<string, unknown>[];
  if (Array.isArray(data.items)) return data.items as Record<string, unknown>[];
  if (Array.isArray(root.content)) return root.content as Record<string, unknown>[];
  if (Array.isArray(root.items)) return root.items as Record<string, unknown>[];
  return [];
};

const asNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const toHistoryItem = (row: Record<string, unknown>, index: number): ShiftHistoryItem => {
  const startedAt = asNumber(row.startedAt ?? row.shiftStartTime ?? row.startTime ?? row.startAt);
  const endedAt = asNumber(row.endedAt ?? row.shiftEndTime ?? row.endTime ?? row.endAt);
  const durationSeconds =
    asNumber(row.durationSeconds ?? row.durationSec ?? row.totalDurationSeconds) ||
    (startedAt > 0 && endedAt > startedAt ? Math.floor((endedAt - startedAt) / 1000) : 0);
  return {
    id: String(row.id ?? `${startedAt}-${endedAt}-${index}`),
    startedAt,
    endedAt,
    durationSeconds,
    online: typeof row.online === "boolean" ? row.online : undefined,
    shiftStart: typeof row.shiftStart === "string" ? row.shiftStart : undefined,
    shiftEnd: typeof row.shiftEnd === "string" ? row.shiftEnd : undefined,
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : undefined,
    maxActiveJobs: asNumber(row.maxActiveJobs),
  };
};

export async function fetchShiftHistoryApi(): Promise<ShiftHistoryItem[]> {
  const endpoints = [
    "/api/v1/partner/dispatch/shift/history",
    "/api/v1/partner/dispatch/history",
    "/api/partner/dispatch/shift/history",
    "/api/partner/dispatch/history",
  ];

  for (const endpoint of endpoints) {
    try {
      const { data } = await API.get(endpoint);
      assertContractSuccess(data, ["Partner shift history fetched"], "Shift history fetch failed");
      const rows = parseArray(data).map((item, index) => toHistoryItem(item, index));
      if (rows.length > 0) return rows;
    } catch {
      // try next endpoint
    }
  }

  throw new Error(getReadableApiError({}, "Shift history endpoint unavailable"));
}
