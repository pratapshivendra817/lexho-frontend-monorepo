describe("webrtcCallService", () => {
  const start = jest.fn();
  const stop = jest.fn();
  const setKeepScreenOn = jest.fn();
  const setMicrophoneMute = jest.fn();
  const setForceSpeakerphoneOn = jest.fn();
  const request = jest.fn();
  const send = jest.fn();
  const getUserMedia = jest.fn();

  let lastPeer: any;
  let localTracks: Array<{ enabled: boolean; stop: jest.Mock }>;

  class MockRTCIceCandidate {
    candidate: any;
    constructor(candidate: any) {
      this.candidate = candidate;
    }
  }

  class MockRTCSessionDescription {
    description: any;
    constructor(description: any) {
      this.description = description;
    }
  }

  class MockRTCPeerConnection {
    remoteDescription: any = null;
    localDescription: any = null;
    addTrack = jest.fn();
    createOffer = jest.fn(async () => ({ type: "offer", sdp: "offer-sdp" }));
    createAnswer = jest.fn(async () => ({ type: "answer", sdp: "answer-sdp" }));
    setLocalDescription = jest.fn(async (description) => {
      this.localDescription = description;
    });
    setRemoteDescription = jest.fn(async (description) => {
      this.remoteDescription = description;
    });
    addIceCandidate = jest.fn(async () => undefined);
    close = jest.fn();
    listeners: Record<string, (event: any) => void> = {};

    constructor() {
      lastPeer = this;
    }

    addEventListener(event: string, listener: (payload: any) => void) {
      this.listeners[event] = listener;
    }
  }

  const loadService = async (platform = "android") => {
    jest.resetModules();
    localTracks = [
      { enabled: true, stop: jest.fn() },
      { enabled: true, stop: jest.fn() },
    ];
    getUserMedia.mockResolvedValue({
      getTracks: () => localTracks,
      getAudioTracks: () => localTracks,
    });
    request.mockResolvedValue("granted");

    jest.doMock("react-native-incall-manager", () => ({
      __esModule: true,
      default: {
        start,
        stop,
        setKeepScreenOn,
        setMicrophoneMute,
        setForceSpeakerphoneOn,
      },
    }));
    jest.doMock("react-native", () => ({
      PermissionsAndroid: {
        PERMISSIONS: {
          RECORD_AUDIO: "RECORD_AUDIO",
        },
        RESULTS: {
          GRANTED: "granted",
        },
        request,
      },
      Platform: {
        OS: platform,
      },
    }));
    jest.doMock("react-native-webrtc", () => ({
      mediaDevices: { getUserMedia },
      RTCPeerConnection: MockRTCPeerConnection,
      RTCIceCandidate: MockRTCIceCandidate,
      RTCSessionDescription: MockRTCSessionDescription,
    }));
    jest.doMock("./callSignaling", () => ({
      callSignaling: { send },
    }));
    return require("./webrtcCallService");
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("starts an outgoing call, requests audio permission, and sends an offer", async () => {
    const { webrtcCallService } = await loadService();

    await webrtcCallService.startOutgoing("call-1", 42);

    expect(request).toHaveBeenCalledWith("RECORD_AUDIO");
    expect(start).toHaveBeenCalledWith({ media: "audio" });
    expect(setKeepScreenOn).toHaveBeenCalledWith(true);
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true, video: false });
    expect(lastPeer.addTrack).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledWith({
      type: "OFFER",
      callId: "call-1",
      orderId: 42,
      sdp: "offer-sdp",
    });
  });

  it("accepts an incoming call and sends an answer", async () => {
    const { webrtcCallService } = await loadService();

    await webrtcCallService.acceptIncoming("call-3", "offer-sdp");

    expect(lastPeer.setRemoteDescription).toHaveBeenCalledWith(
      expect.objectContaining({
        description: { type: "offer", sdp: "offer-sdp" },
      }),
    );
    expect(send).toHaveBeenLastCalledWith({
      type: "ANSWER",
      callId: "call-3",
      sdp: "answer-sdp",
    });
  });

  it("applies answer and ice-candidate signals only for the active call", async () => {
    const { webrtcCallService } = await loadService();

    await webrtcCallService.startOutgoing("call-4", 2);
    await webrtcCallService.applySignal({
      type: "ICE_CANDIDATE",
      callId: "call-4",
      candidate: { candidate: "early" },
    } as any);
    await webrtcCallService.applySignal({ type: "ANSWER", callId: "other", sdp: "ignored" } as any);
    expect(lastPeer.setRemoteDescription).not.toHaveBeenCalledWith(
      expect.objectContaining({ description: { type: "answer", sdp: "ignored" } }),
    );

    await webrtcCallService.applySignal({ type: "ANSWER", callId: "call-4", sdp: "real-answer" } as any);
    expect(lastPeer.addIceCandidate).toHaveBeenCalledWith(
      expect.objectContaining({
        candidate: { candidate: "early" },
      }),
    );
    await webrtcCallService.applySignal({
      type: "ICE_CANDIDATE",
      callId: "call-4",
      candidate: { candidate: "live" },
    } as any);

    expect(lastPeer.setRemoteDescription).toHaveBeenCalledWith(
      expect.objectContaining({
        description: { type: "answer", sdp: "real-answer" },
      }),
    );
    expect(lastPeer.addIceCandidate).toHaveBeenCalledWith(
      expect.objectContaining({
        candidate: { candidate: "live" },
      }),
    );

    lastPeer.listeners.icecandidate({
      candidate: {
        toJSON: () => ({ candidate: "outgoing-candidate" }),
      },
    });
    expect(send).toHaveBeenCalledWith({
      type: "ICE_CANDIDATE",
      callId: "call-4",
      candidate: { candidate: "outgoing-candidate" },
    });
  });

  it("toggles mute and speaker state and cleans resources on end", async () => {
    const { webrtcCallService } = await loadService();
    await webrtcCallService.startOutgoing("call-5", 9);

    webrtcCallService.setMuted(true);
    expect(localTracks.every((track) => track.enabled === false)).toBe(true);
    expect(setMicrophoneMute).toHaveBeenCalledWith(true);

    webrtcCallService.setSpeaker(true);
    expect(setForceSpeakerphoneOn).toHaveBeenCalledWith(true);

    webrtcCallService.end();
    expect(localTracks[0].stop).toHaveBeenCalled();
    expect(localTracks[1].stop).toHaveBeenCalled();
    expect(lastPeer.close).toHaveBeenCalled();
    expect(stop).toHaveBeenCalled();
  });

  it("throws when microphone permission is denied", async () => {
    request.mockResolvedValueOnce("denied");
    const { webrtcCallService } = await loadService();

    await expect(webrtcCallService.startOutgoing("call-6", 12)).rejects.toThrow(
      "Microphone permission is required for calls",
    );
  });

  it("skips android permission flow on ios", async () => {
    const { webrtcCallService } = await loadService("ios");

    await webrtcCallService.startOutgoing("call-ios", 7);
    expect(request).not.toHaveBeenCalled();
  });
});
