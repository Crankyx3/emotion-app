const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Keep existing cjs support
config.resolver.assetExts.push("cjs");
config.resolver.unstable_enablePackageExports = false;

// Add additional resolver for React Native (fix for TurboModule errors)
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs'];
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'react-native': require.resolve('react-native'),
};

// Add support for Hermes
config.transformer.unstable_allowRequireContext = true;

module.exports = config;