const mockRequestUse = jest.fn();
const mockResponseUse = jest.fn();
const mockApiCall = jest.fn();
const mockStorage = {
  getToken: jest.fn(), getRefreshToken: jest.fn(), getOrCreateDeviceId: jest.fn(),
  loadSession: jest.fn(), saveSession: jest.fn(),
};
const mockStore = { getState: jest.fn(), dispatch: jest.fn() };
const mockAuth = { clear: jest.fn(), access: jest.fn(), refresh: jest.fn() };
const mockCapture = jest.fn();

jest.mock("axios", () => {
  const client: any = Object.assign((config: any) => mockApiCall(config), {
    interceptors: { request: { use: mockRequestUse }, response: { use: mockResponseUse } },
  });
  return {
    __esModule: true,
    default: {
      create: jest.fn().mockReturnValue(client),
      post: jest.fn(),
    },
  };
});
jest.mock("../src/constants/env", () => ({ API_BASE_URL: "http://api.test:8082/", DEV_LOGIN_BYPASS: false, DEV_BYPASS_API_TOKEN: "", DEV_INTERNAL_TOKEN: "internal" }));
jest.mock("../src/utils/storage", () => ({
  getToken: () => mockStorage.getToken(), getRefreshToken: () => mockStorage.getRefreshToken(),
  getOrCreateDeviceId: () => mockStorage.getOrCreateDeviceId(), loadSession: () => mockStorage.loadSession(),
  saveSession: (...args: any[]) => mockStorage.saveSession(...args),
}));
jest.mock("../src/redux/store", () => ({ store: mockStore }));
jest.mock("../src/redux/authSlice", () => ({ clearSessionState: jest.fn(() => ({ type: "auth/clear" })), setSession: jest.fn(payload => ({ type: "auth/set", payload })) }));
jest.mock("../src/utils/authSessionManager", () => ({
  clearSessionWithReason: (...args: any[]) => mockAuth.clear(...args),
  extractAccessToken: (...args: any[]) => mockAuth.access(...args),
  extractRefreshToken: (...args: any[]) => mockAuth.refresh(...args),
}));
jest.mock("../src/services/monitoring", () => ({ captureFrontendError: (...args: any[]) => mockCapture(...args) }));

const {
  api, apiClient, extractList, getApiErrorCode, getPayloadCode, parseApiError, toApiError, unwrapPayload,
} = require("../src/api/client");

const registeredRequestHandler = mockRequestUse.mock.calls[0][0];
const registeredResponseSuccess = mockResponseUse.mock.calls[0][0];
const registeredResponseError = mockResponseUse.mock.calls[0][1];
const requestHandler = () => registeredRequestHandler;
const responseSuccess = () => registeredResponseSuccess;
const responseError = () => registeredResponseError;

describe("API client utilities and interceptors", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.getToken.mockResolvedValue(null);
    mockStorage.getRefreshToken.mockResolvedValue(null);
    mockStorage.getOrCreateDeviceId.mockResolvedValue("device-1");
    mockStorage.loadSession.mockResolvedValue({ token: null, refreshToken: null, user: null });
    mockStore.getState.mockReturnValue({ auth: { token: null, user: null } });
    mockApiCall.mockResolvedValue({ data: "retried" });
  });

  it("creates configured clients and exports the same client alias", () => {
    expect(apiClient).toBe(api);
    expect(api).toBeDefined();
  });

  it("normalizes utility errors, codes, payloads, and lists", () => {
    expect(parseApiError({ response: { data: { code: "RATE_LIMIT_EXCEEDED" } } })).toBe("Too many requests. Please try again later.");
    expect(parseApiError({ response: { status: 429 } })).toBe("Too many requests, please try again shortly");
    expect(parseApiError({ response: { status: 409, data: { message: "Conflict" } } })).toBe("Conflict");
    expect(parseApiError({}, "fallback")).toBe("fallback");
    expect(getApiErrorCode({ response: { data: { errorCode: " bad " } } })).toBe("BAD");
    expect(getPayloadCode({ data: { paymentCode: "paid" } })).toBe("PAID");
    expect(toApiError({ code: "payment_failed" })).toMatchObject({ message: "Payment Failed", code: "PAYMENT_FAILED", errorCode: "PAYMENT_FAILED" });
    expect(unwrapPayload({ data: 0 }, 9)).toBe(0);
    expect(unwrapPayload(undefined, 9)).toBe(9);
    expect(extractList([1])).toEqual([1]);
    expect(extractList({ data: [2] })).toEqual([2]);
    expect(extractList({ content: [3] })).toEqual([3]);
    expect(extractList({})).toEqual([]);
  });

  it.each([
    ["PAYMENT_EXPIRED", "Payment expired"], ["BOOKING_NOT_FOUND", "Booking not found"],
    ["REVIEW_ALREADY_EXISTS", "already been submitted"], ["INVALID_RATING", "valid rating"],
    ["INTERNAL_ERROR", "Something went wrong"], ["INSTANT_UNAVAILABLE", "No partner available"],
    ["NO_PARTNER_IN_30_MIN", "No partner can reach"], ["SLOT_EXPIRED", "Selected slot"],
    ["SLOT_UNAVAILABLE", "Selected slot"],
  ])("maps backend error code %s", (code, text) => {
    expect(parseApiError({ response: { data: { code } } })).toContain(text);
  });

  it("injects storage or Redux tokens and normalizes duplicated URLs", async () => {
    mockStorage.getToken.mockResolvedValueOnce("stored").mockResolvedValueOnce(null);
    mockStore.getState.mockReturnValue({ auth: { token: "redux" } });
    const first = await requestHandler()({ url: "http://api.test:8082http://api.test:8082/api/test", headers: {}, method: "get" });
    expect(first).toMatchObject({ url: "/api/test", headers: { Authorization: "Bearer stored" } });
    const second = await requestHandler()({ url: "/api/test", headers: {} });
    expect(second.headers.Authorization).toBe("Bearer redux");
  });

  it("removes multipart content type and rejects protected calls without tokens", async () => {
    const data = new FormData();
    const config = await requestHandler()({ url: "/public", data, headers: { "Content-Type": "multipart/form-data", "content-type": "x" } });
    expect(config.headers).toEqual({});
    await expect(requestHandler()({ url: "/api/customer/location/current", headers: {} })).rejects.toThrow("Authorization token is required");
  });

  it("supports skipping authorization for specific requests", async () => {
    mockStorage.getToken.mockResolvedValueOnce("stored");
    const config = await requestHandler()({
      url: "/api/admin/profile-content",
      headers: { "X-Skip-Authorization": "true" },
    });

    expect(config.headers).toEqual({});
  });

  it("passes successful responses through", () => {
    const response = { status: 200, config: { url: "/api/customer/location/current", method: "get" }, data: { ok: true } };
    expect(responseSuccess()(response)).toBe(response);
  });

  it("reports a 401 before the auth refresh interceptor handles it", async () => {
    const error = { response: { status: 401, data: { message: "Unauthorized" } }, config: { url: "/secure", method: "get" } };
    await expect(responseError()(error)).rejects.toBe(error);
    expect(mockCapture).toHaveBeenCalled();
  });

  it("reports network and location errors without refresh", async () => {
    const error = { message: "Network Error", config: { url: "/api/v1/customer/location/current", baseURL: "http://api", method: "patch", data: {} } };
    await expect(responseError()(error)).rejects.toBe(error);
    expect(mockCapture).toHaveBeenCalledWith(error, expect.objectContaining({ userAction: "PATCH", errorCode: "NETWORK_ERROR" }));
  });
});
