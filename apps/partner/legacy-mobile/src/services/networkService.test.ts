jest.mock("@react-native-community/netinfo", () => ({
  fetch: jest.fn(),
  addEventListener: jest.fn(),
}));

import NetInfo from "@react-native-community/netinfo";

import {
  getCurrentNetworkStatus,
  isNetworkOnline,
  subscribeNetworkStatus,
} from "./networkService";

describe("networkService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("isNetworkOnline", () => {
    it("returns true when connected and internet is reachable", async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValueOnce({
        isConnected: true,
        isInternetReachable: true,
      });

      await expect(isNetworkOnline()).resolves.toBe(true);
    });

    it("returns false when offline or internet is unreachable", async () => {
      (NetInfo.fetch as jest.Mock).mockResolvedValueOnce({
        isConnected: true,
        isInternetReachable: false,
      });

      await expect(isNetworkOnline()).resolves.toBe(false);
    });

    it("fails open when netinfo throws", async () => {
      (NetInfo.fetch as jest.Mock).mockRejectedValueOnce(new Error("netinfo failed"));

      await expect(isNetworkOnline()).resolves.toBe(true);
    });
  });

  describe("subscribeNetworkStatus and getCurrentNetworkStatus", () => {
    it("updates the current online status from listener events", () => {
      const listener = jest.fn();
      const unsubscribe = jest.fn();
      let capturedHandler: ((state: any) => void) | undefined;
      (NetInfo.addEventListener as jest.Mock).mockImplementation((handler) => {
        capturedHandler = handler;
        return unsubscribe;
      });

      const cleanup = subscribeNetworkStatus(listener);
      capturedHandler?.({ isConnected: false, isInternetReachable: true });
      expect(listener).toHaveBeenCalledWith(false);
      expect(getCurrentNetworkStatus()).toBe(false);

      capturedHandler?.({ isConnected: true, isInternetReachable: undefined });
      expect(listener).toHaveBeenCalledWith(true);
      expect(getCurrentNetworkStatus()).toBe(true);

      expect(cleanup).toBe(unsubscribe);
    });
  });
});
