import React, { createContext, useContext, useState, useEffect } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ThemeContext = createContext();

export const lightTheme = {
  // Backgrounds
  background: "#FFFFFF",
  backgroundSecondary: "#F7F9FC",
  backgroundGradientStart: "#EAF4FF",
  backgroundGradientEnd: "#FFFFFF",

  // Surfaces
  surface: "#FFFFFF",
  surfaceLight: "#F7F9FC",
  card: "#FFFFFF",

  // Text
  text: "#1C1C1E",
  textSecondary: "#3C3C43",
  textMuted: "#8E8E93",

  // Primary Colors
  primary: "#007AFF",
  primaryLight: "#E3F2FD",
  primaryDark: "#0051D5",

  // Status Colors
  success: "#34C759",
  successLight: "#E8F5E9",
  warning: "#FFB900",
  warningLight: "#FFF9E6",
  error: "#E03131",
  errorLight: "#FFE5E5",
  info: "#667eea",
  infoLight: "#E3F2FD",

  // Streak Colors
  streak: "#FF6B35",
  streakLight: "#FFF5F0",
  streakBorder: "#FFD280",

  // Borders & Dividers
  border: "#E5E5EA",
  divider: "#C7C7CC",

  // Shadows
  shadowColor: "#000",
  shadowOpacity: 0.1,

  // Overlay
  overlay: "rgba(0, 0, 0, 0.5)",

  // Mode
  isDark: false,
};

export const darkTheme = {
  // Backgrounds
  background: "#000000",
  backgroundSecondary: "#1C1C1E",
  backgroundGradientStart: "#1C1C1E",
  backgroundGradientEnd: "#000000",

  // Surfaces
  surface: "#1C1C1E",
  surfaceLight: "#2C2C2E",
  card: "#2C2C2E",

  // Text
  text: "#FFFFFF",
  textSecondary: "#E5E5EA",
  textMuted: "#8E8E93",

  // Primary Colors
  primary: "#0A84FF",
  primaryLight: "#1E3A5F",
  primaryDark: "#409CFF",

  // Status Colors
  success: "#32D74B",
  successLight: "#1C3A25",
  warning: "#FFD60A",
  warningLight: "#3A3520",
  error: "#FF453A",
  errorLight: "#3A1F1E",
  info: "#7F8CFF",
  infoLight: "#1E2540",

  // Streak Colors
  streak: "#FF9F0A",
  streakLight: "#3A2E1E",
  streakBorder: "#5E4A2E",

  // Borders & Dividers
  border: "#38383A",
  divider: "#48484A",

  // Shadows
  shadowColor: "#000",
  shadowOpacity: 0.3,

  // Overlay
  overlay: "rgba(0, 0, 0, 0.7)",

  // Mode
  isDark: true,
};

export function ThemeProvider({ children }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState("system"); // "light", "dark", "system"
  const [currentTheme, setCurrentTheme] = useState(lightTheme);

  useEffect(() => {
    loadThemePreference();
  }, []);

  useEffect(() => {
    applyTheme();
  }, [themeMode, systemColorScheme]);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem("themeMode");
      if (savedTheme) {
        setThemeMode(savedTheme);
      }
    } catch (error) {
      console.error("Error loading theme preference:", error);
    }
  };

  const applyTheme = () => {
    if (themeMode === "system") {
      setCurrentTheme(systemColorScheme === "dark" ? darkTheme : lightTheme);
    } else if (themeMode === "dark") {
      setCurrentTheme(darkTheme);
    } else {
      setCurrentTheme(lightTheme);
    }
  };

  const setTheme = async (mode) => {
    try {
      await AsyncStorage.setItem("themeMode", mode);
      setThemeMode(mode);
    } catch (error) {
      console.error("Error saving theme preference:", error);
    }
  };

  const toggleTheme = () => {
    const newMode = currentTheme.isDark ? "light" : "dark";
    setTheme(newMode);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: currentTheme,
        themeMode,
        setTheme,
        toggleTheme,
        isDark: currentTheme.isDark,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
