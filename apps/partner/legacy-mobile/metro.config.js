const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require("path");

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // Ignore transient native build artifacts that can appear/disappear during Gradle/CMake.
    blockList: [
      /android[/\\]app[/\\]\.cxx[/\\].*/,
      /android[/\\]app[/\\]build[/\\].*/,
      // Native dependencies generate and remove CMake files while Gradle
      // builds. Metro must not try to watch those transient directories.
      /node_modules[/\\].*[/\\]android[/\\]\.cxx[/\\].*/,
      /node_modules[/\\]@react-native[/\\]gradle-plugin[/\\].*[/\\]build[/\\].*/,
    ],
    extraNodeModules: {
      "@react-navigation/core": path.resolve(__dirname, "node_modules/@react-navigation/core"),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
