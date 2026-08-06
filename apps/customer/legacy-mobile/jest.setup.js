const { jest: jestGlobals } = require('@jest/globals');

jestGlobals.mock('react-native-linear-gradient', () => 'LinearGradient');
jestGlobals.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jestGlobals.mock('react-native-vector-icons/Feather', () => 'FeatherIcon');
jestGlobals.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcon');
jestGlobals.mock('react-native-config', () => ({
  ANDROID_EMULATOR_HOST: 'localhost',
  AUTH_FALLBACK_BASE_URLS: '',
  DEV_LAN_HOST: 'localhost',
  MANUAL_REAL_DEVICE_API_HOST: '',
  MAPBOX_PUBLIC_TOKEN: 'test-mapbox-public-token',
  SSL_PINNING_ENABLED: 'false',
  SSL_PINNING_CERT_NAME: 'lexho_api',
}));
jestGlobals.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');

  return {
    GestureHandlerRootView: View,
  };
});
jestGlobals.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jestGlobals.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(async () => ({ isConnected: true, isInternetReachable: true })),
}));
jestGlobals.mock(
  'react-native-ssl-pinning',
  () => ({
    fetch: jest.fn(),
  }),
  { virtual: true },
);
