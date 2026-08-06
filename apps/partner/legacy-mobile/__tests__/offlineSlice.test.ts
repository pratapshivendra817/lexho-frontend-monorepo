import offlineReducer, { offlineActions } from "../src/redux/slices/offlineSlice";

describe("offlineSlice", () => {
  it("stores offline status, queued actions, and server errors", () => {
    let state = offlineReducer(undefined, offlineActions.setOfflineStatus(true));
    state = offlineReducer(state, offlineActions.setQueuedActions(4));
    state = offlineReducer(state, offlineActions.setLastServerError("Server unavailable"));

    expect(state).toEqual({
      isOffline: true,
      queuedActions: 4,
      lastServerError: "Server unavailable",
    });
  });

  it("allows clearing the last server error", () => {
    const seeded = {
      isOffline: true,
      queuedActions: 2,
      lastServerError: "Timeout",
    };

    const state = offlineReducer(seeded, offlineActions.setLastServerError(null));
    expect(state.lastServerError).toBeNull();
  });
});
