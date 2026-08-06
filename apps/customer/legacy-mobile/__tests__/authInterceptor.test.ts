const mockRefreshAccessToken = jest.fn();

jest.mock("../src/services/authService", () => ({
  authService: { refreshAccessToken: (...args: any[]) => mockRefreshAccessToken(...args) },
}));

import { installAuthRefreshInterceptor } from "../src/api/authInterceptor";

function createClient() {
  const retry = jest.fn().mockResolvedValue({ data: "retried" });
  const use = jest.fn();
  const client: any = Object.assign(retry, {
    interceptors: { response: { use } },
  });
  installAuthRefreshInterceptor(client);
  return { client, retry, success: use.mock.calls[0][0], failure: use.mock.calls[0][1] };
}

describe("auth refresh interceptor", () => {
  beforeEach(() => jest.clearAllMocks());

  it("refreshes a 401 and retries the original request with the new token", async () => {
    const onSessionRefreshed = jest.fn();
    const retry = jest.fn().mockResolvedValue({ data: "retried" });
    const use = jest.fn();
    const client: any = Object.assign(retry, { interceptors: { response: { use } } });
    installAuthRefreshInterceptor(client, { onSessionRefreshed });
    mockRefreshAccessToken.mockResolvedValue({ accessToken: "new", refreshToken: "rotated", user: null });
    const request: any = { url: "/secure", headers: {} };

    await expect(use.mock.calls[0][1]({ response: { status: 401 }, config: request })).resolves.toEqual({ data: "retried" });
    expect(request).toMatchObject({ _retry: true, headers: { Authorization: "Bearer new" } });
    expect(onSessionRefreshed).toHaveBeenCalledTimes(1);
    expect(retry).toHaveBeenCalledWith(request);
  });

  it("logs out when refresh fails", async () => {
    const onLogout = jest.fn();
    const { client } = createClient();
    const use = client.interceptors.response.use as jest.Mock;
    installAuthRefreshInterceptor(client, { onLogout });
    const failure = use.mock.calls[1][1];
    const error = { response: { status: 401 }, config: { url: "/secure" } };
    mockRefreshAccessToken.mockRejectedValue(new Error("expired"));

    await expect(failure(error)).rejects.toBe(error);
    expect(onLogout).toHaveBeenCalledWith(error);
  });

  it("does not refresh non-401, retried, or refresh-endpoint failures", async () => {
    const { failure } = createClient();
    const errors = [
      { response: { status: 500 }, config: { url: "/secure" } },
      { response: { status: 401 }, config: { url: "/secure", _retry: true } },
      { response: { status: 401 }, config: { url: "/api/auth/refresh" } },
    ];

    for (const error of errors) {
      await expect(failure(error)).rejects.toBe(error);
    }
    expect(mockRefreshAccessToken).not.toHaveBeenCalled();
  });
});
