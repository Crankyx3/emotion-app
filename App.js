import "react-native-gesture-handler";
import "react-native-reanimated";
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
import LoginScreen from "./screens/LoginScreen";
import SettingsScreen from "./screens/SettingsScreen";
import PrivacyPolicyScreen from "./screens/PrivacyPolicyScreen";

import { AuthProvider, useAuth } from "./components/AuthProvider";

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
  const { user, initializing } = useAuth();

  if (initializing) {
    // minimal placeholder while auth initializes
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Meditation" component={MeditationScreen} />
            <Stack.Screen name="PsychoEducation" component={PsychoEducationScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
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
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
