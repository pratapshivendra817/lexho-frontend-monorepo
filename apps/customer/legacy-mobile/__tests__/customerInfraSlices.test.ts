import analyticsReducer, {
  analyticsEventTracked,
  analyticsScreenTracked,
} from "../src/redux/analyticsSlice";
import notificationReducer, {
  notificationOpened,
  notificationReceived,
} from "../src/redux/notificationSlice";
import trackingReducer, {
  trackingStarted,
  trackingStopped,
  trackingUpdated,
} from "../src/redux/trackingSlice";
import offlineReducer, {
  offlineQueueSynced,
  offlineStatusChanged,
} from "../src/redux/offlineSlice";

describe("customer infra slices", () => {
  it("tracks analytics events and screen updates", () => {
    let state = analyticsReducer(undefined, analyticsEventTracked({ name: "payment_success", params: { bookingId: "1" } }));
    expect(state.lastEvent?.name).toBe("payment_success");
    expect(state.eventCount).toBe(1);

    state = analyticsReducer(state, analyticsScreenTracked("Payment"));
    expect(state.screenName).toBe("Payment");
  });

  it("stores received and opened notification metadata", () => {
    let state = notificationReducer(undefined, notificationReceived({ id: "n1", type: "BOOKING", source: "foreground" }));
    expect(state.unreadHintCount).toBe(1);
    expect(state.lastReceived?.id).toBe("n1");

    state = notificationReducer(state, notificationOpened({ id: "n1", type: "BOOKING", source: "background" }));
    expect(state.unreadHintCount).toBe(0);
    expect(state.lastOpened?.source).toBe("background");
  });

  it("maintains live tracking state", () => {
    let state = trackingReducer(undefined, trackingStarted({ bookingId: "booking-1" }));
    state = trackingReducer(
      state,
      trackingUpdated({
        partnerLocation: { latitude: 28.6, longitude: 77.2 },
        route: [{ latitude: 28.6, longitude: 77.2 }],
        etaMinutes: 12,
        lastUpdatedAt: "10:00:00",
      }),
    );
    expect(state.activeBookingId).toBe("booking-1");
    expect(state.etaMinutes).toBe(12);
    expect(state.route).toHaveLength(1);

    state = trackingReducer(state, trackingStopped());
    expect(state.isLive).toBe(false);
    expect(state.activeBookingId).toBeNull();
  });

  it("reflects offline status and queue snapshots", () => {
    let state = offlineReducer(undefined, offlineStatusChanged({ isOffline: true, serverUnavailable: true }));
    expect(state.isOffline).toBe(true);
    expect(state.serverUnavailable).toBe(true);

    state = offlineReducer(
      state,
      offlineQueueSynced([{ id: "q1", type: "booking:create", createdAt: 1 }]),
    );
    expect(state.queue).toHaveLength(1);
  });
});
