import React, { useEffect, useRef, useState } from "react";
import ScreenHeader from "../components/ScreenHeader";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  ScrollView,
  Alert,
  SafeAreaView,
} from "react-native";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { getAiResponse } from "../openaiService";
import {
  doc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
  limit,
} from "firebase/firestore";
import { db, auth } from "../firebaseconfig";

export default function DailyAnalysisScreen({ route, navigation }) {
  const { feelScore, sleep, energy, selfWorth, emotion, text, theme } = route.params || {};
  const [aiText, setAiText] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysisValid, setAnalysisValid] = useState(false);
  const [todayAnalysis, setTodayAnalysis] = useState(null);
  const [canAnalyze, setCanAnalyze] = useState(true);
  const [checkingLimit, setCheckingLimit] = useState(true);

  // progress für Ladebalken
  const progress = useRef(new Animated.Value(0)).current;

  // Für animierten Textzähler
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [displayedScore, setDisplayedScore] = useState(0);

  // Für den „Atem"-Effekt
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Prüfe beim Start ob heute bereits eine Analyse existiert
  useEffect(() => {
    checkTodayAnalysis();
  }, []);

  const checkTodayAnalysis = async () => {
    if (!auth.currentUser) {
      setCheckingLimit(false);
      return;
    }

    try {
      // Hole heutiges Datum (Start des Tages)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Hole morgiges Datum (Ende des Tages)
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Suche nach Analysen von heute
      const q = query(
        collection(db, "entries"),
        where("userId", "==", auth.currentUser.uid),
        where("analysisDate", ">=", Timestamp.fromDate(today)),
        where("analysisDate", "<", Timestamp.fromDate(tomorrow)),
        orderBy("analysisDate", "desc"),
        limit(1)
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        // Heute wurde bereits analysiert
        const doc = snapshot.docs[0];
        const data = doc.data();
        setTodayAnalysis(data);
        setAiText(data.analysis);
        setAnalysisValid(true);
        setCanAnalyze(false);
        console.log("✅ Heute bereits analysiert");
      } else {
        // Noch keine Analyse heute
        setCanAnalyze(true);
        console.log("✅ Analyse heute noch verfügbar");
      }
    } catch (error) {
      console.error("Error checking today's analysis:", error);
      // Im Fehlerfall: Analyse erlauben
      setCanAnalyze(true);
    } finally {
      setCheckingLimit(false);
    }
  };

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: feelScore || 0,
      duration: 800,
      useNativeDriver: false,
    }).start();

    const listener = animatedValue.addListener(({ value }) => {
      setDisplayedScore(Math.round(value));
    });

    return () => {
      animatedValue.removeListener(listener);
    };
  }, [feelScore]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleAiAnalysis = async () => {
    // Prüfe ob heute bereits analysiert wurde
    if (!canAnalyze) {
      Alert.alert(
        "Bereits analysiert",
        "Du hast heute bereits eine Tagesanalyse erstellt. Die nächste Analyse ist ab morgen um 00:00 Uhr verfügbar.",
        [{ text: "OK" }]
      );
      return;
    }

    // Schutz vor fehlenden Werten — zeige klare Meldung
    if (feelScore == null || theme == null) {
      Alert.alert("Bitte erst die Tagesdaten ausfüllen");
      setAiText(null);
      setAnalysisValid(false);
      return;
    }

    // Start Ladezustand + animierten Progress aufbauen
    setLoading(true);
    setAnalysisValid(false);
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 0.92,
      duration: 12000, // läuft solange die KI antwortet (simulierter "Vorlauf")
      useNativeDriver: false,
    }).start();

    try {
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
      setAiText(reply);
      // Prüfung, ob die Antwort plausibel ist (kein Fehler-Text)
      const ok = typeof reply === "string" && reply.trim().length > 20 && !/fehler/i.test(reply);
      setAnalysisValid(ok);

      // Speichere mit analysisDate für das Daily Limit
      const analysisDate = Timestamp.now();

      // Nur wenn Werte gültig sind, Query ausführen
      const q = query(
        collection(db, "entries"),
        where("feelScore", "==", feelScore),
        where("theme", "==", theme)
      );

      const snap = await getDocs(q);

      if (!snap.empty) {
        const entryDoc = snap.docs[0].ref;
        await updateDoc(entryDoc, {
          analysis: reply,
          analysisDate: analysisDate
        });
        console.log("✅ Analyse in Firestore gespeichert.");
      } else {
        await addDoc(collection(db, "entries"), {
          userId: auth.currentUser?.uid,
          emotion,
          feelScore,
          sleep,
          energy,
          selfWorth,
          theme,
          text,
          analysis: reply,
          analysisDate: analysisDate,
          createdAt: Timestamp.now(),
        });
        console.log("📄 Neuer Eintrag mit Analyse erstellt.");
      }

      // Markiere als heute bereits verwendet
      setCanAnalyze(false);
      setTodayAnalysis({
        emotion,
        feelScore,
        sleep,
        energy,
        selfWorth,
        theme,
        text,
        analysis: reply,
        analysisDate: analysisDate.toDate(),
      });

    } catch (error) {
      setAiText("Fehler bei der Analyse 😕");
      setAnalysisValid(false);
      console.error(error);
    } finally {
      // Ladebalken auf 100% animieren, dann Laden beenden und Balken zurücksetzen
      Animated.timing(progress, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false,
      }).start(() => {
        setTimeout(() => {
          setLoading(false);
          progress.setValue(0);
        }, 500);
      });
    }
  };

  // Zeige Lade-Indikator während der Limit-Prüfung
  if (checkingLimit) {
    return (
      <LinearGradient colors={["#f0f4ff", "#ffffff"]} style={styles.gradient}>
        <SafeAreaView style={styles.safe}>
          <ScreenHeader title="📊 Tagesanalyse" subtitle="Deine KI-gestützte Auswertung" />
          <View style={styles.checkingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.checkingText}>Prüfe Verfügbarkeit...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#f0f4ff", "#ffffff"]} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="📊 Tagesanalyse" subtitle="Deine KI-gestützte Auswertung" />
        <ScrollView contentContainerStyle={styles.container}>

          {/* Limit Status Info */}
          {!canAnalyze && (
            <View style={styles.limitInfoCard}>
              <Ionicons name="checkmark-circle" size={24} color="#34a853" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.limitInfoTitle}>✅ Heute bereits analysiert</Text>
                <Text style={styles.limitInfoSubtitle}>
                  Nächste Analyse verfügbar: Morgen um 00:00 Uhr
                </Text>
              </View>
            </View>
          )}

          {canAnalyze && (
            <View style={styles.availableInfoCard}>
              <Ionicons name="time-outline" size={24} color="#007AFF" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.availableInfoTitle}>Analyse verfügbar</Text>
                <Text style={styles.availableInfoSubtitle}>
                  Du kannst heute noch eine Analyse erstellen
                </Text>
              </View>
            </View>
          )}

          {/* Score-Kreis */}
          <Animated.View style={[styles.circleWrapper, { transform: [{ scale: pulseAnim }] }]}>
            <AnimatedCircularProgress
              size={220}
              width={18}
              fill={(displayedScore / 99) * 100}
              tintColor="#007aff"
              backgroundColor="#eef3fb"
              rotation={0}
              lineCap="round"
            >
              {() => (
                <View style={{ alignItems: "center" }}>
                  <Text style={styles.scoreNumber}>{displayedScore}</Text>
                  <Text style={styles.scoreLabel}>von 99</Text>
                </View>
              )}
            </AnimatedCircularProgress>
          </Animated.View>

          {/* Emotion-Badge */}
          {emotion && (
            <View style={styles.emotionBadge}>
              <Text style={styles.emotionText}>{emotion}</Text>
            </View>
          )}

          {/* Analyse-Button oder geladene Analyse */}
          {loading && (
            <View style={styles.loadingCard}>
              <View style={styles.progressContainer}>
                <Animated.View
                  style={[
                    styles.progressBar,
                    {
                      width: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0%", "100%"],
                      }),
                    },
                  ]}
                />
              </View>
              <ActivityIndicator size="large" color="#007aff" style={{ marginVertical: 20 }} />
              <Text style={styles.loadingText}>KI analysiert deine Daten...</Text>
            </View>
          )}

          {!loading && !aiText && (
            <TouchableOpacity
              style={[styles.analyzeButton, !canAnalyze && styles.analyzeButtonDisabled]}
              activeOpacity={canAnalyze ? 0.8 : 1}
              onPress={handleAiAnalysis}
              disabled={!canAnalyze}
            >
              <Ionicons
                name={canAnalyze ? "analytics" : "lock-closed"}
                size={24}
                color="#fff"
              />
              <Text style={styles.analyzeButtonText}>
                {canAnalyze ? "Jetzt analysieren" : "Heute bereits genutzt"}
              </Text>
            </TouchableOpacity>
          )}

          {aiText && (
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Ionicons name="bulb" size={24} color="#fbbc05" />
                <Text style={styles.resultTitle}>Deine persönliche Analyse</Text>
              </View>
              <Text style={styles.resultText}>{aiText}</Text>
              {analysisValid && (
                <View style={styles.successBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#34a853" />
                  <Text style={styles.successText}>
                    {!canAnalyze ? "Heute erstellt" : "Gespeichert"}
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  container: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: "center",
  },
  checkingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  checkingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#8E8E93",
  },
  limitInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    width: "100%",
    borderWidth: 1.5,
    borderColor: "#C8E6C9",
  },
  limitInfoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1B5E20",
    marginBottom: 4,
  },
  limitInfoSubtitle: {
    fontSize: 13,
    color: "#558B2F",
  },
  availableInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    width: "100%",
    borderWidth: 1.5,
    borderColor: "#BBDEFB",
  },
  availableInfoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0D47A1",
    marginBottom: 4,
  },
  availableInfoSubtitle: {
    fontSize: 13,
    color: "#1976D2",
  },
  circleWrapper: {
    marginVertical: 30,
  },
  scoreNumber: {
    fontSize: 64,
    fontWeight: "800",
    color: "#007aff",
  },
  scoreLabel: {
    fontSize: 16,
    color: "#8E8E93",
    marginTop: 4,
  },
  emotionBadge: {
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  emotionText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  analyzeButton: {
    backgroundColor: "#007AFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: "100%",
    shadowColor: "#007AFF",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  analyzeButtonDisabled: {
    backgroundColor: "#8E8E93",
    shadowOpacity: 0.1,
  },
  analyzeButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 8,
  },
  loadingCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  progressContainer: {
    width: "100%",
    height: 6,
    backgroundColor: "#eef3fb",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 16,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#007aff",
    borderRadius: 3,
  },
  loadingText: {
    fontSize: 16,
    color: "#8E8E93",
  },
  resultCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 24,
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    marginTop: 20,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1C1C1E",
    marginLeft: 8,
  },
  resultText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#3C3C43",
  },
  successBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F2F2F7",
  },
  successText: {
    fontSize: 14,
    color: "#34a853",
    marginLeft: 6,
    fontWeight: "600",
  },
});
