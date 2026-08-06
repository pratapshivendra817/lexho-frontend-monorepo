import navigationReducer, { navigationActions } from "../src/modules/navigation/store/navigationSlice";

const route = {
  bookingId: 91,
  partnerLocation: { latitude: 28.61, longitude: 77.2 },
  customerLocation: { latitude: 28.62, longitude: 77.21 },
  coordinates: [
    { latitude: 28.61, longitude: 77.2 },
    { latitude: 28.62, longitude: 77.21 },
  ],
  etaSeconds: 780,
  distanceMeters: 4200,
  trafficDelaySeconds: 120,
  deviationThresholdMeters: 100,
  instructions: [
    {
      id: "step-1",
      text: "Head north",
      distanceMeters: 200,
      durationSeconds: 60,
    },
  ],
  fetchedAt: 1000,
  source: "backend" as const,
};

describe("navigationSlice", () => {
  it("stores active route summary and next instruction", () => {
    const state = navigationReducer(undefined, navigationActions.setActiveRoute(route));

    expect(state.routeStatus).toBe("idle");
    expect(state.eta).toBe(780);
    expect(state.distance).toBe(4200);
    expect(state.trafficDelaySeconds).toBe(120);
    expect(state.nextInstruction?.text).toBe("Head north");
    expect(state.lastError).toBeNull();
  });

  it("updates route and navigation lifecycle states explicitly", () => {
    let state = navigationReducer(undefined, navigationActions.setRouteStatus("loading"));
    state = navigationReducer(state, navigationActions.setNavigationState("navigating"));

    expect(state.routeStatus).toBe("loading");
    expect(state.navigationState).toBe("navigating");
  });

  it("supports clearing the route and next instruction", () => {
    let state = navigationReducer(undefined, navigationActions.setActiveRoute(route));
    state = navigationReducer(state, navigationActions.setNextInstruction(null));
    state = navigationReducer(state, navigationActions.setActiveRoute(null));

    expect(state.activeRoute).toBeNull();
    expect(state.eta).toBeNull();
    expect(state.distance).toBeNull();
    expect(state.trafficDelaySeconds).toBe(0);
    expect(state.nextInstruction).toBeNull();
  });

  it("marks failure when error is stored and keeps status when error is cleared", () => {
    let state = navigationReducer(undefined, navigationActions.setNavigationError("network lost"));
    expect(state.routeStatus).toBe("failed");
    expect(state.lastError).toBe("network lost");

    state = navigationReducer(state, navigationActions.setNavigationError(null));
    expect(state.routeStatus).toBe("failed");
    expect(state.lastError).toBeNull();
  });

  it("tracks deviations, prepends events, and trims the event list to 25", () => {
    let state = navigationReducer(undefined, navigationActions.markDeviation(12345));

    for (let index = 0; index < 27; index += 1) {
      state = navigationReducer(
        state,
        navigationActions.pushNavigationEvent({
          id: `event-${index}`,
          type: "route_loaded",
          createdAt: index,
        }),
      );
    }

    expect(state.lastDeviationAt).toBe(12345);
    expect(state.events).toHaveLength(25);
    expect(state.events[0].id).toBe("event-26");
    expect(state.events.at(-1)?.id).toBe("event-2");
  });

  it("resets back to the initial navigation state", () => {
    let state = navigationReducer(undefined, navigationActions.setActiveRoute(route));
    state = navigationReducer(state, navigationActions.setRouteStatus("ready"));
    state = navigationReducer(state, navigationActions.resetNavigationState());

    expect(state).toEqual({
      activeRoute: null,
      eta: null,
      distance: null,
      routeStatus: "idle",
      navigationState: "idle",
      trafficDelaySeconds: 0,
      nextInstruction: null,
      lastError: null,
      lastDeviationAt: null,
      events: [],
    });
  });
});
