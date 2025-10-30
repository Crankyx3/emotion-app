import React, { useEffect, useState } from "react";
import ScreenHeader from "../components/ScreenHeader";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from "react-native";
import { collection, getDocs, orderBy, query, limit, doc, updateDoc, where } from "firebase/firestore";
import { db, auth } from "../firebaseconfig";
import { LineChart } from "react-native-chart-kit";
import { getAiResponse } from "../openaiService";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const screenWidth = Dimensions.get("window").width;

export default function EmotionChartScreen() {
  const [entries, setEntries] = useState([]);
  const [allEntries, setAllEntries] = useState([]); // Für Trend & Insights
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [timeframe, setTimeframe] = useState(7); // 7, 14, 30, 90

  useEffect(() => {
    (async () => {
      try {
        if (!auth.currentUser) {
          setLoading(false);
          return;
        }

        // Lade alle Einträge des aktuellen Users
        const q = query(
          collection(db, "entries"),
          where("userId", "==", auth.currentUser.uid)
        );
        const snap = await getDocs(q);

        // Mappe alle Einträge und sortiere clientseitig nach Datum
        const all = snap.docs
          .map((docSnap) => {
            const e = docSnap.data();
            const ts = e.createdAt?.seconds ? new Date(e.createdAt.seconds * 1000) : new Date();
            return {
              id: docSnap.id,
              ...e,
              date: ts.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }),
              timestamp: ts.getTime(),
            };
          })
          .sort((a, b) => b.timestamp - a.timestamp); // Neueste zuerst

        setAllEntries(all);

        // Filtere nach gewähltem Zeitraum
        const filtered = all.slice(0, timeframe).reverse(); // Umdrehen für Chart (älteste -> neueste)
        setEntries(filtered);
      } catch (err) {
        console.error("Fehler beim Laden:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [timeframe]);

  // Trend-Berechnung: Aktueller Zeitraum vs. vorheriger Zeitraum
  const calculateTrend = () => {
    const validAll = allEntries.filter((e) => typeof e.feelScore === "number" && e.feelScore > 0);
    if (validAll.length < timeframe) return null;

    const currentPeriod = validAll.slice(0, timeframe);
    const previousPeriod = validAll.slice(timeframe, timeframe * 2);

    if (previousPeriod.length === 0) return null;

    const currentAvg = currentPeriod.reduce((sum, e) => sum + e.feelScore, 0) / currentPeriod.length;
    const previousAvg = previousPeriod.reduce((sum, e) => sum + e.feelScore, 0) / previousPeriod.length;

    const change = ((currentAvg - previousAvg) / previousAvg) * 100;
    const emoji = change > 5 ? "↗️" : change < -5 ? "↘️" : "➡️";
    const label = change > 5 ? "Aufwärts" : change < -5 ? "Abwärts" : "Stabil";

    return { change: change.toFixed(1), emoji, label };
  };

  // Insight-Berechnung
  const calculateInsights = () => {
    const validAll = allEntries.filter((e) => typeof e.feelScore === "number" && e.feelScore > 0);
    const currentPeriod = validAll.slice(0, timeframe);

    if (currentPeriod.length === 0) return null;

    // 1. Bester Tag
    const bestDay = currentPeriod.reduce((best, e) => (e.feelScore > best.feelScore ? e : best), currentPeriod[0]);

    // 2. Längste positive Serie (über Durchschnitt)
    const allAvg = validAll.reduce((sum, e) => sum + e.feelScore, 0) / validAll.length;
    let longestStreak = 0;
    let currentStreak = 0;

    for (const entry of currentPeriod.reverse()) {
      if (entry.feelScore >= allAvg) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    // 3. Percentile: Wie viel Prozent der Tage waren schlechter als der aktuelle Durchschnitt?
    const currentAvg = currentPeriod.reduce((sum, e) => sum + e.feelScore, 0) / currentPeriod.length;
    const worseDays = validAll.filter((e) => e.feelScore < currentAvg).length;
    const percentile = Math.round((worseDays / validAll.length) * 100);

    return { bestDay, longestStreak, percentile };
  };

  const trend = calculateTrend();
  const insights = calculateInsights();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007aff" />
      </View>
    );
  }

  const valid = entries.filter((e) => typeof e.feelScore === "number" && e.feelScore > 0);

  if (valid.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.placeholder}>Noch keine Einträge 😌</Text>
      </View>
    );
  }

  const step = valid.length > 10 ? 3 : 2;
  const labels = valid.map((e, i) => (i % step === 0 ? e.date : ""));
  const dataPoints = valid.map((e) => e.feelScore);
  const avg = dataPoints.reduce((a, b) => a + b, 0) / dataPoints.length;

  const chartData = {
    labels,
    datasets: [
      {
        data: dataPoints,
        color: (opacity = 1) => `rgba(0,122,255,${opacity})`,
        strokeWidth: 3,
      },
    ],
  };

  const handleAiAnalysis = async (entry) => {
    setAiLoading(true);
    try {
      const {
        emotion = "Unbekannt",
        feelScore = 50,
        sleep = 5,
        energy = 5,
        selfWorth = 5,
        theme = "Allgemein",
        text = "Keine Beschreibung angegeben",
        id,
      } = entry || {};

      if (!id) {
        Alert.alert("Fehler", "Dieser Eintrag hat keine ID und kann nicht aktualisiert werden.");
        return;
      }

      const prompt = `
Analysiere den psychischen Zustand basierend auf diesen Tagesdaten:

Emotion: ${emotion}
Wohlfühlscore: ${feelScore}/99
Schlafqualität: ${sleep}/10
Energielevel: ${energy}/10
Selbstwertgefühl: ${selfWorth}/10
Thema des Tages: ${theme}
Beschreibung: ${text}

Gib eine empathische, kurze psychologische Einschätzung mit einem hilfreichen Ratschlag.
`;

      const reply = await getAiResponse("psychologische Tagesanalyse", prompt);

      await updateDoc(doc(db, "entries", id), { analysis: reply });

      const updated = entries.map((e) => (e.id === id ? { ...e, analysis: reply } : e));
      setEntries(updated);
      setSelectedEntry({ ...entry, analysis: reply });

      Alert.alert("Analyse gespeichert ✅", "Die KI hat deinen Eintrag analysiert.");
    } catch (err) {
      console.error(err);
      Alert.alert("Fehler bei Analyse", err.message || "Etwas ist schiefgelaufen.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#F6FBFF", "#FFFFFF"]} style={styles.background}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <ScreenHeader title="📈 Dein Wohlfühlverlauf" subtitle={`Durchschnitt: ${avg.toFixed(1)}/99`} />

        {/* Zeitfilter-Buttons */}
        <View style={styles.filterContainer}>
          {[7, 14, 30, 90].map((days) => (
            <TouchableOpacity
              key={days}
              style={[styles.filterButton, timeframe === days && styles.filterButtonActive]}
              onPress={() => setTimeframe(days)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterText, timeframe === days && styles.filterTextActive]}>{days}T</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Trend-Indikator */}
        {trend && (
          <View style={styles.trendCard}>
            <Text style={styles.trendEmoji}>{trend.emoji}</Text>
            <View style={styles.trendContent}>
              <Text style={styles.trendLabel}>{trend.label}</Text>
              <Text style={styles.trendChange}>
                {trend.change > 0 ? "+" : ""}
                {trend.change}% vs. vorherige {timeframe} Tage
              </Text>
            </View>
          </View>
        )}

        {/* Insight-Cards */}
        {insights && (
          <View style={styles.insightsContainer}>
            <View style={styles.insightCard}>
              <Text style={styles.insightEmoji}>🏆</Text>
              <Text style={styles.insightTitle}>Bester Tag</Text>
              <Text style={styles.insightValue}>{insights.bestDay.date}</Text>
              <Text style={styles.insightDetail}>{insights.bestDay.feelScore}/99</Text>
            </View>

            <View style={styles.insightCard}>
              <Text style={styles.insightEmoji}>🔥</Text>
              <Text style={styles.insightTitle}>Längste Serie</Text>
              <Text style={styles.insightValue}>{insights.longestStreak}</Text>
              <Text style={styles.insightDetail}>gute Tage hintereinander</Text>
            </View>

            <View style={styles.insightCard}>
              <Text style={styles.insightEmoji}>📊</Text>
              <Text style={styles.insightTitle}>Dein Ranking</Text>
              <Text style={styles.insightValue}>Top {100 - insights.percentile}%</Text>
              <Text style={styles.insightDetail}>deiner bisherigen Tage</Text>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Verlauf</Text>
          <LineChart
            data={chartData}
            width={screenWidth - 36}
            height={240}
            fromZero
            bezier
            style={styles.chart}
            chartConfig={{
              backgroundGradientFrom: "#F6FBFF",
              backgroundGradientTo: "#FFFFFF",
              decimalPlaces: 0,
              color: (o = 1) => `rgba(0,122,255,${o})`,
              labelColor: (o = 1) => `rgba(0,0,0,${o})`,
              propsForDots: {
                r: "5",
                strokeWidth: "2",
                stroke: "#007aff",
                fill: "#fff",
              },
              propsForBackgroundLines: { strokeDasharray: "4", stroke: "#e6eef6" },
              fillShadowGradient: "#007aff",
              fillShadowGradientOpacity: 0.12,
            }}
          />
        </View>

        <View style={styles.avgBox}>
          <Text style={styles.avgText}>
            Durchschnittlicher Wohlfühlwert: <Text style={styles.avgValue}>{avg.toFixed(1)}</Text> / 99
          </Text>
        </View>

        <View style={styles.listContainer}>
          <Text style={styles.sectionTitle}>🗓 Letzte Einträge</Text>

          {valid.slice().reverse().map((entry) => (
            <TouchableOpacity
              key={entry.id}
              style={styles.entryCard}
              onPress={() => setSelectedEntry(entry)}
              activeOpacity={0.9}
            >
              <View style={styles.entryRow}>
                <View>
                  <Text style={styles.entryDate}>{entry.date}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.entryEmotion}>{entry.emotion}</Text>
                    {entry.theme ? <Text style={styles.entryTheme}>• {entry.theme}</Text> : null}
                  </View>
                </View>
                <View style={styles.rightCol}>
                  <Text style={styles.entryScore}>{entry.feelScore}/99</Text>
                  <View style={[styles.pill, entry.analysis ? styles.pillGood : styles.pillMuted]}>
                    <Text style={styles.pillText}>{entry.analysis ? "Analyse" : "Keine Analyse"}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <Modal visible={!!selectedEntry} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  📅 {selectedEntry?.date} • {selectedEntry?.emotion}
                </Text>
                <TouchableOpacity onPress={() => setSelectedEntry(null)}>
                  <Ionicons name="close" size={22} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.modalLine}>💙 Wohlfühlscore: {selectedEntry?.feelScore}/99</Text>
                <Text style={styles.modalLine}>🛏 Schlaf: {selectedEntry?.sleep}/10</Text>
                <Text style={styles.modalLine}>⚡ Energie: {selectedEntry?.energy}/10</Text>
                <Text style={styles.modalLine}>❤️ Selbstwert: {selectedEntry?.selfWorth}/10</Text>

                {selectedEntry?.theme ? <Text style={[styles.modalLine, { marginTop: 8 }]}>🧩 Thema: {selectedEntry?.theme}</Text> : null}
                {selectedEntry?.text ? <Text style={[styles.modalText, { marginTop: 8 }]}>💭 {selectedEntry?.text}</Text> : null}

                {selectedEntry?.analysis ? (
                  <>
                    <Text style={[styles.modalSubTitle, { marginTop: 12 }]}>🧠 KI-Analyse</Text>
                    <ScrollView style={styles.analysisScroll}>
                      <Text style={styles.modalAnalysis}>{selectedEntry.analysis}</Text>
                    </ScrollView>
                  </>
                ) : (
                  <TouchableOpacity
                    style={[styles.actionButton, aiLoading && styles.actionButtonDisabled]}
                    onPress={() => handleAiAnalysis(selectedEntry)}
                    disabled={aiLoading}
                  >
                    <Text style={styles.actionText}>{aiLoading ? "Analysiere..." : "KI-Analyse starten"}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  scrollContainer: { paddingBottom: 80, backgroundColor: "#F7F9FB", alignItems: "center" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F7F9FB" },
  placeholder: { color: "#9aa4b2", fontSize: 16 },

  // Zeitfilter
  filterContainer: {
    flexDirection: "row",
    width: screenWidth - 36,
    marginTop: 12,
    marginBottom: 8,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E5EA",
    elevation: 1,
  },
  filterButtonActive: {
    backgroundColor: "#007aff",
    borderColor: "#007aff",
    elevation: 3,
  },
  filterText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#666",
  },
  filterTextActive: {
    color: "#fff",
    fontWeight: "700",
  },

  // Trend-Indikator
  trendCard: {
    width: screenWidth - 36,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
  },
  trendEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  trendContent: {
    flex: 1,
  },
  trendLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
    marginBottom: 2,
  },
  trendChange: {
    fontSize: 14,
    color: "#666",
  },

  // Insight-Cards
  insightsContainer: {
    width: screenWidth - 36,
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  insightCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    elevation: 2,
  },
  insightEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  insightTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#666",
    textAlign: "center",
    marginBottom: 4,
  },
  insightValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#007aff",
    marginBottom: 2,
  },
  insightDetail: {
    fontSize: 10,
    color: "#999",
    textAlign: "center",
  },

  card: {
    width: screenWidth - 32,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    marginTop: 8,
    elevation: 3,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#111", marginBottom: 8 },

  chart: { borderRadius: 12 },
  avgBox: {
    width: screenWidth - 36,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    elevation: 2,
  },
  avgText: { fontSize: 15, color: "#333", textAlign: "center" },
  avgValue: { fontWeight: "700", color: "#007aff" },

  listContainer: { width: screenWidth - 36, marginTop: 18 },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginBottom: 10, color: "#222" },

  entryCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    elevation: 2,
  },
  entryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  entryDate: { fontSize: 14, fontWeight: "700", color: "#333" },
  metaRow: { flexDirection: "row", marginTop: 4, alignItems: "center" },
  entryEmotion: { fontSize: 14, color: "#444", marginRight: 8 },
  entryTheme: { fontSize: 13, color: "#7b8a98" },

  rightCol: { alignItems: "flex-end" },
  entryScore: { fontWeight: "800", color: "#007aff", fontSize: 14 },
  pill: { marginTop: 6, borderRadius: 12, paddingVertical: 4, paddingHorizontal: 8 },
  pillText: { fontSize: 12, fontWeight: "600" },
  pillGood: { backgroundColor: "#e8f7ee" },
  pillMuted: { backgroundColor: "#f2f4f7", color: "#9aa4b2" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center" },
  modalContent: { width: "88%", backgroundColor: "#fff", borderRadius: 14, padding: 14, elevation: 5 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#111" },
  modalBody: { marginTop: 10 },
  modalLine: { fontSize: 15, marginVertical: 4, color: "#333" },
  modalText: { fontSize: 15, color: "#333" },
  modalSubTitle: { fontSize: 15, fontWeight: "700", color: "#111" },
  analysisScroll: { maxHeight: 160, marginTop: 8 },
  modalAnalysis: { fontSize: 14, color: "#333", lineHeight: 20, backgroundColor: "#f6f8fb", padding: 10, borderRadius: 10 },

  actionButton: {
    marginTop: 12,
    backgroundColor: "#007aff",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  actionButtonDisabled: { opacity: 0.85 },
  actionText: { color: "#fff", fontWeight: "700" },
});
