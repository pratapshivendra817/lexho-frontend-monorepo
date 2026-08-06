import { act, renderHook } from "@testing-library/react-native";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockDispatch = jest.fn();
const mockRemoveListener = jest.fn();
const mockCallSignalingConnect = jest.fn();
const mockCallSignalingDisconnect = jest.fn();
const mockCallSignalingAddListener = jest.fn();
const mockReceiveCallSignal = jest.fn((payload) => ({ type: "calls/receiveSignal", payload }));
const mockApplySignal = jest.fn();
const mockWebRtcEnd = jest.fn();

jest.mock("./useRedux", () => ({
  useAppDispatch: jest.fn(() => mockDispatch),
}));

jest.mock("../redux/slices/callSlice", () => ({
  receiveCallSignal: jest.fn((payload) => mockReceiveCallSignal(payload)),
}));

jest.mock("../services/callSignaling", () => ({
  callSignaling: {
    connect: jest.fn(() => mockCallSignalingConnect()),
    disconnect: jest.fn(() => mockCallSignalingDisconnect()),
    addListener: jest.fn((listener) => mockCallSignalingAddListener(listener)),
  },
}));

jest.mock("../services/webrtcCallService", () => ({
  webrtcCallService: {
    applySignal: jest.fn((signal) => mockApplySignal(signal)),
    end: jest.fn(() => mockWebRtcEnd()),
  },
}));

import { useCallSignaling } from "./useCallSignaling";

describe("useCallSignaling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCallSignalingAddListener.mockImplementation(() => mockRemoveListener);
    mockCallSignalingConnect.mockResolvedValue(undefined);
    mockApplySignal.mockResolvedValue(undefined);
  });

  it("disconnects and ends web rtc when disabled", async () => {
    await renderHook(() => useCallSignaling(false));

    expect(mockCallSignalingDisconnect).toHaveBeenCalledTimes(1);
    expect(mockWebRtcEnd).toHaveBeenCalledTimes(1);
    expect(mockCallSignalingAddListener).not.toHaveBeenCalled();
  });

  it("connects, forwards offers, and cleans up on unmount", async () => {
    const onIncomingOffer = jest.fn();
    const { unmount } = await renderHook(() => useCallSignaling(true, onIncomingOffer));
    const listener = mockCallSignalingAddListener.mock.calls[0][0];
    const offer = { type: "OFFER", callId: "call-1", orderId: 9, customerName: "Riya" };

    await act(async () => {
      listener(offer);
    });

    expect(onIncomingOffer).toHaveBeenCalledWith(offer);
    expect(mockReceiveCallSignal).toHaveBeenCalledWith(offer);
    expect(mockDispatch).toHaveBeenCalledWith({ type: "calls/receiveSignal", payload: offer });
    expect(mockApplySignal).toHaveBeenCalledWith(offer);

    await unmount();

    expect(mockRemoveListener).toHaveBeenCalledTimes(1);
    expect(mockCallSignalingDisconnect).toHaveBeenCalledTimes(1);
    expect(mockWebRtcEnd).toHaveBeenCalledTimes(1);
  });

  it("handles ended and rejected signals, ignores missing callback, and swallows apply/connect failures", async () => {
    mockCallSignalingConnect.mockRejectedValueOnce(new Error("connect failed"));
    mockApplySignal.mockRejectedValueOnce(new Error("apply failed"));

    const { rerender } = await renderHook(({ enabled, onIncomingOffer }) => useCallSignaling(enabled, onIncomingOffer), {
      initialProps: { enabled: true, onIncomingOffer: undefined as undefined | ((signal: any) => void) },
    });
    const listener = mockCallSignalingAddListener.mock.calls[0][0];

    await act(async () => {
      listener({ type: "ANSWER", callId: "call-2", sdp: "abc" });
      await Promise.resolve();
    });

    await act(async () => {
      listener({ type: "ENDED", callId: "call-2" });
      listener({ type: "REJECTED", callId: "call-2" });
      await Promise.resolve();
    });

    expect(mockReceiveCallSignal).toHaveBeenCalledWith({ type: "ANSWER", callId: "call-2", sdp: "abc" });
    expect(mockWebRtcEnd).toHaveBeenCalledTimes(2);

    await rerender({ enabled: false, onIncomingOffer: undefined });
    expect(mockCallSignalingDisconnect).toHaveBeenCalledTimes(2);
    expect(mockWebRtcEnd).toHaveBeenCalledTimes(4);
  });
});
