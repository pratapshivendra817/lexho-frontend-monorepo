import { isAxiosError } from "axios";

type UnknownRecord = Record<string, unknown>;

function normalizeString(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return null;
}

function readValidationMessage(payload: unknown): string | null {
  if (!payload) {
    return null;
  }

  const direct = normalizeString(payload);
  if (direct) {
    return direct;
  }

  if (typeof payload !== "object") {
    return null;
  }

  const source = payload as UnknownRecord;

  if (Array.isArray(source.errors) && source.errors.length > 0) {
    const first = source.errors[0];
    if (first && typeof first === "object") {
      const row = first as UnknownRecord;
      const field = normalizeString(row.field);
      const message =
        normalizeString(row.defaultMessage) ??
        normalizeString(row.message) ??
        normalizeString(row.error);
      if (field && message) {
        return `${field}: ${message}`;
      }
      if (message) {
        return message;
      }
    }
  }

  if (source.fieldErrors && typeof source.fieldErrors === "object") {
    const entries = Object.entries(source.fieldErrors as UnknownRecord);
    if (entries.length > 0) {
      const [field, value] = entries[0];
      const message = normalizeString(value);
      if (message) {
        return `${field}: ${message}`;
      }
    }
  }

  return null;
}

function readMessage(payload: unknown): string | null {
  if (!payload) {
    return null;
  }

  const direct = normalizeString(payload);
  if (direct) {
    return direct;
  }

  if (typeof payload !== "object") {
    return null;
  }

  const source = payload as UnknownRecord;
  const candidates = [
    source.message,
    source.error,
    source.details,
    source.title,
    (source.data as UnknownRecord | undefined)?.message,
    (source.data as UnknownRecord | undefined)?.error,
    (source.data as UnknownRecord | undefined)?.details,
    readValidationMessage(source.data),
    readValidationMessage(source),
  ];

  for (const candidate of candidates) {
    const message = normalizeString(candidate);
    if (message) {
      return message;
    }
  }

  return null;
}

export function summarizeApiErrorPayload(payload: unknown): string {
  if (payload == null) {
    return "EMPTY_RESPONSE";
  }

  const message = readMessage(payload);
  if (message) {
    return message;
  }

  try {
    const serialized = JSON.stringify(payload);
    if (!serialized) {
      return "UNSERIALIZABLE_RESPONSE";
    }
    return serialized.length > 500 ? `${serialized.slice(0, 500)}...` : serialized;
  } catch {
    return "UNSERIALIZABLE_RESPONSE";
  }
}

export function extractApiError(error: unknown, fallback: string): string {
  if (!isAxiosError(error)) {
    return fallback;
  }

  if (!error.response) {
    if (error.code === "ERR_NETWORK") {
      return "Cannot reach backend. Check backend server and API base URL.";
    }
    return fallback;
  }

  const status = error.response.status;
  const message = readMessage(error.response.data);
  if (message) {
    return `${message} (HTTP ${status})`;
  }

  return `${fallback} (HTTP ${status})`;
}
