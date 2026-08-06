function loadSocketCallService() {
  jest.resetModules();
  const mockSocket = {
    connected: false,
    disconnect: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    once: jest.fn(),
    emit: jest.fn(),
  };
  const io = jest.fn(() => mockSocket);
  const getToken = jest.fn(async () => "jwt-token");

  jest.doMock("socket.io-client", () => ({
    __esModule: true,
    io,
  }));
  jest.doMock("../src/services/api", () => ({
    __esModule: true,
    API_BASE_URL: "https://api.example.com",
  }));
  jest.doMock("../src/utils/storage", () => ({
    __esModule: true,
    getToken,
  }));

  return {
    io,
    getToken,
    mockSocket,
    socketCallService: require("../src/modules/calling/services/SocketCallService").socketCallService,
  };
}

function loadWebRTCService() {
  jest.resetModules();
  const eventHandlers = new Map<string, Function>();
  const addTrack = jest.fn();
  const restartIce = jest.fn();
  const close = jest.fn();
  const createOffer = jest.fn(async (options?: any) => ({
    type: "offer",
    sdp: options?.iceRestart ? "restart-offer" : "offer-sdp",
  }));
  const createAnswer = jest.fn(async () => ({ type: "answer", sdp: "answer-sdp" }));
  const setLocalDescription = jest.fn(async () => undefined);
  const setRemoteDescription = jest.fn(async () => undefined);
  const addIceCandidate = jest.fn(async () => undefined);
  const trackStop = jest.fn();
  const audioTrack = { enabled: true };
  const stream = {
    getTracks: jest.fn(() => [{ stop: trackStop }]),
    getAudioTracks: jest.fn(() => [audioTrack]),
  };
  const peer = {
    addTrack,
    addEventListener: jest.fn((event: string, listener: Function) => {
      eventHandlers.set(event, listener);
    }),
    createOffer,
    createAnswer,
    setLocalDescription,
    setRemoteDescription,
    addIceCandidate,
    restartIce,
    close,
    connectionState: "new",
    iceConnectionState: "new",
    remoteDescription: null,
  };
  const RTCPeerConnection = jest.fn(() => peer);
  const RTCIceCandidate = jest.fn((value) => value);
  const RTCSessionDescription = jest.fn((value) => value);
  const getUserMedia = jest.fn(async () => stream);
  const emit = jest.fn();
  const InCallManager = {
    start: jest.fn(),
    stop: jest.fn(),
    setKeepScreenOn: jest.fn(),
    setMicrophoneMute: jest.fn(),
    setForceSpeakerphoneOn: jest.fn(),
  };

  jest.doMock("react-native-incall-manager", () => ({
    __esModule: true,
    default: InCallManager,
  }));
  jest.doMock("react-native-webrtc", () => ({
    __esModule: true,
    mediaDevices: { getUserMedia },
    RTCPeerConnection,
    RTCIceCandidate,
    RTCSessionDescription,
  }));
  jest.doMock("../src/modules/calling/services/SocketCallService", () => ({
    __esModule: true,
    socketCallService: { emit },
  }));

  return {
    eventHandlers,
    peer,
    stream,
    audioTrack,
    RTCPeerConnection,
    RTCIceCandidate,
    RTCSessionDescription,
    getUserMedia,
    emit,
    InCallManager,
    webRTCService: require("../src/modules/calling/services/WebRTCService").webRTCService,
  };
}

describe("calling services and slices core", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-21T10:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("covers socket connection, timeout, emit, listeners, and disconnect flows", async () => {
    const loaded = loadSocketCallService();
    const payloadListener = jest.fn();
    const cleanup = loaded.socketCallService.on("call:incoming", payloadListener);

    const connectPromise = loaded.socketCallService.connect();
    await Promise.resolve();
    await Promise.resolve();
    expect(loaded.io).toHaveBeenCalledWith("https://api.example.com", expect.objectContaining({
      transports: ["websocket"],
      auth: { token: "jwt-token", role: "PARTNER" },
      timeout: 15000,
    }));
    const onConnect = loaded.mockSocket.once.mock.calls.find((call: any[]) => call[0] === "connect")?.[1];
    expect(onConnect).toEqual(expect.any(Function));
    onConnect();
    await expect(connectPromise).resolves.toBeUndefined();
    expect(loaded.mockSocket.on).toHaveBeenCalledWith("call:incoming", payloadListener);

    loaded.mockSocket.connected = true;
    await expect(loaded.socketCallService.connect()).resolves.toBeUndefined();

    loaded.mockSocket.connected = true;
    loaded.socketCallService.emit("call:answer", { callId: "c1", sdp: "ok" } as any);
    expect(loaded.mockSocket.emit).toHaveBeenCalledWith("call:answer", { callId: "c1", sdp: "ok" });

    cleanup();
    expect(loaded.mockSocket.off).toHaveBeenCalledWith("call:incoming", payloadListener);

    loaded.mockSocket.connected = false;
    expect(() => loaded.socketCallService.emit("call:end", { callId: "c1", reason: "HANGUP" } as any)).toThrow(
      "Call socket is disconnected",
    );

    loaded.socketCallService.disconnect();
    expect(loaded.mockSocket.disconnect).toHaveBeenCalled();

    const noTokenLoaded = loadSocketCallService();
    noTokenLoaded.getToken.mockResolvedValue(null);
    await expect(noTokenLoaded.socketCallService.connect()).rejects.toThrow(
      "Authentication token is required for calling",
    );

    const timeoutLoaded = loadSocketCallService();
    const timeoutPromise = timeoutLoaded.socketCallService.connect();
    await Promise.resolve();
    await Promise.resolve();
    const timeoutExpectation = expect(timeoutPromise).rejects.toThrow("Call socket connection timed out");
    await jest.advanceTimersByTimeAsync(15000);
    await timeoutExpectation;

    const errorLoaded = loadSocketCallService();
    const errorPromise = errorLoaded.socketCallService.connect();
    await Promise.resolve();
    await Promise.resolve();
    const onConnectError = errorLoaded.mockSocket.once.mock.calls.find((call: any[]) => call[0] === "connect_error")?.[1];
    expect(onConnectError).toEqual(expect.any(Function));
    onConnectError(new Error("socket handshake failed"));
    await expect(errorPromise).rejects.toThrow("socket handshake failed");
  });

  it("covers WebRTC offer, answer, candidates, reconnect, mute, speaker, and close flows", async () => {
    const loaded = loadWebRTCService();
    const listener = jest.fn();
    loaded.webRTCService.setEventListener(listener);

    await loaded.webRTCService.createOffer("call-1");
    expect(loaded.InCallManager.start).toHaveBeenCalledWith({ media: "audio" });
    expect(loaded.getUserMedia).toHaveBeenCalledWith({ audio: true, video: false });
    expect(loaded.peer.addTrack).toHaveBeenCalled();
    expect(loaded.emit).toHaveBeenCalledWith("call:offer", { callId: "call-1", sdp: "offer-sdp" });

    loaded.eventHandlers.get("icecandidate")?.({
      candidate: { toJSON: () => ({ candidate: "ice-1" }) },
    });
    expect(loaded.emit).toHaveBeenCalledWith("call:ice-candidate", {
      callId: "call-1",
      candidate: { candidate: "ice-1" },
    });

    await loaded.webRTCService.addIceCandidate("call-1", { candidate: "queued" });
    expect(loaded.RTCIceCandidate).not.toHaveBeenCalled();

    loaded.peer.remoteDescription = { type: "offer" };
    await loaded.webRTCService.applyAnswer("call-1", "answer-sdp");
    expect(loaded.RTCSessionDescription).toHaveBeenCalledWith({ type: "answer", sdp: "answer-sdp" });
    expect(loaded.RTCIceCandidate).toHaveBeenCalledWith({ candidate: "queued" });

    await loaded.webRTCService.acceptOffer("call-2", "offer-2");
    expect(loaded.emit).toHaveBeenCalledWith("call:answer", { callId: "call-2", sdp: "answer-sdp" });

    loaded.peer.connectionState = "connected";
    loaded.eventHandlers.get("connectionstatechange")?.();
    expect(listener).toHaveBeenCalledWith({ type: "connected" });

    loaded.peer.connectionState = "disconnected";
    loaded.eventHandlers.get("connectionstatechange")?.();
    expect(listener).toHaveBeenCalledWith({ type: "reconnecting" });

    loaded.peer.connectionState = "failed";
    loaded.eventHandlers.get("connectionstatechange")?.();
    await Promise.resolve();
    expect(loaded.peer.restartIce).toHaveBeenCalled();

    loaded.peer.iceConnectionState = "disconnected";
    loaded.eventHandlers.get("iceconnectionstatechange")?.();
    expect(listener).toHaveBeenCalledWith({ type: "reconnecting" });

    loaded.peer.iceConnectionState = "failed";
    loaded.eventHandlers.get("iceconnectionstatechange")?.();
    await Promise.resolve();

    loaded.webRTCService.setMuted(true);
    expect(loaded.audioTrack.enabled).toBe(false);
    expect(loaded.InCallManager.setMicrophoneMute).toHaveBeenCalledWith(true);

    loaded.webRTCService.setSpeakerEnabled(true);
    expect(loaded.InCallManager.setForceSpeakerphoneOn).toHaveBeenCalledWith(true);

    loaded.webRTCService.close();
    expect(loaded.InCallManager.stop).toHaveBeenCalled();
    expect(loaded.peer.close).toHaveBeenCalled();
    expect(loaded.stream.getTracks).toHaveBeenCalled();
  });

  it("covers call slice reducers and async thunks", async () => {
    jest.resetModules();
    const createPartnerCall = jest.fn(async (orderId: number) => ({ callId: "call-10", orderId, customerName: "Naina", customerId: 22 }));
    const acceptPartnerCall = jest.fn(async () => undefined);
    const rejectPartnerCall = jest.fn(async () => undefined);
    const endPartnerCall = jest.fn(async () => undefined);
    const markPartnerCallMissed = jest.fn(async () => undefined);
    const connect = jest.fn(async () => undefined);
    const send = jest.fn();
    const startOutgoing = jest.fn(async () => undefined);
    const acceptIncoming = jest.fn(async () => undefined);
    const end = jest.fn();
    const setMuted = jest.fn();
    const setSpeaker = jest.fn();
    const InCallManager = { startRingtone: jest.fn(), stopRingtone: jest.fn() };

    jest.doMock("../src/services/callApi", () => ({
      __esModule: true,
      createPartnerCall,
      acceptPartnerCall,
      rejectPartnerCall,
      endPartnerCall,
      markPartnerCallMissed,
    }));
    jest.doMock("../src/services/callSignaling", () => ({
      __esModule: true,
      callSignaling: { connect, send },
    }));
    jest.doMock("../src/services/webrtcCallService", () => ({
      __esModule: true,
      webrtcCallService: { startOutgoing, acceptIncoming, end, setMuted, setSpeaker },
    }));
    jest.doMock("react-native-incall-manager", () => ({
      __esModule: true,
      default: InCallManager,
    }));

    const { configureStore } = require("@reduxjs/toolkit");
    const callModule = require("../src/redux/slices/callSlice");
    const store = configureStore({ reducer: { calls: callModule.default } });

    store.dispatch(callModule.receiveIncomingCall({
      callId: "incoming-1",
      orderId: 11,
      customerName: "Riya",
      customerId: 2,
      expiresAt: "2026-06-21T10:05:00.000Z",
    }));
    store.dispatch(callModule.receiveCallSignal({
      type: "OFFER",
      callId: "incoming-1",
      orderId: 11,
      sdp: "offer-sdp",
      customerName: "Riya",
      customerId: 2,
    }));
    store.dispatch(callModule.receiveCallSignal({ type: "ANSWER", callId: "incoming-1" }));
    store.dispatch(callModule.receiveCallSignal({ type: "REJECTED", callId: "incoming-1", reason: "DECLINED" }));
    store.dispatch(callModule.recordMissedCall({
      callId: "missed-1",
      orderId: 15,
      customerName: "Asha",
      customerId: 3,
    }));
    store.dispatch(callModule.setMuted(true));
    store.dispatch(callModule.setSpeaker(true));

    await store.dispatch(callModule.startOutgoingCall(91));
    expect(createPartnerCall).toHaveBeenCalledWith(91);
    expect(connect).toHaveBeenCalled();
    expect(startOutgoing).toHaveBeenCalledWith("call-10", 91);

    await store.dispatch(callModule.presentIncomingCall({
      callId: "incoming-2",
      orderId: 12,
      customerName: "Meera",
      customerId: 5,
    }));
    expect(InCallManager.startRingtone).toHaveBeenCalled();

    store.dispatch(callModule.receiveCallSignal({
      type: "OFFER",
      callId: "incoming-2",
      orderId: 12,
      sdp: "offer-2",
      customerName: "Meera",
      customerId: 5,
    }));
    await store.dispatch(callModule.acceptIncomingCall());
    expect(acceptPartnerCall).toHaveBeenCalledWith("incoming-2");
    expect(acceptIncoming).toHaveBeenCalledWith("incoming-2", "offer-2");
    expect(InCallManager.stopRingtone).toHaveBeenCalled();

    await store.dispatch(callModule.rejectIncomingCall("BUSY"));
    expect(rejectPartnerCall).toHaveBeenCalledWith("incoming-2", "BUSY");
    expect(end).toHaveBeenCalled();

    store.dispatch(callModule.receiveIncomingCall({
      callId: "incoming-3",
      orderId: 13,
      customerName: "Tina",
      customerId: 7,
    }));
    await store.dispatch(callModule.hangUpCall("HANGUP"));
    expect(endPartnerCall).toHaveBeenCalledWith("incoming-3", "HANGUP");
    expect(send).toHaveBeenCalledWith({ type: "ENDED", callId: "incoming-3", reason: "HANGUP" });

    store.dispatch(callModule.receiveIncomingCall({
      callId: "incoming-4",
      orderId: 14,
      customerName: "Sara",
      customerId: 8,
    }));
    await store.dispatch(callModule.timeoutIncomingCall());
    expect(markPartnerCallMissed).toHaveBeenCalledWith("incoming-4");

    await store.dispatch(callModule.setCallMuted(true));
    await store.dispatch(callModule.setCallSpeaker(true));
    expect(setMuted).toHaveBeenCalledWith(true);
    expect(setSpeaker).toHaveBeenCalledWith(true);

    store.dispatch(callModule.clearCurrentCall());
    store.dispatch(callModule.clearCallState());
    expect(store.getState().calls.current).toBeNull();

    const failingStore = configureStore({ reducer: { calls: callModule.default } });
    const failedAccept = await failingStore.dispatch(callModule.acceptIncomingCall());
    expect(failedAccept.type).toBe("call/acceptIncoming/rejected");
  });

  it("covers chat slice reducers, selectors, and thunks", async () => {
    jest.resetModules();
    const getChatThreads = jest.fn(async (page: number) => ({
      page,
      hasMore: false,
      items: [
        {
          orderId: 51,
          customerName: "Riya",
          unreadCount: 2,
          updatedAt: "2026-06-21T10:00:00.000Z",
          lastMessage: {
            id: "msg-1",
            orderId: 51,
            senderType: "CUSTOMER",
            text: "Hello",
            createdAt: "2026-06-21T10:00:00.000Z",
          },
        },
      ],
    }));
    const getOrderMessages = jest.fn(async (_orderId: number, page: number) => ({
      page,
      hasMore: false,
      items: [
        { id: "m1", orderId: 51, senderType: "CUSTOMER", text: "First", createdAt: "2026-06-21T10:00:00.000Z" },
        { id: "m2", orderId: 51, senderType: "PARTNER", text: "Reply", createdAt: "2026-06-21T10:01:00.000Z" },
      ],
    }));
    const sendOrderMessage = jest.fn(async (orderId: number, text: string, clientId: string) => ({
      id: "server-1",
      clientId,
      orderId,
      senderType: "PARTNER",
      text,
      createdAt: "2026-06-21T10:02:00.000Z",
      status: "sent",
    }));
    const markOrderMessagesRead = jest.fn(async () => undefined);

    jest.doMock("../src/services/chatApi", () => ({
      __esModule: true,
      getChatThreads,
      getOrderMessages,
      sendOrderMessage,
      markOrderMessagesRead,
    }));

    const { configureStore } = require("@reduxjs/toolkit");
    const chatModule = require("../src/redux/slices/chatSlice");
    const store = configureStore({ reducer: { chat: chatModule.default } });

    store.dispatch(chatModule.setChatConnected(true));
    store.dispatch(chatModule.setCustomerTyping({ orderId: 51, typing: true }));
    store.dispatch(chatModule.addOptimisticMessage({
      id: "client-1",
      clientId: "client-1",
      orderId: 51,
      senderType: "PARTNER",
      text: "Ping",
      createdAt: "2026-06-21T10:00:30.000Z",
      status: "sending",
    }));
    store.dispatch(chatModule.markMessageFailed({ orderId: 51, clientId: "client-1" }));
    store.dispatch(chatModule.receiveMessage({
      id: "customer-1",
      orderId: 77,
      senderType: "CUSTOMER",
      text: "Need help",
      createdAt: "2026-06-21T10:03:00.000Z",
    }));
    store.dispatch(chatModule.applyReceipt({
      orderId: 51,
      messageIds: ["client-1"],
      status: "read",
      readAt: "2026-06-21T10:04:00.000Z",
    }));
    store.dispatch(chatModule.clearThreadUnread(77));

    await store.dispatch(chatModule.fetchChatThreads(0));
    await store.dispatch(chatModule.fetchMessages({ orderId: 51, page: 0 }));
    await store.dispatch(chatModule.sendChatMessage({ orderId: 51, text: "Confirmed" }));
    await store.dispatch(chatModule.readOrderMessages({ orderId: 51, messageIds: ["m1"] }));

    const state = store.getState().chat;
    expect(chatModule.selectTotalChatUnread({ chat: state })).toBeGreaterThanOrEqual(0);
    expect(markOrderMessagesRead).toHaveBeenCalledWith(51, ["m1"]);
    expect(sendOrderMessage).toHaveBeenCalled();

    sendOrderMessage.mockRejectedValueOnce(new Error("send failed"));
    const failedSend = await store.dispatch(chatModule.sendChatMessage({ orderId: 51, text: "Retry", clientId: "client-2" }));
    expect(failedSend.type).toBe("chat/sendMessage/rejected");

    getChatThreads.mockRejectedValueOnce(new Error("threads down"));
    const failedThreads = await store.dispatch(chatModule.fetchChatThreads(1));
    expect(failedThreads.type).toBe("chat/fetchThreads/rejected");

    getOrderMessages.mockRejectedValueOnce(new Error("messages down"));
    const failedMessages = await store.dispatch(chatModule.fetchMessages({ orderId: 51, page: 1 }));
    expect(failedMessages.type).toBe("chat/fetchMessages/rejected");

    store.dispatch(chatModule.clearChatState());
    expect(store.getState().chat.threads).toEqual([]);
  });
});
