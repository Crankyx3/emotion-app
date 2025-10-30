import "react-native-gesture-handler";
import "react-native-reanimated";
import * as React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import ChatScreen from "./screens/ChatScreen";
import HomeScreen from "./screens/HomeScreen";
import DailyEntryScreen from "./screens/DailyEntryScreen";
import DailyAnalysisScreen from "./screens/DailyAnalysisScreen";
import EmotionChartScreen from "./screens/EmotionChartScreen";
import AnalysisScreen from "./screens/AnalysisScreen";
import LoginScreen from "./screens/LoginScreen";

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
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="DailyEntry" component={DailyEntryScreen} />
      <Tab.Screen name="DailyAnalysis" component={DailyAnalysisScreen} />
      <Tab.Screen name="EmotionChart" component={EmotionChartScreen} />
      <Tab.Screen name="Analysis" component={AnalysisScreen} />
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
          </>
        ) : (
          <Stack.Screen name="Auth" component={LoginScreen} />
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
