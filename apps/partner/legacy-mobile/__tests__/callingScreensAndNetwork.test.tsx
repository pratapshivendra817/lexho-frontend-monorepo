describe("calling screens and network hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function loadNetworkStatusModules(options?: {
    hasNativeNetInfo?: boolean;
    addEventListenerImpl?: (listener: (state: any) => void) => void;
    throwOnRequire?: boolean;
  }) {
    jest.resetModules();
    const React = require("react");
    const ReactTestRenderer = require("react-test-renderer");

    const listeners: Array<(state: any) => void> = [];
    const unsubscribe = jest.fn();
    const addEventListener = jest.fn((listener: (state: any) => void) => {
      listeners.push(listener);
      options?.addEventListenerImpl?.(listener);
      return unsubscribe;
    });

    jest.doMock("react-native", () => ({
      __esModule: true,
      NativeModules: options?.hasNativeNetInfo === false ? {} : { RNCNetInfo: {} },
    }));
    if (options?.throwOnRequire) {
      jest.doMock("@react-native-community/netinfo", () => {
        throw new Error("not installed");
      });
    } else {
      jest.doMock("@react-native-community/netinfo", () => ({
        __esModule: true,
        addEventListener,
      }));
    }

    return {
      React,
      ReactTestRenderer,
      listeners,
      unsubscribe,
      useNetworkStatus: require("../src/hooks/useNetworkStatus").useNetworkStatus,
    };
  }

  function loadCallingScreensModules(state?: any, callHook?: any) {
    jest.resetModules();
    const React = require("react");
    const ReactTestRenderer = require("react-test-renderer");

    const navigation = {
      goBack: jest.fn(),
      replace: jest.fn(),
    };
    const mockState = state ?? {
      calling: {
        current: {
          participant: { name: "Riya" },
          status: "ringing",
        },
        durationSeconds: 125,
      },
    };
    const hookValue = callHook ?? {
      call: mockState.calling.current,
      muted: false,
      speaker: false,
      accept: jest.fn(async () => undefined),
      reject: jest.fn(async () => undefined),
      start: jest.fn(async () => undefined),
      end: jest.fn(async () => undefined),
      toggleMute: jest.fn(),
      toggleSpeaker: jest.fn(),
    };
    const lifecycle = jest.fn();

    jest.doMock("../src/hooks/useRedux", () => ({
      __esModule: true,
      useAppSelector: (selector: any) => selector(mockState),
    }));
    jest.doMock("react-native", () => {
      const make = (name: string) => ({ children, ...props }: any) => React.createElement(name, props, children);
      return {
        __esModule: true,
        Pressable: make("Pressable"),
        SafeAreaView: make("SafeAreaView"),
        Text: make("Text"),
        View: make("View"),
        StyleSheet: { create: (styles: any) => styles },
      };
    });
    jest.doMock("../src/modules/calling/hooks/useWebRTCCall", () => ({
      __esModule: true,
      useWebRTCCall: () => hookValue,
    }));
    jest.doMock("../src/modules/calling/hooks/useCallLifecycle", () => ({
      __esModule: true,
      useCallLifecycle: lifecycle,
    }));

    return {
      React,
      ReactTestRenderer,
      navigation,
      hookValue,
      lifecycle,
      IncomingCallScreen: require("../src/modules/calling/screens/CallScreens").IncomingCallScreen,
      OutgoingCallScreen: require("../src/modules/calling/screens/CallScreens").OutgoingCallScreen,
      ActiveCallScreen: require("../src/modules/calling/screens/CallScreens").ActiveCallScreen,
      MissedCallScreen: require("../src/modules/calling/screens/CallScreens").MissedCallScreen,
    };
  }

  it("covers online, offline, native-missing, and require-failure states for useNetworkStatus", async () => {
    const loaded = loadNetworkStatusModules();
    const HookProbe = ({ hook, onValue }: { hook: () => any; onValue: (value: any) => void }) => {
      onValue(hook());
      return null;
    };

    const seen: boolean[] = [];
    let renderer: any;
    await loaded.ReactTestRenderer.act(async () => {
      renderer = loaded.ReactTestRenderer.create(
        loaded.React.createElement(HookProbe, {
          hook: loaded.useNetworkStatus,
          onValue: (value: boolean) => { seen.push(value); },
        }),
      );
    });

    await loaded.ReactTestRenderer.act(async () => {
      loaded.listeners[0]?.({ isConnected: true, isInternetReachable: true });
    });
    await loaded.ReactTestRenderer.act(async () => {
      loaded.listeners[0]?.({ isConnected: true, isInternetReachable: false });
    });
    await loaded.ReactTestRenderer.act(async () => {
      loaded.listeners[0]?.({ isConnected: false, isInternetReachable: true });
    });
    await loaded.ReactTestRenderer.act(async () => {
      loaded.listeners[0]?.({ isConnected: true });
    });

    expect(seen).toContain(true);
    expect(seen).toContain(false);
    loaded.ReactTestRenderer.act(() => {
      renderer.unmount();
    });
    expect(loaded.unsubscribe).toHaveBeenCalled();

    const missingNative = loadNetworkStatusModules({ hasNativeNetInfo: false });
    let missingValue = false;
    await missingNative.ReactTestRenderer.act(async () => {
      missingNative.ReactTestRenderer.create(
        missingNative.React.createElement(HookProbe, {
          hook: missingNative.useNetworkStatus,
          onValue: (value: boolean) => { missingValue = value; },
        }),
      );
    });
    expect(missingValue).toBe(true);

    const requireFailure = loadNetworkStatusModules({ throwOnRequire: true });
    let failureValue = false;
    await requireFailure.ReactTestRenderer.act(async () => {
      requireFailure.ReactTestRenderer.create(
        requireFailure.React.createElement(HookProbe, {
          hook: requireFailure.useNetworkStatus,
          onValue: (value: boolean) => { failureValue = value; },
        }),
      );
    });
    expect(failureValue).toBe(true);
  });

  it("renders incoming, outgoing, active, and missed call screens with real interactions", async () => {
    const incomingLoaded = loadCallingScreensModules();
    let incomingTree: any;
    await incomingLoaded.ReactTestRenderer.act(async () => {
      incomingTree = incomingLoaded.ReactTestRenderer.create(
        incomingLoaded.React.createElement(incomingLoaded.IncomingCallScreen, {
          navigation: incomingLoaded.navigation,
        }),
      );
    });

    const incomingText = incomingTree.root.findAllByType("Text").map((node: any) => String(node.props.children)).join(" ");
    expect(incomingText).toContain("Incoming audio call");
    expect(incomingText).toContain("Decline");
    expect(incomingText).toContain("Accept");

    const findPressableByLabel = (tree: any, label: string) =>
      tree.root.findAll(
        (node: any) =>
          typeof node.props?.onPress === "function" &&
          node.findAll?.((child: any) => child.type === "Text" && child.props.children === label).length > 0,
      )[0];
    const declineButton = findPressableByLabel(incomingTree, "Decline");
    const acceptButton = findPressableByLabel(incomingTree, "Accept");
    await incomingLoaded.ReactTestRenderer.act(async () => {
      await declineButton.props.onPress();
      await acceptButton.props.onPress();
    });
    expect(incomingLoaded.hookValue.reject).toHaveBeenCalled();
    expect(incomingLoaded.navigation.goBack).toHaveBeenCalled();
    expect(incomingLoaded.hookValue.accept).toHaveBeenCalled();
    expect(incomingLoaded.navigation.replace).toHaveBeenCalledWith("ActiveCall");

    const emptyIncomingLoaded = loadCallingScreensModules({
      calling: { current: null, durationSeconds: 0 },
    }, {
      call: null,
      muted: false,
      speaker: false,
      accept: jest.fn(async () => undefined),
      reject: jest.fn(async () => undefined),
      start: jest.fn(async () => undefined),
      end: jest.fn(async () => undefined),
      toggleMute: jest.fn(),
      toggleSpeaker: jest.fn(),
    });
    let emptyIncomingTree: any;
    await emptyIncomingLoaded.ReactTestRenderer.act(async () => {
      emptyIncomingTree = emptyIncomingLoaded.ReactTestRenderer.create(
        emptyIncomingLoaded.React.createElement(emptyIncomingLoaded.IncomingCallScreen, {
          navigation: emptyIncomingLoaded.navigation,
        }),
      );
    });
    expect(
      emptyIncomingTree.root.findAllByType("Text").map((node: any) => String(node.props.children)).join(" "),
    ).toContain("Unknown caller");

    const outgoingHook = {
      call: null,
      muted: false,
      speaker: false,
      accept: jest.fn(async () => undefined),
      reject: jest.fn(async () => undefined),
      start: jest.fn(async () => undefined),
      end: jest.fn(async () => undefined),
      toggleMute: jest.fn(),
      toggleSpeaker: jest.fn(),
    };
    const outgoingLoaded = loadCallingScreensModules({
      calling: { current: null, durationSeconds: 0 },
    }, outgoingHook);
    let outgoingTree: any;
    await outgoingLoaded.ReactTestRenderer.act(async () => {
      outgoingTree = outgoingLoaded.ReactTestRenderer.create(
        outgoingLoaded.React.createElement(outgoingLoaded.OutgoingCallScreen, {
          route: { params: { orderId: 81, customerName: "Kiran" } },
          navigation: outgoingLoaded.navigation,
        }),
      );
    });
    expect(outgoingHook.start).toHaveBeenCalledWith(81, "Kiran");
    expect(
      outgoingTree.root.findAllByType("Text").map((node: any) => String(node.props.children)).join(" "),
    ).toContain("Calling...");
    const cancelButton = outgoingTree.root.findAll((node: any) => typeof node.props?.onPress === "function")[0];
    await outgoingLoaded.ReactTestRenderer.act(async () => {
      await cancelButton.props.onPress();
    });
    expect(outgoingHook.end).toHaveBeenCalled();
    expect(outgoingLoaded.navigation.goBack).toHaveBeenCalled();

    const failedStartHook = {
      ...outgoingHook,
      start: jest.fn(async () => {
        throw new Error("call start failed");
      }),
      end: jest.fn(async () => undefined),
    };
    const failedOutgoingLoaded = loadCallingScreensModules({
      calling: { current: null, durationSeconds: 0 },
    }, failedStartHook);
    await failedOutgoingLoaded.ReactTestRenderer.act(async () => {
      failedOutgoingLoaded.ReactTestRenderer.create(
        failedOutgoingLoaded.React.createElement(failedOutgoingLoaded.OutgoingCallScreen, {
          route: { params: { bookingId: 82, customerName: "Asha" } },
          navigation: failedOutgoingLoaded.navigation,
        }),
      );
    });
    expect(failedOutgoingLoaded.navigation.replace).toHaveBeenCalledWith("MissedCall");

    const connectedOutgoingLoaded = loadCallingScreensModules({
      calling: {
        current: {
          participant: { name: "Naina" },
          status: "connected",
        },
        durationSeconds: 0,
      },
    }, {
      ...outgoingHook,
      call: {
        participant: { name: "Naina" },
        status: "connected",
      },
    });
    await connectedOutgoingLoaded.ReactTestRenderer.act(async () => {
      connectedOutgoingLoaded.ReactTestRenderer.create(
        connectedOutgoingLoaded.React.createElement(connectedOutgoingLoaded.OutgoingCallScreen, {
          route: { params: { orderId: 83, customerName: "Naina" } },
          navigation: connectedOutgoingLoaded.navigation,
        }),
      );
    });
    expect(connectedOutgoingLoaded.navigation.replace).toHaveBeenCalledWith("ActiveCall");

    const activeHook = {
      call: {
        participant: { name: "Meera" },
        status: "reconnecting",
      },
      muted: true,
      speaker: true,
      accept: jest.fn(async () => undefined),
      reject: jest.fn(async () => undefined),
      start: jest.fn(async () => undefined),
      end: jest.fn(async () => undefined),
      toggleMute: jest.fn(),
      toggleSpeaker: jest.fn(),
    };
    const activeLoaded = loadCallingScreensModules({
      calling: {
        current: activeHook.call,
        durationSeconds: 125,
      },
    }, activeHook);
    let activeTree: any;
    await activeLoaded.ReactTestRenderer.act(async () => {
      activeTree = activeLoaded.ReactTestRenderer.create(
        activeLoaded.React.createElement(activeLoaded.ActiveCallScreen, {
          navigation: activeLoaded.navigation,
        }),
      );
    });
    const activeText = activeTree.root.findAllByType("Text").map((node: any) => String(node.props.children)).join(" ");
    expect(activeLoaded.lifecycle).toHaveBeenCalled();
    expect(activeText).toContain("Reconnecting...");
    expect(activeText.replaceAll(",", "")).toContain("2:05");

    const muteButton = findPressableByLabel(activeTree, "Unmute");
    const speakerButton = findPressableByLabel(activeTree, "Earpiece");
    const endButton = findPressableByLabel(activeTree, "End");
    await activeLoaded.ReactTestRenderer.act(async () => {
      muteButton.props.onPress();
      speakerButton.props.onPress();
      await endButton.props.onPress();
    });
    expect(activeHook.toggleMute).toHaveBeenCalled();
    expect(activeHook.toggleSpeaker).toHaveBeenCalled();
    expect(activeHook.end).toHaveBeenCalled();
    expect(activeLoaded.navigation.goBack).toHaveBeenCalled();

    const endedActiveLoaded = loadCallingScreensModules({
      calling: {
        current: {
          participant: { name: "Meera" },
          status: "busy",
        },
        durationSeconds: 0,
      },
    }, {
      ...activeHook,
      call: {
        participant: { name: "Meera" },
        status: "busy",
      },
    });
    await endedActiveLoaded.ReactTestRenderer.act(async () => {
      endedActiveLoaded.ReactTestRenderer.create(
        endedActiveLoaded.React.createElement(endedActiveLoaded.ActiveCallScreen, {
          navigation: endedActiveLoaded.navigation,
        }),
      );
    });
    expect(endedActiveLoaded.navigation.replace).toHaveBeenCalledWith("MissedCall");

    const missedLoaded = loadCallingScreensModules({
      calling: {
        current: {
          participant: { name: "Sanya" },
          status: "busy",
        },
        durationSeconds: 0,
      },
    }, {
      call: {
        participant: { name: "Sanya" },
        status: "busy",
      },
      muted: false,
      speaker: false,
      accept: jest.fn(async () => undefined),
      reject: jest.fn(async () => undefined),
      start: jest.fn(async () => undefined),
      end: jest.fn(async () => undefined),
      toggleMute: jest.fn(),
      toggleSpeaker: jest.fn(),
    });
    let missedTree: any;
    await missedLoaded.ReactTestRenderer.act(async () => {
      missedTree = missedLoaded.ReactTestRenderer.create(
        missedLoaded.React.createElement(missedLoaded.MissedCallScreen, {
          navigation: missedLoaded.navigation,
        }),
      );
    });
    expect(
      missedTree.root.findAllByType("Text").map((node: any) => String(node.props.children)).join(" "),
    ).toContain("User is busy");
    const closeButton = missedTree.root.findAll((node: any) => typeof node.props?.onPress === "function")[0];
    closeButton.props.onPress();
    expect(missedLoaded.navigation.goBack).toHaveBeenCalled();

    const failedMissedLoaded = loadCallingScreensModules({
      calling: {
        current: {
          participant: { name: "Sanya" },
          status: "failed",
        },
        durationSeconds: 0,
      },
    }, {
      ...activeHook,
      call: {
        participant: { name: "Sanya" },
        status: "failed",
      },
    });
    let failedMissedTree: any;
    await failedMissedLoaded.ReactTestRenderer.act(async () => {
      failedMissedTree = failedMissedLoaded.ReactTestRenderer.create(
        failedMissedLoaded.React.createElement(failedMissedLoaded.MissedCallScreen, {
          navigation: failedMissedLoaded.navigation,
        }),
      );
    });
    expect(
      failedMissedTree.root.findAllByType("Text").map((node: any) => String(node.props.children)).join(" "),
    ).toContain("Connection failed");
  });
});
