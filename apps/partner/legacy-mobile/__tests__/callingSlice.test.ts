import reducer, { callActions } from "../src/modules/calling/store/callSlice";

const call = { callId: "c1", bookingId: 42, direction: "outgoing" as const, participant: { id: "u1", name: "Customer", role: "CUSTOMER" as const }, status: "calling" as const, startedAt: 100 };
describe("calling slice", () => {
  it("tracks the full connected lifecycle", () => {
    let state = reducer(undefined, callActions.setCall(call));
    state = reducer(state, callActions.setConnected());
    state = reducer(state, callActions.tick());
    state = reducer(state, callActions.setMuted(true));
    state = reducer(state, callActions.setSpeaker(true));
    expect(state.current?.status).toBe("connected");
    expect(state.durationSeconds).toBe(1);
    expect(state.muted).toBe(true);
    expect(state.speaker).toBe(true);
  });
  it("records failure and resets", () => {
    let state = reducer(undefined, callActions.setCall(call));
    state = reducer(state, callActions.setError("network"));
    expect(state.current?.status).toBe("failed");
    expect(reducer(state, callActions.resetCall()).current).toBeNull();
  });
  it("keeps idle state safe and applies default end state", () => {
    let idle = reducer(undefined, callActions.setStatus("ringing"));
    idle = reducer(idle, callActions.setConnected());
    idle = reducer(idle, callActions.endCall(undefined));
    idle = reducer(idle, callActions.setError("offline"));
    idle = reducer(idle, callActions.tick());
    expect(idle.current).toBeNull();
    let state = reducer(undefined, callActions.setCall({ ...call, connectedAt: 50 }));
    state = reducer(state, callActions.setConnected());
    state = reducer(state, callActions.endCall(undefined));
    expect(state.current?.status).toBe("ended");
    expect(state.current?.connectedAt).toBe(50);
  });
});
