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
      "react-native-reanimated/plugin", // Muss immer das letzte Plugin sein!
    ],
  };
};