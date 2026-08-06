import { useCallback, useEffect, useMemo, useRef } from "react";

import { useAppDispatch, useAppSelector } from "../../../hooks/useRedux";
import { getPartnerOrderById } from "../../../services/partnerService";
import { navigationActions } from "../store/navigationSlice";
import { trackingActions } from "../store/trackingSlice";
import { getFreshTrackingLocation, startLiveTracking } from "../services/locationService";
import { fetchNavigationRoute } from "../services/navigationApi";
import { hasRouteDeviation } from "../services/routeDeviationService";
import type { CoordinatePoint, TrackingLocation } from "../types";

type UsePartnerNavigationOptions = {
  bookingId: number;
  customerLocation?: CoordinatePoint | null;
  autoStart?: boolean;
  refreshIntervalMs?: number;
  deviationThresholdMeters?: number;
};

function createEventId(type: string) {
  return `${type}-${Date.now()}`;
}

export function usePartnerNavigation({
  bookingId,
  customerLocation,
  autoStart = true,
  refreshIntervalMs = 30000,
  deviationThresholdMeters = 100,
}: UsePartnerNavigationOptions) {
  const dispatch = useAppDispatch();
  const navigation = useAppSelector((state) => state.partnerNavigation);
  const tracking = useAppSelector((state) => state.partnerTracking);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopTrackingRef = useRef<(() => void) | null>(null);
  const routeRefreshInFlight = useRef(false);
  const activeRouteRef = useRef(navigation.activeRoute);

  useEffect(() => {
    activeRouteRef.current = navigation.activeRoute;
  }, [navigation.activeRoute]);

  const resolvedCustomerLocation = useMemo(() => {
    if (customerLocation) return customerLocation;
    const activeRoute = navigation.activeRoute;
    return activeRoute ? activeRoute.customerLocation : null;
  }, [customerLocation, navigation.activeRoute]);

  const refreshRoute = useCallback(async (originOverride?: TrackingLocation | null) => {
    if (!bookingId) return;
    let customer = resolvedCustomerLocation;
    if (!customer) {
      const order = await getPartnerOrderById(bookingId);
      if (!Number.isFinite(order.latitude) || !Number.isFinite(order.longitude)) {
        throw new Error("Customer location unavailable for navigation.");
      }
      customer = { latitude: Number(order.latitude), longitude: Number(order.longitude) };
    }

    const origin = originOverride ?? tracking.currentLocation ?? await getFreshTrackingLocation();
    dispatch(navigationActions.setRouteStatus(activeRouteRef.current ? "rerouting" : "loading"));

    const result = await fetchNavigationRoute({
      bookingId,
      origin,
      destination: customer,
      deviationThresholdMeters,
    });
    dispatch(navigationActions.setActiveRoute(result.route));
    dispatch(navigationActions.setRouteStatus("ready"));
    dispatch(
      navigationActions.pushNavigationEvent({
        id: createEventId(activeRouteRef.current ? "route_refreshed" : "route_loaded"),
        type: activeRouteRef.current ? "route_refreshed" : "route_loaded",
        createdAt: Date.now(),
        metadata: {
          source: result.route.source,
          etaSeconds: result.route.etaSeconds,
          distanceMeters: result.route.distanceMeters,
        },
      }),
    );
  }, [bookingId, deviationThresholdMeters, dispatch, resolvedCustomerLocation, tracking.currentLocation]);

  const startTracking = useCallback(async () => {
    dispatch(trackingActions.setTrackingEnabled(true));
    dispatch(navigationActions.setNavigationState("navigating"));
    dispatch(
      navigationActions.pushNavigationEvent({
        id: createEventId("tracking_started"),
        type: "tracking_started",
        createdAt: Date.now(),
      }),
    );

    const firstLocation = await getFreshTrackingLocation();
    dispatch(trackingActions.setCurrentLocation(firstLocation));
    await refreshRoute(firstLocation);

    stopTrackingRef.current?.();
    stopTrackingRef.current = startLiveTracking(
      (location) => {
        dispatch(trackingActions.setCurrentLocation(location));
        const activeRoute = activeRouteRef.current;
        if (activeRoute) {
          const nextInstruction =
            activeRoute.instructions.find((instruction) => {
              if (!instruction.coordinate) return false;
              return (
                Math.abs(instruction.coordinate.latitude - location.latitude) +
                  Math.abs(instruction.coordinate.longitude - location.longitude) >
                0.0002
              );
            }) ?? activeRoute.instructions[0] ?? null;
          dispatch(navigationActions.setNextInstruction(nextInstruction));
          if (hasRouteDeviation(activeRoute, location, activeRoute.deviationThresholdMeters) && !routeRefreshInFlight.current) {
            routeRefreshInFlight.current = true;
            dispatch(navigationActions.markDeviation(Date.now()));
            dispatch(
              navigationActions.pushNavigationEvent({
                id: createEventId("deviation_detected"),
                type: "deviation_detected",
                createdAt: Date.now(),
              }),
            );
            refreshRoute(location)
              .catch((error: any) => {
                dispatch(navigationActions.setNavigationError(error?.message ?? "Unable to refresh route"));
              })
              .finally(() => {
                routeRefreshInFlight.current = false;
              });
          }
        }
      },
      (error) => {
        dispatch(navigationActions.setNavigationError(error.message));
      },
    );
  }, [dispatch, refreshRoute]);

  const stopTracking = useCallback(() => {
    stopTrackingRef.current?.();
    stopTrackingRef.current = null;
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    dispatch(trackingActions.setTrackingEnabled(false));
    dispatch(navigationActions.setNavigationState("previewing"));
    dispatch(
      navigationActions.pushNavigationEvent({
        id: createEventId("tracking_stopped"),
        type: "tracking_stopped",
        createdAt: Date.now(),
      }),
    );
  }, [dispatch]);

  useEffect(() => {
    if (!autoStart) return undefined;
    startTracking().catch((error: any) => {
      dispatch(navigationActions.setNavigationError(error?.message ?? "Unable to start navigation"));
    });

    refreshTimerRef.current = setInterval(() => {
      refreshRoute().catch((error: any) => {
        dispatch(navigationActions.setNavigationError(error?.message ?? "Unable to refresh ETA"));
      });
    }, refreshIntervalMs);

    return () => {
      stopTracking();
    };
  }, [autoStart, dispatch, refreshIntervalMs, refreshRoute, startTracking, stopTracking]);

  useEffect(() => {
    if (autoStart || navigation.activeRoute || !bookingId) return;
    dispatch(navigationActions.setNavigationState("previewing"));
    refreshRoute()
      .catch((error: any) => {
        dispatch(navigationActions.setNavigationError(error?.message ?? "Unable to load route preview"));
      });
  }, [autoStart, bookingId, dispatch, navigation.activeRoute, refreshRoute]);

  return {
    navigation,
    tracking,
    refreshRoute,
    startTracking,
    stopTracking,
  };
}
