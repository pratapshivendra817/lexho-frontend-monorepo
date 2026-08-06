const mockSignalSend = jest.fn();
jest.mock("../src/services/callSignaling", () => ({
  callSignaling: { send: (...args: any[]) => mockSignalSend(...args) },
}));

import InCallManager from "react-native-incall-manager";
import { mediaDevices, RTCPeerConnection } from "react-native-webrtc";
import { webrtcCallService } from "../src/services/webrtcCallService";

describe("webrtcCallService", () => {
  const audioTrack = { enabled: true, stop: jest.fn() };
  const stream = { getTracks: jest.fn(() => [audioTrack]), getAudioTracks: jest.fn(() => [audioTrack]) };
  const peer = {
    createOffer: jest.fn(async () => ({ type: "offer", sdp: "local-offer" })),
    createAnswer: jest.fn(async () => ({ type: "answer", sdp: "local-answer" })),
    setLocalDescription: jest.fn(async () => undefined),
    setRemoteDescription: jest.fn(async () => undefined),
    addIceCandidate: jest.fn(async () => undefined),
    addTrack: jest.fn(),
    addEventListener: jest.fn(),
    close: jest.fn(),
    remoteDescription: null as any,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    audioTrack.enabled = true;
    (mediaDevices.getUserMedia as jest.Mock).mockResolvedValue(stream);
    (RTCPeerConnection as unknown as jest.Mock).mockImplementation(() => peer);
  });

  afterEach(() => webrtcCallService.end());

  it("creates an audio offer and forwards local ICE", async () => {
    await webrtcCallService.startOutgoing("c1", 22);
    expect(mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true, video: false });
    expect(peer.addTrack).toHaveBeenCalledWith(audioTrack, stream);
    expect(mockSignalSend).toHaveBeenCalledWith({ type: "OFFER", callId: "c1", orderId: 22, sdp: "local-offer" });

    const iceHandler = peer.addEventListener.mock.calls[0][1];
    iceHandler({ candidate: { toJSON: () => ({ candidate: "ice" }) } });
    expect(mockSignalSend).toHaveBeenCalledWith({ type: "ICE_CANDIDATE", callId: "c1", candidate: { candidate: "ice" } });
  });

  it("mutes tracks, routes speaker audio, and tears down media", async () => {
    await webrtcCallService.startOutgoing("c2", 7);
    webrtcCallService.setMuted(true);
    webrtcCallService.setSpeaker(true);
    expect(audioTrack.enabled).toBe(false);
    expect(InCallManager.setMicrophoneMute).toHaveBeenCalledWith(true);
    expect(InCallManager.setForceSpeakerphoneOn).toHaveBeenCalledWith(true);

    webrtcCallService.end();
    expect(audioTrack.stop).toHaveBeenCalled();
    expect(peer.close).toHaveBeenCalled();
    expect(InCallManager.stop).toHaveBeenCalled();
  });
});

