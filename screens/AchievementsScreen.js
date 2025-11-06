import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "../components/ScreenHeader";
import { useAuth } from "../components/AuthProvider";
import { getAllAchievementsWithStatus, getAchievementProgress } from "../services/achievementService";
import { getLocalEntries, getLocalWeeklyAnalyses } from "../services/localStorageService";

export default function AchievementsScreen({ navigation }) {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      if (!user) return;

      // Load user stats
      const localEntries = await getLocalEntries(user.uid);
      const localWeeklyAnalyses = await getLocalWeeklyAnalyses(user.uid);

      // Calculate streak
      const currentStreak = calculateStreak(localEntries);

      const userStats = {
        totalEntries: localEntries.length,
        dailyAnalyses: localEntries.filter(e => e.analysis).length,
        weeklyAnalyses: localWeeklyAnalyses.length,
        currentStreak,
      };

      setStats(userStats);

      // Load achievements
      const achievementsData = await getAllAchievementsWithStatus(user.uid);
      setAchievements(achievementsData);

      // Load progress
      const progressData = getAchievementProgress(userStats);
      setProgress(progressData);
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStreak = (entries) => {
    if (entries.length === 0) return 0;

    const sortedDates = entries
      .map(e => {
        const date = new Date(e.createdAt);
        return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      })
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort((a, b) => b - a);

    let streak = 0;
    const today = new Date();
    const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

    for (let i = 0; i < sortedDates.length; i++) {
      const expectedDate = todayNormalized - (i * 24 * 60 * 60 * 1000);
      if (sortedDates[i] === expectedDate) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;
  const completionPercentage = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <LinearGradient colors={["#FFF9E6", "#FFFFFF"]} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={28} color="#FFB900" />
        </TouchableOpacity>

        <ScreenHeader
          title="🏆 Erfolge"
          subtitle="Deine Fortschritte und Meilensteine"
        />

        <ScrollView contentContainerStyle={styles.container}>
          {/* Overview Card */}
          <View style={styles.overviewCard}>
            <View style={styles.overviewHeader}>
              <Text style={styles.overviewTitle}>Deine Erfolge</Text>
              <Text style={styles.overviewPercentage}>
                {Math.round(completionPercentage)}%
              </Text>
            </View>

            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${completionPercentage}%` }]}
              />
            </View>

            <Text style={styles.overviewSubtitle}>
              {unlockedCount} von {totalCount} freigeschaltet
            </Text>
          </View>

          {/* Active Progress */}
          {progress.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📈 Nächste Meilensteine</Text>
              {progress.map((item, index) => (
                <View key={index} style={styles.progressCard}>
                  <Text style={styles.progressTitle}>{item.title}</Text>
                  <View style={styles.progressBarSmall}>
                    <View
                      style={[
                        styles.progressFillSmall,
                        { width: `${Math.min(item.percentage, 100)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {item.current} / {item.target}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Unlocked Achievements */}
          {achievements.filter(a => a.unlocked).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>✨ Freigeschaltet</Text>
              {achievements
                .filter(a => a.unlocked)
                .map((achievement) => (
                  <View key={achievement.id} style={styles.achievementCard}>
                    <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                    <View style={styles.achievementContent}>
                      <Text style={styles.achievementTitle}>{achievement.title}</Text>
                      <Text style={styles.achievementDescription}>
                        {achievement.description}
                      </Text>
                    </View>
                    <Ionicons name="checkmark-circle" size={28} color="#34C759" />
                  </View>
                ))}
            </View>
          )}

          {/* Locked Achievements */}
          {achievements.filter(a => !a.unlocked).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔒 Noch nicht erreicht</Text>
              {achievements
                .filter(a => !a.unlocked)
                .map((achievement) => (
                  <View key={achievement.id} style={[styles.achievementCard, styles.achievementLocked]}>
                    <Text style={styles.achievementIconLocked}>{achievement.icon}</Text>
                    <View style={styles.achievementContent}>
                      <Text style={[styles.achievementTitle, styles.achievementTitleLocked]}>
                        {achievement.title}
                      </Text>
                      <Text style={[styles.achievementDescription, styles.achievementDescriptionLocked]}>
                        {achievement.description}
                      </Text>
                    </View>
                    <Ionicons name="lock-closed" size={24} color="#C7C7CC" />
                  </View>
                ))}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  backButton: {
    position: "absolute",
    top: 60,
    left: 20,
    zIndex: 10,
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    borderRadius: 25,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  // Overview Card
  overviewCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  overviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  overviewTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1C1C1E",
  },
  overviewPercentage: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFB900",
  },
  progressBar: {
    height: 12,
    backgroundColor: "#F7F9FC",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FFB900",
    borderRadius: 6,
  },
  overviewSubtitle: {
    fontSize: 14,
    color: "#8E8E93",
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 12,
  },

  // Progress Cards
  progressCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  progressTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 8,
  },
  progressBarSmall: {
    height: 8,
    backgroundColor: "#F7F9FC",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFillSmall: {
    height: "100%",
    backgroundColor: "#007AFF",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    color: "#8E8E93",
  },

  // Achievement Cards
  achievementCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  achievementLocked: {
    backgroundColor: "#F7F9FC",
    opacity: 0.6,
  },
  achievementIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  achievementIconLocked: {
    fontSize: 40,
    marginRight: 16,
    opacity: 0.4,
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 4,
  },
  achievementTitleLocked: {
    color: "#8E8E93",
  },
  achievementDescription: {
    fontSize: 14,
    color: "#8E8E93",
  },
  achievementDescriptionLocked: {
    color: "#C7C7CC",
  },
});
