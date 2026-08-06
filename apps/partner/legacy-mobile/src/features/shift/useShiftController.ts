import { useCallback, useEffect, useMemo, useState } from "react";
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
  setTrackingConfig,
  setLocationSentHandler,
  stopTrackingAndCleanup,
  syncTrackingByCondition,
} from "./locationTrackingManager";
import type { ShiftHistoryItem } from "./types";
import { getPartnerDispatchConfig } from "../../services/partnerService";
import { PARTNER_ANALYTICS_EVENTS, trackEvent } from "../../services/firebaseAnalytics";

type ShiftControllerState = {
  shiftStarted: boolean;
  online: boolean;
  locationEnabled: boolean;
  startedAt?: number;
};

const initialState: ShiftControllerState = {
  shiftStarted: false,
  online: false,
  locationEnabled: true,
  startedAt: undefined,
};

export function useShiftController() {
  const [state, setState] = useState<ShiftControllerState>(initialState);
  const [trackingError, setTrackingError] = useState("");
  const [lastLocationSentAt, setLastLocationSentAt] = useState<number | null>(null);

  const historyQuery = useQuery({
    queryKey: ["partner-shift-history"],
    queryFn: async () => {
      try {
        const remote = await fetchShiftHistoryApi();
        if (remote.length > 0) {
          await replaceShiftHistory(remote);
          return remote;
        }
      } catch {
        // fallback to local
      }
      return getShiftHistory();
    },
  });

  const dispatchConfigQuery = useQuery({
    queryKey: ["partner-dispatch-config"],
    queryFn: getPartnerDispatchConfig,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    (async () => {
      const snapshot = await getShiftState();
      if (!snapshot) return;
      setState({
        shiftStarted: snapshot.shiftStarted,
        online: snapshot.online,
        locationEnabled: true,
        startedAt: snapshot.startedAt,
      });
    })().catch(() => null);
  }, []);

  useEffect(() => {
    if (dispatchConfigQuery.data) {
      setTrackingConfig(dispatchConfigQuery.data);
    }
    saveShiftState({
      shiftStarted: state.shiftStarted,
      online: state.online,
      locationEnabled: state.locationEnabled,
      startedAt: state.startedAt,
    }).catch(() => null);
    syncTrackingByCondition({
      shiftStarted: state.shiftStarted,
      online: state.online,
      locationEnabled: state.locationEnabled,
    }).then(() => setTrackingError("")).catch((error: Error) => setTrackingError(error.message));
  }, [dispatchConfigQuery.data, state]);

  useEffect(() => {
    setLocationSentHandler((timestamp) => setLastLocationSentAt(timestamp));
    return () => setLocationSentHandler(null);
  }, []);

  const startShiftMutation = useMutation({
    mutationFn: startShiftApi,
    onSuccess: () => {
      void trackEvent(PARTNER_ANALYTICS_EVENTS.shiftStarted);
      setState((prev) =>
        prev.shiftStarted ? prev : { ...prev, shiftStarted: true, startedAt: Date.now(), online: false },
      );
    },
  });

  const endShiftMutation = useMutation({
    mutationFn: endShiftApi,
    onSuccess: async () => {
      void trackEvent(PARTNER_ANALYTICS_EVENTS.shiftEnded);
      const endedAt = Date.now();
      if (state.startedAt) {
        const durationSeconds = Math.max(0, Math.floor((endedAt - state.startedAt) / 1000));
        const historyItem: ShiftHistoryItem = {
          id: `${state.startedAt}-${endedAt}`,
          startedAt: state.startedAt,
          endedAt,
          durationSeconds,
        };
        await addShiftHistory(historyItem);
        await historyQuery.refetch();
      }

      setState(initialState);
      stopTrackingAndCleanup();
      await clearShiftState();
    },
  });

  const availabilityMutation = useMutation({
    mutationFn: (online: boolean) => setPartnerAvailabilityApi(online),
    onSuccess: (_data, online) => {
      void trackEvent(online ? PARTNER_ANALYTICS_EVENTS.partnerOnline : PARTNER_ANALYTICS_EVENTS.partnerOffline);
      setState((prev) => ({ ...prev, online }));
    },
  });

  const setLocationEnabled = useCallback(() => {
    // location toggle removed from UI; tracking is auto-managed by shift+online state
  }, []);

  const startShift = useCallback(async (schedule?: { shiftDate?: string; startTime?: string; endTime?: string }) => {
    if (startShiftMutation.isPending || state.shiftStarted) return;
    await startShiftMutation.mutateAsync(schedule);
  }, [startShiftMutation, state.shiftStarted]);

  const endShift = useCallback(async () => {
    if (endShiftMutation.isPending || !state.shiftStarted) return;
    await endShiftMutation.mutateAsync();
  }, [endShiftMutation, state.shiftStarted]);

  const setOnline = useCallback(
    async (online: boolean) => {
      await availabilityMutation.mutateAsync(online);
    },
    [availabilityMutation],
  );

  const shiftSeconds = useMemo(() => {
    if (!state.shiftStarted || !state.startedAt) return 0;
    return Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000));
  }, [state.shiftStarted, state.startedAt]);

  return {
    state,
    history: historyQuery.data ?? [],
    historyLoading: historyQuery.isLoading,
    historyError: historyQuery.isError ? "Unable to load shift history" : "",
    shiftSeconds,
    trackingActive: isTrackingActive(),
    lastLocationSentAt,
    loading: startShiftMutation.isPending || endShiftMutation.isPending || availabilityMutation.isPending,
    error:
      startShiftMutation.error?.message ||
      endShiftMutation.error?.message ||
      availabilityMutation.error?.message ||
      trackingError,
    startShift,
    endShift,
    setOnline,
    setLocationEnabled,
    refetchHistory: historyQuery.refetch,
    dispatchConfig: dispatchConfigQuery.data,
  };
}
