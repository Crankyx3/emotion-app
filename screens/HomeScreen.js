import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenHeader from "../components/ScreenHeader";
import { useAuth } from "../components/AuthProvider";

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const menuItems = [
    {
      title: "Tagesdaten eintragen",
      subtitle: "Notiere deine Stimmung, Energie und Schlafqualität",
      icon: <Ionicons name="create-outline" size={28} color="#007aff" />,
      screen: "DailyEntry",
    },
    {
      title: "Tagesanalyse",
      subtitle: "Erhalte deine KI-Analyse des heutigen Tages",
      icon: <Ionicons name="analytics-outline" size={28} color="#34a853" />,
      screen: "DailyAnalysis",
    },
    {
      title: "Meditation & Achtsamkeit",
      subtitle: "Geführte Meditationen und Atemübungen (2-5 Min.)",
      icon: <Ionicons name="leaf-outline" size={28} color="#2ecc71" />,
      screen: "Meditation",
    },
    {
      title: "Psycho-Edukation",
      subtitle: "Lerne über mentale Gesundheit und Bewältigungsstrategien",
      icon: <Ionicons name="school-outline" size={28} color="#a142f4" />,
      screen: "PsychoEducation",
    },
    {
      title: "EmotionChart",
      subtitle: "Verfolge deinen emotionalen Verlauf über Zeit",
      icon: <Ionicons name="bar-chart-outline" size={28} color="#fbbc05" />,
      screen: "EmotionChart",
    },
    {
      title: "KI-Wochenanalyse",
      subtitle: "Lass deine Woche psychologisch reflektieren",
      icon: <MaterialCommunityIcons name="brain" size={28} color="#a142f4" />,
      screen: "Analysis",
    },
  ];

  return (
    <LinearGradient colors={["#EAF4FF", "#FFFFFF"]} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="KI-Stimmungshelfer" subtitle="Dein persönliches Stimmungs-Dashboard" />

        {/* User Info Card */}
        {user && (
          <View style={styles.userCard}>
            <View style={styles.userIconContainer}>
              <Ionicons name="person" size={24} color="#007AFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userLabel}>Angemeldet als</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Online</Text>
            </View>
          </View>
        )}

        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.card}
            activeOpacity={0.9}
            onPress={() => navigation.navigate(item.screen)}
          >
            <View style={styles.iconContainer}>{item.icon}</View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#ccc" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 20,
    width: "100%",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: "#E3F2FD",
  },
  userIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  userLabel: {
    fontSize: 12,
    color: "#8E8E93",
    fontWeight: "500",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#34a853",
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: "#34a853",
    fontWeight: "600",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
    width: "100%",
    marginVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#f1f3f5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#222",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
});
