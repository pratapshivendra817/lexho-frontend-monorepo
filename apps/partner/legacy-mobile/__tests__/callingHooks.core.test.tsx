function loadCallingModules(initialState?: any, options?: { microphoneGranted?: boolean }) {
  jest.resetModules();
  const React = require("react");
  const ReactTestRenderer = require("react-test-renderer");

  const mockDispatch = jest.fn();
  const mockState = initialState ?? {
    calling: {
      current: null,
      muted: false,
      speaker: false,
      durationSeconds: 0,
    },
  };
  const mockAppStateListeners: Array<(value: string) => void> = [];
  const mockSocketHandlers = new Map<string, Function>();
  const mockSocketCleanups = new Map<string, jest.Mock>();
  const mockEventRef: { current?: (event: any) => void } = {};

  const mockSocketCallService = {
    on: jest.fn((event: string, listener: Function) => {
      mockSocketHandlers.set(event, listener);
      const cleanup = jest.fn(() => {
        mockSocketHandlers.delete(event);
      });
      mockSocketCleanups.set(event, cleanup);
      return cleanup;
    }),
    connect: jest.fn(async () => undefined),
    emit: jest.fn(),
  };
  const mockWebRTCService = {
    setEventListener: jest.fn((listener?: (event: any) => void) => {
      mockEventRef.current = listener;
    }),
    applyAnswer: jest.fn(async () => undefined),
    addIceCandidate: jest.fn(async () => undefined),
    createOffer: jest.fn(async () => undefined),
    acceptOffer: jest.fn(async () => undefined),
    close: jest.fn(),
    setMuted: jest.fn(),
    setSpeakerEnabled: jest.fn(),
  };
  const mockCallService = {
    initiate: jest.fn(async () => ({ callId: "call-1", customerId: 91, customerName: "Naina" })),
    accept: jest.fn(async () => undefined),
    reject: jest.fn(async () => undefined),
    end: jest.fn(async () => undefined),
  };
  const mockTrackCallEvent = jest.fn(async () => undefined);
  const mockPermissionRequest = jest.fn(async () => options?.microphoneGranted ?? true);
  const mockRN = {
    AppState: {
      addEventListener: jest.fn((_event: string, listener: (value: string) => void) => {
        mockAppStateListeners.push(listener);
        return {
          remove: jest.fn(() => {
            const index = mockAppStateListeners.indexOf(listener);
            if (index >= 0) mockAppStateListeners.splice(index, 1);
          }),
        };
      }),
    },
    PermissionsAndroid: {
      PERMISSIONS: { RECORD_AUDIO: "RECORD_AUDIO" },
      RESULTS: { GRANTED: "granted", DENIED: "denied" },
      request: jest.fn(async () => "granted"),
    },
    Platform: { OS: "android" },
  };

  jest.doMock("../src/hooks/useRedux", () => ({
    __esModule: true,
    useAppDispatch: () => mockDispatch,
    useAppSelector: (selector: any) => selector(mockState),
  }));
  jest.doMock("react-native", () => ({ __esModule: true, ...mockRN }));
  jest.doMock("../src/modules/calling/services/SocketCallService", () => ({
    __esModule: true,
    socketCallService: mockSocketCallService,
  }));
  jest.doMock("../src/modules/calling/services/WebRTCService", () => ({
    __esModule: true,
    webRTCService: mockWebRTCService,
  }));
  jest.doMock("../src/modules/calling/services/CallService", () => ({
    __esModule: true,
    CallService: mockCallService,
  }));
  jest.doMock("../src/modules/calling/services/CallAnalyticsService", () => ({
    __esModule: true,
    trackCallEvent: mockTrackCallEvent,
  }));

  const audioHooks = require("../src/modules/calling/hooks/useAudioPermissions");
  jest.doMock("../src/modules/calling/hooks/useAudioPermissions", () => ({
    __esModule: true,
    ...audioHooks,
    useAudioPermissions: () => ({ request: mockPermissionRequest, denied: false }),
  }));

  return {
    React,
    ReactTestRenderer,
    mockDispatch,
    mockState,
    mockAppStateListeners,
    mockSocketHandlers,
    mockSocketCleanups,
    mockEventRef,
    mockSocketCallService,
    mockWebRTCService,
    mockCallService,
    mockTrackCallEvent,
    mockPermissionRequest,
    mockRN,
    callActions: require("../src/modules/calling/store/callSlice").callActions,
    useAudioPermissions: require("../src/modules/calling/hooks/useAudioPermissions").useAudioPermissions,
    useCallLifecycle: require("../src/modules/calling/hooks/useCallLifecycle").useCallLifecycle,
    useCallSocket: require("../src/modules/calling/hooks/useCallSocket").useCallSocket,
    useWebRTCCall: require("../src/modules/calling/hooks/useWebRTCCall").useWebRTCCall,
  };
}

function loadAudioPermissionsOnly(platform: "android" | "ios" = "android") {
  jest.resetModules();
  const React = require("react");
  const ReactTestRenderer = require("react-test-renderer");
  const mockRN = {
    PermissionsAndroid: {
      PERMISSIONS: { RECORD_AUDIO: "RECORD_AUDIO" },
      RESULTS: { GRANTED: "granted", DENIED: "denied" },
      request: jest.fn(async () => "granted"),
    },
    Platform: { OS: platform },
  };
  jest.doMock("react-native", () => ({ __esModule: true, ...mockRN }));
  return {
    React,
    ReactTestRenderer,
    mockRN,
    useAudioPermissions: require("../src/modules/calling/hooks/useAudioPermissions").useAudioPermissions,
  };
}

describe("calling hooks core", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    delete (globalThis as any).__lexhoPendingCallOffer;
  });

  it("handles audio permissions on android and ios", async () => {
    const loaded = loadAudioPermissionsOnly();
    const HookProbe = ({ hook, onValue }: { hook: () => any; onValue: (value: any) => void }) => {
      onValue(hook());
      return null;
    };
    let value: any;

    await loaded.ReactTestRenderer.act(async () => {
      loaded.ReactTestRenderer.create(
        loaded.React.createElement(HookProbe, {
          hook: loaded.useAudioPermissions,
          onValue: (next: any) => { value = next; },
        }),
      );
    });

    loaded.mockRN.PermissionsAndroid.request.mockResolvedValueOnce("granted");
    await loaded.ReactTestRenderer.act(async () => {
      await expect(value.request()).resolves.toBe(true);
    });
    expect(value.denied).toBe(false);

    loaded.mockRN.PermissionsAndroid.request.mockResolvedValueOnce("denied");
    await loaded.ReactTestRenderer.act(async () => {
      await expect(value.request()).resolves.toBe(false);
    });
    expect(value.denied).toBe(true);

    const iosLoaded = loadAudioPermissionsOnly("ios");
    const IosHookProbe = ({ hook, onValue }: { hook: () => any; onValue: (value: any) => void }) => {
      onValue(hook());
      return null;
    };
    iosLoaded.mockRN.Platform.OS = "ios";
    let iosValue: any;
    await iosLoaded.ReactTestRenderer.act(async () => {
      iosLoaded.ReactTestRenderer.create(
        iosLoaded.React.createElement(IosHookProbe, {
          hook: iosLoaded.useAudioPermissions,
          onValue: (next: any) => { iosValue = next; },
        }),
      );
    });
    await iosLoaded.ReactTestRenderer.act(async () => {
      await expect(iosValue.request()).resolves.toBe(true);
    });
  });

  it("ticks connected calls and re-dispatches reconnecting state on foreground", async () => {
    const loaded = loadCallingModules({
      calling: { current: { status: "connected" }, muted: false, speaker: false, durationSeconds: 0 },
    });
    const HookProbe = ({ hook, onValue }: { hook: () => any; onValue: (value: any) => void }) => {
      onValue(hook());
      return null;
    };

    let renderer: any;
    await loaded.ReactTestRenderer.act(async () => {
      renderer = loaded.ReactTestRenderer.create(
        loaded.React.createElement(HookProbe, { hook: loaded.useCallLifecycle, onValue: () => undefined }),
      );
    });
    loaded.ReactTestRenderer.act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(loaded.mockDispatch).toHaveBeenCalledWith(loaded.callActions.tick());

    loaded.mockState.calling.current = { status: "reconnecting" };
    await loaded.ReactTestRenderer.act(async () => {
      renderer.update(
        loaded.React.createElement(HookProbe, { hook: loaded.useCallLifecycle, onValue: () => undefined }),
      );
    });
    loaded.ReactTestRenderer.act(() => {
      loaded.mockAppStateListeners[0]?.("active");
    });
    expect(loaded.mockDispatch).toHaveBeenCalledWith(loaded.callActions.setStatus("reconnecting"));
  });

  it("wires socket events, incoming call state, and connection errors", async () => {
    const loaded = loadCallingModules();
    const HookProbe = ({ hook, onValue }: { hook: () => any; onValue: (value: any) => void }) => {
      onValue(hook());
      return null;
    };
    const onIncoming = jest.fn();

    let renderer: any;
    await loaded.ReactTestRenderer.act(async () => {
      renderer = loaded.ReactTestRenderer.create(
        loaded.React.createElement(HookProbe, {
          hook: () => loaded.useCallSocket(true, onIncoming),
          onValue: () => undefined,
        }),
      );
    });

    expect(loaded.mockSocketCallService.connect).toHaveBeenCalled();
    loaded.ReactTestRenderer.act(() => {
      loaded.mockSocketHandlers.get("call:incoming")?.({
        callId: "call-11",
        bookingId: 52,
        caller: { id: "c1", name: "Riya", role: "CUSTOMER" },
      });
      loaded.mockSocketHandlers.get("call:ringing")?.();
      loaded.mockSocketHandlers.get("call:accept")?.();
      loaded.mockSocketHandlers.get("call:answer")?.({ callId: "call-11", sdp: "ans" });
      loaded.mockSocketHandlers.get("call:offer")?.({ callId: "call-11", sdp: "offer" });
      loaded.mockSocketHandlers.get("call:ice-candidate")?.({ callId: "call-11", candidate: { candidate: "ice" } });
      loaded.mockSocketHandlers.get("call:reject")?.({ reason: "DECLINED" });
      loaded.mockSocketHandlers.get("call:busy")?.();
      loaded.mockSocketHandlers.get("call:timeout")?.({ callId: "call-11" });
      loaded.mockSocketHandlers.get("call:end")?.({ reason: "REMOTE_HANGUP" });
    });

    expect(onIncoming).toHaveBeenCalled();
    expect(loaded.mockWebRTCService.applyAnswer).toHaveBeenCalledWith("call-11", "ans");
    expect(loaded.mockWebRTCService.addIceCandidate).toHaveBeenCalledWith("call-11", { candidate: "ice" });
    expect((globalThis as any).__lexhoPendingCallOffer).toEqual({ callId: "call-11", sdp: "offer" });
    expect(loaded.mockTrackCallEvent).toHaveBeenCalledWith("call_missed", { call_id: "call-11" });
    expect(loaded.mockWebRTCService.close).toHaveBeenCalled();

    loaded.mockSocketCallService.connect.mockRejectedValueOnce(new Error("socket down"));
    await loaded.ReactTestRenderer.act(async () => {
      renderer.update(
        loaded.React.createElement(HookProbe, {
          hook: () => loaded.useCallSocket(true, onIncoming),
          onValue: () => undefined,
        }),
      );
    });
    const errorLoaded = loadCallingModules();
    const ErrorHookProbe = ({ hook, onValue }: { hook: () => any; onValue: (value: any) => void }) => {
      onValue(hook());
      return null;
    };
    errorLoaded.mockSocketCallService.connect.mockRejectedValueOnce(new Error("socket down"));
    await errorLoaded.ReactTestRenderer.act(async () => {
      errorLoaded.ReactTestRenderer.create(
        errorLoaded.React.createElement(ErrorHookProbe, {
          hook: () => errorLoaded.useCallSocket(true, onIncoming),
          onValue: () => undefined,
        }),
      );
    });
    expect(errorLoaded.mockDispatch).toHaveBeenCalledWith(errorLoaded.callActions.setError("socket down"));

    loaded.ReactTestRenderer.act(() => {
      renderer.unmount();
    });
    loaded.mockSocketCleanups.forEach((cleanup) => expect(cleanup).toHaveBeenCalled());
  });

  it("covers start, accept, reject, end, toggles, and WebRTC listener events", async () => {
    const loaded = loadCallingModules({
      calling: {
        current: {
          callId: "call-77",
          bookingId: 77,
          participant: { id: "c77", name: "Meera", role: "CUSTOMER" },
          status: "ringing",
          connectedAt: Date.now() - 4500,
        },
        muted: false,
        speaker: false,
        durationSeconds: 0,
      },
    });
    const HookProbe = ({ hook, onValue }: { hook: () => any; onValue: (value: any) => void }) => {
      onValue(hook());
      return null;
    };
    let value: any;
    (globalThis as any).__lexhoPendingCallOffer = { callId: "call-77", sdp: "offer-sdp" };

    await loaded.ReactTestRenderer.act(async () => {
      loaded.ReactTestRenderer.create(
        loaded.React.createElement(HookProbe, {
          hook: loaded.useWebRTCCall,
          onValue: (next: any) => { value = next; },
        }),
      );
    });

    loaded.ReactTestRenderer.act(() => {
      loaded.mockEventRef.current?.({ type: "connected" });
      loaded.mockEventRef.current?.({ type: "reconnecting" });
      loaded.mockEventRef.current?.({ type: "failed", error: new Error("ice failed") });
    });
    expect(loaded.mockDispatch).toHaveBeenCalledWith(loaded.callActions.setConnected());
    expect(loaded.mockDispatch).toHaveBeenCalledWith(loaded.callActions.setStatus("reconnecting"));
    expect(loaded.mockDispatch).toHaveBeenCalledWith(loaded.callActions.setError("ice failed"));

    loaded.mockCallService.initiate.mockResolvedValueOnce({ callId: "call-1", customerId: 91, customerName: "Naina" });
    loaded.mockState.calling.current = null;
    await loaded.ReactTestRenderer.act(async () => {
      await value.start(88, "Customer Name");
    });
    expect(loaded.mockSocketCallService.emit).toHaveBeenCalledWith("call:initiate", { bookingId: 88, recipientId: "91" });
    expect(loaded.mockWebRTCService.createOffer).toHaveBeenCalledWith("call-1");

    loaded.mockCallService.initiate.mockResolvedValueOnce({});
    await expect(value.start(1)).rejects.toThrow("Backend did not return a callId");

    loaded.mockState.calling.current = {
      callId: "call-77",
      bookingId: 77,
      participant: { id: "c77", name: "Meera", role: "CUSTOMER" },
      status: "ringing",
      connectedAt: Date.now() - 4500,
    };
    await loaded.ReactTestRenderer.act(async () => {
      await value.accept();
    });
    expect(loaded.mockCallService.accept).toHaveBeenCalledWith("call-77");
    expect(loaded.mockWebRTCService.acceptOffer).toHaveBeenCalledWith("call-77", "offer-sdp");

    delete (globalThis as any).__lexhoPendingCallOffer;
    await expect(value.accept()).rejects.toThrow("Call offer has not arrived yet");

    await loaded.ReactTestRenderer.act(async () => {
      await value.reject();
      await value.end();
    });
    expect(loaded.mockCallService.reject).toHaveBeenCalledWith("call-77");
    expect(loaded.mockCallService.end).toHaveBeenCalledWith("call-77");
    expect(loaded.mockTrackCallEvent).toHaveBeenCalledWith("call_rejected", { call_id: "call-77", booking_id: 77 });
    expect(loaded.mockTrackCallEvent).toHaveBeenCalledWith("call_ended", { call_id: "call-77", booking_id: 77 });

    loaded.ReactTestRenderer.act(() => {
      value.toggleMute();
      value.toggleSpeaker();
    });
    expect(loaded.mockWebRTCService.setMuted).toHaveBeenCalledWith(true);
    expect(loaded.mockWebRTCService.setSpeakerEnabled).toHaveBeenCalledWith(true);

    loaded.mockState.calling.current = null;
    await loaded.ReactTestRenderer.act(async () => {
      await value.reject();
      await value.end();
    });
  });

  it("swallows reject/end transport failures and still updates call teardown state", async () => {
    const loaded = loadCallingModules({
      calling: {
        current: {
          callId: "call-99",
          bookingId: 99,
          participant: { id: "c99", name: "Ira", role: "CUSTOMER" },
          status: "connected",
          connectedAt: Date.now() - 2000,
        },
        muted: true,
        speaker: true,
        durationSeconds: 0,
      },
    });
    const HookProbe = ({ hook, onValue }: { hook: () => any; onValue: (value: any) => void }) => {
      onValue(hook());
      return null;
    };
    let value: any;

    loaded.mockCallService.reject.mockRejectedValueOnce(new Error("reject failed"));
    loaded.mockCallService.end.mockRejectedValueOnce(new Error("end failed"));
    loaded.mockSocketCallService.emit
      .mockImplementationOnce(() => undefined)
      .mockImplementationOnce(() => { throw new Error("socket emit failed"); });

    await loaded.ReactTestRenderer.act(async () => {
      loaded.ReactTestRenderer.create(
        loaded.React.createElement(HookProbe, {
          hook: loaded.useWebRTCCall,
          onValue: (next: any) => { value = next; },
        }),
      );
    });

    await loaded.ReactTestRenderer.act(async () => {
      await value.reject();
      await value.end();
    });

    expect(loaded.mockDispatch).toHaveBeenCalledWith(loaded.callActions.endCall({ reason: "REJECTED" }));
    expect(loaded.mockDispatch).toHaveBeenCalledWith(loaded.callActions.endCall({ reason: "HANGUP" }));
    expect(loaded.mockWebRTCService.close).toHaveBeenCalled();
  });

});
