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
import { getAiResponse } from "../openaiService";
import {
  doc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db, auth } from "../firebaseconfig";

export default function DailyAnalysisScreen({ route, navigation }) {
  const { feelScore, sleep, energy, selfWorth, emotion, text, theme } = route.params || {};
  const [aiText, setAiText] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysisValid, setAnalysisValid] = useState(false);
  
  // progress für Ladebalken
  const progress = useRef(new Animated.Value(0)).current;
  
  // Für animierten Textzähler
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [displayedScore, setDisplayedScore] = useState(0);

  // Für den „Atem“-Effekt
  const pulseAnim = useRef(new Animated.Value(1)).current;

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

      // Nur wenn Werte gültig sind, Query ausführen
      const q = query(
        collection(db, "entries"),
        where("feelScore", "==", feelScore),
        where("theme", "==", theme)
      );

      const snap = await getDocs(q);

      if (!snap.empty) {
        const entryDoc = snap.docs[0].ref;
        await updateDoc(entryDoc, { analysis: reply });
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
          createdAt: new Date(),
        });
        console.log("📄 Neuer Eintrag mit Analyse erstellt.");
      }
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
        }, 250);
      });
    }
  };

  const getColor = (score) => {
    if (score >= 70) return "#4CAF50";
    if (score >= 40) return "#FFC107";
    return "#F44336";
  };

  return (
    <LinearGradient colors={["#F6FBFF", "#FFFFFF"]} style={styles.gradient}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.inner}>
            <ScreenHeader title="☀️ Dein Wohlfühlscore" subtitle="Kurz, klar, hilfreich" />

            <Animated.View style={[styles.pulseContainer, { transform: [{ scale: pulseAnim }] }]}>
              <AnimatedCircularProgress
                size={200}
                width={14}
                fill={(displayedScore / 99) * 100}
                tintColor={getColor(displayedScore)}
                backgroundColor="#eef6fb"
                duration={800}
                rotation={0}
                lineCap="round"
              >
                {() => (
                  <View style={styles.innerCircle}>
                    <Text style={[styles.score, { color: getColor(displayedScore) }]}>
                      {displayedScore}
                    </Text>
                    <Text style={styles.subtext}>von 99</Text>
                  </View>
                )}
              </AnimatedCircularProgress>
            </Animated.View>

            <View style={styles.statsRow}>
              <View style={styles.chip}><Text style={styles.chipText}>🛏 Schlaf {sleep}/10</Text></View>
              <View style={styles.chip}><Text style={styles.chipText}>⚡ Energie {energy}/10</Text></View>
              <View style={styles.chip}><Text style={styles.chipText}>❤️ Selbstwert {selfWorth}/10</Text></View>
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleAiAnalysis}
              style={styles.actionWrapper}
              disabled={loading}
            >
              <LinearGradient
                colors={loading ? ["#9ec8ff", "#6fb0ff"] : ["#34a3ff", "#007aff"]}
                start={[0, 0]}
                end={[1, 1]}
                style={[styles.button, loading && styles.buttonDisabled]}
              >
                <Text style={styles.buttonText}>
                  {loading ? "Analysiere…" : "KI‑Tagesanalyse starten"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {loading && (
              <View style={styles.loadingRow}>
                <View style={styles.progressTrack}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        width: progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0%", "100%"],
                        }),
                      },
                    ]}
                  />
                </View>
                <ActivityIndicator size="small" color="#007aff" style={{ marginLeft: 12 }} />
              </View>
            )}

            {aiText && (
              <>
                <View style={styles.analysisBox}>
                  <Text style={styles.analysisHeader}>🧠 Deine KI‑Analyse</Text>
                  <Text style={styles.analysisText}>{aiText}</Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.chatButton,
                    { backgroundColor: analysisValid ? "#34C759" : "#D1D1D6" },
                  ]}
                  onPress={() => {
                    if (!analysisValid) {
                      Alert.alert("Bitte erst die Tagesdaten ausfüllen");
                      return;
                    }
                    navigation.navigate("Chat", { context: aiText });
                  }}
                  disabled={!analysisValid}
                >
                  <Text style={[styles.buttonText, { color: analysisValid ? "#fff" : "#888" }]}>
                    {analysisValid ? "💬 Mit KI weiterreden" : "💬 Chat (nicht verfügbar)"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: {
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 16,
  },
  inner: {
    width: "100%",
    maxWidth: 720,
    alignItems: "center",
  },
  pulseContainer: {
    marginVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  innerCircle: {
    alignItems: "center",
    justifyContent: "center",
  },
  score: {
    fontSize: 40,
    fontWeight: "800",
  },
  subtext: {
    fontSize: 13,
    color: "#778089",
    marginTop: 6,
  },
  statsRow: {
    flexDirection: "row",
    marginTop: 8,
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 10,
  },
  chip: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  chipText: {
    color: "#333",
    fontSize: 13,
    fontWeight: "600",
  },
  actionWrapper: {
    width: "100%",
    paddingHorizontal: 12,
    marginTop: 20,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.9,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    width: "90%",
    maxWidth: 680,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    backgroundColor: "#eef6fb",
    borderRadius: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#007aff",
  },
  analysisBox: {
    backgroundColor: "#fff",
    marginTop: 22,
    padding: 18,
    borderRadius: 16,
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  analysisHeader: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
    color: "#111",
  },
  analysisText: {
    fontSize: 15,
    color: "#333",
    lineHeight: 22,
  },
  chatButton: {
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
});
