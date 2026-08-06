import { act, cleanup, renderHook, waitFor } from "@testing-library/react-native";
import { AppState } from "react-native";

const mockUseQuery = jest.fn();
const mockUseQueryClient = jest.fn();
const mockSetQueryData = jest.fn();
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
    mockUseQueryClient.mockReturnValue({ setQueryData: mockSetQueryData });
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

  it("handles query polling, WebSocket messages, reconnect, dependency changes, and cleanup", async () => {
    jest.useFakeTimers();
    mockGetBookingDetails.mockResolvedValue({ id: "booking-1" });
    mockGetBookingMeta.mockImplementation(data => data?.meta ?? {});

    let currentBookingId = "booking-1";
    const { result, rerender, unmount } = await renderHook(() =>
      useInstantBookingLifecycle(currentBookingId),
    );
    let options = mockUseQuery.mock.calls.at(-1)?.[0] as any;
    const first = MockWebSocket.instances[0];

    expect(first.url).toBe(
      "ws://localhost:8082/ws/customer/bookings/booking-1",
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
    ).toBe(false);
    expect(
      options.refetchInterval({
        state: { data: { meta: { trackingRefreshSeconds: "invalid" } } },
      }),
    ).toBe(false);

    await act(async () => first.open());
    await waitFor(() => expect(result.current.wsConnected).toBe(true));
    options = mockUseQuery.mock.calls.at(-1)?.[0] as any;
    expect(
      options.refetchInterval({
        state: { data: { meta: { trackingRefreshSeconds: 5 } } },
      }),
    ).toBe(false);

    await act(async () => {
      first.message(
        JSON.stringify({
          data: { bookingId: "booking-1", status: "ASSIGNED" },
        }),
      );
      first.message(JSON.stringify({ id: "other" }));
      first.message(
        JSON.stringify({
          id: "booking-1",
          dispatchStatus: "SEARCHING",
        }),
      );
      first.message("{malformed");
      first.message(undefined);
    });
    expect(mockSetQueryData).toHaveBeenCalledTimes(2);
    const updater = mockSetQueryData.mock.calls[0][1];
    expect(updater({ amount: 100 })).toEqual({
      amount: 100,
      bookingId: "booking-1",
      status: "ASSIGNED",
    });
    expect(updater(null)).toEqual({
      bookingId: "booking-1",
      status: "ASSIGNED",
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
    expect(MockWebSocket.instances.at(-1)?.url).toContain("booking-2");

    const activeSocket = MockWebSocket.instances.at(-1)!;
    await act(async () => activeSocket.open());
    expect(result.current.wsConnected).toBe(true);

    activeSocket.close.mockImplementationOnce(() => {
      throw new Error("close failed");
    });
    await act(async () => unmount());
    expect(activeSocket.close).toHaveBeenCalled();
    activeSocket.closed();
    expect(removeListener).toHaveBeenCalled();
  });
});
