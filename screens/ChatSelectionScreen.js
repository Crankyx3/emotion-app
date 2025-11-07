import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db, auth } from "../firebaseconfig";
import { useNavigation } from "@react-navigation/native";
import { getLocalEntries, getLocalWeeklyAnalyses } from "../services/localStorageService";

export default function ChatSelectionScreen() {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [dailyAnalyses, setDailyAnalyses] = useState([]);
  const [weeklyAnalyses, setWeeklyAnalyses] = useState([]);

  useEffect(() => {
    loadAnalyses();
  }, []);

  const loadAnalyses = async () => {
    try {
      if (!auth.currentUser) return;

      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      // 🔒 DATENSCHUTZ: Lade Tagesanalysen aus lokalem Storage
      const localEntries = await getLocalEntries(auth.currentUser.uid);

      const daily = (localEntries || [])
        .filter(entry => {
          // Nur Einträge mit Analyse
          if (!entry.analysis) return false;

          // Verwende analysisDate wenn vorhanden, sonst createdAt
          const dateToCheck = entry.analysisDate || entry.createdAt;
          if (!dateToCheck) return false;

          const analysisDate = new Date(dateToCheck);
          return analysisDate >= fourteenDaysAgo;
        })
        .map(entry => ({
          id: entry.localId,
          ...entry,
          analysisDate: new Date(entry.analysisDate || entry.createdAt),
          createdAt: new Date(entry.createdAt)
        }))
        .sort((a, b) => b.analysisDate.getTime() - a.analysisDate.getTime());

      setDailyAnalyses(daily);

      // 🔒 DATENSCHUTZ: Lade Wochenanalysen aus lokalem Storage
      const localWeeklyAnalyses = await getLocalWeeklyAnalyses(auth.currentUser.uid);

      const weekly = (localWeeklyAnalyses || [])
        .filter(analysis => {
          if (!analysis.createdAt) return false;
          const analysisDate = new Date(analysis.createdAt);
          return analysisDate >= fourteenDaysAgo;
        })
        .map(analysis => ({
          id: analysis.localId,
          ...analysis,
          analysisDate: new Date(analysis.createdAt)
        }))
        .sort((a, b) => b.analysisDate.getTime() - a.analysisDate.getTime());

      setWeeklyAnalyses(weekly);
    } catch (err) {
      console.error("Fehler beim Laden der Analysen:", err);
      // Defensive: Setze leere Arrays bei Fehler
      setDailyAnalyses([]);
      setWeeklyAnalyses([]);
    } finally {
      setLoading(false);
    }
  };

  const startChat = (context, type, date) => {
    navigation.navigate("Chat", { context, type, date });
  };

  return (
    <LinearGradient colors={["#EAF4FF", "#FFFFFF"]} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Ionicons name="chatbubbles" size={32} color="#007AFF" />
          <Text style={styles.headerTitle}>KI-Chat starten</Text>
          <Text style={styles.headerSubtitle}>
            Wähle, worüber du sprechen möchtest
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Lade Analysen...</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.container}>
            {/* Option: Alle Analysen der letzten 14 Tage */}
            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => startChat(null, "all", null)}
              activeOpacity={0.8}
            >
              <View style={styles.optionIconContainer}>
                <Ionicons name="calendar" size={28} color="#007AFF" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>
                  Alle Analysen der letzten 14 Tage
                </Text>
                <Text style={styles.optionSubtitle}>
                  {dailyAnalyses.length + weeklyAnalyses.length} Analysen · Gesamtüberblick
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#8E8E93" />
            </TouchableOpacity>

            {/* Wochenanalysen */}
            {weeklyAnalyses.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📊 Wochenanalysen</Text>
                {weeklyAnalyses.map((analysis) => {
                  // analysisDate ist bereits ein Date-Objekt (von filter mapping)
                  const date = analysis.analysisDate;
                  const dateStr = date instanceof Date
                    ? date.toLocaleDateString("de-DE", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                      })
                    : "Unbekannt";

                  return (
                    <TouchableOpacity
                      key={analysis.id}
                      style={styles.analysisCard}
                      onPress={() =>
                        startChat(analysis.analysis, "weekly", dateStr)
                      }
                      activeOpacity={0.8}
                    >
                      <View style={styles.analysisHeader}>
                        <Ionicons name="bar-chart" size={20} color="#007AFF" />
                        <Text style={styles.analysisDate}>{dateStr}</Text>
                      </View>
                      <Text style={styles.analysisPreview} numberOfLines={2}>
                        {analysis.analysis}
                      </Text>
                      {analysis.highlight?.mood && (
                        <View
                          style={[
                            styles.moodBadge,
                            {
                              backgroundColor:
                                analysis.highlight.mood === "positiv"
                                  ? "#E8F5E9"
                                  : analysis.highlight.mood === "negativ"
                                  ? "#FFEBEE"
                                  : "#FFF9DB",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.moodText,
                              {
                                color:
                                  analysis.highlight.mood === "positiv"
                                    ? "#2E7D32"
                                    : analysis.highlight.mood === "negativ"
                                    ? "#C62828"
                                    : "#F57C00",
                              },
                            ]}
                          >
                            {analysis.highlight.mood === "positiv"
                              ? "🌿 Positiv"
                              : analysis.highlight.mood === "negativ"
                              ? "🌧️ Herausfordernd"
                              : "🌤️ Ausgeglichen"}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Tagesanalysen */}
            {dailyAnalyses.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📝 Tagesanalysen</Text>
                {dailyAnalyses.slice(0, 10).map((entry) => {
                  // analysisDate ist bereits ein Date-Objekt (von filter mapping)
                  const date = entry.analysisDate;
                  const dateStr = date instanceof Date
                    ? date.toLocaleDateString("de-DE", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                      })
                    : "Unbekannt";

                  return (
                    <TouchableOpacity
                      key={entry.id}
                      style={styles.analysisCard}
                      onPress={() =>
                        startChat(entry.analysis, "daily", dateStr)
                      }
                      activeOpacity={0.8}
                    >
                      <View style={styles.analysisHeader}>
                        <Text style={styles.emotionBadge}>{entry.emotion}</Text>
                        <Text style={styles.analysisDate}>{dateStr}</Text>
                        <Text style={styles.scoreText}>
                          {entry.feelScore}/99
                        </Text>
                      </View>
                      {entry.theme && (
                        <Text style={styles.themeText}>🧩 {entry.theme}</Text>
                      )}
                      <Text style={styles.analysisPreview} numberOfLines={2}>
                        {entry.analysis}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                {dailyAnalyses.length > 10 && (
                  <Text style={styles.moreText}>
                    ... und {dailyAnalyses.length - 10} weitere
                  </Text>
                )}
              </View>
            )}

            {/* Keine Analysen */}
            {dailyAnalyses.length === 0 && weeklyAnalyses.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={64} color="#C7C7CC" />
                <Text style={styles.emptyTitle}>Keine Analysen vorhanden</Text>
                <Text style={styles.emptySubtitle}>
                  Erstelle zuerst eine Tages- oder Wochenanalyse, um den Chat nutzen zu können.
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  header: {
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
    backgroundColor: "#fff",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1C1C1E",
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "#8E8E93",
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: "#8E8E93",
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  optionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 14,
    color: "#8E8E93",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 12,
  },
  analysisCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  analysisHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  emotionBadge: {
    fontSize: 14,
    fontWeight: "600",
    color: "#007AFF",
  },
  analysisDate: {
    fontSize: 14,
    color: "#8E8E93",
    flex: 1,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#007AFF",
  },
  themeText: {
    fontSize: 13,
    color: "#666",
    marginBottom: 6,
  },
  analysisPreview: {
    fontSize: 14,
    color: "#3C3C43",
    lineHeight: 20,
  },
  moodBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  moodText: {
    fontSize: 12,
    fontWeight: "600",
  },
  moreText: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1C1C1E",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#8E8E93",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 40,
    lineHeight: 22,
  },
});
