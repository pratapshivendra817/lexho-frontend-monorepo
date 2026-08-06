import React from "react";
import { ActivityIndicator, Text, TouchableOpacity } from "react-native";
import ReactTestRenderer, { act } from "react-test-renderer";

import { CallControls } from "../CallControls";
import IncomingCallScreen from "../IncomingCallScreen";
import OutgoingCallScreen from "../OutgoingCallScreen";

const mockDispatch = jest.fn();
let mockCallState: any;

jest.mock("../../../hooks/useRedux", () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: any) => selector({ calls: mockCallState }),
}));

jest.mock("../../../redux/slices/callSlice", () => ({
  acceptIncomingCall: jest.fn(() => ({ type: "call/accept" })),
  clearCurrentCall: jest.fn(() => ({ type: "call/clear" })),
  rejectIncomingCall: jest.fn(() => ({ type: "call/reject" })),
  timeoutIncomingCall: jest.fn(() => ({ type: "call/timeout" })),
  hangUpCall: jest.fn(() => ({ type: "call/hangup" })),
  setCallMuted: jest.fn((payload) => ({ type: "call/muted", payload })),
  setCallSpeaker: jest.fn((payload) => ({ type: "call/speaker", payload })),
  startOutgoingCall: jest.fn((payload) => ({ type: "call/start", payload })),
}));

function collectText(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.findAllByType(Text).map((node) => {
    const children = node.props.children;
    return Array.isArray(children) ? children.join("") : String(children ?? "");
  }).join(" ");
}

describe("call screens", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockDispatch.mockImplementation(() => {
      const promise = Promise.resolve(undefined) as any;
      promise.finally = (cb: () => void) => {
        cb();
        return Promise.resolve(undefined);
      };
      return promise;
    });
    mockCallState = {
      current: null,
      offerSdp: null,
      muted: false,
      speaker: false,
      loading: false,
      error: null,
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders call controls and incoming call states", async () => {
    const onMute = jest.fn();
    const onSpeaker = jest.fn();
    const onEnd = jest.fn();

    let controlsTree: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      controlsTree = ReactTestRenderer.create(
        <CallControls muted speaker={false} onMute={onMute} onSpeaker={onSpeaker} onEnd={onEnd} />,
      );
    });

    const controlButtons = controlsTree!.root.findAllByType(TouchableOpacity);
    await act(async () => {
      controlButtons[0].props.onPress();
      controlButtons[1].props.onPress();
      controlButtons[2].props.onPress();
    });
    expect(onMute).toHaveBeenCalled();
    expect(onEnd).toHaveBeenCalled();
    expect(onSpeaker).toHaveBeenCalled();

    let emptyTree: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      emptyTree = ReactTestRenderer.create(<IncomingCallScreen navigation={{ goBack: jest.fn(), replace: jest.fn() }} />);
    });
    expect(collectText(emptyTree!)).toContain("Call is no longer available.");

    mockCallState = {
      ...mockCallState,
      current: {
        callId: "c1",
        orderId: 22,
        customerName: "Riya",
        status: "ringing",
        expiresAt: new Date(Date.now() + 30000).toISOString(),
      },
      offerSdp: "offer-sdp",
      error: "Mic unavailable",
    };

    const navigation = { goBack: jest.fn(), replace: jest.fn() };
    let incomingTree: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      incomingTree = ReactTestRenderer.create(<IncomingCallScreen navigation={navigation} />);
    });

    const incomingText = collectText(incomingTree!);
    expect(incomingText).toContain("Incoming order call");
    expect(incomingText).toContain("Riya");
    expect(incomingText).toContain("Mic unavailable");

    const incomingButtons = incomingTree!.root.findAllByType(TouchableOpacity);
    await act(async () => {
      incomingButtons[0].props.onPress();
      incomingButtons[1].props.onPress();
    });
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it("times out ringing incoming calls and returns back when the countdown expires", async () => {
    mockCallState = {
      ...mockCallState,
      current: {
        callId: "c-timeout",
        orderId: 101,
        customerName: "Kabir",
        status: "ringing",
        expiresAt: new Date(Date.now() + 1000).toISOString(),
      },
      offerSdp: "secure-offer",
    };

    const navigation = { goBack: jest.fn(), replace: jest.fn() };
    let tree: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = ReactTestRenderer.create(<IncomingCallScreen navigation={navigation} />);
    });

    expect(collectText(tree!)).toContain("Ringing");

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(mockDispatch).toHaveBeenCalledWith({ type: "call/timeout" });
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it("shows outgoing call details, duration, and end controls", async () => {
    mockCallState = {
      ...mockCallState,
      current: {
        callId: "c2",
        orderId: 55,
        customerName: "Asha",
        status: "active",
        direction: "outgoing",
      },
      muted: false,
      speaker: true,
      loading: true,
      error: "Network jitter",
    };

    const navigation = { goBack: jest.fn() };
    let tree: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = ReactTestRenderer.create(
        <OutgoingCallScreen route={{ params: { orderId: 55, customerName: "Asha" } }} navigation={navigation} />,
      );
    });

    expect(tree!.root.findAllByType(ActivityIndicator).length).toBeGreaterThan(0);
    expect(collectText(tree!)).toContain("Calling customer");
    expect(collectText(tree!)).toContain("Asha");
    expect(collectText(tree!)).toContain("Network jitter");

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    expect(collectText(tree!)).toContain("00:02");

    const buttons = tree!.root.findAllByType(TouchableOpacity);
    await act(async () => {
      buttons[0].props.onPress();
      buttons[1].props.onPress();
      buttons[2].props.onPress();
    });
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it("auto clears completed outgoing calls and navigates back after the grace delay", async () => {
    mockCallState = {
      ...mockCallState,
      current: {
        callId: "c3",
        orderId: 77,
        customerName: "Meera",
        status: "failed",
        direction: "incoming",
      },
    };

    const navigation = { goBack: jest.fn() };
    let tree: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = ReactTestRenderer.create(
        <OutgoingCallScreen route={{ params: { orderId: 77, customerName: "Fallback" } }} navigation={navigation} />,
      );
    });

    expect(collectText(tree!)).toContain("Order call");
    expect(collectText(tree!)).toContain("Meera");
    expect(collectText(tree!)).toContain("failed");

    await act(async () => {
      jest.advanceTimersByTime(800);
    });

    expect(mockDispatch).toHaveBeenCalledWith({ type: "call/clear" });
    expect(navigation.goBack).toHaveBeenCalled();
  });
});
