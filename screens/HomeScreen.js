import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenHeader from "../components/ScreenHeader";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db, auth } from "../firebaseconfig";
import { useAuth } from "../components/AuthProvider";
import { useFocusEffect } from "@react-navigation/native";

export default function HomeScreen({ navigation }) {
  const { userName } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [dailyAnalysisDone, setDailyAnalysisDone] = useState(false);
  const [weeklyAnalysisDone, setWeeklyAnalysisDone] = useState(false);
  const [daysUntilWeekly, setDaysUntilWeekly] = useState(0);

  // Aktualisiere Dashboard-Daten wenn Screen fokussiert wird
  useFocusEffect(
    React.useCallback(() => {
      loadDashboardData();
    }, [])
  );

  const loadDashboardData = async () => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    try {
      // Streak berechnen
      const entriesQuery = query(
        collection(db, "entries"),
        where("userId", "==", auth.currentUser.uid)
      );
      const entriesSnapshot = await getDocs(entriesQuery);

      const entryDates = entriesSnapshot.docs
        .map(doc => {
          const data = doc.data();
          if (!data.createdAt) return null;
          const date = data.createdAt.toDate();
          const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          return normalized.getTime();
        })
        .filter(d => d !== null);

      const uniqueDates = [...new Set(entryDates)].sort((a, b) => b - a);

      if (uniqueDates.length > 0) {
        let current = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTime = today.getTime();

        for (let i = 0; i < uniqueDates.length; i++) {
          const expectedDate = todayTime - (i * 24 * 60 * 60 * 1000);
          if (uniqueDates[i] === expectedDate) {
            current++;
          } else {
            break;
          }
        }

        let longest = 1;
        let tempStreak = 1;

        for (let i = 1; i < uniqueDates.length; i++) {
          const diff = (uniqueDates[i - 1] - uniqueDates[i]) / (24 * 60 * 60 * 1000);
          if (diff === 1) {
            tempStreak++;
            longest = Math.max(longest, tempStreak);
          } else {
            tempStreak = 1;
          }
        }

        setCurrentStreak(current);
        setLongestStreak(Math.max(longest, current));
      }

      // Tagesanalyse Check
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayAnalyses = entriesSnapshot.docs.filter((doc) => {
        const data = doc.data();
        if (!data.analysisDate) return false;
        const analysisDate = data.analysisDate.toDate();
        return analysisDate >= today && analysisDate < tomorrow;
      });

      setDailyAnalysisDone(todayAnalyses.length > 0);

      // Wochenanalyse Check
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const weeklyQuery = query(
        collection(db, "weeklyAnalyses"),
        where("userId", "==", auth.currentUser.uid)
      );

      const weeklySnapshot = await getDocs(weeklyQuery);

      const recentWeekly = weeklySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(analysis => {
          if (!analysis.analysisDate) return false;
          const analysisDate = analysis.analysisDate.toDate();
          return analysisDate >= sevenDaysAgo;
        })
        .sort((a, b) => b.analysisDate.toMillis() - a.analysisDate.toMillis());

      if (recentWeekly.length > 0) {
        const lastWeekly = recentWeekly[0];
        const lastDate = lastWeekly.analysisDate.toDate();
        const now = new Date();
        const diffTime = Math.abs(now - lastDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const daysLeft = 7 - diffDays;

        setWeeklyAnalysisDone(true);
        setDaysUntilWeekly(daysLeft > 0 ? daysLeft : 0);
      } else {
        setWeeklyAnalysisDone(false);
      }

    } catch (err) {
      console.error("Fehler beim Laden der Dashboard-Daten:", err);
    } finally {
      setLoading(false);
    }
  };
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
    {
      title: "KI-Chat",
      subtitle: "Sprich über deine Analysen und stelle Fragen",
      icon: <Ionicons name="chatbubbles" size={28} color="#FF6B6B" />,
      screen: "ChatSelection",
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

  const renderAnalysisStatus = (item) => {
    if (item.title === "Tagesanalyse" && dailyAnalysisDone) {
      return (
        <View style={styles.statusBadge}>
          <Ionicons name="checkmark-circle" size={16} color="#34a853" />
          <Text style={styles.statusText}>Erledigt</Text>
        </View>
      );
    }
    if (item.title === "KI-Wochenanalyse" && weeklyAnalysisDone) {
      return (
        <View style={styles.statusBadge}>
          <Ionicons name="time-outline" size={16} color="#fbbc05" />
          <Text style={[styles.statusText, { color: "#fbbc05" }]}>
            in {daysUntilWeekly}d
          </Text>
        </View>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <LinearGradient colors={["#EAF4FF", "#FFFFFF"]} style={styles.gradient}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#EAF4FF", "#FFFFFF"]} style={styles.gradient}>
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => navigation.navigate("Settings")}
      >
        <Ionicons name="settings-outline" size={28} color="#007AFF" />
      </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="KI-Stimmungshelfer" subtitle="Dein persönliches Stimmungs-Dashboard" />

        {/* Streak/Welcome Card */}
        <View style={styles.streakCard}>
          <View style={styles.streakContent}>
            {currentStreak > 0 ? (
              <>
                <View style={styles.streakMain}>
                  <Text style={styles.streakEmoji}>🔥</Text>
                  <View style={styles.streakInfo}>
                    <Text style={styles.streakNumber}>{currentStreak}</Text>
                    <Text style={styles.streakLabel}>
                      {currentStreak === 1 ? "Tag" : "Tage"} Streak
                    </Text>
                  </View>
                </View>
                <View style={styles.streakRight}>
                  {userName && (
                    <Text style={styles.greetingText}>Hey {userName}! 👋</Text>
                  )}
                  {longestStreak > currentStreak && (
                    <View style={styles.longestBadge}>
                      <Ionicons name="trophy" size={14} color="#FFB900" />
                      <Text style={styles.longestText}>
                        Rekord: {longestStreak}
                      </Text>
                    </View>
                  )}
                </View>
              </>
            ) : (
              <View style={styles.welcomeContent}>
                <Text style={styles.welcomeEmoji}>👋</Text>
                <View style={styles.welcomeInfo}>
                  <Text style={styles.welcomeTitle}>
                    {userName ? `Hey ${userName}!` : "Willkommen!"}
                  </Text>
                  <Text style={styles.welcomeSubtitle}>
                    Erstelle deinen ersten Eintrag um eine Streak zu starten
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

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
            {renderAnalysisStatus(item)}
            <Ionicons name="chevron-forward" size={22} color="#ccc" style={{ marginLeft: 8 }} />
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
  settingsButton: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 10,
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 25,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  container: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  streakCard: {
    width: "100%",
    backgroundColor: "#FFF5E5",
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#FFD280",
    shadowColor: "#FF9500",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  streakContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  streakMain: {
    flexDirection: "row",
    alignItems: "center",
  },
  streakEmoji: {
    fontSize: 36,
    marginRight: 12,
  },
  streakInfo: {
    justifyContent: "center",
  },
  streakNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FF6B35",
    lineHeight: 28,
  },
  streakLabel: {
    fontSize: 12,
    color: "#8B5E3C",
    fontWeight: "600",
  },
  streakRight: {
    alignItems: "flex-end",
    gap: 8,
  },
  greetingText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FF6B35",
    marginBottom: 4,
  },
  longestBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFD280",
  },
  longestText: {
    fontSize: 11,
    color: "#8B5E3C",
    fontWeight: "700",
    marginLeft: 4,
  },
  // Welcome Card Styles (wenn keine Streak vorhanden)
  welcomeContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  welcomeEmoji: {
    fontSize: 40,
    marginRight: 16,
  },
  welcomeInfo: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FF6B35",
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: "#8B5E3C",
    fontWeight: "500",
    lineHeight: 18,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    color: "#34a853",
    fontWeight: "600",
    marginLeft: 4,
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
