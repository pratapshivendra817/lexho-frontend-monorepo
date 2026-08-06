const mockCallApi = {
  create: jest.fn(), accept: jest.fn(), reject: jest.fn(), end: jest.fn(), missed: jest.fn(),
};
const mockRtc = { startOutgoing: jest.fn(), acceptIncoming: jest.fn(), end: jest.fn(), setMuted: jest.fn(), setSpeaker: jest.fn() };
const mockSignaling = { connect: jest.fn(), send: jest.fn() };

jest.mock("../src/services/callApi", () => ({
  createPartnerCall: (...args: any[]) => mockCallApi.create(...args),
  acceptPartnerCall: (...args: any[]) => mockCallApi.accept(...args),
  rejectPartnerCall: (...args: any[]) => mockCallApi.reject(...args),
  endPartnerCall: (...args: any[]) => mockCallApi.end(...args),
  markPartnerCallMissed: (...args: any[]) => mockCallApi.missed(...args),
}));
jest.mock("../src/services/webrtcCallService", () => ({
  webrtcCallService: {
    startOutgoing: (...args: any[]) => mockRtc.startOutgoing(...args),
    acceptIncoming: (...args: any[]) => mockRtc.acceptIncoming(...args),
    end: (...args: any[]) => mockRtc.end(...args),
    setMuted: (...args: any[]) => mockRtc.setMuted(...args),
    setSpeaker: (...args: any[]) => mockRtc.setSpeaker(...args),
  },
}));
jest.mock("../src/services/callSignaling", () => ({
  callSignaling: {
    connect: (...args: any[]) => mockSignaling.connect(...args),
    send: (...args: any[]) => mockSignaling.send(...args),
  },
}));

import { configureStore } from "@reduxjs/toolkit";
import reducer, {
  acceptIncomingCall,
  clearCurrentCall,
  presentIncomingCall,
  receiveCallSignal,
  setCallMuted,
  setCallSpeaker,
  startOutgoingCall,
} from "../src/redux/slices/callSlice";

describe("callSlice", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignaling.connect.mockResolvedValue(undefined);
    mockCallApi.accept.mockResolvedValue(undefined);
    mockRtc.acceptIncoming.mockResolvedValue(undefined);
  });

  it("tracks incoming offer, active, ended, and cleanup states", () => {
    let state = reducer(undefined, receiveCallSignal({ type: "OFFER", callId: "c1", orderId: 5, sdp: "offer", customerName: "Asha" }));
    expect(state.current).toMatchObject({ callId: "c1", status: "ringing" });
    expect(state.offerSdp).toBe("offer");
    state = reducer(state, receiveCallSignal({ type: "ANSWER", callId: "c1", sdp: "answer" }));
    expect(state.current?.status).toBe("active");
    state = reducer(state, receiveCallSignal({ type: "ENDED", callId: "c1", reason: "REMOTE" }));
    expect(state.current).toMatchObject({ status: "ended", endReason: "REMOTE" });
    expect(reducer(state, clearCurrentCall()).current).toBeNull();
  });

  it("starts an outgoing WebRTC call", async () => {
    mockCallApi.create.mockResolvedValue({ callId: "c2", orderId: 9, customerName: "Riya", direction: "outgoing", status: "ringing" });
    mockRtc.startOutgoing.mockResolvedValue(undefined);
    const store = configureStore({ reducer: { calls: reducer } });
    await store.dispatch(startOutgoingCall(9));
    expect(mockRtc.startOutgoing).toHaveBeenCalledWith("c2", 9);
    expect(store.getState().calls.current).toMatchObject({ callId: "c2", status: "ringing" });
  });

  it("accepts an incoming offer and controls audio routes", async () => {
    const store = configureStore({ reducer: { calls: reducer } });
    await store.dispatch(presentIncomingCall({ type: "INCOMING_CALL", callId: "c3", orderId: 4, customerName: "Neha" }));
    store.dispatch(receiveCallSignal({ type: "OFFER", callId: "c3", orderId: 4, sdp: "offer" }));
    await store.dispatch(acceptIncomingCall());
    await store.dispatch(setCallMuted(true));
    await store.dispatch(setCallSpeaker(true));
    expect(mockRtc.acceptIncoming).toHaveBeenCalledWith("c3", "offer");
    expect(mockRtc.setMuted).toHaveBeenCalledWith(true);
    expect(mockRtc.setSpeaker).toHaveBeenCalledWith(true);
    expect(store.getState().calls).toMatchObject({ muted: true, speaker: true });
  });
});
