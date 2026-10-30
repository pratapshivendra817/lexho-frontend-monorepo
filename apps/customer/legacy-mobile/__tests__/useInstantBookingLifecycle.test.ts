import { act, cleanup, renderHook, waitFor } from "@testing-library/react-native";
import { AppState } from "react-native";

const mockUseQuery = jest.fn();
const mockUseQueryClient = jest.fn();
const mockInvalidateQueries = jest.fn();
const mockGetAccessToken = jest.fn();
const mockGetBookingDetails = jest.fn();
const mockGetBookingMeta = jest.fn();
let mockBookingWsEnabled = true;

jest.mock("@tanstack/react-query", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useQueryClient: () => mockUseQueryClient(),
}));
jest.mock("../src/api/bookingExtrasApi", () => ({
  getBookingDetails: (...args: unknown[]) => mockGetBookingDetails(...args),
}));
jest.mock("../src/utils/bookingMeta", () => ({
  getBookingMeta: (...args: unknown[]) => mockGetBookingMeta(...args),
}));
jest.mock("../src/services/tokenStorage", () => ({
  tokenStorage: { getAccessToken: (...args: unknown[]) => mockGetAccessToken(...args) },
}));
jest.mock("../src/constants/env", () => ({
  API_BASE_URL: "http://localhost:8082/",
  get ENABLE_BOOKING_WS() {
    return mockBookingWsEnabled;
  },
}));

import { useInstantBookingLifecycle } from "../src/hooks/useInstantBookingLifecycle";

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static throwOnConstruct = false;

  url: string;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data?: unknown }) => void) | null = null;
  send = jest.fn();
  close = jest.fn();

  constructor(url: string) {
    if (MockWebSocket.throwOnConstruct) {
      MockWebSocket.throwOnConstruct = false;
      throw new Error("constructor failed");
    }
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  open() {
    this.onopen?.();
  }

  closed() {
    this.onclose?.();
  }

  error() {
    this.onerror?.();
  }

  message(data: unknown) {
    this.onmessage?.({ data });
  }
}

describe("useInstantBookingLifecycle", () => {
  const runtime = globalThis as any;
  const originalDev = runtime.__DEV__;
  let appStateListener: ((state: string) => void) | undefined;
  const removeListener = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mockBookingWsEnabled = true;
    MockWebSocket.instances = [];
    MockWebSocket.throwOnConstruct = false;
    (globalThis as any).WebSocket = MockWebSocket;
    mockUseQueryClient.mockReturnValue({ invalidateQueries: mockInvalidateQueries });
    mockGetAccessToken.mockResolvedValue("test-token");
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    mockGetBookingMeta.mockReturnValue({});
    runtime.__DEV__ = true;
    jest.spyOn(AppState, "addEventListener").mockImplementation(
      ((event: string, listener: (state: string) => void) => {
        expect(event).toBe("change");
        appStateListener = listener;
        return { remove: removeListener };
      }) as typeof AppState.addEventListener,
    );
  });

  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  afterAll(() => {
    runtime.__DEV__ = originalDev;
  });

  it("disables querying and sockets for an empty booking ID", async () => {
    const { result } = await renderHook(() =>
      useInstantBookingLifecycle(""),
    );
    const options = mockUseQuery.mock.calls.at(-1)?.[0] as any;

    expect(options).toEqual(
      expect.objectContaining({
        queryKey: ["instant-booking-status", ""],
        enabled: false,
        refetchOnWindowFocus: true,
      }),
    );
    expect(result.current.wsConnected).toBe(false);
    expect(MockWebSocket.instances).toHaveLength(0);
  });

  it("returns query error state without sockets when the feature is disabled", async () => {
    mockBookingWsEnabled = false;
    const queryState = {
      data: null,
      isLoading: false,
      error: new Error("not found"),
      refetch: jest.fn(),
    };
    mockUseQuery.mockReturnValue(queryState);

    const { result, unmount } = await renderHook(() =>
      useInstantBookingLifecycle("booking-disabled"),
    );

    expect(result.current).toEqual({
      ...queryState,
      wsConnected: false,
    });
    expect(MockWebSocket.instances).toHaveLength(0);
    await act(async () => unmount());
    expect(removeListener).toHaveBeenCalled();
  });

  it("retries socket setup when access-token retrieval fails", async () => {
    jest.useFakeTimers();
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    mockGetAccessToken.mockRejectedValueOnce(new Error("storage unavailable"));

    const { unmount } = await renderHook(() =>
      useInstantBookingLifecycle("booking-token-retry"),
    );
    expect(MockWebSocket.instances).toHaveLength(0);
    expect(warn).toHaveBeenCalledWith(
      "Unable to retrieve booking realtime credentials; retrying",
    );

    await act(async () => {
      await jest.advanceTimersByTimeAsync(4000);
    });
    expect(MockWebSocket.instances).toHaveLength(1);

    await act(async () => unmount());
  });

  it("handles query polling, WebSocket messages, reconnect, dependency changes, and cleanup", async () => {
    jest.useFakeTimers();
    mockGetBookingDetails.mockResolvedValue({ id: "booking-1" });
    mockGetBookingMeta.mockImplementation(data => data?.meta ?? {});

    let currentBookingId = "booking-1";
    const { result, rerender, unmount } = await renderHook(() =>
      useInstantBookingLifecycle(currentBookingId),
    );
    let options = mockUseQuery.mock.calls.at(-1)?.[0] as any;
    await waitFor(() => expect(MockWebSocket.instances.length).toBe(1));
    const first = MockWebSocket.instances[0];

    expect(first.url).toBe(
      "ws://localhost:8082/ws/customer/bookings",
    );
    await expect(options.queryFn()).resolves.toEqual({ id: "booking-1" });
    expect(mockGetBookingDetails).toHaveBeenCalledWith("booking-1");
    expect(
      options.refetchInterval({
        state: { data: { meta: { trackingRefreshSeconds: 5 } } },
      }),
    ).toBe(5000);
    expect(
      options.refetchInterval({
        state: { data: { meta: { trackingRefreshSeconds: 0 } } },
      }),
    ).toBe(6000);
    expect(
      options.refetchInterval({
        state: { data: { meta: { trackingRefreshSeconds: "invalid" } } },
      }),
    ).toBe(6000);

    await act(async () => {
      first.open();
      first.message("CONNECTED\nversion:1.2\n\n\0");
    });
    await waitFor(() => expect(result.current.wsConnected).toBe(true));
    expect(first.send).toHaveBeenCalledWith(expect.stringContaining("Authorization:Bearer test-token"));
    expect(first.send).toHaveBeenCalledWith(expect.stringContaining("/topic/customer/bookings/booking-1"));
    options = mockUseQuery.mock.calls.at(-1)?.[0] as any;
    expect(
      options.refetchInterval({
        state: { data: { meta: { trackingRefreshSeconds: 5 } } },
      }),
    ).toBe(5000);

    await act(async () => {
      first.message("MESSAGE\ndestination:/topic/customer/bookings/booking-1\n\n" +
        JSON.stringify({ data: { bookingId: "booking-1", status: "ASSIGNED" } }) + "\0");
      first.message("MESSAGE\ndestination:/topic/customer/bookings/booking-1\n\n" +
        JSON.stringify({ id: "other" }) + "\0");
      first.message("MESSAGE\ndestination:/topic/customer/bookings/booking-1\n\n" +
        JSON.stringify({ id: "booking-1", dispatchStatus: "SEARCHING" }) + "\0");
      first.message("MESSAGE\ndestination:/topic/customer/bookings/booking-1\n\n{malformed\0");
      first.message(undefined);
    });
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(3);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["instant-booking-status", "booking-1"],
    });

    await act(async () => appStateListener?.("background"));
    options = mockUseQuery.mock.calls.at(-1)?.[0] as any;
    expect(
      options.refetchInterval({
        state: { data: { meta: { trackingRefreshSeconds: 5 } } },
      }),
    ).toBe(false);

    await act(async () => first.error());
    await act(async () => first.closed());
    await act(async () => {
      await jest.advanceTimersByTimeAsync(4000);
    });
    expect(MockWebSocket.instances).toHaveLength(2);

    mockUseQuery.mockReturnValue({
      data: {
        id: "booking-2",
        bookingType: "INSTANT",
        status: "ASSIGNED",
        assignmentStatus: "ACCEPTED",
      },
      isLoading: false,
      error: null,
    });
    MockWebSocket.throwOnConstruct = true;
    currentBookingId = "booking-2";
    await rerender({});
    runtime.__DEV__ = false;
    await act(async () => {
      await jest.advanceTimersByTimeAsync(4000);
    });
    const second = MockWebSocket.instances.at(-1)!;
    expect(second.url).toBe("ws://localhost:8082/ws/customer/bookings");

    await act(async () => {
      second.open();
      second.message("CONNECTED\nversion:1.2\n\n\0");
    });
    expect(result.current.wsConnected).toBe(true);
    expect(second.send).toHaveBeenCalledWith(expect.stringContaining(
      "/topic/customer/bookings/booking-2",
    ));

    second.close.mockImplementationOnce(() => {
      throw new Error("close failed");
    });
    await act(async () => unmount());
    expect(second.close).toHaveBeenCalled();
    second.closed();
    expect(removeListener).toHaveBeenCalled();
  });
});
