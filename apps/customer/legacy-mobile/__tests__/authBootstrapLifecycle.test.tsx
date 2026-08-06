import React from "react";
import { Text } from "react-native";
import { cleanup, render, waitFor } from "@testing-library/react-native";

const mockDispatch = jest.fn();
const mockLoadSession = jest.fn();
const mockGetToken = jest.fn();
const mockGetRefreshToken = jest.fn();
const mockRefresh = jest.fn();
let mockDevLoginBypass = false;

jest.mock("../src/redux/hooks", () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock("../src/utils/storage", () => ({
  loadSession: () => mockLoadSession(),
  getToken: () => mockGetToken(),
  getRefreshToken: () => mockGetRefreshToken(),
}));

jest.mock("../src/utils/authSessionManager", () => ({
  tryRefreshSessionWithAxios: (...args: unknown[]) => mockRefresh(...args),
}));

jest.mock("../src/constants/env", () => ({
  get DEV_LOGIN_BYPASS() {
    return mockDevLoginBypass;
  },
  DEV_BYPASS_SESSION: {
    token: "dev-token",
    refreshToken: "dev-refresh",
    user: { id: "dev-user" },
  },
}));

import { useAuthBootstrap } from "../src/hooks/useAuthBootstrap";
import { setHydrated, setSession } from "../src/redux/authSlice";

function Probe() {
  useAuthBootstrap();
  return <Text>bootstrap</Text>;
}

const runtime = globalThis as any;

function jwt(exp: number) {
  return `header.${runtime.Buffer.from(JSON.stringify({ exp })).toString(
    "base64url",
  )}.signature`;
}

describe("useAuthBootstrap lifecycle branches", () => {
  const originalDev = runtime.__DEV__;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDevLoginBypass = false;
    mockLoadSession.mockResolvedValue({
      token: null,
      refreshToken: null,
      user: null,
    });
    mockGetToken.mockResolvedValue(null);
    mockGetRefreshToken.mockResolvedValue(null);
    mockRefresh.mockResolvedValue({
      ok: false,
      reason: "MISSING_ACCESS_TOKEN",
    });
    runtime.__DEV__ = true;
  });

  afterEach(async () => {
    await cleanup();
  });

  afterAll(() => {
    runtime.__DEV__ = originalDev;
  });

  it("uses the configured development bypass session", async () => {
    mockDevLoginBypass = true;
    await render(<Probe />);

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(
        setSession({
          token: "dev-token",
          refreshToken: "dev-refresh",
          user: { id: "dev-user" },
        }),
      ),
    );
    expect(mockLoadSession).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(setHydrated(true));
  });

  it("handles unexpected bootstrap rejection and still hydrates", async () => {
    mockLoadSession.mockRejectedValue(new Error("storage crashed"));
    await render(<Probe />);

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(setHydrated(true)),
    );
    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "auth/setSession" }),
    );
  });

  it("does not dispatch after unmount while session loading is pending", async () => {
    let resolveSession: ((value: unknown) => void) | undefined;
    mockLoadSession.mockReturnValue(
      new Promise(resolve => {
        resolveSession = resolve;
      }),
    );
    const view = await render(<Probe />);

    await view.unmount();
    resolveSession?.({ token: "late-token", refreshToken: null, user: null });
    await Promise.resolve();

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("restores a valid persisted session", async () => {
    const token = jwt(Math.floor(Date.now() / 1000) + 3600);
    mockLoadSession.mockResolvedValue({
      token,
      refreshToken: "refresh",
      user: { id: "user-1" },
    });

    await render(<Probe />);

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(
        setSession({
          token,
          refreshToken: "refresh",
          user: { id: "user-1" },
        }),
      ),
    );
    expect(mockRefresh).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(setHydrated(true));
  });

  it("uses fallback token storage when the multi-value session is empty", async () => {
    mockGetToken.mockResolvedValue(" fallback-token ");
    mockGetRefreshToken.mockResolvedValue(" fallback-refresh ");

    await render(<Probe />);

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(
        setSession({
          token: "fallback-token",
          refreshToken: "fallback-refresh",
          user: undefined,
        }),
      ),
    );
  });

  it("keeps an expired token when no refresh token exists", async () => {
    const expired = jwt(Math.floor(Date.now() / 1000) - 60);
    mockLoadSession.mockResolvedValue({
      token: expired,
      refreshToken: null,
      user: null,
    });

    await render(<Probe />);

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(
        setSession({
          token: expired,
          refreshToken: null,
          user: undefined,
        }),
      ),
    );
  });

  it("refreshes an expired token and dispatches the new session", async () => {
    const expired = jwt(Math.floor(Date.now() / 1000) - 60);
    mockLoadSession.mockResolvedValue({
      token: expired,
      refreshToken: "refresh",
      user: { id: "old-user" },
    });
    mockRefresh.mockResolvedValue({
      ok: true,
      token: "new-token",
      refreshToken: "new-refresh",
      user: { id: "new-user" },
    });

    await render(<Probe />);

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(
        setSession({
          token: "new-token",
          refreshToken: "new-refresh",
          user: { id: "new-user" },
        }),
      ),
    );
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("hydrates without a session when refresh returns a failure result", async () => {
    mockLoadSession.mockResolvedValue({
      token: null,
      refreshToken: "refresh",
      user: null,
    });

    await render(<Probe />);

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(setHydrated(true)),
    );
    expect(mockRefresh).toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "auth/setSession" }),
    );
  });

  it("falls back to the persisted token when refresh throws", async () => {
    const expired = jwt(Math.floor(Date.now() / 1000) - 60);
    mockLoadSession.mockResolvedValue({
      token: expired,
      refreshToken: "refresh",
      user: { id: "user-1" },
    });
    mockRefresh.mockRejectedValue(new Error("offline"));

    await render(<Probe />);

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(
        setSession({
          token: expired,
          refreshToken: "refresh",
          user: { id: "user-1" },
        }),
      ),
    );
  });

  it("handles malformed JWT values as restorable tokens", async () => {
    mockLoadSession.mockResolvedValue({
      token: "malformed-token",
      refreshToken: "refresh",
      user: null,
    });

    await render(<Probe />);

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(
        setSession({
          token: "malformed-token",
          refreshToken: "refresh",
          user: undefined,
        }),
      ),
    );
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("handles invalid JWT payload encoding", async () => {
    mockLoadSession.mockResolvedValue({
      token: "header.%%%.signature",
      refreshToken: null,
      user: null,
    });

    await render(<Probe />);

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            token: "header.%%%.signature",
          }),
        }),
      ),
    );
  });

  it("does not dispatch a completed refresh after unmount", async () => {
    const expired = jwt(Math.floor(Date.now() / 1000) - 60);
    mockLoadSession.mockResolvedValue({
      token: expired,
      refreshToken: "refresh",
      user: null,
    });
    let resolveRefresh!: (value: unknown) => void;
    mockRefresh.mockReturnValue(
      new Promise(resolve => {
        resolveRefresh = resolve;
      }),
    );
    const view = await render(<Probe />);
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());

    await view.unmount();
    resolveRefresh({
      ok: true,
      token: "late-token",
      refreshToken: "late-refresh",
    });
    await Promise.resolve();

    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ token: "late-token" }),
      }),
    );
  });

  it("runs in production mode without development logging branches", async () => {
    runtime.__DEV__ = false;
    mockLoadSession.mockResolvedValue({
      token: "production-token",
      refreshToken: null,
      user: null,
    });

    await render(<Probe />);

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(
        setSession({
          token: "production-token",
          refreshToken: null,
          user: undefined,
        }),
      ),
    );
  });

  it("decodes JWT through Buffer when atob is unavailable", async () => {
    const originalAtob = runtime.atob;
    runtime.atob = undefined;
    const token = jwt(Math.floor(Date.now() / 1000) + 3600);
    mockLoadSession.mockResolvedValue({
      token,
      refreshToken: "refresh",
      user: null,
    });

    await render(<Probe />);
    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ token }),
        }),
      ),
    );
    runtime.atob = originalAtob;
  });

  it("restores a token when no JWT decoder is available", async () => {
    const originalAtob = runtime.atob;
    const originalBuffer = runtime.Buffer;
    runtime.atob = undefined;
    runtime.Buffer = undefined;
    mockLoadSession.mockResolvedValue({
      token: "header.e30.signature",
      refreshToken: null,
      user: null,
    });

    await render(<Probe />);
    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            token: "header.e30.signature",
          }),
        }),
      ),
    );
    runtime.atob = originalAtob;
    runtime.Buffer = originalBuffer;
  });
});
