export {};

const mockPinnedFetch = jest.fn();
const mockAxiosRequest = jest.fn();
const mockLogCrashlyticsMessage = jest.fn();
const mockRecordNonFatalError = jest.fn();

jest.mock("react-native-ssl-pinning", () => ({
  fetch: (...args: any[]) => mockPinnedFetch(...args),
}));

jest.mock("axios", () => ({
  __esModule: true,
  default: {
    request: (...args: any[]) => mockAxiosRequest(...args),
  },
}));

jest.mock("../src/constants/env", () => ({
  API_BASE_URL: "https://api.lexho.test",
  SSL_PINNING_ENABLED: true,
  SSL_PINNING_CERT_NAME: "lexho_api",
}));

jest.mock("../src/services/firebaseCrashlytics", () => ({
  logCrashlyticsMessage: (...args: any[]) => mockLogCrashlyticsMessage(...args),
  recordNonFatalError: (...args: any[]) => mockRecordNonFatalError(...args),
}));

describe("sslApiClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uses pinned fetch when the native module is available", async () => {
    const { secureRequest } = require("../src/services/security/sslApiClient");
    mockPinnedFetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue({ ok: true }),
    });

    await expect(
      secureRequest({
        path: "/api/test",
        method: "POST",
        headers: { Authorization: "Bearer token" },
        body: { a: 1 },
      }),
    ).resolves.toEqual({ ok: true });

    expect(mockPinnedFetch).toHaveBeenCalledWith(
      "POST",
      "https://api.lexho.test/api/test",
      { Authorization: "Bearer token" },
      { a: 1 },
      expect.objectContaining({
        sslPinning: { certs: ["lexho_api"] },
      }),
    );
  });

  it("records pinned request failures", async () => {
    const { secureRequest } = require("../src/services/security/sslApiClient");
    const error = new Error("pinning failed");
    mockPinnedFetch.mockRejectedValue(error);

    await expect(
      secureRequest({
        path: "/api/test",
      }),
    ).rejects.toThrow("pinning failed");

    expect(mockRecordNonFatalError).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        area: "ssl_pinning",
        endpoint: "/api/test",
      }),
    );
  });
});
