const mockListeners: Record<string, () => void> = {};
const mockTrack = { enabled: true, stop: jest.fn() };
const mockStream = { getTracks: () => [mockTrack], getAudioTracks: () => [mockTrack] };
const mockPeer = {
  remoteDescription: null as any,
  connectionState: "new",
  iceConnectionState: "new",
  createOffer: jest.fn(async () => ({ type: "offer", sdp: "offer-sdp" })),
  createAnswer: jest.fn(async () => ({ type: "answer", sdp: "answer-sdp" })),
  setLocalDescription: jest.fn(async () => undefined),
  setRemoteDescription: jest.fn(async function (description) { mockPeer.remoteDescription = description; }),
  addIceCandidate: jest.fn(async () => undefined),
  addTrack: jest.fn(), close: jest.fn(), restartIce: jest.fn(),
  addEventListener: jest.fn((name: string, listener: () => void) => { mockListeners[name] = listener; }),
};
jest.mock("react-native-config", () => ({ TURN_URL: "turn:test", TURN_USERNAME: "user", TURN_PASSWORD: "pass" }));
jest.mock("react-native-incall-manager", () => ({ start: jest.fn(), stop: jest.fn(), setKeepScreenOn: jest.fn(), setMicrophoneMute: jest.fn(), setForceSpeakerphoneOn: jest.fn() }));
jest.mock("react-native-webrtc", () => ({ mediaDevices: { getUserMedia: jest.fn(async () => mockStream) }, RTCPeerConnection: jest.fn(() => mockPeer), RTCIceCandidate: jest.fn(value => value), RTCSessionDescription: jest.fn(value => value) }));
jest.mock("../src/modules/calling/services/SocketCallService", () => ({ socketCallService: { emit: jest.fn() } }));

import { webRTCService } from "../src/modules/calling/services/WebRTCService";
import { socketCallService } from "../src/modules/calling/services/SocketCallService";
const mockEmit = socketCallService.emit as jest.Mock;

describe("WebRTCService", () => {
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => webRTCService.close());
  it("creates audio-only offer and emits ICE signaling", async () => {
    await webRTCService.createOffer("call-1");
    expect(mockPeer.addTrack).toHaveBeenCalledWith(mockTrack, mockStream);
    expect(mockEmit).toHaveBeenCalledWith("call:offer", { callId: "call-1", sdp: "offer-sdp" });
    (mockListeners.icecandidate as any)({ candidate: { toJSON: () => ({ candidate: "ice" }) } });
    expect(mockEmit).toHaveBeenCalledWith("call:ice-candidate", { callId: "call-1", candidate: { candidate: "ice" } });
  });
  it("answers, applies candidates, and controls audio", async () => {
    await webRTCService.acceptOffer("call-2", "remote-offer");
    await webRTCService.addIceCandidate("call-2", { candidate: "ice" });
    webRTCService.setMuted(true);
    webRTCService.setSpeakerEnabled(true);
    expect(mockTrack.enabled).toBe(false);
    expect(mockEmit).toHaveBeenCalledWith("call:answer", { callId: "call-2", sdp: "answer-sdp" });
  });
});
