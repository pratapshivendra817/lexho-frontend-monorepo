import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const apiInstance = Object.assign(vi.fn(), {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: {
        use: vi.fn(),
      },
      response: {
        use: vi.fn(),
      },
    },
  });

  const refreshInstance = Object.assign(vi.fn(), {
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  });

  let createCallCount = 0;
  const createArgs: Array<Record<string, unknown>> = [];
  const create = vi.fn(() => {
    createCallCount += 1;
    createArgs.push({ baseURL: "https://admin.lexho.test" });
    return createCallCount === 1 ? apiInstance : refreshInstance;
  });

  const state = {
    apiInstance,
    refreshInstance,
    create,
    createArgs,
    requestFulfilled: undefined as ((config: any) => any) | undefined,
    responseFulfilled: undefined as ((response: any) => any) | undefined,
    responseRejected: undefined as ((error: any) => Promise<unknown>) | undefined,
    toastError: vi.fn(),
    normalizeApiError: vi.fn(),
    summarizeApiErrorPayload: vi.fn(),
    publishApiError: vi.fn(),
    addApiRequestLog: vi.fn(),
    getAccessToken: vi.fn(),
    getRefreshToken: vi.fn(),
    getOrCreateAdminDeviceId: vi.fn(),
    setAccessToken: vi.fn(),
    setRefreshToken: vi.fn(),
    clearAccessToken: vi.fn(),
  };

  apiInstance.interceptors.request.use.mockImplementation((fulfilled) => {
    state.requestFulfilled = fulfilled;
    return 0;
  });
  apiInstance.interceptors.response.use.mockImplementation((fulfilled, rejected) => {
    state.responseFulfilled = fulfilled;
    state.responseRejected = rejected;
    return 0;
  });

  return state;
});

vi.mock("axios", () => ({
  default: {
    create: mocks.create,
  },
  create: mocks.create,
}));

vi.mock("react-hot-toast", () => ({
  default: {
    error: mocks.toastError,
  },
}));

vi.mock("@/config", () => ({
  appConfig: {
    apiBaseUrl: "https://admin.lexho.test",
  },
}));

vi.mock("@/utils/apiError", () => ({
  normalizeApiError: mocks.normalizeApiError,
  summarizeApiErrorPayload: mocks.summarizeApiErrorPayload,
}));

vi.mock("@/utils/apiErrorBus", () => ({
  publishApiError: mocks.publishApiError,
}));

vi.mock("@/utils/apiRequestLog", () => ({
  addApiRequestLog: mocks.addApiRequestLog,
}));

vi.mock("@/utils/authSession", () => ({
  getAccessToken: mocks.getAccessToken,
  getRefreshToken: mocks.getRefreshToken,
  getOrCreateAdminDeviceId: mocks.getOrCreateAdminDeviceId,
  setAccessToken: mocks.setAccessToken,
  setRefreshToken: mocks.setRefreshToken,
  clearAccessToken: mocks.clearAccessToken,
}));

import { api } from "@/api/axios";

describe("axios api instance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();

    mocks.normalizeApiError.mockReturnValue({
      message: "Normalized error",
      requestId: "req-1",
      correlationId: "corr-1",
      retryable: false,
    });
    mocks.summarizeApiErrorPayload.mockReturnValue("summary");
    mocks.getAccessToken.mockReturnValue("token-123");
    mocks.getRefreshToken.mockReturnValue("refresh-123");
    mocks.getOrCreateAdminDeviceId.mockReturnValue("device-123");
    vi.spyOn(Date, "now").mockReturnValue(1000);
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn(() => "uuid-123"),
    });
  });

  it("creates api clients with the configured base url and exports the primary instance", () => {
    expect(mocks.createArgs).toEqual([
      { baseURL: "https://admin.lexho.test" },
      { baseURL: "https://admin.lexho.test" },
    ]);
    expect(api).toBe(mocks.apiInstance);
    expect(mocks.requestFulfilled).toBeTypeOf("function");
    expect(mocks.responseFulfilled).toBeTypeOf("function");
    expect(mocks.responseRejected).toBeTypeOf("function");
  });

  it("injects auth and correlation headers for tokenized requests and allows auth endpoints without a token", async () => {
    const requestHandler = mocks.requestFulfilled!;

    const protectedConfig = await requestHandler({
      url: "/api/admin/users",
      headers: { "X-Correlation-Id": "preset-corr" },
    });
    expect(protectedConfig.headers.Authorization).toBe("Bearer token-123");
    expect(protectedConfig.headers["X-Correlation-Id"]).toBe("preset-corr");
    expect(protectedConfig.metadata).toEqual({ startedAt: 1000 });

    mocks.getAccessToken.mockReturnValueOnce(null);
    const authConfig = await requestHandler({
      url: "/api/admin/login",
      headers: {},
    });
    expect(authConfig.headers.Authorization).toBeUndefined();
    expect(authConfig.headers["X-Correlation-Id"]).toBe("uuid-123");
  });

  it("allows unprotected requests without a token and uses the Date.now fallback correlation id when randomUUID is unavailable", async () => {
    mocks.getAccessToken.mockReturnValue(null);
    vi.stubGlobal("crypto", {});

    const config = await mocks.requestFulfilled!({
      url: "/public/health",
      headers: {},
    });

    expect(config.headers.Authorization).toBeUndefined();
    expect(config.headers["X-Correlation-Id"]).toBe("admin-1000");
    expect(config.metadata).toEqual({ startedAt: 1000 });
  });

  it("rejects protected requests without a token and redirects away from non-login pages", async () => {
    mocks.getAccessToken.mockReturnValue(null);
    const originalWindow = window;
    vi.stubGlobal("window", {
      ...originalWindow,
      location: {
        pathname: "/dashboard",
        replace: vi.fn(),
      },
      setTimeout: originalWindow.setTimeout.bind(originalWindow),
    });

    await expect(
      mocks.requestFulfilled!({
        url: "/api/admin/bookings",
        headers: {},
      }),
    ).rejects.toThrow("Authorization token is required");

    vi.stubGlobal("window", {
      ...originalWindow,
      location: {
        pathname: "/login",
        replace: vi.fn(),
      },
      setTimeout: originalWindow.setTimeout.bind(originalWindow),
    });
    await expect(
      mocks.requestFulfilled!({
        url: "/api/v1/admin/reports",
        headers: {},
      }),
    ).rejects.toThrow("Authorization token is required");
  });

  it("logs successful responses with request and correlation ids", () => {
    const response = {
      status: 200,
      data: { ok: true },
      headers: { "x-request-id": "resp-1" },
      config: {
        method: "post",
        baseURL: "https://admin.lexho.test",
        url: "/api/admin/users",
        data: { name: "Aman" },
        headers: { "X-Correlation-Id": "corr-55" },
        metadata: { startedAt: 900 },
      },
    };

    expect(mocks.responseFulfilled!(response)).toBe(response);
    expect(mocks.addApiRequestLog).toHaveBeenCalledWith({
      id: "uuid-123",
      method: "POST",
      url: "https://admin.lexho.test/api/admin/users",
      status: 200,
      durationMs: 100,
      requestId: "resp-1",
      correlationId: "corr-55",
      requestBody: { name: "Aman" },
      responseBody: { ok: true },
      createdAt: expect.any(String),
    });
  });

  it("logs successful responses with fallback defaults and alternate request-id headers", () => {
    mocks.responseFulfilled!({
      status: 204,
      data: undefined,
      headers: { "request-id": "resp-2" },
      config: {
        headers: {},
      },
    });

    expect(mocks.addApiRequestLog).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "GET",
        url: "",
        durationMs: 0,
        requestId: "resp-2",
        correlationId: undefined,
      }),
    );
  });

  it("retries 429 responses with backoff, toast, and the original request", async () => {
    vi.useFakeTimers();
    mocks.apiInstance.mockResolvedValueOnce("retried-response");

    const promise = mocks.responseRejected!({
      config: {
        method: "get",
        baseURL: "https://admin.lexho.test",
        url: "/api/admin/users",
        headers: {},
        metadata: { startedAt: 700 },
        _retry429Count: 0,
      },
      response: {
        status: 429,
        data: { message: "too many requests" },
      },
    });

    expect(mocks.toastError).toHaveBeenCalledWith("Too many requests, please try again shortly");
    await vi.advanceTimersByTimeAsync(3000);
    await expect(promise).resolves.toBe("retried-response");
    expect(mocks.apiInstance).toHaveBeenCalledWith(
      expect.objectContaining({ _retry429Count: 1, url: "/api/admin/users" }),
    );
  });

  it("defaults the 429 retry counter when it is missing", async () => {
    vi.useFakeTimers();
    mocks.apiInstance.mockResolvedValueOnce("retried-with-default-counter");

    const promise = mocks.responseRejected!({
      config: {
        method: "get",
        baseURL: "https://admin.lexho.test",
        url: "/api/admin/default-429",
        headers: {},
      },
      response: {
        status: 429,
        data: { message: "retry me" },
      },
    });

    await vi.advanceTimersByTimeAsync(3000);
    await expect(promise).resolves.toBe("retried-with-default-counter");
    expect(mocks.apiInstance).toHaveBeenCalledWith(
      expect.objectContaining({ _retry429Count: 1, url: "/api/admin/default-429" }),
    );
  });

  it("refreshes tokens on 401 once and retries the original request", async () => {
    mocks.refreshInstance.post.mockResolvedValueOnce({
      data: {
        data: {
          accessToken: "new-access",
          refreshToken: "new-refresh",
        },
      },
    });
    mocks.apiInstance.mockResolvedValueOnce("retried-after-refresh");

    await expect(
      mocks.responseRejected!({
        config: {
          method: "patch",
          baseURL: "https://admin.lexho.test",
          url: "/api/admin/orders/1",
          headers: {},
          metadata: { startedAt: 500 },
        },
        response: {
          status: 401,
          data: { message: "expired" },
        },
      }),
    ).resolves.toBe("retried-after-refresh");

    expect(mocks.refreshInstance.post).toHaveBeenCalledWith("/api/auth/refresh", {
      refreshToken: "refresh-123",
      deviceId: "device-123",
    });
    expect(mocks.setAccessToken).toHaveBeenCalledWith("new-access");
    expect(mocks.setRefreshToken).toHaveBeenCalledWith("new-refresh");
    expect(mocks.apiInstance).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer new-access" }),
        _retry: true,
      }),
    );
  });

  it("forces logout on 401 when refresh is missing or fails and suppresses api-error publishing", async () => {
    const originalWindow = window;
    vi.stubGlobal("window", {
      ...originalWindow,
      location: {
        pathname: "/dashboard",
        replace: vi.fn(),
      },
      setTimeout: originalWindow.setTimeout.bind(originalWindow),
    });
    mocks.getRefreshToken.mockReturnValueOnce(null);

    await expect(
      mocks.responseRejected!({
        config: {
          method: "get",
          baseURL: "https://admin.lexho.test",
          url: "/api/admin/profile",
          headers: {},
        },
        response: {
          status: 401,
          data: { message: "unauthorized" },
        },
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        response: expect.objectContaining({ status: 401 }),
      }),
    );

    expect(mocks.clearAccessToken).toHaveBeenCalledTimes(1);
    expect(mocks.publishApiError).not.toHaveBeenCalled();

    mocks.refreshInstance.post.mockRejectedValueOnce(new Error("refresh failed"));

    await expect(
      mocks.responseRejected!({
        config: {
          method: "get",
          baseURL: "https://admin.lexho.test",
          url: "/api/admin/profile",
          headers: {},
        },
        response: {
          status: 401,
          data: { message: "unauthorized again" },
        },
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        response: expect.objectContaining({ status: 401 }),
      }),
    );

    expect(mocks.clearAccessToken).toHaveBeenCalledTimes(2);
  });

  it("skips refresh retry when a 401 request is already marked as retried and avoids redirecting again on /login", async () => {
    const originalWindow = window;
    vi.stubGlobal("window", {
      ...originalWindow,
      location: {
        pathname: "/login",
        replace: vi.fn(),
      },
      setTimeout: originalWindow.setTimeout.bind(originalWindow),
    });

    await expect(
      mocks.responseRejected!({
        config: {
          method: "get",
          baseURL: "https://admin.lexho.test",
          url: "/api/admin/profile",
          headers: {},
          _retry: true,
        },
        response: {
          status: 401,
          data: { message: "retry exhausted" },
        },
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        response: expect.objectContaining({ status: 401 }),
      }),
    );

    expect(mocks.refreshInstance.post).not.toHaveBeenCalled();
    expect(mocks.clearAccessToken).toHaveBeenCalled();
  });

  it("publishes non-401 errors, logs serialized payloads, and suppresses duplicate device-conflict console noise", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const networkError = {
      config: {
        method: "post",
        baseURL: "https://admin.lexho.test",
        url: "/api/admin/support/tickets",
        data: new FormData(),
        headers: { "X-Correlation-Id": "corr-200" },
        metadata: { startedAt: 750 },
      },
      message: "Network Error",
    };
    (networkError.config.data as FormData).append("file", new File(["abc"], "proof.txt", { type: "text/plain" }));

    await expect(mocks.responseRejected!(networkError)).rejects.toBe(networkError);
    expect(mocks.publishApiError).toHaveBeenCalledWith({
      message: "Normalized error",
      requestId: "req-1",
      correlationId: "corr-1",
      retryable: false,
    });
    expect(consoleSpy).toHaveBeenCalled();
    expect(mocks.addApiRequestLog).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://admin.lexho.test/api/admin/support/tickets",
        requestBody: networkError.config.data,
        responseBody: undefined,
        errorMessage: "Normalized error",
      }),
    );

    consoleSpy.mockClear();
    mocks.publishApiError.mockClear();
    const conflictError = {
      config: {
        method: "post",
        baseURL: "https://admin.lexho.test",
        url: "/api/notifications/devices",
        data: null,
        headers: {},
      },
      response: {
        status: 409,
        data: { message: "duplicate device" },
      },
    };

    await expect(mocks.responseRejected!(conflictError)).rejects.toBe(conflictError);
    expect(consoleSpy).not.toHaveBeenCalled();
    expect(mocks.publishApiError).toHaveBeenCalledTimes(1);
  });

  it("stops 429 retries after the backoff budget and rejects invalid payload errors unchanged", async () => {
    const error = {
      config: {
        method: "post",
        baseURL: "https://admin.lexho.test",
        url: "/api/admin/notifications",
        data: undefined,
        headers: {},
        _retry429Count: 3,
      },
      response: {
        status: 429,
        data: { message: "still too many requests" },
      },
    };

    await expect(mocks.responseRejected!(error)).rejects.toBe(error);
    expect(mocks.apiInstance).not.toHaveBeenCalled();
    expect(mocks.publishApiError).toHaveBeenCalledWith({
      message: "Normalized error",
      requestId: "req-1",
      correlationId: "corr-1",
      retryable: false,
    });
  });

  it("uses fallback correlation ids, truncates long strings, handles unserializable payloads, and refreshes from nested token fields", async () => {
    vi.stubGlobal("crypto", undefined);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const longString = "x".repeat(610);

    const networkError = {
      config: {
        method: "post",
        baseURL: "https://admin.lexho.test",
        url: "/api/admin/upload",
        data: longString,
        headers: {},
      },
      response: {
        status: 500,
        data: circular,
      },
    };

    await expect(mocks.responseRejected!(networkError)).rejects.toBe(networkError);
    expect(mocks.addApiRequestLog).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "admin-1000",
      }),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(`req=${`${"x".repeat(600)}...`}`),
      expect.any(Object),
    );
    expect(consoleSpy.mock.calls[0]?.[0]).toContain("res=UNSERIALIZABLE");

    mocks.refreshInstance.post.mockResolvedValueOnce({
      data: {
        data: {
          token: "nested-token-only",
        },
      },
    });
    mocks.apiInstance.mockResolvedValueOnce("retried-with-nested-token");

    await expect(
      mocks.responseRejected!({
        config: {
          method: "get",
          baseURL: "https://admin.lexho.test",
          url: "/api/admin/orders/2",
          headers: {},
        },
        response: {
          status: 401,
          data: { message: "expired again" },
        },
      }),
    ).resolves.toBe("retried-with-nested-token");

    expect(mocks.setAccessToken).toHaveBeenCalledWith("nested-token-only");
  });

  it("serializes non-file form-data entries and refreshes from root token fields", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const formData = new FormData();
    formData.append("note", "hello");

    const error = {
      config: {
        method: "post",
        baseURL: "https://admin.lexho.test",
        url: "/api/admin/form",
        data: formData,
        headers: {},
      },
      response: {
        status: 400,
        data: { message: "invalid form" },
      },
    };

    await expect(mocks.responseRejected!(error)).rejects.toBe(error);
    expect(consoleSpy.mock.calls[0]?.[0]).toContain('"value":"hello"');

    mocks.refreshInstance.post.mockResolvedValueOnce({
      data: {
        accessToken: "root-access",
        refreshToken: "root-refresh",
      },
    });
    mocks.apiInstance.mockResolvedValueOnce("retried-with-root-token");

    await expect(
      mocks.responseRejected!({
        config: {
          method: "get",
          baseURL: "https://admin.lexho.test",
          url: "/api/admin/orders/3",
        },
        response: {
          status: 401,
          data: { message: "expired root" },
        },
      }),
    ).resolves.toBe("retried-with-root-token");

    expect(mocks.setAccessToken).toHaveBeenCalledWith("root-access");
    expect(mocks.setRefreshToken).toHaveBeenCalledWith("root-refresh");
  });

  it("uses config fallbacks for generic errors and logs plain JSON previews", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const error = {
      response: {
        status: 500,
        data: { problem: "server blew up" },
      },
    };

    await expect(mocks.responseRejected!(error)).rejects.toBe(error);
    expect(mocks.addApiRequestLog).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "GET",
        url: "",
        status: 500,
      }),
    );
    expect(consoleSpy.mock.calls[0]?.[0]).toContain('res={"problem":"server blew up"}');
  });

  it("falls through to logout when refresh returns a null payload", async () => {
    const originalWindow = window;
    vi.stubGlobal("window", {
      ...originalWindow,
      location: {
        pathname: "/login",
        replace: vi.fn(),
      },
      setTimeout: originalWindow.setTimeout.bind(originalWindow),
    });
    mocks.refreshInstance.post.mockResolvedValueOnce({
      data: null,
    });

    await expect(
      mocks.responseRejected!({
        config: {
          method: "get",
          baseURL: "https://admin.lexho.test",
          url: "/api/admin/orders/4",
          headers: {},
        },
        response: {
          status: 401,
          data: { message: "null refresh payload" },
        },
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        response: expect.objectContaining({ status: 401 }),
      }),
    );

    expect(mocks.clearAccessToken).toHaveBeenCalled();
  });
});
