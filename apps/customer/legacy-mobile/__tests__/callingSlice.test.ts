import reducer, { callActions } from "../src/modules/calling/store/callSlice";

const call = { callId: "c1", bookingId: 42, direction: "incoming" as const, participant: { id: "p1", name: "Partner", role: "PARTNER" as const }, status: "ringing" as const, startedAt: 100 };
describe("calling slice", () => {
  it("tracks connected state, controls, duration, and end reason", () => {
    let state = reducer(undefined, callActions.setCall(call));
    state = reducer(state, callActions.setConnected());
    state = reducer(state, callActions.tick());
    state = reducer(state, callActions.setMuted(true));
    state = reducer(state, callActions.setSpeaker(true));
    state = reducer(state, callActions.endCall({ reason: "HANGUP" }));
    expect(state.current?.status).toBe("ended");
    expect(state.current?.endReason).toBe("HANGUP");
    expect(state.durationSeconds).toBe(1);
  });
  it("records busy, missed, and failed states", () => {
    let state = reducer(undefined, callActions.setCall(call));
    state = reducer(state, callActions.endCall({ status: "busy" }));
    expect(state.current?.status).toBe("busy");
    state = reducer(state, callActions.setStatus("missed"));
    expect(state.current?.status).toBe("missed");
    state = reducer(state, callActions.setError("offline"));
    expect(state.current?.status).toBe("failed");
  });
  it("handles actions safely without a current call", () => {
    let state = reducer(undefined, callActions.setStatus("ringing"));
    state = reducer(state, callActions.setConnected());
    state = reducer(state, callActions.endCall(undefined));
    state = reducer(state, callActions.setError("offline"));
    state = reducer(state, callActions.tick());
    expect(state.current).toBeNull();
    state = reducer(state, callActions.setCall({ ...call, connectedAt: 10 }));
    state = reducer(state, callActions.setConnected());
    state = reducer(state, callActions.endCall(undefined));
    expect(state.current?.connectedAt).toBe(10);
    expect(state.current?.status).toBe("ended");
    expect(reducer(state, callActions.resetCall()).current).toBeNull();
  });
});
