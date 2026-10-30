const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName === 'event-target-shim/index') {
        return context.resolveRequest(context, 'event-target-shim', platform);
      }

      return context.resolveRequest(context, moduleName, platform);
    },
    blockList: [
      /node_modules[\\/]+@react-native[\\/]+gradle-plugin[\\/]+(?:[^\\/]+[\\/]+)*build[\\/].*/,
      /node_modules[\\/].+[\\/]android[\\/]build[\\/].*/,
      /node_modules[\\/].+[\\/]ios[\\/]build[\\/].*/,
      /android[\\/]\.cxx[\\/].*/
    ]
  }
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
