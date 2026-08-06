import analyticsReducer, { analyticsActions } from "../src/redux/slices/analyticsSlice";

describe("analyticsSlice", () => {
  it("calculates acceptance rate from received and accepted orders", () => {
    let state = analyticsReducer(undefined, analyticsActions.incrementOrdersReceived(4));
    state = analyticsReducer(state, analyticsActions.incrementOrdersAccepted(3));
    state = analyticsReducer(state, analyticsActions.incrementOrdersRejected(1));

    expect(state.totalOrdersReceived).toBe(4);
    expect(state.totalOrdersAccepted).toBe(3);
    expect(state.totalOrdersRejected).toBe(1);
    expect(state.acceptanceRate).toBe(75);
  });

  it("uses default increments when payload is omitted and stores the last tracked screen", () => {
    let state = analyticsReducer(undefined, analyticsActions.incrementOrdersReceived(undefined));
    state = analyticsReducer(state, analyticsActions.incrementOrdersAccepted(undefined));
    state = analyticsReducer(state, analyticsActions.incrementOrdersRejected(undefined));
    state = analyticsReducer(state, analyticsActions.setLastTrackedScreen("Dashboard"));

    expect(state.totalOrdersReceived).toBe(1);
    expect(state.totalOrdersAccepted).toBe(1);
    expect(state.totalOrdersRejected).toBe(1);
    expect(state.acceptanceRate).toBe(100);
    expect(state.lastScreenName).toBe("Dashboard");
  });

  it("keeps acceptance rate at zero when no orders were received and resets state", () => {
    let state = analyticsReducer(undefined, analyticsActions.incrementOrdersAccepted(2));
    expect(state.acceptanceRate).toBe(0);

    state = analyticsReducer(state, analyticsActions.resetAnalyticsState());
    expect(state).toEqual({
      totalOrdersReceived: 0,
      totalOrdersAccepted: 0,
      totalOrdersRejected: 0,
      acceptanceRate: 0,
      lastScreenName: null,
    });
  });
});
