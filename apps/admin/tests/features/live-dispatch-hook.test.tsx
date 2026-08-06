import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clientInstances: [] as any[],
  subscribe: vi.fn(),
  activate: vi.fn(),
  deactivate: vi.fn(),
  getAccessToken: vi.fn(),
  consoleError: vi.fn(),
}));

vi.mock("@stomp/stompjs", () => ({
  Client: vi.fn().mockImplementation((config: any) => {
    const instance = {
      ...config,
      active: true,
      subscribe: mocks.subscribe,
      activate: mocks.activate,
      deactivate: mocks.deactivate,
    };
    mocks.clientInstances.push(instance);
    return instance;
  }),
}));

vi.mock("@/config", () => ({
  appConfig: { apiBaseUrl: "https://api.lexho.test/" },
}));

vi.mock("@/utils/authSession", () => ({
  getAccessToken: mocks.getAccessToken,
}));

import { useAdminBookingEtaSocket } from "@/features/live-dispatch/hooks/useAdminBookingEtaSocket";

describe("useAdminBookingEtaSocket", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.clientInstances.length = 0;
    mocks.getAccessToken.mockReturnValue("token-123");
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_ADMIN_BOOKING_ETA_WS_URL", "");
    vi.spyOn(console, "error").mockImplementation(mocks.consoleError);
  });

  it("does nothing when disabled, booking id is missing or token is unavailable", () => {
    const { unmount: unmountDisabled } = renderHook(() =>
      useAdminBookingEtaSocket({ bookingId: "bk-1", enabled: false }),
    );
    const { unmount: unmountMissingId } = renderHook(() =>
      useAdminBookingEtaSocket({ bookingId: "   " }),
    );
    mocks.getAccessToken.mockReturnValueOnce("");
    const { unmount: unmountMissingToken } = renderHook(() =>
      useAdminBookingEtaSocket({ bookingId: "bk-2" }),
    );

    expect(mocks.clientInstances).toHaveLength(0);
    unmountDisabled();
    unmountMissingId();
    unmountMissingToken();
  });

  it("creates a client, subscribes to eta updates, handles parse failures and deactivates on cleanup", () => {
    const onEtaUpdate = vi.fn();
    const { unmount } = renderHook(() =>
      useAdminBookingEtaSocket({ bookingId: "  bk-77  ", onEtaUpdate }),
    );

    expect(mocks.clientInstances).toHaveLength(1);
    const client = mocks.clientInstances[0];
    expect(client.brokerURL).toBe("wss://api.lexho.test/ws-notifications");
    expect(client.connectHeaders).toEqual({ Authorization: "Bearer token-123" });
    expect(mocks.activate).toHaveBeenCalledTimes(1);

    const frameHandler = vi.fn();
    mocks.subscribe.mockImplementation((_topic: string, callback: (frame: { body: string }) => void) => {
      frameHandler.mockImplementation(callback);
    });
    client.onConnect();
    expect(mocks.subscribe).toHaveBeenCalledWith("/topic/admin/bookings/bk-77/eta", expect.any(Function));

    frameHandler({ body: JSON.stringify({ bookingId: "bk-77", etaMinutes: 9 }) });
    expect(onEtaUpdate).toHaveBeenCalledWith({ bookingId: "bk-77", etaMinutes: 9 });

    frameHandler({ body: "{bad-json" });
    expect(onEtaUpdate).toHaveBeenCalledWith({ bookingId: "bk-77" });

    client.onStompError({ headers: { message: "bad-frame" }, body: "details" });
    client.onWebSocketError({ type: "close" });
    expect(mocks.consoleError).toHaveBeenCalledTimes(2);

    unmount();
    expect(mocks.deactivate).toHaveBeenCalledTimes(1);
  });

  it("prefers an explicit websocket url when provided", () => {
    vi.stubEnv("VITE_ADMIN_BOOKING_ETA_WS_URL", "ws://custom-socket");

    renderHook(() =>
      useAdminBookingEtaSocket({ bookingId: "bk-99", onEtaUpdate: vi.fn() }),
    );

    const client = mocks.clientInstances[0];
    expect(client.brokerURL).toBe("ws://custom-socket");
  });
});
