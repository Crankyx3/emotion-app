module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module:react-native-dotenv",
        {
          moduleName: "@env",
          path: "./openAi.env",
        },
      ],
      [
        "module-resolver",
        {
          alias: {
            "^react-native$": "react-native"
          }
        }
      ],
      "react-native-reanimated/plugin"
    ],
  };
};