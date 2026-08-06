import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clientInstances: [] as any[],
  getAccessToken: vi.fn(),
  consoleInfo: vi.fn(),
  consoleWarn: vi.fn(),
  consoleError: vi.fn(),
}));

vi.mock("@stomp/stompjs", () => ({
  Client: vi.fn().mockImplementation((config: any) => {
    const instance = {
      ...config,
      active: false,
      subscribe: vi.fn(),
      activate: vi.fn(() => {
        instance.active = true;
      }),
      deactivate: vi.fn(() => {
        instance.active = false;
        return Promise.resolve();
      }),
    };
    mocks.clientInstances.push(instance);
    return instance;
  }),
}));

vi.mock("@/utils/authSession", () => ({
  getAccessToken: mocks.getAccessToken,
}));

vi.mock("@/config", () => ({
  appConfig: {
    apiBaseUrl: "https://api.lexho.test",
  },
}));

import { useAdminNotificationSocket } from "@/features/notifications/hooks/useAdminNotificationSocket";

describe("useAdminNotificationSocket", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.clientInstances.length = 0;
    mocks.getAccessToken.mockReturnValue("admin-token");
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_ADMIN_NOTIFICATIONS_WS_URL", "");
    vi.spyOn(console, "info").mockImplementation(mocks.consoleInfo);
    vi.spyOn(console, "warn").mockImplementation(mocks.consoleWarn);
    vi.spyOn(console, "error").mockImplementation(mocks.consoleError);
  });

  it("skips connection setup when disabled or when an auth token is unavailable", () => {
    const { unmount: unmountDisabled } = renderHook(() =>
      useAdminNotificationSocket({ enabled: false, onMessage: vi.fn() }),
    );

    mocks.getAccessToken.mockReturnValueOnce("");
    const { unmount: unmountMissingToken } = renderHook(() =>
      useAdminNotificationSocket({ enabled: true, onMessage: vi.fn() }),
    );

    expect(mocks.clientInstances).toHaveLength(0);
    expect(mocks.consoleInfo).toHaveBeenCalledWith("[admin-notifications-ws] skipped: no admin token", "");

    unmountDisabled();
    unmountMissingToken();
  });

  it("creates a client, subscribes once, and forwards parsed or raw frames to the latest message handler", () => {
    const firstHandler = vi.fn();
    const secondHandler = vi.fn();
    const { rerender } = renderHook(
      ({ onMessage }) => useAdminNotificationSocket({ onMessage }),
      { initialProps: { onMessage: firstHandler } },
    );

    expect(mocks.clientInstances).toHaveLength(1);
    const client = mocks.clientInstances[0];

    expect(client.brokerURL).toBe("wss://api.lexho.test/ws/admin/notifications");
    expect(client.connectHeaders).toEqual({ Authorization: "Bearer admin-token" });
    expect(client.activate).toHaveBeenCalledTimes(1);

    client.onConnect();
    client.onConnect();
    expect(client.subscribe).toHaveBeenCalledTimes(1);
    expect(client.subscribe).toHaveBeenCalledWith("/topic/admin/notifications", expect.any(Function));

    const frameHandler = client.subscribe.mock.calls[0][1];
    frameHandler({ body: JSON.stringify({ id: 101, title: "New alert" }) });
    expect(firstHandler).toHaveBeenCalledWith({ id: 101, title: "New alert" });

    rerender({ onMessage: secondHandler });
    frameHandler({ body: "raw-frame" });
    expect(secondHandler).toHaveBeenCalledWith("raw-frame");
  });

  it("uses an env broker url and logs websocket and stomp errors with close warnings throttled", () => {
    vi.stubEnv("VITE_ADMIN_NOTIFICATIONS_WS_URL", "ws://custom-admin-socket");

    renderHook(() => useAdminNotificationSocket({ onMessage: vi.fn() }));

    const client = mocks.clientInstances[0];
    expect(client.brokerURL).toBe("ws://custom-admin-socket");
    expect(mocks.consoleInfo).toHaveBeenCalledWith(
      "[admin-notifications-ws] brokerURL from env: ws://custom-admin-socket",
      "",
    );

    const nowSpy = vi.spyOn(Date, "now");
    nowSpy
      .mockReturnValueOnce(5000)
      .mockReturnValueOnce(6000)
      .mockReturnValueOnce(10050);

    client.onStompError({ headers: { message: "bad-frame" }, body: "frame-body" });
    client.onWebSocketError({ type: "socket-error" });
    client.onWebSocketClose({ code: 1006, reason: "network", wasClean: false });
    client.onWebSocketClose({ code: 1006, reason: "network", wasClean: false });
    client.onWebSocketClose({ code: 1000, reason: "", wasClean: true });

    expect(mocks.consoleError).toHaveBeenNthCalledWith(
      1,
      "[admin-notifications-ws] onStompError",
      "bad-frame",
      "frame-body",
    );
    expect(mocks.consoleError).toHaveBeenNthCalledWith(2, "[admin-notifications-ws] onWebSocketError", { type: "socket-error" });
    expect(mocks.consoleWarn).toHaveBeenCalledTimes(2);
    expect(mocks.consoleWarn).toHaveBeenNthCalledWith(
      1,
      '[admin-notifications-ws] close code=1006 reason="network" clean=false',
    );
    expect(mocks.consoleWarn).toHaveBeenNthCalledWith(
      2,
      '[admin-notifications-ws] close code=1000 reason="-" clean=true',
    );
  });

  it("deactivates on cleanup and re-activates when the hook is enabled again before deactivation completes", async () => {
    let resolveDeactivate: (() => void) | undefined;

    const { rerender } = renderHook(
      ({ enabled }) => useAdminNotificationSocket({ enabled, onMessage: vi.fn() }),
      { initialProps: { enabled: true } },
    );

    const client = mocks.clientInstances[0];
    client.deactivate.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveDeactivate = () => {
            client.active = false;
            resolve();
          };
        }),
    );

    rerender({ enabled: false });
    expect(client.deactivate).toHaveBeenCalledTimes(1);

    rerender({ enabled: true });
    expect(client.activate).toHaveBeenCalledTimes(1);

    resolveDeactivate?.();

    await waitFor(() => {
      expect(client.activate).toHaveBeenCalledTimes(2);
    });
  });
});
