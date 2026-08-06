function loadNavigationHookModules(initialState?: any) {
  jest.resetModules();
  const React = require("react");
  const ReactTestRenderer = require("react-test-renderer");

  const mockDispatch = jest.fn();
  const mockState = initialState ?? {
    partnerNavigation: {
      activeRoute: null,
      eta: null,
      distance: null,
      routeStatus: "idle",
      navigationState: "idle",
      trafficDelaySeconds: 0,
      nextInstruction: null,
      lastError: null,
    },
    partnerTracking: {
      currentLocation: null,
      trackingEnabled: false,
      accuracyValid: false,
    },
  };
  const mockGetPartnerOrderById = jest.fn(async () => ({ latitude: 28.62, longitude: 77.21 }));
  const mockGetFreshTrackingLocation = jest.fn(async () => ({
    latitude: 28.61,
    longitude: 77.2,
    accuracy: 12,
    timestamp: 1000,
  }));
  const mockStartLiveTracking = jest.fn();
  const mockFetchNavigationRoute = jest.fn();
  const mockHasRouteDeviation = jest.fn(() => false);

  jest.doMock("../src/hooks/useRedux", () => ({
    __esModule: true,
    useAppDispatch: () => mockDispatch,
    useAppSelector: (selector: any) => selector(mockState),
  }));
  jest.doMock("../src/services/partnerService", () => ({
    __esModule: true,
    getPartnerOrderById: mockGetPartnerOrderById,
  }));
  jest.doMock("../src/modules/navigation/services/locationService", () => ({
    __esModule: true,
    getFreshTrackingLocation: mockGetFreshTrackingLocation,
    startLiveTracking: mockStartLiveTracking,
  }));
  jest.doMock("../src/modules/navigation/services/navigationApi", () => ({
    __esModule: true,
    fetchNavigationRoute: mockFetchNavigationRoute,
  }));
  jest.doMock("../src/modules/navigation/services/routeDeviationService", () => ({
    __esModule: true,
    hasRouteDeviation: mockHasRouteDeviation,
  }));

  return {
    React,
    ReactTestRenderer,
    mockDispatch,
    mockState,
    mockGetPartnerOrderById,
    mockGetFreshTrackingLocation,
    mockStartLiveTracking,
    mockFetchNavigationRoute,
    mockHasRouteDeviation,
    navigationActions: require("../src/modules/navigation/store/navigationSlice").navigationActions,
    trackingActions: require("../src/modules/navigation/store/trackingSlice").trackingActions,
    usePartnerNavigation: require("../src/modules/navigation/hooks/usePartnerNavigation").usePartnerNavigation,
  };
}

function loadNavigationScreenModules() {
  jest.resetModules();
  const React = require("react");
  const ReactTestRenderer = require("react-test-renderer");
  const mockUsePartnerNavigation = jest.fn();
  const mockEnsureMapboxConfigured = jest.fn();
  const mockBuildRouteFeature = jest.fn(() => ({ type: "Feature" }));
  const mockGetRouteBounds = jest.fn(() => ({ ne: [77.21, 28.62], sw: [77.2, 28.61] }));
  const mockGetMapboxStyleUrl = jest.fn(() => "mock-style");
  const mockToMapboxCoordinate = jest.fn((point) => [point.longitude, point.latitude]);

  jest.doMock("../src/modules/navigation/hooks/usePartnerNavigation", () => ({
    __esModule: true,
    usePartnerNavigation: (...args: any[]) => mockUsePartnerNavigation(...args),
  }));
  jest.doMock("../src/modules/navigation/services/mapboxService", () => ({
    __esModule: true,
    ensureMapboxConfigured: mockEnsureMapboxConfigured,
    buildRouteFeature: mockBuildRouteFeature,
    getRouteBounds: mockGetRouteBounds,
    getMapboxStyleUrl: mockGetMapboxStyleUrl,
    toMapboxCoordinate: mockToMapboxCoordinate,
  }));
  jest.doMock("@rnmapbox/maps", () => {
    const React = require("react");
    const { View } = require("react-native");
    const Mock = ({ children }: any) => React.createElement(View, {}, children);
    return {
      __esModule: true,
      default: {
        MapView: Mock,
        Camera: Mock,
        ShapeSource: Mock,
        LineLayer: Mock,
        PointAnnotation: Mock,
        UserLocation: Mock,
      },
    };
  });

  return {
    React,
    ReactTestRenderer,
    mockUsePartnerNavigation,
    mockEnsureMapboxConfigured,
    RouteMapScreen: require("../src/modules/navigation/screens/RouteMapScreen").default,
    LiveTrackingScreen: require("../src/modules/navigation/screens/LiveTrackingScreen").default,
  };
}

describe("navigation hook and screens core", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("auto-starts tracking, refreshes route, and handles deviations", async () => {
    const loaded = loadNavigationHookModules();
    const HookProbe = ({ hook, onValue }: { hook: () => any; onValue: (value: any) => void }) => {
      onValue(hook());
      return null;
    };
    const route = {
      bookingId: 99,
      partnerLocation: { latitude: 28.61, longitude: 77.2 },
      customerLocation: { latitude: 28.62, longitude: 77.21 },
      coordinates: [],
      etaSeconds: 780,
      distanceMeters: 4200,
      trafficDelaySeconds: 120,
      deviationThresholdMeters: 100,
      instructions: [
        {
          id: "step-1",
          text: "Turn left",
          distanceMeters: 50,
          durationSeconds: 20,
          coordinate: { latitude: 28.615, longitude: 77.205 },
        },
      ],
      fetchedAt: 111,
      source: "backend",
    };
    let trackingListener: ((location: any) => void) | undefined;
    const trackingCleanup = jest.fn();
    let value: any;

    loaded.mockFetchNavigationRoute.mockResolvedValue({ route });
    loaded.mockStartLiveTracking.mockImplementation((onLocation: (location: any) => void) => {
      trackingListener = onLocation;
      return trackingCleanup;
    });
    loaded.mockHasRouteDeviation.mockReturnValueOnce(false).mockReturnValueOnce(true);

    let renderer: any;
    await loaded.ReactTestRenderer.act(async () => {
      renderer = loaded.ReactTestRenderer.create(
        loaded.React.createElement(HookProbe, {
          hook: () =>
            loaded.usePartnerNavigation({
              bookingId: 99,
              customerLocation: null,
              autoStart: true,
              refreshIntervalMs: 2000,
              deviationThresholdMeters: 100,
            }),
          onValue: (next: any) => { value = next; },
        }),
      );
    });

    expect(loaded.mockDispatch).toHaveBeenCalledWith(loaded.trackingActions.setTrackingEnabled(true));
    expect(loaded.mockDispatch).toHaveBeenCalledWith(loaded.navigationActions.setNavigationState("navigating"));

    loaded.mockState.partnerNavigation.activeRoute = route;
    loaded.mockState.partnerTracking.currentLocation = { latitude: 28.61, longitude: 77.2, accuracy: 12, timestamp: 1000 };
    await loaded.ReactTestRenderer.act(async () => {
      renderer.update(
        loaded.React.createElement(HookProbe, {
          hook: () =>
            loaded.usePartnerNavigation({
              bookingId: 99,
              customerLocation: null,
              autoStart: true,
              refreshIntervalMs: 2000,
              deviationThresholdMeters: 100,
            }),
          onValue: (next: any) => { value = next; },
        }),
      );
    });
    await loaded.ReactTestRenderer.act(async () => {
      trackingListener?.({ latitude: 28.63, longitude: 77.22, accuracy: 11, timestamp: 2000 });
      await Promise.resolve();
    });

    expect(loaded.mockDispatch).toHaveBeenCalledWith(
      loaded.navigationActions.setNextInstruction(
        expect.objectContaining({ id: "step-1", text: "Turn left" }),
      ),
    );
    await loaded.ReactTestRenderer.act(async () => {
      await jest.advanceTimersByTimeAsync(2000);
    });
    expect(loaded.mockFetchNavigationRoute.mock.calls.length).toBeGreaterThanOrEqual(2);

    loaded.ReactTestRenderer.act(() => {
      value.stopTracking();
    });
    expect(trackingCleanup).toHaveBeenCalled();
    loaded.ReactTestRenderer.act(() => {
      renderer.unmount();
    });
  });

  it("loads preview mode and reports preview errors", async () => {
    const loaded = loadNavigationHookModules();
    const HookProbe = ({ hook, onValue }: { hook: () => any; onValue: (value: any) => void }) => {
      onValue(hook());
      return null;
    };
    let value: any;

    loaded.mockFetchNavigationRoute.mockRejectedValueOnce(new Error("preview failed"));
    await loaded.ReactTestRenderer.act(async () => {
      loaded.ReactTestRenderer.create(
        loaded.React.createElement(HookProbe, {
          hook: () =>
            loaded.usePartnerNavigation({
              bookingId: 77,
              customerLocation: { latitude: 28.7, longitude: 77.3 },
              autoStart: false,
              deviationThresholdMeters: 80,
            }),
          onValue: (next: any) => { value = next; },
        }),
      );
    });
    expect(loaded.mockDispatch).toHaveBeenCalledWith(loaded.navigationActions.setNavigationState("previewing"));
    expect(loaded.mockDispatch).toHaveBeenCalledWith(loaded.navigationActions.setNavigationError("preview failed"));

    loaded.mockFetchNavigationRoute.mockResolvedValueOnce({
      route: {
        bookingId: 77,
        partnerLocation: { latitude: 28.61, longitude: 77.2 },
        customerLocation: { latitude: 28.7, longitude: 77.3 },
        coordinates: [],
        etaSeconds: 600,
        distanceMeters: 3000,
        trafficDelaySeconds: 60,
        deviationThresholdMeters: 80,
        instructions: [],
        fetchedAt: 222,
        source: "fallback",
      },
    });
    await loaded.ReactTestRenderer.act(async () => {
      await value.refreshRoute({ latitude: 28.61, longitude: 77.2, accuracy: 10, timestamp: 1 });
    });
    expect(loaded.mockDispatch).toHaveBeenCalledWith(loaded.navigationActions.setRouteStatus("loading"));
  });

  it("renders route preview and live tracking screen states", async () => {
    const loaded = loadNavigationScreenModules();
    const navigation = { navigate: jest.fn() };

    loaded.mockUsePartnerNavigation.mockReturnValueOnce({
      navigation: {
        activeRoute: null,
        eta: null,
        distance: null,
        routeStatus: "loading",
        trafficDelaySeconds: null,
        lastError: "Preparing",
      },
      tracking: { accuracyValid: false },
    });
    loaded.mockUsePartnerNavigation.mockReturnValueOnce({
      navigation: {
        activeRoute: {
          bookingId: 22,
          partnerLocation: { latitude: 28.61, longitude: 77.2 },
          customerLocation: { latitude: 28.62, longitude: 77.21 },
          coordinates: [],
          etaSeconds: 780,
          distanceMeters: 4200,
          trafficDelaySeconds: 120,
          deviationThresholdMeters: 100,
          instructions: [],
          fetchedAt: 1,
          source: "backend",
        },
        eta: 780,
        distance: 4200,
        routeStatus: "ready",
        trafficDelaySeconds: 120,
        lastError: null,
      },
      tracking: { accuracyValid: true },
    });

    let routeTree: any;
    await loaded.ReactTestRenderer.act(async () => {
      routeTree = loaded.ReactTestRenderer.create(
        loaded.React.createElement(loaded.RouteMapScreen, {
          route: { params: { orderId: 22, customerLatitude: 28.62, customerLongitude: 77.21 } },
          navigation,
        }),
      );
    });
    const routeText = routeTree.root.findAllByType("Text").map((node) => String(node.props.children)).join(" ");
    expect(routeText).toContain("Route Preview");
    expect(routeText).toContain("Fetching route...");

    await loaded.ReactTestRenderer.act(async () => {
      routeTree.update(
        loaded.React.createElement(loaded.RouteMapScreen, {
          route: { params: { orderId: 22, customerLatitude: 28.62, customerLongitude: 77.21 } },
          navigation,
        }),
      );
    });
    const startPressable = routeTree.root.findAll((node) => node.props?.onPress && node.findAllByProps?.({ children: "Start Navigation" }).length > 0)[0];
    loaded.ReactTestRenderer.act(() => {
      startPressable.props.onPress();
    });
    expect(navigation.navigate).toHaveBeenCalledWith("LiveTracking", {
      orderId: 22,
      customerLatitude: 28.62,
      customerLongitude: 77.21,
    });

    const refreshRoute = jest.fn(async () => undefined);
    loaded.mockUsePartnerNavigation.mockReset();
    loaded.mockUsePartnerNavigation
      .mockReturnValueOnce({
        navigation: {
          activeRoute: null,
          eta: null,
          distance: null,
          trafficDelaySeconds: null,
          nextInstruction: null,
          lastError: null,
        },
        tracking: { currentLocation: null },
        refreshRoute,
      })
      .mockReturnValueOnce({
        navigation: {
          activeRoute: {
            bookingId: 22,
            partnerLocation: { latitude: 28.61, longitude: 77.2 },
            customerLocation: { latitude: 28.62, longitude: 77.21 },
            coordinates: [],
            etaSeconds: 780,
            distanceMeters: 4200,
            trafficDelaySeconds: 120,
            deviationThresholdMeters: 100,
            instructions: [{ id: "step-1", text: "Turn left", distanceMeters: 120, durationSeconds: 45 }],
            fetchedAt: 1,
            source: "backend",
          },
          eta: 780,
          distance: 4200,
          trafficDelaySeconds: 120,
          nextInstruction: { text: "Turn left", distanceMeters: 120 },
          lastError: null,
        },
        tracking: { currentLocation: { latitude: 28.61, longitude: 77.2, speedKmh: 24 } },
        refreshRoute,
      });

    let liveTree: any;
    await loaded.ReactTestRenderer.act(async () => {
      liveTree = loaded.ReactTestRenderer.create(
        loaded.React.createElement(loaded.LiveTrackingScreen, { route: { params: { orderId: 22 } } }),
      );
    });
    let liveText = liveTree.root.findAllByType("Text").map((node) => String(node.props.children)).join(" ");
    expect(liveText).toContain("Preparing live route...");

    await loaded.ReactTestRenderer.act(async () => {
      liveTree.update(
        loaded.React.createElement(loaded.LiveTrackingScreen, {
          route: { params: { orderId: 22, customerLatitude: 28.62, customerLongitude: 77.21 } },
        }),
      );
    });
    liveText = liveTree.root.findAllByType("Text").map((node) => String(node.props.children)).join(" ");
    expect(liveText).toContain("Live Tracking");
    expect(liveText).toContain("Turn left");
    expect(liveText).toContain("13 min");

    const refreshPressable = liveTree.root.findAll((node) => node.props?.onPress && node.findAllByProps?.({ children: "Refresh Route & ETA" }).length > 0)[0];
    await loaded.ReactTestRenderer.act(async () => {
      await refreshPressable.props.onPress();
    });
    expect(refreshRoute).toHaveBeenCalled();
    expect(loaded.mockEnsureMapboxConfigured).toHaveBeenCalled();
  });
});
