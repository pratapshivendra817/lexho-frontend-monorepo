const { jest: jestGlobals } = require("@jest/globals");

jestGlobals.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jestGlobals.mock("react-native-vector-icons/MaterialCommunityIcons", () => "MaterialCommunityIcon");
jestGlobals.mock("react-native-geolocation-service", () => ({
  requestAuthorization: jestGlobals.fn(async () => "granted"),
  getCurrentPosition: jestGlobals.fn(),
  watchPosition: jestGlobals.fn(() => 1),
  clearWatch: jestGlobals.fn(),
}));
jestGlobals.mock("react-native-image-picker", () => ({
  launchCamera: jestGlobals.fn(async () => ({ assets: [] })),
  launchImageLibrary: jestGlobals.fn(async () => ({ assets: [] })),
}));
jestGlobals.mock("@react-native-community/datetimepicker", () => {
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");

  return function MockDateTimePicker(props) {
    const nextValue =
      props.mode === "date"
        ? new Date(2026, 6, 10, 0, 0, 0, 0)
        : new Date(2026, 6, 10, 23, 30, 0, 0);

    return React.createElement(
      View,
      { testID: `picker-${props.mode}` },
      React.createElement(Text, null, props.mode),
      React.createElement(
        TouchableOpacity,
        {
          accessibilityLabel: "Apply picker value",
          onPress: () => props.onChange({}, nextValue),
        },
        React.createElement(Text, null, "Apply picker"),
      ),
      React.createElement(
        TouchableOpacity,
        {
          accessibilityLabel: "Dismiss picker value",
          onPress: () => props.onChange({}, undefined),
        },
        React.createElement(Text, null, "Dismiss picker"),
      ),
    );
  };
});
jestGlobals.mock("@react-native-community/netinfo", () => ({
  addEventListener: jestGlobals.fn(() => jestGlobals.fn()),
  fetch: jestGlobals.fn(async () => ({ isConnected: true })),
}));
jestGlobals.mock("@react-native-firebase/app", () => ({
  getApp: jestGlobals.fn(() => ({})),
}));
jestGlobals.mock("@react-native-firebase/crashlytics", () => ({
  getCrashlytics: jestGlobals.fn(() => ({
    setUserId: jestGlobals.fn(),
    setAttribute: jestGlobals.fn(),
    log: jestGlobals.fn(),
    recordError: jestGlobals.fn(),
  })),
}), { virtual: true });
jestGlobals.mock("@react-native-firebase/messaging", () => ({
  getMessaging: jestGlobals.fn(() => ({})),
  getToken: jestGlobals.fn(async () => "test-fcm-token"),
  getInitialNotification: jestGlobals.fn(async () => null),
  onMessage: jestGlobals.fn(() => jestGlobals.fn()),
  onNotificationOpenedApp: jestGlobals.fn(() => jestGlobals.fn()),
  onTokenRefresh: jestGlobals.fn(() => jestGlobals.fn()),
  registerDeviceForRemoteMessages: jestGlobals.fn(async () => undefined),
  requestPermission: jestGlobals.fn(async () => 1),
}));
jestGlobals.mock("react-native-device-info", () => ({
  getModel: jestGlobals.fn(() => "Pixel Test"),
  getSystemVersion: jestGlobals.fn(() => "14"),
  getVersion: jestGlobals.fn(() => "1.0.0"),
  getBuildNumber: jestGlobals.fn(() => "100"),
}), { virtual: true });
jestGlobals.mock("jail-monkey", () => ({
  isJailBroken: jestGlobals.fn(() => false),
  isOnExternalStorage: jestGlobals.fn(() => false),
  isDebuggedMode: jestGlobals.fn(() => false),
  canMockLocation: jestGlobals.fn(() => false),
}), { virtual: true });
jestGlobals.mock("react-native-incall-manager", () => ({
  __esModule: true,
  default: {
    start: jestGlobals.fn(),
    stop: jestGlobals.fn(),
    startRingtone: jestGlobals.fn(),
    stopRingtone: jestGlobals.fn(),
    setKeepScreenOn: jestGlobals.fn(),
    setMicrophoneMute: jestGlobals.fn(),
    setForceSpeakerphoneOn: jestGlobals.fn(),
  },
}));
jestGlobals.mock("react-native-webrtc", () => ({
  mediaDevices: { getUserMedia: jestGlobals.fn() },
  RTCPeerConnection: jestGlobals.fn(),
  RTCIceCandidate: jestGlobals.fn((value) => value),
  RTCSessionDescription: jestGlobals.fn((value) => value),
}));
jestGlobals.mock("react-native-config", () => ({
  API_BASE_URL: "",
  MAPBOX_PUBLIC_TOKEN: "pk.test-token",
  TURN_URL: "turn:test.example.com:3478",
  TURN_USERNAME: "tester",
  TURN_PASSWORD: "secret",
}));
jestGlobals.mock("@rnmapbox/maps", () => {
  const React = require("react");
  const { View } = require("react-native");
  const Mock = ({ children, testID }) => React.createElement(View, testID ? { testID } : null, children);
  return {
    __esModule: true,
    default: {
      setAccessToken: jestGlobals.fn(),
      StyleURL: { Dark: "mock-dark-style" },
      MapView: (props) => React.createElement(Mock, { ...props, testID: "mapbox-map-view" }),
      Camera: (props) => React.createElement(Mock, { ...props, testID: "mapbox-camera" }),
      ShapeSource: Mock,
      LineLayer: Mock,
      PointAnnotation: (props) => React.createElement(Mock, { ...props, testID: "mapbox-point-annotation" }),
      UserLocation: Mock,
    },
  };
});
