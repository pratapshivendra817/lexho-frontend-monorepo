import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { useShiftController } from "./useShiftController";

jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
}));

jest.mock("./shiftStorage", () => ({
  addShiftHistory: jest.fn(),
  clearShiftState: jest.fn(),
  getShiftHistory: jest.fn(),
  getShiftState: jest.fn(),
  replaceShiftHistory: jest.fn(),
  saveShiftState: jest.fn(),
}));

jest.mock("./shiftApi", () => ({
  endShiftApi: jest.fn(),
  fetchShiftHistoryApi: jest.fn(),
  setPartnerAvailabilityApi: jest.fn(),
  startShiftApi: jest.fn(),
}));

jest.mock("./locationTrackingManager", () => ({
  isTrackingActive: jest.fn(),
  setTrackingConfig: jest.fn(),
  setLocationSentHandler: jest.fn(),
  stopTrackingAndCleanup: jest.fn(),
  syncTrackingByCondition: jest.fn(),
}));

jest.mock("../../services/partnerService", () => ({
  getPartnerDispatchConfig: jest.fn(),
}));

jest.mock("../../services/firebaseAnalytics", () => ({
  PARTNER_ANALYTICS_EVENTS: {
    shiftStarted: "shift-started",
    shiftEnded: "shift-ended",
    partnerOnline: "partner-online",
    partnerOffline: "partner-offline",
  },
  trackEvent: jest.fn(),
}));

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  addShiftHistory,
  clearShiftState,
  getShiftHistory,
  getShiftState,
  replaceShiftHistory,
  saveShiftState,
} from "./shiftStorage";
import { endShiftApi, fetchShiftHistoryApi, setPartnerAvailabilityApi, startShiftApi } from "./shiftApi";
import {
  isTrackingActive,
  setLocationSentHandler,
  setTrackingConfig,
  stopTrackingAndCleanup,
  syncTrackingByCondition,
} from "./locationTrackingManager";
import { trackEvent } from "../../services/firebaseAnalytics";

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;

describe("useShiftController", () => {
  const mutationStates: any[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, "now").mockReturnValue(10_000);

    (getShiftState as jest.Mock).mockResolvedValue(null);
    (getShiftHistory as jest.Mock).mockResolvedValue([{ id: "local", startedAt: 1, endedAt: 2, durationSeconds: 1 }]);
    (replaceShiftHistory as jest.Mock).mockResolvedValue(undefined);
    (saveShiftState as jest.Mock).mockResolvedValue(undefined);
    (addShiftHistory as jest.Mock).mockResolvedValue(undefined);
    (clearShiftState as jest.Mock).mockResolvedValue(undefined);
    (fetchShiftHistoryApi as jest.Mock).mockResolvedValue([{ id: "remote", startedAt: 2, endedAt: 6, durationSeconds: 4 }]);
    (startShiftApi as jest.Mock).mockResolvedValue({ success: true });
    (endShiftApi as jest.Mock).mockResolvedValue({ success: true });
    (setPartnerAvailabilityApi as jest.Mock).mockResolvedValue(undefined);
    (isTrackingActive as jest.Mock).mockReturnValue(true);
    (syncTrackingByCondition as jest.Mock).mockResolvedValue(undefined);

    mutationStates.length = 0;

    mockUseQuery.mockImplementation((config: any) => {
      if (config.queryKey[0] === "partner-shift-history") {
        return {
          data: undefined,
          isLoading: false,
          isError: false,
          refetch: jest.fn(async () => config.queryFn()),
        } as any;
      }
      return {
        data: { foregroundTrackingIntervalSeconds: 45, minDistanceMeters: 80 },
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      } as any;
    });

    mockUseMutation.mockImplementation((config: any) => {
      const state = {
        isPending: false,
        error: undefined,
        mutateAsync: jest.fn(async (value?: any) => {
          const result = await config.mutationFn(value);
          await config.onSuccess?.(result, value);
          return result;
        }),
      };
      mutationStates.push({ config, state });
      return state as any;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("initialization", () => {
    it("hydrates local shift state and syncs tracking configuration", async () => {
      (getShiftState as jest.Mock).mockResolvedValueOnce({
        shiftStarted: true,
        online: true,
        locationEnabled: false,
        startedAt: 7_000,
      });

      const { result } = await renderHook(() => useShiftController());

      await waitFor(() => {
        expect(result.current.state.shiftStarted).toBe(true);
      });

      expect(setTrackingConfig).toHaveBeenCalledWith({ foregroundTrackingIntervalSeconds: 45, minDistanceMeters: 80 });
      expect(saveShiftState).toHaveBeenCalled();
      expect(syncTrackingByCondition).toHaveBeenCalledWith({
        shiftStarted: true,
        online: true,
        locationEnabled: true,
      });
      expect(result.current.trackingActive).toBe(true);
    });

    it("falls back to local history when the remote history query fails", async () => {
      mockUseQuery.mockImplementation((config: any) => {
        if (config.queryKey[0] === "partner-shift-history") {
          return {
            data: undefined,
            isLoading: false,
            isError: true,
            refetch: jest.fn(async () => {
              try {
                return await config.queryFn();
              } catch {
                return getShiftHistory();
              }
            }),
          } as any;
        }
        return {
          data: undefined,
          isLoading: false,
          isError: false,
          refetch: jest.fn(),
        } as any;
      });
      (fetchShiftHistoryApi as jest.Mock).mockRejectedValueOnce(new Error("api down"));

      const { result } = await renderHook(() => useShiftController());
      const historyConfig = mockUseQuery.mock.calls.find((call) => call[0].queryKey[0] === "partner-shift-history")?.[0];

      await expect(historyConfig.queryFn()).resolves.toEqual([{ id: "local", startedAt: 1, endedAt: 2, durationSeconds: 1 }]);
      expect(result.current.historyError).toBe("Unable to load shift history");
    });

    it("replaces local history when the remote query returns rows", async () => {
      await renderHook(() => useShiftController());
      const historyConfig = mockUseQuery.mock.calls.find((call) => call[0].queryKey[0] === "partner-shift-history")?.[0];

      await expect(historyConfig.queryFn()).resolves.toEqual([{ id: "remote", startedAt: 2, endedAt: 6, durationSeconds: 4 }]);
      expect(replaceShiftHistory).toHaveBeenCalledWith([{ id: "remote", startedAt: 2, endedAt: 6, durationSeconds: 4 }]);
    });

    it("falls back to local history when the remote query succeeds with no rows", async () => {
      (fetchShiftHistoryApi as jest.Mock).mockResolvedValueOnce([]);

      await renderHook(() => useShiftController());
      const historyConfig = mockUseQuery.mock.calls.find((call) => call[0].queryKey[0] === "partner-shift-history")?.[0];

      await expect(historyConfig.queryFn()).resolves.toEqual([{ id: "local", startedAt: 1, endedAt: 2, durationSeconds: 1 }]);
      expect(replaceShiftHistory).not.toHaveBeenCalled();
    });

    it("survives storage and save failures without crashing", async () => {
      (getShiftState as jest.Mock).mockRejectedValueOnce(new Error("storage failed"));
      (saveShiftState as jest.Mock).mockRejectedValueOnce(new Error("save failed"));

      const { result } = await renderHook(() => useShiftController());

      expect(result.current.state.shiftStarted).toBe(false);
      expect(saveShiftState).toHaveBeenCalled();
    });
  });

  describe("startShift", () => {
    it("starts a shift and updates state when the mutation succeeds", async () => {
      const { result } = await renderHook(() => useShiftController());

      await act(async () => {
        await result.current.startShift({ shiftDate: "2026-07-07", startTime: "09:00", endTime: "17:00" });
      });

      expect(startShiftApi).toHaveBeenCalledWith({ shiftDate: "2026-07-07", startTime: "09:00", endTime: "17:00" });
      expect(trackEvent).toHaveBeenCalledWith("shift-started");
      expect(result.current.state.shiftStarted).toBe(true);
      expect(result.current.state.online).toBe(false);
      expect(result.current.state.startedAt).toBe(10_000);
    });

    it("does not start a shift when already started", async () => {
      (getShiftState as jest.Mock).mockResolvedValueOnce({
        shiftStarted: true,
        online: false,
        locationEnabled: true,
        startedAt: 2_000,
      });

      const { result } = await renderHook(() => useShiftController());

      await waitFor(() => {
        expect(result.current.state.shiftStarted).toBe(true);
      });

      await act(async () => {
        await result.current.startShift();
      });

      expect(startShiftApi).not.toHaveBeenCalled();
    });

    it("does not start a shift while the mutation is pending", async () => {
      mockUseMutation.mockImplementation((config: any) => {
        if (config.mutationFn === startShiftApi) {
          return { isPending: true, error: undefined, mutateAsync: jest.fn() } as any;
        }
        if (config.mutationFn === endShiftApi) {
          return { isPending: false, error: undefined, mutateAsync: jest.fn() } as any;
        }
        return { isPending: false, error: undefined, mutateAsync: jest.fn() } as any;
      });

      const { result } = await renderHook(() => useShiftController());

      await act(async () => {
        await result.current.startShift();
      });

      expect(startShiftApi).not.toHaveBeenCalled();
    });

    it("preserves started state when the success handler runs for an already-started shift", async () => {
      (getShiftState as jest.Mock).mockResolvedValueOnce({
        shiftStarted: true,
        online: true,
        locationEnabled: true,
        startedAt: 2_000,
      });

      const { result } = await renderHook(() => useShiftController());

      await waitFor(() => {
        expect(result.current.state.shiftStarted).toBe(true);
      });

      await act(async () => {
        await mutationStates[0].config.onSuccess?.();
      });

      expect(result.current.state).toEqual({
        shiftStarted: true,
        online: true,
        locationEnabled: true,
        startedAt: 2_000,
      });
    });
  });

  describe("endShift", () => {
    it("ends the shift, writes history, refetches history, and clears tracking state", async () => {
      (getShiftState as jest.Mock).mockResolvedValueOnce({
        shiftStarted: true,
        online: true,
        locationEnabled: true,
        startedAt: 4_000,
      });

      const refetch = jest.fn(async () => [{ id: "remote", startedAt: 2, endedAt: 6, durationSeconds: 4 }]);
      mockUseQuery.mockImplementation((config: any) => {
        if (config.queryKey[0] === "partner-shift-history") {
          return {
            data: [],
            isLoading: false,
            isError: false,
            refetch,
          } as any;
        }
        return {
          data: undefined,
          isLoading: false,
          isError: false,
          refetch: jest.fn(),
        } as any;
      });

      const { result } = await renderHook(() => useShiftController());

      await waitFor(() => {
        expect(result.current.state.shiftStarted).toBe(true);
      });

      await act(async () => {
        await result.current.endShift();
      });

      expect(endShiftApi).toHaveBeenCalled();
      expect(trackEvent).toHaveBeenCalledWith("shift-ended");
      expect(addShiftHistory).toHaveBeenCalledWith({
        id: "4000-10000",
        startedAt: 4_000,
        endedAt: 10_000,
        durationSeconds: 6,
      });
      expect(refetch).toHaveBeenCalled();
      expect(stopTrackingAndCleanup).toHaveBeenCalled();
      expect(clearShiftState).toHaveBeenCalled();
      expect(result.current.state.shiftStarted).toBe(false);
    });

    it("does nothing when no shift is active", async () => {
      const { result } = await renderHook(() => useShiftController());

      await act(async () => {
        await result.current.endShift();
      });

      expect(endShiftApi).not.toHaveBeenCalled();
    });

    it("does not write history when the shift has no startedAt timestamp", async () => {
      (getShiftState as jest.Mock).mockResolvedValueOnce({
        shiftStarted: true,
        online: false,
        locationEnabled: true,
        startedAt: undefined,
      });

      const { result } = await renderHook(() => useShiftController());

      await waitFor(() => {
        expect(result.current.state.shiftStarted).toBe(true);
      });

      await act(async () => {
        await result.current.endShift();
      });

      expect(addShiftHistory).not.toHaveBeenCalled();
      expect(clearShiftState).toHaveBeenCalled();
      expect(result.current.state.shiftStarted).toBe(false);
    });

    it("does not end a shift while the mutation is pending", async () => {
      (getShiftState as jest.Mock).mockResolvedValueOnce({
        shiftStarted: true,
        online: false,
        locationEnabled: true,
        startedAt: 2_000,
      });

      mockUseMutation.mockImplementation((config: any) => {
        if (config.mutationFn === startShiftApi) {
          return { isPending: false, error: undefined, mutateAsync: jest.fn() } as any;
        }
        if (config.mutationFn === endShiftApi) {
          return { isPending: true, error: undefined, mutateAsync: jest.fn() } as any;
        }
        return { isPending: false, error: undefined, mutateAsync: jest.fn() } as any;
      });

      const { result } = await renderHook(() => useShiftController());

      await waitFor(() => {
        expect(result.current.state.shiftStarted).toBe(true);
      });

      await act(async () => {
        await result.current.endShift();
      });

      expect(endShiftApi).not.toHaveBeenCalled();
    });
  });

  describe("setOnline", () => {
    it("updates online state and tracks analytics", async () => {
      const { result } = await renderHook(() => useShiftController());

      await act(async () => {
        await result.current.setOnline(true);
      });

      expect(setPartnerAvailabilityApi).toHaveBeenCalledWith(true);
      expect(trackEvent).toHaveBeenCalledWith("partner-online");
      expect(result.current.state.online).toBe(true);
    });

    it("tracks the offline analytics event when availability is disabled", async () => {
      const { result } = await renderHook(() => useShiftController());

      await act(async () => {
        await result.current.setOnline(false);
      });

      expect(setPartnerAvailabilityApi).toHaveBeenCalledWith(false);
      expect(trackEvent).toHaveBeenCalledWith("partner-offline");
      expect(result.current.state.online).toBe(false);
    });

    it("surfaces mutation loading and error states", async () => {
      const availabilityState = {
        isPending: true,
        error: { message: "availability failed" },
        mutateAsync: jest.fn(),
      };

      mockUseMutation.mockImplementation((config: any) => {
        if (config.mutationFn === startShiftApi) {
          return { isPending: false, error: undefined, mutateAsync: jest.fn() } as any;
        }
        if (config.mutationFn === endShiftApi) {
          return { isPending: false, error: undefined, mutateAsync: jest.fn() } as any;
        }
        return availabilityState as any;
      });

      const { result } = await renderHook(() => useShiftController());

      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBe("availability failed");
    });
  });

  describe("hook effects and cleanup", () => {
    it("registers a location sent handler and clears it on unmount", async () => {
      const { unmount } = await renderHook(() => useShiftController());

      expect(setLocationSentHandler).toHaveBeenCalledWith(expect.any(Function));

      await act(async () => {
        unmount();
      });

      await waitFor(() => {
        expect(setLocationSentHandler).toHaveBeenLastCalledWith(null);
      });
    });

    it("updates lastLocationSentAt through the registered callback", async () => {
      const { result } = await renderHook(() => useShiftController());
      const handler = (setLocationSentHandler as jest.Mock).mock.calls[0][0];

      await act(async () => {
        handler(12_345);
      });

      await waitFor(() => {
        expect(result.current.lastLocationSentAt).toBe(12_345);
      });
    });

    it("exposes shiftSeconds, dispatch config, and the no-op location toggle", async () => {
      (getShiftState as jest.Mock).mockResolvedValueOnce({
        shiftStarted: true,
        online: false,
        locationEnabled: true,
        startedAt: 7_000,
      });

      const { result } = await renderHook(() => useShiftController());

      await waitFor(() => {
        expect(result.current.state.startedAt).toBe(7_000);
      });

      expect(result.current.shiftSeconds).toBe(3);
      expect(result.current.dispatchConfig).toEqual({ foregroundTrackingIntervalSeconds: 45, minDistanceMeters: 80 });
      expect(result.current.historyLoading).toBe(false);
      expect(result.current.setLocationEnabled()).toBeUndefined();
      expect(result.current.refetchHistory).toEqual(expect.any(Function));
    });

    it("surfaces tracking errors from syncTrackingByCondition", async () => {
      (syncTrackingByCondition as jest.Mock).mockRejectedValue(new Error("tracking failed"));

      const { result } = await renderHook(() => useShiftController());

      await waitFor(() => {
        expect(result.current.error).toBe("tracking failed");
      });
    });
  });
});
