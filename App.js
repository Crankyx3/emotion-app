import "react-native-gesture-handler";
import * as React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import ChatScreen from "./screens/ChatScreen";
import ChatHistoryScreen from "./screens/ChatHistoryScreen";
import HomeScreen from "./screens/HomeScreen";
import DailyEntryScreen from "./screens/DailyEntryScreen";
import DailyAnalysisScreen from "./screens/DailyAnalysisScreen";
import EmotionChartScreen from "./screens/EmotionChartScreen";
import AnalysisScreen from "./screens/AnalysisScreen";
import MeditationScreen from "./screens/MeditationScreen";
import PsychoEducationScreen from "./screens/PsychoEducationScreen";
import AppGuideScreen from "./screens/AppGuideScreen";
import PaywallScreen from "./screens/PaywallScreen";
import LoginScreen from "./screens/LoginScreen";
import SettingsScreen from "./screens/SettingsScreen";
import PrivacyPolicyScreen from "./screens/PrivacyPolicyScreen";
import AdminScreen from "./screens/AdminScreen";
import EmergencyScreen from "./screens/EmergencyScreen";
import AchievementsScreen from "./screens/AchievementsScreen";
import OnboardingScreen from "./screens/OnboardingScreen";

import { AuthProvider, useAuth } from "./components/AuthProvider";
import { PremiumProvider } from "./components/PremiumProvider";
import { ThemeProvider } from "./components/ThemeProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0A84FF",
        tabBarInactiveTintColor: "#8E8E93",
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
          tabBarLabel: "Home"
        }}
      />
      <Tab.Screen
        name="DailyEntry"
        component={DailyEntryScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="create-outline" size={size} color={color} />
          ),
          tabBarLabel: "Eintrag"
        }}
      />
      <Tab.Screen
        name="DailyAnalysis"
        component={DailyAnalysisScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="analytics-outline" size={size} color={color} />
          ),
          tabBarLabel: "Analyse"
        }}
      />
      <Tab.Screen
        name="EmotionChart"
        component={EmotionChartScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" size={size} color={color} />
          ),
          tabBarLabel: "Chart"
        }}
      />
      <Tab.Screen
        name="Analysis"
        component={AnalysisScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="brain" size={size} color={color} />
          ),
          tabBarLabel: "Wochenanalyse"
        }}
      />
      <Tab.Screen
        name="ChatSelection"
        component={ChatHistoryScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
          tabBarLabel: "KI-Chat"
        }}
      />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { user, initializing, isGuestMode } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = React.useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = React.useState(true);

  React.useEffect(() => {
    checkOnboardingStatus();
  }, [user, isGuestMode]);

  const checkOnboardingStatus = async () => {
    try {
      // Guest Mode braucht kein Onboarding
      if (isGuestMode || !user) {
        setNeedsOnboarding(false);
        setCheckingOnboarding(false);
        return;
      }

      // Prüfe ob User Onboarding bereits gesehen hat
      const hasSeenOnboarding = await AsyncStorage.getItem(`hasSeenOnboarding_${user.uid}`);

      if (!hasSeenOnboarding) {
        setNeedsOnboarding(true);
      } else {
        setNeedsOnboarding(false);
      }
    } catch (error) {
      console.error("Error checking onboarding status:", error);
      setNeedsOnboarding(false);
    } finally {
      setCheckingOnboarding(false);
    }
  };

  if (initializing || checkingOnboarding) {
    // minimal placeholder while auth initializes
    return null;
  }

  // Zeige Main App wenn eingeloggt ODER im Guest Mode
  const showMainApp = user || isGuestMode;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {showMainApp ? (
          <>
            {needsOnboarding && (
              <Stack.Screen
                name="Onboarding"
                component={OnboardingScreen}
                options={{ gestureEnabled: false }}
              />
            )}
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Meditation" component={MeditationScreen} />
            <Stack.Screen name="PsychoEducation" component={PsychoEducationScreen} />
            <Stack.Screen name="AppGuide" component={AppGuideScreen} />
            <Stack.Screen name="Paywall" component={PaywallScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
            <Stack.Screen name="Admin" component={AdminScreen} />
            <Stack.Screen name="Achievements" component={AchievementsScreen} />
            <Stack.Screen name="Emergency" component={EmergencyScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Auth" component={LoginScreen} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PremiumProvider>
          <RootNavigator />
        </PremiumProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
