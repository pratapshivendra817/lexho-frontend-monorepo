module.exports = {
  preset: '@react-native/jest-preset',
  transformIgnorePatterns: [
    'node_modules/(?!(?:@react-native|react-native|@react-navigation|react-native-screens|react-native-safe-area-context|react-native-gesture-handler|react-redux|@reduxjs/toolkit|@tanstack|immer)/)',
  ],
  setupFiles: ['<rootDir>/jest.setup.js'],
};
