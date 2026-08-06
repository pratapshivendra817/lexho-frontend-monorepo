import { isAxiosError } from "axios";

type UnknownRecord = Record<string, unknown>;

export type KnownApiErrorCode =
  | "ORDER_NOT_FOUND"
  | "PAYMENT_FAILED"
  | "ACCESS_DENIED"
  | "RATE_LIMIT_EXCEEDED"
  | "VALIDATION_ERROR";

export type NormalizedApiError = {
  code?: string;
  message: string;
  technicalMessage?: string;
  httpStatus?: number;
  requestId?: string;
  correlationId?: string;
  retryable: boolean;
};

const FRIENDLY_MESSAGES: Record<KnownApiErrorCode, string> = {
  ORDER_NOT_FOUND: "We could not find this order. Refresh and try again.",
  PAYMENT_FAILED: "The payment did not complete. Please retry or check the payment record.",
  ACCESS_DENIED: "You do not have permission to perform this action.",
  RATE_LIMIT_EXCEEDED: "Too many requests. Please wait a moment and try again.",
  VALIDATION_ERROR: "Some details look incorrect. Review the highlighted fields and try again.",
};

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

function readCode(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }
  const source = payload as UnknownRecord;
  const nested = source.data && typeof source.data === "object" ? (source.data as UnknownRecord) : {};
  const code = normalizeString(source.code) ?? normalizeString(source.errorCode) ?? normalizeString(nested.code);
  return code ?? undefined;
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
  return normalizeApiError(error, fallback).message;
}

export function normalizeApiError(error: unknown, fallback = "Something went wrong"): NormalizedApiError {
  if (!isAxiosError(error)) {
    return {
      message: fallback,
      retryable: false,
    };
  }

  const status = error.response?.status;
  const payload = error.response?.data;
  const code = readCode(payload);
  const requestId =
    normalizeString(error.response?.headers?.["x-request-id"]) ??
    normalizeString(error.response?.headers?.["request-id"]) ??
    normalizeString((payload as UnknownRecord | undefined)?.requestId);
  const correlationId =
    normalizeString(error.response?.headers?.["x-correlation-id"]) ??
    normalizeString(error.config?.headers?.["X-Correlation-Id"]) ??
    normalizeString((payload as UnknownRecord | undefined)?.correlationId);

  if (!error.response) {
    const isNetwork = error.code === "ERR_NETWORK" || error.message.includes("Network Error");
    return {
      code: isNetwork ? "NETWORK_ERROR" : error.code,
      message: isNetwork ? "Cannot reach backend. Check your connection and try again." : fallback,
      technicalMessage: error.message,
      requestId: requestId ?? undefined,
      correlationId: correlationId ?? undefined,
      retryable: true,
    };
  }

  const knownCode =
    code && Object.prototype.hasOwnProperty.call(FRIENDLY_MESSAGES, code) ? (code as KnownApiErrorCode) : undefined;
  const message =
    knownCode ? FRIENDLY_MESSAGES[knownCode] : readMessage(payload) ?? `${fallback}${status ? ` (HTTP ${status})` : ""}`;

  return {
    code,
    message,
    technicalMessage: readMessage(payload) ?? error.message,
    httpStatus: status,
    requestId: requestId ?? undefined,
    correlationId: correlationId ?? undefined,
    retryable: !status || status === 408 || status === 429 || status >= 500,
  };
}
