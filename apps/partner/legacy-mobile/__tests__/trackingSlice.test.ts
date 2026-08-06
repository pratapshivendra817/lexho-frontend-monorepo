import trackingReducer, { trackingActions } from "../src/modules/navigation/store/trackingSlice";

describe("trackingSlice", () => {
  it("stores current location and validates accurate readings", () => {
    const state = trackingReducer(
      undefined,
      trackingActions.setCurrentLocation({
        latitude: 28.6,
        longitude: 77.2,
        accuracy: 22,
        timestamp: 1700000000000,
        headingDegrees: 90,
        speedKmh: 18,
      }),
    );

    expect(state.currentLocation?.latitude).toBe(28.6);
    expect(state.accuracyValid).toBe(true);
    expect(state.lastUpdatedAt).toBe(1700000000000);
  });

  it("treats missing or large accuracy values correctly", () => {
    let state = trackingReducer(
      undefined,
      trackingActions.setCurrentLocation({
        latitude: 1,
        longitude: 2,
        timestamp: 111,
      }),
    );
    expect(state.accuracyValid).toBe(true);

    state = trackingReducer(
      state,
      trackingActions.setCurrentLocation({
        latitude: 3,
        longitude: 4,
        accuracy: 140,
        timestamp: 222,
      }),
    );
    expect(state.accuracyValid).toBe(false);
    expect(state.lastUpdatedAt).toBe(222);
  });

  it("preserves the last update when location becomes null", () => {
    let state = trackingReducer(
      undefined,
      trackingActions.setCurrentLocation({
        latitude: 10,
        longitude: 11,
        accuracy: 10,
        timestamp: 333,
      }),
    );

    state = trackingReducer(state, trackingActions.setCurrentLocation(null));
    expect(state.currentLocation).toBeNull();
    expect(state.lastUpdatedAt).toBe(333);
    expect(state.accuracyValid).toBe(true);
  });

  it("tracks enabled state, clamps queue size, and resets cleanly", () => {
    let state = trackingReducer(undefined, trackingActions.setTrackingEnabled(true));
    state = trackingReducer(state, trackingActions.setOfflineQueueSize(3.8));
    expect(state.trackingEnabled).toBe(true);
    expect(state.offlineQueueSize).toBe(3);

    state = trackingReducer(state, trackingActions.setOfflineQueueSize(-10));
    expect(state.offlineQueueSize).toBe(0);

    state = trackingReducer(state, trackingActions.resetTrackingState());
    expect(state).toEqual({
      currentLocation: null,
      trackingEnabled: false,
      lastUpdatedAt: null,
      accuracyValid: false,
      offlineQueueSize: 0,
    });
  });
});
