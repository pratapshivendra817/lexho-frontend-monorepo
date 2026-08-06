import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  extractApiError,
  normalizeApiError,
  summarizeApiErrorPayload,
} from "@/utils/apiError";

const axiosMocks = vi.hoisted(() => ({
  isAxiosError: vi.fn(),
}));

vi.mock("axios", () => ({
  isAxiosError: axiosMocks.isAxiosError,
}));

describe("apiError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axiosMocks.isAxiosError.mockReturnValue(false);
  });

  it("summarizes nullish and direct payloads", () => {
    expect(summarizeApiErrorPayload(null)).toBe("EMPTY_RESPONSE");
    expect(summarizeApiErrorPayload(undefined)).toBe("EMPTY_RESPONSE");
    expect(summarizeApiErrorPayload("  plain message  ")).toBe("plain message");
  });

  it("extracts nested validation and field error messages", () => {
    expect(
      summarizeApiErrorPayload({
        data: {
          errors: [{ field: "email", defaultMessage: "Required" }],
        },
      }),
    ).toBe("email: Required");

    expect(
      summarizeApiErrorPayload({
        fieldErrors: {
          password: "Too short",
        },
      }),
    ).toBe("password: Too short");
  });

  it("handles alternate validation payload shapes and primitive payloads", () => {
    expect(
      summarizeApiErrorPayload({
        errors: [{ message: "Plain validation message" }],
      }),
    ).toBe("Plain validation message");

    expect(
      summarizeApiErrorPayload({
        data: "Already normalized",
      }),
    ).toBe("Already normalized");

    expect(summarizeApiErrorPayload(42)).toBe("42");
  });

  it("serializes unknown payloads and handles unserializable values", () => {
    expect(summarizeApiErrorPayload({ ok: true, items: [] })).toBe('{"ok":true,"items":[]}');
    expect(summarizeApiErrorPayload(() => "ignored")).toBe("UNSERIALIZABLE_RESPONSE");

    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(summarizeApiErrorPayload(circular)).toBe("UNSERIALIZABLE_RESPONSE");
  });

  it("normalizes non-axios errors with fallback messaging", () => {
    expect(normalizeApiError(new Error("plain failure"), "Fallback")).toEqual({
      message: "Fallback",
      retryable: false,
    });
  });

  it("normalizes axios network errors and preserves technical metadata", () => {
    axiosMocks.isAxiosError.mockReturnValue(true);

    const error = {
      code: "ERR_NETWORK",
      message: "Network Error",
      config: {
        headers: {
          "X-Correlation-Id": "corr-1",
        },
      },
    };

    expect(normalizeApiError(error, "Fallback")).toEqual({
      code: "NETWORK_ERROR",
      message: "Cannot reach backend. Check your connection and try again.",
      technicalMessage: "Network Error",
      requestId: undefined,
      correlationId: "corr-1",
      retryable: true,
    });
  });

  it("uses the generic fallback for non-network axios errors without responses", () => {
    axiosMocks.isAxiosError.mockReturnValue(true);

    const error = {
      code: "ECONNRESET",
      message: "Socket closed",
      config: {
        headers: {},
      },
    };

    expect(normalizeApiError(error, "Fallback")).toEqual({
      code: "ECONNRESET",
      message: "Fallback",
      technicalMessage: "Socket closed",
      requestId: undefined,
      correlationId: undefined,
      retryable: true,
    });
  });

  it("normalizes axios http errors with friendly known-code messages", () => {
    axiosMocks.isAxiosError.mockReturnValue(true);

    const error = {
      message: "Request failed",
      response: {
        status: 403,
        headers: {
          "x-request-id": "req-1",
        },
        data: {
          code: "ACCESS_DENIED",
          correlationId: "corr-2",
        },
      },
      config: {
        headers: {},
      },
    };

    expect(normalizeApiError(error, "Fallback")).toEqual({
      code: "ACCESS_DENIED",
      message: "You do not have permission to perform this action.",
      technicalMessage: "Request failed",
      httpStatus: 403,
      requestId: "req-1",
      correlationId: "corr-2",
      retryable: false,
    });
  });

  it("prefers nested payload messages, request ids, and retryable http statuses", () => {
    axiosMocks.isAxiosError.mockReturnValue(true);

    const error = {
      message: "Boom",
      response: {
        status: 500,
        headers: {
          "request-id": "req-2",
        },
        data: {
          data: {
            details: "Backend exploded",
          },
          requestId: "payload-req",
        },
      },
      config: {
        headers: {},
      },
    };

    expect(normalizeApiError(error, "Fallback")).toEqual({
      code: undefined,
      message: "Backend exploded",
      technicalMessage: "Backend exploded",
      httpStatus: 500,
      requestId: "req-2",
      correlationId: undefined,
      retryable: true,
    });
  });

  it("falls back to formatted http status text when payload has no readable message", () => {
    axiosMocks.isAxiosError.mockReturnValue(true);

    const error = {
      message: "No details",
      response: {
        status: 418,
        headers: {},
        data: {},
      },
      config: {
        headers: {},
      },
    };

    expect(extractApiError(error, "Fallback")).toBe("Fallback (HTTP 418)");
  });
});
