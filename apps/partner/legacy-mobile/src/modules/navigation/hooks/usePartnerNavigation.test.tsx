import { renderHook, waitFor } from "@testing-library/react-native";

import { usePartnerNavigation } from "./usePartnerNavigation";

const mockDispatch = jest.fn();
const mockGetPartnerOrderById = jest.fn();
const mockGetFreshTrackingLocation = jest.fn();
const mockStartLiveTracking = jest.fn();
const mockFetchNavigationRoute = jest.fn();
const mockHasRouteDeviation = jest.fn();

let mockNavigationState: any;
let mockTrackingState: any;
let liveLocationCallback: ((location: any) => void) | null = null;
let liveErrorCallback: ((error: Error) => void) | null = null;

jest.mock("../../../hooks/useRedux", () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: any) =>
    selector({
      partnerNavigation: mockNavigationState,
      partnerTracking: mockTrackingState,
    }),
}));

jest.mock("../../../services/partnerService", () => ({
  getPartnerOrderById: (...args: any[]) => mockGetPartnerOrderById(...args),
}));

jest.mock("../services/locationService", () => ({
  getFreshTrackingLocation: (...args: any[]) => mockGetFreshTrackingLocation(...args),
  startLiveTracking: (...args: any[]) => mockStartLiveTracking(...args),
}));

jest.mock("../services/navigationApi", () => ({
  fetchNavigationRoute: (...args: any[]) => mockFetchNavigationRoute(...args),
}));

jest.mock("../services/routeDeviationService", () => ({
  hasRouteDeviation: (...args: any[]) => mockHasRouteDeviation(...args),
}));

const baseRoute = {
  bookingId: 55,
  partnerLocation: { latitude: 12.9, longitude: 77.5 },
  customerLocation: { latitude: 13.1, longitude: 77.7 },
  coordinates: [
    { latitude: 12.9, longitude: 77.5 },
    { latitude: 13.1, longitude: 77.7 },
  ],
  etaSeconds: 600,
  distanceMeters: 5000,
  trafficDelaySeconds: 30,
  deviationThresholdMeters: 100,
  instructions: [
    {
      id: "step-1",
      text: "Head north",
      distanceMeters: 100,
      durationSeconds: 50,
      coordinate: { latitude: 13.2, longitude: 77.8 },
    },
  ],
  fetchedAt: 1000,
  source: "backend" as const,
};

describe("usePartnerNavigation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    mockNavigationState = {
      activeRoute: null,
      routeStatus: "idle",
      navigationState: "idle",
      events: [],
    };
    mockTrackingState = {
      currentLocation: null,
      trackingEnabled: false,
      lastUpdatedAt: null,
      accuracyValid: false,
      offlineQueueSize: 0,
    };
    liveLocationCallback = null;
    liveErrorCallback = null;
    mockGetFreshTrackingLocation.mockResolvedValue({ latitude: 12.9, longitude: 77.5, timestamp: 1_700_000_000_000 });
    mockFetchNavigationRoute.mockResolvedValue({ route: baseRoute });
    mockStartLiveTracking.mockImplementation((onLocation: any, onError: any) => {
      liveLocationCallback = onLocation;
      liveErrorCallback = onError;
      return jest.fn();
    });
    mockHasRouteDeviation.mockReturnValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it("loads a preview route when autoStart is disabled", async () => {
    mockGetPartnerOrderById.mockResolvedValueOnce({ latitude: 13.1, longitude: 77.7 });

    await renderHook(() => usePartnerNavigation({ bookingId: 55, autoStart: false }));

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({ type: "partnerNavigation/setNavigationState", payload: "previewing" });
      expect(mockDispatch).toHaveBeenCalledWith({ type: "partnerNavigation/setRouteStatus", payload: "loading" });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "partnerNavigation/setActiveRoute",
        payload: baseRoute,
      });
    });

    expect(mockGetPartnerOrderById).toHaveBeenCalledWith(55);
    expect(mockFetchNavigationRoute).toHaveBeenCalledWith({
      bookingId: 55,
      origin: { latitude: 12.9, longitude: 77.5, timestamp: 1_700_000_000_000 },
      destination: { latitude: 13.1, longitude: 77.7 },
      deviationThresholdMeters: 100,
    });
  });

  it("returns early when bookingId is missing and throws for invalid customer coordinates", async () => {
    const zeroBooking = await renderHook(() => usePartnerNavigation({ bookingId: 0, autoStart: false }));
    await expect(zeroBooking.result.current.refreshRoute()).resolves.toBeUndefined();
    expect(mockFetchNavigationRoute).not.toHaveBeenCalled();

    mockGetPartnerOrderById.mockResolvedValue({ latitude: "bad", longitude: null });
    await renderHook(() => usePartnerNavigation({ bookingId: 77, autoStart: false }));

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: "partnerNavigation/setNavigationError",
        payload: "Customer location unavailable for navigation.",
      });
    });
  });

  it("starts tracking, refreshes routes, handles deviations, and stores tracking errors", async () => {
    const stopTracking = jest.fn();
    mockNavigationState = {
      activeRoute: baseRoute,
      routeStatus: "ready",
      navigationState: "previewing",
      events: [],
    };
    mockTrackingState = {
      currentLocation: { latitude: 12.8, longitude: 77.4, timestamp: 100 },
      trackingEnabled: false,
      lastUpdatedAt: 100,
      accuracyValid: true,
      offlineQueueSize: 0,
    };
    mockStartLiveTracking.mockImplementation((onLocation: any, onError: any) => {
      liveLocationCallback = onLocation;
      liveErrorCallback = onError;
      return stopTracking;
    });
    mockHasRouteDeviation.mockReturnValue(true);

    const view = await renderHook(() => usePartnerNavigation({ bookingId: 55, autoStart: true, refreshIntervalMs: 1000 }));

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({ type: "partnerTracking/setTrackingEnabled", payload: true });
      expect(mockDispatch).toHaveBeenCalledWith({ type: "partnerNavigation/setNavigationState", payload: "navigating" });
      expect(mockStartLiveTracking).toHaveBeenCalled();
    });

    liveLocationCallback?.({ latitude: 13.3, longitude: 77.9, timestamp: 200 });
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: "partnerNavigation/markDeviation", payload: 1_700_000_000_000 }),
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "partnerNavigation/setNextInstruction",
          payload: expect.objectContaining({ id: "step-1" }),
        }),
      );
    });

    liveErrorCallback?.(new Error("gps failed"));
    expect(mockDispatch).toHaveBeenCalledWith({ type: "partnerNavigation/setNavigationError", payload: "gps failed" });

    mockFetchNavigationRoute.mockRejectedValueOnce(new Error("ETA failed"));
    await waitFor(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });
    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({ type: "partnerNavigation/setNavigationError", payload: "ETA failed" });
    });

    await view.result.current.stopTracking();
    expect(stopTracking).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith({ type: "partnerTracking/setTrackingEnabled", payload: false });
    expect(mockDispatch).toHaveBeenCalledWith({ type: "partnerNavigation/setNavigationState", payload: "previewing" });
  });

  it("stores a start-navigation error when startup fails", async () => {
    mockGetFreshTrackingLocation.mockRejectedValueOnce(new Error("No GPS"));

    await renderHook(() => usePartnerNavigation({ bookingId: 55, autoStart: true }));

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({ type: "partnerNavigation/setNavigationError", payload: "No GPS" });
    });
  });
});
