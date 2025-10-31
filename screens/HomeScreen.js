import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenHeader from "../components/ScreenHeader";

export default function HomeScreen({ navigation }) {
  const mainMenuItems = [
    {
      title: "Tagesdaten eintragen",
      subtitle: "Notiere deine Stimmung und wie du dich fühlst",
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

  const guideItems = [
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
  ];

  return (
    <LinearGradient colors={["#EAF4FF", "#FFFFFF"]} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="KI-Stimmungshelfer" subtitle="Dein persönliches Stimmungs-Dashboard" />

        {/* Haupt-Menü */}
        {mainMenuItems.map((item, index) => (
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

        {/* Guides Sektion */}
        <View style={styles.sectionHeader}>
          <Ionicons name="book-outline" size={20} color="#666" />
          <Text style={styles.sectionTitle}>Guides</Text>
        </View>

        {guideItems.map((item, index) => (
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginTop: 30,
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#666",
    marginLeft: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
