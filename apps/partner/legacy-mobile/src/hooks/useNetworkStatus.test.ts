import { act, renderHook, waitFor } from "@testing-library/react-native";
import { NativeModules } from "react-native";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockAddEventListener = jest.fn();
const mockUnsubscribe = jest.fn();

jest.mock("@react-native-community/netinfo", () => ({
  addEventListener: jest.fn((listener) => mockAddEventListener(listener)),
}));

import { useNetworkStatus } from "./useNetworkStatus";

describe("useNetworkStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    NativeModules.RNCNetInfo = {};
    mockAddEventListener.mockImplementation(() => mockUnsubscribe);
  });

  it("defaults to online when the native netinfo module is unavailable", async () => {
    NativeModules.RNCNetInfo = undefined;

    const { result, unmount } = await renderHook(() => useNetworkStatus());

    expect(result.current).toBe(true);
    expect(mockAddEventListener).not.toHaveBeenCalled();

    await unmount();
  });

  it("subscribes to netinfo updates, derives online state, and unsubscribes on unmount", async () => {
    let listener!: (state: { isConnected?: boolean | null; isInternetReachable?: boolean | null }) => void;
    mockAddEventListener.mockImplementationOnce((nextListener) => {
      listener = nextListener;
      return mockUnsubscribe;
    });

    const { result, unmount } = await renderHook(() => useNetworkStatus());

    expect(result.current).toBe(true);

    await act(async () => {
      listener({ isConnected: true, isInternetReachable: undefined });
    });
    expect(result.current).toBe(true);

    await act(async () => {
      listener({ isConnected: true, isInternetReachable: false });
    });
    expect(result.current).toBe(false);

    await act(async () => {
      listener({ isConnected: false, isInternetReachable: true });
    });
    expect(result.current).toBe(false);

    await act(async () => {
      listener({ isConnected: true, isInternetReachable: true });
    });
    expect(result.current).toBe(true);

    await unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it("falls back to online when netinfo subscription setup throws", async () => {
    mockAddEventListener.mockImplementationOnce(() => {
      throw new Error("netinfo unavailable");
    });

    const { result } = await renderHook(() => useNetworkStatus());

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });
});
