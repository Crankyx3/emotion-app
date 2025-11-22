import React, { useEffect, useState, useRef } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePremium } from "../components/PremiumProvider";
import { useAuth } from "../components/AuthProvider";
import { getLocalEntries, getLocalWeeklyAnalyses, saveWeeklyAnalysisLocally } from "../services/localStorageService";

export default function AnalysisScreen() {
  const navigation = useNavigation();
  const { canUseFeature, getTrialText } = usePremium();
  const { isGuestMode } = useAuth();
  const scrollViewRef = useRef(null);
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
  const [insights, setInsights] = useState([]); // Muster-Erkennung: Korrelationen

  // Prüfen, ob Analyse in den letzten 7 Tagen erstellt wurde
  const checkRecentAnalysis = async () => {
    try {
      if (isGuestMode || !auth.currentUser) {
        setCheckingLimit(false);
        setCanAnalyze(false);
        return;
      }

      const userId = auth.currentUser.uid;
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // 🔒 DATENSCHUTZ: Lade Wochenanalysen aus lokalem Storage
      const localAnalyses = await getLocalWeeklyAnalyses(userId);

      // Nach Datum filtern und sortieren
      const recentAnalyses = localAnalyses
        .filter(analysis => {
          if (!analysis.createdAt) return false;
          const analysisDate = new Date(analysis.createdAt);
          return analysisDate >= sevenDaysAgo;
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      if (recentAnalyses.length > 0) {
        const lastAnalysis = recentAnalyses[0];
        const lastDate = new Date(lastAnalysis.createdAt);
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
      if (isGuestMode || !auth.currentUser) {
        setAllAnalyses([]);
        return;
      }

      const userId = auth.currentUser.uid;

      // 🔒 DATENSCHUTZ: Lade Analysen aus lokalem Storage
      const localAnalyses = await getLocalWeeklyAnalyses(userId);

      // Nach Datum sortieren und Dates konvertieren
      const analyses = (localAnalyses || [])
        .map((analysis) => ({
          id: analysis.localId,
          ...analysis,
          // Konvertiere String-Dates zu Date-Objekten
          createdAt: analysis.createdAt ? new Date(analysis.createdAt) : null,
          analysisDate: analysis.createdAt ? new Date(analysis.createdAt) : null,
        }))
        .sort((a, b) => {
          if (!a.createdAt || !b.createdAt) return 0;
          return b.createdAt.getTime() - a.createdAt.getTime();
        });

      setAllAnalyses(analyses);
    } catch (err) {
      console.error("Fehler beim Laden der Analysen:", err);
      setAllAnalyses([]); // Sicherheitsfallback
    }
  };

  // Muster-Erkennung: Berechne Korrelationen
  const calculateInsights = (data) => {
    if (data.length < 5) {
      setInsights([]);
      return; // Zu wenige Daten für aussagekräftige Korrelationen
    }

    const correlations = [];

    // Emotionsverteilung analysieren
    const emotionCounts = {};
    data.forEach(e => {
      const emotion = e.emotion || "Unbekannt";
      emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
    });

    const sortedEmotions = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1]);
    const mostFrequent = sortedEmotions[0];

    if (mostFrequent && mostFrequent[1] >= data.length * 0.4) {
      const percentage = Math.round((mostFrequent[1] / data.length) * 100);
      correlations.push({
        icon: "📊",
        title: "Häufigste Emotion",
        text: `${mostFrequent[0]} tritt in ${percentage}% der Einträge auf.`,
        type: mostFrequent[0].includes("Glücklich") || mostFrequent[0].includes("Zufrieden") ? "positive" : "neutral"
      });
    }

    // Analyse von Stimmungstrends über Zeit
    if (data.length >= 5) {
      const first3 = data.slice(0, 3);
      const last3 = data.slice(-3);

      const avgFirst = first3.reduce((sum, e) => sum + (e.feelScore || 0), 0) / first3.length;
      const avgLast = last3.reduce((sum, e) => sum + (e.feelScore || 0), 0) / last3.length;
      const trend = avgLast - avgFirst;

      if (Math.abs(trend) > 10) {
        correlations.push({
          icon: trend > 0 ? "📈" : "📉",
          title: trend > 0 ? "Positive Entwicklung" : "Rückläufige Stimmung",
          text: `Dein Wohlfühlscore hat sich um ${Math.abs(trend).toFixed(0)} Punkte ${trend > 0 ? "verbessert" : "verschlechtert"}.`,
          type: trend > 0 ? "positive" : "negative"
        });
      }
    }

    setInsights(correlations);
  };

  useEffect(() => {
    const fetchWeekData = async () => {
      try {
        if (isGuestMode || !auth.currentUser) {
          setLoading(false);
          setEntries([]);
          return;
        }

        const userId = auth.currentUser.uid;
        const now = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);

        // 🔒 DATENSCHUTZ: Lade Einträge aus lokalem Storage
        const localEntries = await getLocalEntries(userId);

        // Nach Datum filtern (letzte 7 Tage)
        const data = localEntries
          .filter((entry) => {
            if (!entry.createdAt) return false;
            const entryDate = new Date(entry.createdAt);
            return entryDate >= sevenDaysAgo;
          })
          .sort((a, b) => {
            if (!a.createdAt || !b.createdAt) return 0;
            return new Date(a.createdAt) - new Date(b.createdAt);
          });

        setEntries(data);
        calculateInsights(data); // Berechne Muster
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

  if (!entries || entries.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.placeholder}>Noch keine Einträge in dieser Woche 😌</Text>
      </View>
    );
  }

  // Durchschnittswerte berechnen
  const avg = entries.reduce((sum, e) => sum + (e.feelScore ?? 0), 0) / Math.max(entries.length, 1);

  const handleWeeklyAnalysis = async () => {
    // Prüfe ob KI-Analysen aktiviert sind
    const aiEnabled = await AsyncStorage.getItem(`aiAnalysisEnabled_${auth.currentUser.uid}`);
    if (aiEnabled === 'false') {
      Alert.alert(
        "KI-Analysen deaktiviert",
        "Du hast KI-Analysen in den Einstellungen deaktiviert. Aktiviere sie, um diese Funktion zu nutzen.",
        [
          { text: "OK" },
          {
            text: "Zu Einstellungen",
            onPress: () => navigation.navigate("Settings")
          }
        ]
      );
      return;
    }

    // Prüfe Premium-Status
    if (!canUseFeature('weeklyAnalysis')) {
      const trialInfo = getTrialText();
      Alert.alert(
        "Premium Feature",
        `KI-Wochenanalysen sind ein Premium-Feature.\n\n${trialInfo || 'Upgrade auf Premium für unbegrenzte Analysen.'}`,
        [
          { text: "Abbrechen", style: "cancel" },
          {
            text: "Mehr erfahren",
            onPress: () => navigation.navigate('Paywall')
          }
        ]
      );
      return;
    }

    if (!canAnalyze) {
      Alert.alert(
        "Analyse nicht verfügbar",
        `Du kannst die Wochenanalyse nur alle 7 Tage nutzen. Nächste Analyse verfügbar in ${daysUntilNext} Tag(en).`
      );
      return;
    }

    setAnalyzing(true);
    try {
      // Erweiterte Zusammenfassung mit Themen und Texten
      const detailedSummary = (entries || [])
        .map((e, index) => {
          const date = new Date(e.createdAt).toLocaleDateString("de-DE");
          const basics = `${e.emotion || "Unbekannt"} | Wohlfühlscore=${e.feelScore}/99`;
          const themeText = e.theme ? `\n   Thema: ${e.theme}` : '';
          const userText = e.text ? `\n   "${e.text}"` : '';

          return `${index + 1}. ${date}: ${basics}${themeText}${userText}`;
        })
        .join("\n\n");

      const prompt = `
Du bist ein psychologischer Therapeut, der eine wöchentliche Verlaufsanalyse durchführt.

WOCHENDATEN:
Durchschnittlicher Wohlfühlscore: ${avg.toFixed(1)} / 99
Anzahl Einträge: ${entries.length} Tage

DETAILLIERTE EINTRÄGE:
${detailedSummary}

AUFGABE:
Erstelle eine tiefgehende Wochenanalyse mit folgenden Aspekten:
- Welche Themen, Muster und Emotionen wiederholen sich?
- Welche kognitiven Muster zeigen sich (z.B. aus CBT, ACT)?
- Wie hat sich die Stimmung im Wochenverlauf entwickelt?
- Was sind konkrete Empfehlungen für die nächste Woche?

WICHTIG: Schreibe in fließendem, gut lesbarem Text OHNE Markdown, OHNE Sternchen, OHNE ### Überschriften. Verwende stattdessen natürliche Absätze und klare Struktur.

STRUKTUR:
Beginne mit "Wochenüberblick:" gefolgt von 2-3 Sätzen zum Gesamteindruck.

Dann "Erkannte Muster:" mit 3-4 Sätzen zu wiederkehrenden Themen und kognitiven Mustern.

Dann "Entwicklung:" mit 2-3 Sätzen zur Veränderung im Wochenverlauf.

Dann "Empfehlungen:" mit 3-4 konkreten, umsetzbaren Vorschlägen.

Abschluss: Beende mit genau einem Wort in einer neuen Zeile: POSITIV, NEUTRAL oder NEGATIV.
`;

      const reply = await getAiResponse("psychologische Wochenanalyse", prompt);

      // Stimmung auswerten
      const mood = reply.toUpperCase().includes("POSITIV")
        ? "positiv"
        : reply.toUpperCase().includes("NEGATIV")
        ? "negativ"
        : "neutral";

      // Entferne die Stimmungs-Markierung aus dem Text
      const cleanedText = reply
        .replace(/\n\s*(POSITIV|NEGATIV|NEUTRAL)\s*$/i, '')
        .replace(/(POSITIV|NEGATIV|NEUTRAL)\s*$/i, '')
        .trim();

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
      setAiText(cleanedText);
      setExpanded(false);

      const userId = auth.currentUser.uid;
      const now = new Date();

      // 🔒 DATENSCHUTZ: Speichere Analyse lokal
      const savedAnalysis = await saveWeeklyAnalysisLocally(userId, {
        analysis: reply, // ✅ NUR LOKAL
        highlight: highlightData,
        entriesCount: entries.length,
        avgStats: {
          feelScore: avg,
        },
      });

      console.log("✅ Wochenanalyse lokal gespeichert");

      // Nur Metadaten in Firestore (für 7-Tage-Limit)
      await addDoc(collection(db, "weeklyAnalyses"), {
        userId: userId,
        analysisDate: Timestamp.now(),
        entriesCount: entries.length,
        hasLocalData: true,
        // KEINE analysis, KEINE highlight - Datenschutz!
      });

      console.log("✅ Analyse-Metadaten in Cloud gespeichert");

      // Status aktualisieren
      setCanAnalyze(false);
      setLastAnalysisDate(now);
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
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => navigation.navigate("Settings")}
      >
        <Ionicons name="settings-outline" size={28} color="#007AFF" />
      </TouchableOpacity>
      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.container}>
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

          {/* Emotionsverteilung */}
          <View style={styles.emotionsSummary}>
            <Text style={styles.emotionsSummaryTitle}>Emotionen diese Woche:</Text>
            {(() => {
              const emotionCounts = {};
              entries.forEach(e => {
                const emotion = e.emotion || "Unbekannt";
                emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
              });
              return Object.entries(emotionCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([emotion, count]) => (
                  <Text key={emotion} style={styles.emotionCount}>
                    {emotion}: {count}x
                  </Text>
                ));
            })()}
          </View>
        </View>

        {/* Muster-Erkennung: Insights */}
        {insights && insights.length > 0 && (
          <View style={styles.insightsSection}>
            <View style={styles.insightsHeader}>
              <Ionicons name="analytics" size={22} color="#007AFF" />
              <Text style={styles.insightsTitle}>🔍 Deine Muster</Text>
            </View>
            <Text style={styles.insightsSubtitle}>
              Diese Zusammenhänge haben wir in deinen Daten gefunden:
            </Text>

            {insights.map((insight, index) => (
              <View
                key={index}
                style={[
                  styles.insightCard,
                  insight.type === "positive" ? styles.insightPositive : styles.insightNegative
                ]}
              >
                <Text style={styles.insightIcon}>{insight.icon}</Text>
                <View style={styles.insightContent}>
                  <Text style={styles.insightTitle}>{insight.title}</Text>
                  <Text style={styles.insightText}>{insight.text}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

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

            {/* Absätze mit Whitespace und fetten Überschriften */}
            {aiText.split('\n\n').filter(para => para.trim()).map((paragraph, index) => {
              const trimmedPara = paragraph.trim();
              // Prüfe ob der Absatz mit "Überschrift:" beginnt
              const headingMatch = trimmedPara.match(/^([^:]+):\s*(.*)$/s);

              if (headingMatch) {
                const heading = headingMatch[1];
                const content = headingMatch[2];
                return (
                  <View key={index} style={styles.paragraphContainer}>
                    <Text
                      style={styles.analysisText}
                      numberOfLines={!expanded && index > 0 ? 3 : undefined}
                    >
                      <Text style={styles.headingText}>{heading}:</Text>
                      {' ' + content}
                    </Text>
                  </View>
                );
              }

              return (
                <View key={index} style={styles.paragraphContainer}>
                  <Text
                    style={styles.analysisText}
                    numberOfLines={!expanded && index > 0 ? 3 : undefined}
                  >
                    {trimmedPara}
                  </Text>
                </View>
              );
            })}

            {/* Mehr/Weniger Button */}
            <TouchableOpacity
              onPress={() => setExpanded(!expanded)}
              style={styles.moreButton}
            >
              <Text style={styles.moreButtonText}>
                {expanded ? "Weniger anzeigen ↑" : "Mehr anzeigen ↓"}
              </Text>
            </TouchableOpacity>

            {/* Button: Mit OCD-Coach über Wochenanalyse sprechen */}
            <TouchableOpacity
              style={styles.chatButton}
              onPress={() => navigation.navigate('Chat', {
                context: aiText,
                type: 'weekly',
                date: new Date().toLocaleDateString('de-DE'),
              })}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.chatButtonGradient}
              >
                <Ionicons name="chatbubbles" size={22} color="#fff" />
                <Text style={styles.chatButtonText}>Mit OCD-Coach über Wochenanalyse sprechen</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Verlauf aller Wochenanalysen */}
        {allAnalyses && allAnalyses.length > 0 && (
          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <Ionicons name="time-outline" size={24} color="#007AFF" />
              <Text style={styles.historyTitle}>Verlauf ({allAnalyses.length})</Text>
            </View>

            {allAnalyses.map((item, index) => {
              // analysisDate ist bereits ein Date-Objekt (von loadAnalysisHistory)
              const date = item.analysisDate;
              return (
                <View key={item.id} style={styles.historyItem}>
                  <View style={styles.historyItemHeader}>
                    <Text style={styles.historyDate}>
                      {date instanceof Date ? date.toLocaleDateString("de-DE", {
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
                      💙 {item.avgStats?.feelScore?.toFixed(1) || "?"}/99
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
                      // Nach oben scrollen zur Analyse-Anzeige
                      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
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
    paddingTop: 40,
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
  emotionsSummary: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  emotionsSummaryTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  emotionCount: {
    fontSize: 15,
    color: "#666",
    marginVertical: 2,
  },
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
  paragraphContainer: {
    backgroundColor: "#F7F9FC",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#007AFF",
  },
  analysisText: {
    fontSize: 16,
    color: "#1C1C1E",
    lineHeight: 26,
    textAlign: "left",
  },
  headingText: {
    fontWeight: "700",
    color: "#007AFF",
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
  // Insights / Muster-Erkennung
  insightsSection: {
    width: "90%",
    marginTop: 20,
    marginBottom: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  insightsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1C1C1E",
    marginLeft: 8,
  },
  insightsSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
    fontStyle: "italic",
  },
  insightCard: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  insightPositive: {
    backgroundColor: "#E8F5E9",
    borderLeftColor: "#37B24D",
  },
  insightNegative: {
    backgroundColor: "#FFF5F5",
    borderLeftColor: "#E03131",
  },
  insightIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 4,
  },
  insightText: {
    fontSize: 14,
    color: "#3C3C43",
    lineHeight: 20,
  },

  // Chat Button Styles
  chatButton: {
    marginTop: 24,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  chatButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  chatButtonText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});
