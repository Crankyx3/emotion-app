import React, { useEffect, useState } from "react";
import ScreenHeader from "../components/ScreenHeader";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { collection, getDocs, query, where, orderBy, addDoc, Timestamp, limit } from "firebase/firestore";
import { db, auth } from "../firebaseconfig";
import { getAiResponse } from "../openaiService";

export default function AnalysisScreen() {
  const navigation = useNavigation();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiText, setAiText] = useState(null);
  const [highlight, setHighlight] = useState(null);
  const [expanded, setExpanded] = useState(false);

  // Neue States für 7-Tage-Limit und Verlauf
  const [canAnalyze, setCanAnalyze] = useState(true);
  const [checkingLimit, setCheckingLimit] = useState(true);
  const [lastAnalysisDate, setLastAnalysisDate] = useState(null);
  const [daysUntilNext, setDaysUntilNext] = useState(0);
  const [allAnalyses, setAllAnalyses] = useState([]); // Verlauf aller Analysen

  // Prüfen, ob Analyse in den letzten 7 Tagen erstellt wurde
  const checkRecentAnalysis = async () => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const q = query(
        collection(db, "weeklyAnalyses"),
        where("userId", "==", auth.currentUser.uid),
        where("analysisDate", ">=", Timestamp.fromDate(sevenDaysAgo)),
        orderBy("analysisDate", "desc"),
        limit(1)
      );

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const lastAnalysis = snapshot.docs[0].data();
        const lastDate = lastAnalysis.analysisDate.toDate();
        const now = new Date();
        const diffTime = Math.abs(now - lastDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const daysLeft = 7 - diffDays;

        setCanAnalyze(false);
        setLastAnalysisDate(lastDate);
        setDaysUntilNext(daysLeft > 0 ? daysLeft : 0);
        setAiText(lastAnalysis.analysis);
        setHighlight(lastAnalysis.highlight);
      } else {
        setCanAnalyze(true);
      }
    } catch (err) {
      console.error("Fehler beim Prüfen der Analyse:", err);
    } finally {
      setCheckingLimit(false);
    }
  };

  // Alle bisherigen Analysen laden (für Verlauf)
  const loadAnalysisHistory = async () => {
    try {
      const q = query(
        collection(db, "weeklyAnalyses"),
        where("userId", "==", auth.currentUser.uid),
        orderBy("analysisDate", "desc")
      );

      const snapshot = await getDocs(q);
      const analyses = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAllAnalyses(analyses);
    } catch (err) {
      console.error("Fehler beim Laden der Analysen:", err);
    }
  };

  useEffect(() => {
    const fetchWeekData = async () => {
      try {
        const now = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);

        const q = query(
          collection(db, "entries"),
          where("createdAt", ">=", sevenDaysAgo),
          orderBy("createdAt", "asc")
        );

        const snap = await getDocs(q);
        const data = snap.docs.map((doc) => doc.data());
        setEntries(data);
      } catch (err) {
        console.error("Fehler beim Laden:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWeekData();
    checkRecentAnalysis();
    loadAnalysisHistory();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007aff" />
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.placeholder}>Noch keine Einträge in dieser Woche 😌</Text>
      </View>
    );
  }

  // Durchschnittswerte berechnen
  const avg = entries.reduce((sum, e) => sum + (e.feelScore ?? 0), 0) / entries.length;
  const avgSleep = entries.reduce((s, e) => s + (e.sleep ?? 0), 0) / entries.length;
  const avgEnergy = entries.reduce((s, e) => s + (e.energy ?? 0), 0) / entries.length;
  const avgSelfWorth = entries.reduce((s, e) => s + (e.selfWorth ?? 0), 0) / entries.length;

  const handleWeeklyAnalysis = async () => {
    if (!canAnalyze) {
      Alert.alert(
        "Analyse nicht verfügbar",
        `Du kannst die Wochenanalyse nur alle 7 Tage nutzen. Nächste Analyse verfügbar in ${daysUntilNext} Tag(en).`
      );
      return;
    }

    setAnalyzing(true);
    try {
      const summary = entries
        .map(
          (e) =>
            `${new Date(e.createdAt.seconds * 1000).toLocaleDateString("de-DE")}: ${
              e.emotion || "Unbekannt"
            } | Schlaf=${e.sleep || "?"}/10 | Energie=${e.energy || "?"}/10 | Selbstwert=${
              e.selfWorth || "?"
            }/10 | Score=${e.feelScore}/99`
        )
        .join("\n");

      const prompt = `
Analysiere die psychologische Entwicklung dieser Woche basierend auf folgenden Daten:

Durchschnittswerte:
• Schlafqualität: ${avgSleep.toFixed(1)} / 10
• Energielevel: ${avgEnergy.toFixed(1)} / 10
• Selbstwertgefühl: ${avgSelfWorth.toFixed(1)} / 10
• Wohlfühlscore: ${avg.toFixed(1)} / 99

Tägliche Werte:
${summary}

Bitte gib eine strukturierte, empathische Analyse mit:
1️⃣ Allgemeine Stimmung der Woche
2️⃣ Entwicklung (positiv, stabil, rückläufig)
3️⃣ Auffällige Trends (Schlaf, Energie, Selbstwert)
4️⃣ Kurzer psychologischer Rat für nächste Woche
Beende mit einem einzelnen Wort, das die Stimmung beschreibt: POSITIV, NEUTRAL oder NEGATIV.
`;

      const reply = await getAiResponse("psychologische Wochenanalyse", prompt);

      // Stimmung auswerten
      const mood = reply.toUpperCase().includes("POSITIV")
        ? "positiv"
        : reply.toUpperCase().includes("NEGATIV")
        ? "negativ"
        : "neutral";

      const colorMap = {
        positiv: ["#b2f2bb", "#d3f9d8"],
        neutral: ["#fff3bf", "#fff9db"],
        negativ: ["#ffc9c9", "#ffe3e3"],
      };

      const titleMap = {
        positiv: "🌿 Deine Woche war insgesamt positiv",
        neutral: "🌤️ Deine Woche war ausgeglichen",
        negativ: "🌧️ Deine Woche war eher herausfordernd",
      };

      const highlightData = {
        mood,
        title: titleMap[mood],
        colors: colorMap[mood],
      };

      setHighlight(highlightData);
      setAiText(reply);
      setExpanded(false);

      // In Firestore speichern
      await addDoc(collection(db, "weeklyAnalyses"), {
        userId: auth.currentUser.uid,
        analysis: reply,
        highlight: highlightData,
        analysisDate: Timestamp.now(),
        entriesCount: entries.length,
        avgStats: {
          sleep: avgSleep,
          energy: avgEnergy,
          selfWorth: avgSelfWorth,
          feelScore: avg,
        },
      });

      // Status aktualisieren
      setCanAnalyze(false);
      setLastAnalysisDate(new Date());
      setDaysUntilNext(7);

      // Verlauf neu laden
      await loadAnalysisHistory();

      Alert.alert("Erfolg", "Wochenanalyse wurde gespeichert!");
    } catch (err) {
      Alert.alert("Fehler bei der Analyse", err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <LinearGradient colors={["#EAF4FF", "#FFFFFF"]} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader
          title="🧭 KI-Wochenanalyse"
          subtitle="Deine psychologische Wochenauswertung"
        />

        {/* Lade-Indikator während Limit-Check */}
        {checkingLimit && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingText}>Prüfe Verfügbarkeit...</Text>
          </View>
        )}

        {/* Status-Karte: Verfügbarkeit */}
        {!checkingLimit && (
          <View style={[styles.statusCard, canAnalyze ? styles.statusAvailable : styles.statusUsed]}>
            <Ionicons
              name={canAnalyze ? "checkmark-circle" : "lock-closed"}
              size={24}
              color={canAnalyze ? "#37B24D" : "#E03131"}
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.statusTitle}>
                {canAnalyze ? "Analyse verfügbar" : "Bereits genutzt"}
              </Text>
              <Text style={styles.statusSubtitle}>
                {canAnalyze
                  ? "Du kannst jetzt eine Wochenanalyse erstellen"
                  : lastAnalysisDate
                  ? `Letzte Analyse: ${lastAnalysisDate.toLocaleDateString("de-DE")} • Verfügbar in ${daysUntilNext} Tag(en)`
                  : "Nächste Analyse in wenigen Tagen verfügbar"}
              </Text>
            </View>
          </View>
        )}

        {/* Statistikkarte */}
        <View style={styles.statsBox}>
          <Text style={styles.stat}>📅 Tage berücksichtigt: {entries.length}</Text>
          <Text style={styles.stat}>💙 Ø Wohlfühlwert: {avg.toFixed(1)} / 99</Text>
          <Text style={styles.stat}>🛏️ Ø Schlaf: {avgSleep.toFixed(1)} / 10</Text>
          <Text style={styles.stat}>⚡ Ø Energie: {avgEnergy.toFixed(1)} / 10</Text>
          <Text style={styles.stat}>❤️ Ø Selbstwert: {avgSelfWorth.toFixed(1)} / 10</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, !canAnalyze && styles.buttonDisabled]}
          onPress={handleWeeklyAnalysis}
          disabled={analyzing || !canAnalyze}
        >
          {!canAnalyze && (
            <Ionicons name="lock-closed" size={18} color="#fff" style={{ marginRight: 8 }} />
          )}
          <Text style={styles.buttonText}>
            {analyzing
              ? "Analysiere Woche..."
              : canAnalyze
              ? "KI-Wochenanalyse starten"
              : `Verfügbar in ${daysUntilNext} Tag(en)`}
          </Text>
        </TouchableOpacity>

        {highlight && (
          <LinearGradient
            colors={highlight.colors}
            style={[
              styles.highlightBox,
              {
                borderColor:
                  highlight.mood === "negativ"
                    ? "#e03131"
                    : highlight.mood === "positiv"
                    ? "#37b24d"
                    : "#f59f00",
              },
            ]}
          >
            <Text style={styles.highlightTitle}>{highlight.title}</Text>
          </LinearGradient>
        )}

        {/* KI-Analyse mit Mehr/Weniger-Anzeige */}
        {aiText && (
          <View style={styles.analysisBox}>
            <Text style={styles.analysisHeader}>🧠 KI-Analyse</Text>
            <Text
              style={styles.analysisText}
              numberOfLines={expanded ? undefined : 5} // Zeilenbegrenzung
            >
              {aiText}
            </Text>

            {/* Mehr/Weniger Button */}
            <TouchableOpacity
              onPress={() => setExpanded(!expanded)}
              style={styles.moreButton}
            >
              <Text style={styles.moreButtonText}>
                {expanded ? "Weniger anzeigen ↑" : "Mehr anzeigen ↓"}
              </Text>
            </TouchableOpacity>

            {/* Chat-Button: öffnet den Reflexions-Chat mit der KI-Analyse als Kontext */}
            <TouchableOpacity
              style={[styles.button, { marginTop: 14 }]}
              onPress={() => navigation.navigate("Chat", { context: aiText })}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
                <Text style={[styles.buttonText, { marginLeft: 10 }]}>Reflexions-Chat starten</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Verlauf aller Wochenanalysen */}
        {allAnalyses.length > 0 && (
          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <Ionicons name="time-outline" size={24} color="#007AFF" />
              <Text style={styles.historyTitle}>Verlauf ({allAnalyses.length})</Text>
            </View>

            {allAnalyses.map((item, index) => {
              const date = item.analysisDate?.toDate();
              return (
                <View key={item.id} style={styles.historyItem}>
                  <View style={styles.historyItemHeader}>
                    <Text style={styles.historyDate}>
                      {date ? date.toLocaleDateString("de-DE", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                      }) : "Unbekannt"}
                    </Text>
                    {item.highlight?.mood && (
                      <View style={[
                        styles.moodBadge,
                        { backgroundColor:
                          item.highlight.mood === "positiv" ? "#37B24D" :
                          item.highlight.mood === "negativ" ? "#E03131" :
                          "#F59F00"
                        }
                      ]}>
                        <Text style={styles.moodBadgeText}>
                          {item.highlight.mood === "positiv" ? "🌿 Positiv" :
                           item.highlight.mood === "negativ" ? "🌧️ Herausfordernd" :
                           "🌤️ Ausgeglichen"}
                        </Text>
                      </View>
                    )}
                  </View>

                  {item.entriesCount && (
                    <Text style={styles.historyStats}>
                      📅 {item.entriesCount} Tage •
                      💙 {item.avgStats?.feelScore?.toFixed(1) || "?"}/99 •
                      🛏️ {item.avgStats?.sleep?.toFixed(1) || "?"}/10
                    </Text>
                  )}

                  <Text
                    style={styles.historyText}
                    numberOfLines={3}
                  >
                    {item.analysis || "Keine Analyse verfügbar"}
                  </Text>

                  <TouchableOpacity
                    style={styles.viewButton}
                    onPress={() => {
                      setAiText(item.analysis);
                      setHighlight(item.highlight);
                      setExpanded(false);
                    }}
                  >
                    <Text style={styles.viewButtonText}>Vollständig anzeigen</Text>
                    <Ionicons name="arrow-forward" size={16} color="#007AFF" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: {
    alignItems: "center",
    paddingBottom: 100,
    paddingHorizontal: 20,
  },
  statsBox: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 15,
    paddingHorizontal: 25,
    width: "90%",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 25,
    marginTop: 20,
  },
  stat: { fontSize: 17, color: "#333", marginVertical: 3 },
  button: {
    backgroundColor: "#007aff",
    paddingVertical: 14,
    paddingHorizontal: 50,
    borderRadius: 30,
    elevation: 2,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  highlightBox: {
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 20,
    width: "90%",
    marginTop: 25,
    borderWidth: 1.5,
  },
  highlightTitle: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
    color: "#222",
  },
  analysisBox: {
    backgroundColor: "#fff",
    marginTop: 25,
    padding: 18,
    borderRadius: 15,
    width: "90%",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  analysisHeader: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    textAlign: "center",
  },
  analysisText: {
    fontSize: 16,
    color: "#333",
    lineHeight: 22,
    textAlign: "left",
  },
  moreButton: {
    marginTop: 10,
    alignSelf: "center",
  },
  moreButtonText: {
    color: "#007aff",
    fontWeight: "600",
    fontSize: 15,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f7f8fa",
  },
  placeholder: { fontSize: 16, color: "#888" },
  loadingCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 16,
    width: "90%",
    marginTop: 20,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 15,
    color: "#666",
    fontWeight: "500",
  },
  statusCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 16,
    width: "90%",
    marginTop: 20,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statusAvailable: {
    borderLeftWidth: 4,
    borderLeftColor: "#37B24D",
  },
  statusUsed: {
    borderLeftWidth: 4,
    borderLeftColor: "#E03131",
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 14,
    color: "#666",
    lineHeight: 18,
  },
  buttonDisabled: {
    backgroundColor: "#999",
    opacity: 0.6,
  },
  historySection: {
    width: "90%",
    marginTop: 30,
    marginBottom: 20,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
    marginLeft: 10,
  },
  historyItem: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  historyItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  historyDate: {
    fontSize: 15,
    fontWeight: "600",
    color: "#444",
  },
  moodBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  moodBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  historyStats: {
    fontSize: 13,
    color: "#666",
    marginBottom: 8,
  },
  historyText: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
    marginBottom: 10,
  },
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#007AFF",
    marginRight: 6,
  },
});
