const { jest: jestGlobals } = require('@jest/globals');

jestGlobals.mock('react-native-linear-gradient', () => 'LinearGradient');
jestGlobals.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jestGlobals.mock('react-native-vector-icons/Feather', () => 'FeatherIcon');
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
