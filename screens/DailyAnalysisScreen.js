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
  Modal,
  Linking,
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
  const paramsData = route.params || {};

  // Lokale States für alle Werte (aus route.params oder Firestore)
  const [feelScore, setFeelScore] = useState(paramsData.feelScore || 0);
  const [emotion, setEmotion] = useState(paramsData.emotion || null);
  const [text, setText] = useState(paramsData.text || "");
  const [theme, setTheme] = useState(paramsData.theme || "");

  const [aiText, setAiText] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysisValid, setAnalysisValid] = useState(false);
  const [todayAnalysis, setTodayAnalysis] = useState(null);
  const [todayEntry, setTodayEntry] = useState(null); // Prüfung ob Eintrag existiert
  const [canAnalyze, setCanAnalyze] = useState(true);
  const [checkingLimit, setCheckingLimit] = useState(true);
  const [actionSuggestions, setActionSuggestions] = useState([]); // Konkrete Handlungsvorschläge
  const [showCrisisModal, setShowCrisisModal] = useState(false); // Modal für Notfall-Strategien
  const [suggestionFeedback, setSuggestionFeedback] = useState({}); // Feedback für jeden Vorschlag: {0: "helpful", 1: "not_helpful", ...}

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

  // Aktualisiere States wenn neue route.params kommen
  useEffect(() => {
    if (paramsData.feelScore != null) {
      setFeelScore(paramsData.feelScore);
      setEmotion(paramsData.emotion);
      setText(paramsData.text);
      setTheme(paramsData.theme);

      // Wenn wir von DailyEntry kommen, markiere als "Eintrag vorhanden"
      setTodayEntry({
        feelScore: paramsData.feelScore,
        emotion: paramsData.emotion,
        text: paramsData.text,
        theme: paramsData.theme,
      });
      setCanAnalyze(true);
      console.log("✅ Daten von DailyEntry geladen, Analyse möglich");
    }
  }, [route.params]);

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

      // Erst nach userId filtern, dann clientseitig nach Datum
      const q = query(
        collection(db, "entries"),
        where("userId", "==", auth.currentUser.uid)
      );

      const snapshot = await getDocs(q);

      console.log(`📊 Gefunden: ${snapshot.size} Einträge für User`);

      // Clientseitig nach heutigem Datum filtern
      const todayAnalyses = snapshot.docs.filter((doc) => {
        const data = doc.data();
        if (!data.analysisDate) return false;
        const analysisDate = data.analysisDate.toDate();
        const isToday = analysisDate >= today && analysisDate < tomorrow;
        if (isToday) console.log("📅 Analyse heute gefunden:", data);
        return isToday;
      });

      // Suche nach heutigem Eintrag (mit createdAt heute)
      const todayEntries = snapshot.docs.filter((doc) => {
        const data = doc.data();
        if (!data.createdAt) return false;
        const createdDate = data.createdAt.toDate();
        const isToday = createdDate >= today && createdDate < tomorrow;
        if (isToday) {
          console.log("📝 Eintrag heute gefunden:", {
            emotion: data.emotion,
            feelScore: data.feelScore,
            hasAnalysis: !!data.analysis,
            hasAnalysisDate: !!data.analysisDate,
          });
        }
        return isToday;
      });

      console.log(`✅ Heute: ${todayAnalyses.length} Analysen, ${todayEntries.length} Einträge`);

      if (todayAnalyses.length > 0) {
        // Heute wurde bereits analysiert
        const data = todayAnalyses[0].data();
        setTodayAnalysis(data);
        setTodayEntry(data); // Eintrag existiert
        setAiText(data.analysis);
        setAnalysisValid(true);
        setCanAnalyze(false);

        // Lade alle Werte aus Firestore
        if (data.feelScore != null) setFeelScore(data.feelScore);
        if (data.emotion) setEmotion(data.emotion);
        if (data.text) setText(data.text);
        if (data.theme) setTheme(data.theme);

        console.log("✅ Heute bereits analysiert");
      } else if (todayEntries.length > 0) {
        // Eintrag vorhanden, aber noch keine Analyse
        const data = todayEntries[0].data();
        setTodayEntry(data);
        setCanAnalyze(true);

        // Lade Werte aus Eintrag
        if (data.feelScore != null) setFeelScore(data.feelScore);
        if (data.emotion) setEmotion(data.emotion);
        if (data.text) setText(data.text);
        if (data.theme) setTheme(data.theme);

        console.log("✅ Eintrag vorhanden, Analyse verfügbar", {
          canAnalyze: true,
          todayEntry: !!data
        });
      } else {
        // Weder Eintrag noch Analyse vorhanden
        setCanAnalyze(false);
        setTodayEntry(null);
        console.log("❌ Kein Eintrag heute gefunden");
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
    // Prüfe ob ein Tageseintrag vorhanden ist
    if (!todayEntry && !todayAnalysis) {
      Alert.alert(
        "Kein Eintrag vorhanden",
        "Bitte erstelle zuerst einen Tageseintrag, bevor du eine Analyse durchführst.",
        [
          { text: "OK" },
          {
            text: "Eintrag erstellen",
            onPress: () => navigation.navigate("DailyEntry")
          }
        ]
      );
      return;
    }

    // Prüfe ob heute bereits analysiert wurde
    if (!canAnalyze && todayAnalysis) {
      Alert.alert(
        "Bereits analysiert",
        "Du hast heute bereits eine Tagesanalyse erstellt. Die nächste Analyse ist ab morgen um 00:00 Uhr verfügbar.",
        [{ text: "OK" }]
      );
      return;
    }

    // Schutz vor fehlenden Werten — zeige klare Meldung
    if (feelScore == null || feelScore === 0 || !emotion) {
      Alert.alert(
        "Unvollständige Daten",
        "Bitte erstelle zuerst einen vollständigen Tageseintrag.",
        [
          { text: "OK" },
          {
            text: "Eintrag erstellen",
            onPress: () => navigation.navigate("DailyEntry")
          }
        ]
      );
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
Analysiere den psychischen Zustand dieser Person basierend auf diesen Tagesdaten:

📊 MESSWERTE:
• Emotion: ${emotion}
• Wohlfühlscore: ${feelScore}/99

📝 THEMA & PERSÖNLICHE BESCHREIBUNG:
${theme ? `Thema: ${theme}` : 'Kein Thema angegeben'}
${text ? `\n"${text}"\n` : '\nKeine Beschreibung angegeben\n'}

WICHTIG: Gehe in deiner Analyse DIREKT auf die persönliche Beschreibung ein. Beziehe dich auf konkrete Situationen, Gefühle oder Gedanken, die erwähnt wurden. Falls keine Beschreibung vorhanden ist, konzentriere dich auf die Emotion und den Wohlfühlscore.

Gib eine empathische, individuelle psychologische Einschätzung (2-4 Sätze), die konkret auf ${text ? 'die beschriebene Situation' : 'die aktuellen Messwerte'} eingeht.

Dann gib GENAU 3 konkrete, sofort umsetzbare Handlungsvorschläge, die ${theme ? `zum Thema "${theme}"` : 'zur aktuellen Situation'} passen:
[VORSCHLÄGE]
1. [Kurzer Titel]: [Konkrete Anweisung in 1-2 Sätzen]
2. [Kurzer Titel]: [Konkrete Anweisung in 1-2 Sätzen]
3. [Kurzer Titel]: [Konkrete Anweisung in 1-2 Sätzen]
[/VORSCHLÄGE]

Beispiele für gute Vorschläge:
- "5-Minuten-Pause: Steh auf, öffne das Fenster und atme 5x tief ein und aus."
- "Soziale Verbindung: Ruf eine Person an, mit der du gerne sprichst."
- "Bewegung: Mach einen 10-minütigen Spaziergang um den Block."
`;

      const reply = await getAiResponse("psychologische Tagesanalyse", prompt);

      // Parse Vorschläge aus der Antwort (unterstützt [VORSCHLÄGE] und [VORSCHLAG])
      const suggestionsMatch = reply.match(/\[VORSCHL[ÄA]GE?\](.*?)\[\/VORSCHL[ÄA]GE?\]/is);
      if (suggestionsMatch) {
        const suggestionsText = suggestionsMatch[1];
        const suggestions = suggestionsText
          .split(/\d+\./)
          .filter(s => s.trim())
          .map(s => {
            const parts = s.split(':');
            return {
              title: parts[0]?.trim() || "Vorschlag",
              action: parts.slice(1).join(':').trim() || s.trim()
            };
          })
          .slice(0, 3);
        setActionSuggestions(suggestions);

        // Entferne die Vorschläge aus dem Haupttext (unterstützt beide Varianten)
        setAiText(reply.replace(/\[VORSCHL[ÄA]GE?\].*?\[\/VORSCHL[ÄA]GE?\]/gis, '').trim());
      } else {
        setAiText(reply);
        setActionSuggestions([]);
      }
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

  const handleSuggestionFeedback = async (index, feedbackType) => {
    try {
      // Speichere Feedback lokal
      setSuggestionFeedback(prev => ({
        ...prev,
        [index]: feedbackType
      }));

      // Speichere in Firestore
      await addDoc(collection(db, "suggestionFeedback"), {
        userId: auth.currentUser?.uid,
        suggestionIndex: index,
        suggestionTitle: actionSuggestions[index]?.title || "",
        suggestionAction: actionSuggestions[index]?.action || "",
        feedback: feedbackType, // "helpful" oder "not_helpful"
        feelScore: feelScore,
        emotion: emotion,
        timestamp: Timestamp.now(),
      });

      console.log(`✅ Feedback gespeichert: ${feedbackType} für Vorschlag ${index + 1}`);
    } catch (error) {
      console.error("Fehler beim Speichern des Feedbacks:", error);
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
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => navigation.navigate("Settings")}
      >
        <Ionicons name="settings-outline" size={28} color="#007AFF" />
      </TouchableOpacity>
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="📊 Tagesanalyse" subtitle="Deine KI-gestützte Auswertung" />
        <ScrollView contentContainerStyle={styles.container}>

          {/* Status Info */}
          {!todayEntry && !todayAnalysis && (
            <View style={styles.noEntryCard}>
              <Ionicons name="alert-circle" size={24} color="#E03131" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.noEntryTitle}>Kein Eintrag vorhanden</Text>
                <Text style={styles.noEntrySubtitle}>
                  Erstelle zuerst einen Tageseintrag, um eine Analyse zu erhalten
                </Text>
              </View>
            </View>
          )}

          {todayAnalysis && !canAnalyze && (
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

          {todayEntry && canAnalyze && !todayAnalysis && (
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

          {/* Krisen-Erkennung bei sehr niedrigem Score */}
          {feelScore > 0 && feelScore < 25 && (
            <View style={styles.crisisCard}>
              <View style={styles.crisisHeader}>
                <Ionicons name="warning" size={28} color="#E03131" />
                <Text style={styles.crisisTitle}>Akute Belastung erkannt</Text>
              </View>
              <Text style={styles.crisisText}>
                Dein Wohlfühlwert ist sehr niedrig. Bitte hol dir professionelle Unterstützung, wenn du sie brauchst.
              </Text>

              <View style={styles.crisisHotlines}>
                <Text style={styles.crisisHotlineTitle}>🆘 Sofort erreichbar:</Text>

                <TouchableOpacity
                  style={styles.hotlineButton}
                  onPress={() => Linking.openURL('tel:08001110111')}
                >
                  <Ionicons name="call" size={20} color="#fff" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.hotlineTitle}>Telefonseelsorge</Text>
                    <Text style={styles.hotlineNumber}>0800 111 0 111</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.hotlineButton}
                  onPress={() => Linking.openURL('tel:08001110222')}
                >
                  <Ionicons name="call" size={20} color="#fff" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.hotlineTitle}>Telefonseelsorge</Text>
                    <Text style={styles.hotlineNumber}>0800 111 0 222</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.crisisStrategiesButton}
                onPress={() => setShowCrisisModal(true)}
              >
                <Ionicons name="medical" size={20} color="#E03131" />
                <Text style={styles.crisisStrategiesText}>Notfall-Strategien anzeigen</Text>
              </TouchableOpacity>
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
              style={[styles.analyzeButton, (!canAnalyze || (!todayEntry && !todayAnalysis)) && styles.analyzeButtonDisabled]}
              activeOpacity={canAnalyze && (todayEntry || todayAnalysis) ? 0.8 : 1}
              onPress={handleAiAnalysis}
              disabled={!canAnalyze || (!todayEntry && !todayAnalysis)}
            >
              <Ionicons
                name={canAnalyze && (todayEntry || todayAnalysis) ? "analytics" : "lock-closed"}
                size={24}
                color="#fff"
              />
              <Text style={styles.analyzeButtonText}>
                {!todayEntry && !todayAnalysis
                  ? "Kein Eintrag vorhanden"
                  : canAnalyze
                  ? "Jetzt analysieren"
                  : "Heute bereits genutzt"}
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

              {/* Handlungsvorschläge */}
              {actionSuggestions.length > 0 && (
                <View style={styles.suggestionsSection}>
                  <View style={styles.suggestionsHeader}>
                    <Ionicons name="fitness" size={22} color="#007AFF" />
                    <Text style={styles.suggestionsTitle}>💪 Was du jetzt tun kannst</Text>
                  </View>
                  <Text style={styles.suggestionsSubtitle}>
                    Probier eine dieser Strategien aus:
                  </Text>

                  {actionSuggestions.map((suggestion, index) => (
                    <View key={index} style={styles.suggestionCard}>
                      <View style={styles.suggestionNumber}>
                        <Text style={styles.suggestionNumberText}>{index + 1}</Text>
                      </View>
                      <View style={styles.suggestionContent}>
                        <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
                        <Text style={styles.suggestionAction}>{suggestion.action}</Text>

                        {/* Feedback Buttons */}
                        <View style={styles.feedbackButtons}>
                          <TouchableOpacity
                            style={[
                              styles.feedbackButton,
                              suggestionFeedback[index] === "helpful" && styles.feedbackButtonActive
                            ]}
                            onPress={() => handleSuggestionFeedback(index, "helpful")}
                          >
                            <Ionicons
                              name="checkmark-circle"
                              size={18}
                              color={suggestionFeedback[index] === "helpful" ? "#37B24D" : "#8E8E93"}
                            />
                            <Text style={[
                              styles.feedbackButtonText,
                              suggestionFeedback[index] === "helpful" && styles.feedbackButtonTextActive
                            ]}>
                              Hat geholfen
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.feedbackButton,
                              suggestionFeedback[index] === "not_helpful" && styles.feedbackButtonActive
                            ]}
                            onPress={() => handleSuggestionFeedback(index, "not_helpful")}
                          >
                            <Ionicons
                              name="close-circle"
                              size={18}
                              color={suggestionFeedback[index] === "not_helpful" ? "#E03131" : "#8E8E93"}
                            />
                            <Text style={[
                              styles.feedbackButtonText,
                              suggestionFeedback[index] === "not_helpful" && styles.feedbackButtonTextActive
                            ]}>
                              Nicht hilfreich
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Chat-Button: öffnet den Reflexions-Chat mit der Analyse als Kontext */}
              <TouchableOpacity
                style={styles.chatButton}
                onPress={() => navigation.navigate("Chat", { context: aiText })}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={20} color="#fff" />
                <Text style={styles.chatButtonText}>Reflexions-Chat starten</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Modal mit Notfall-Strategien */}
        <Modal
          visible={showCrisisModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowCrisisModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>🛟 Notfall-Strategien</Text>
                <TouchableOpacity onPress={() => setShowCrisisModal(false)}>
                  <Ionicons name="close-circle" size={32} color="#8E8E93" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                <Text style={styles.modalIntro}>
                  Diese Übungen helfen dir, dich zu stabilisieren und im Hier und Jetzt zu bleiben:
                </Text>

                <View style={styles.strategyCard}>
                  <Text style={styles.strategyTitle}>1. 5-4-3-2-1 Grounding</Text>
                  <Text style={styles.strategyText}>
                    Benenne laut oder in Gedanken:{'\n'}
                    • 5 Dinge, die du SEHEN kannst{'\n'}
                    • 4 Dinge, die du HÖREN kannst{'\n'}
                    • 3 Dinge, die du FÜHLEN kannst{'\n'}
                    • 2 Dinge, die du RIECHEN kannst{'\n'}
                    • 1 Ding, das du SCHMECKEN kannst
                  </Text>
                </View>

                <View style={styles.strategyCard}>
                  <Text style={styles.strategyTitle}>2. Atemübung (4-7-8)</Text>
                  <Text style={styles.strategyText}>
                    • 4 Sekunden einatmen{'\n'}
                    • 7 Sekunden Atem anhalten{'\n'}
                    • 8 Sekunden ausatmen{'\n'}
                    Wiederhole 4x
                  </Text>
                </View>

                <View style={styles.strategyCard}>
                  <Text style={styles.strategyTitle}>3. Kaltes Wasser</Text>
                  <Text style={styles.strategyText}>
                    Halte deine Hände unter kaltes Wasser oder lege ein kaltes Tuch auf dein Gesicht. Die Kälte aktiviert deinen Vagusnerv und beruhigt dein Nervensystem.
                  </Text>
                </View>

                <View style={styles.strategyCard}>
                  <Text style={styles.strategyTitle}>4. Sicherer Ort</Text>
                  <Text style={styles.strategyText}>
                    Stelle dir einen Ort vor, an dem du dich sicher und geborgen fühlst. Was siehst du dort? Was hörst du? Wie fühlt sich der Boden unter deinen Füßen an?
                  </Text>
                </View>

                <View style={styles.strategyCard}>
                  <Text style={styles.strategyTitle}>5. Körperkontakt</Text>
                  <Text style={styles.strategyText}>
                    Drücke deine Füße fest auf den Boden. Umarme dich selbst. Drücke deine Handflächen gegeneinander. Spüre die Verbindung zu deinem Körper.
                  </Text>
                </View>

                <View style={styles.modalWarning}>
                  <Ionicons name="information-circle" size={20} color="#FF9500" />
                  <Text style={styles.modalWarningText}>
                    Diese Übungen ersetzen keine professionelle Hilfe. Bei anhaltenden Beschwerden wende dich bitte an einen Therapeuten oder die Telefonseelsorge.
                  </Text>
                </View>
              </ScrollView>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowCrisisModal(false)}
              >
                <Text style={styles.modalCloseButtonText}>Schließen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
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
  noEntryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    width: "100%",
    borderWidth: 1.5,
    borderColor: "#FFCDD2",
  },
  noEntryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#C62828",
    marginBottom: 4,
  },
  noEntrySubtitle: {
    fontSize: 13,
    color: "#D32F2F",
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
  chatButton: {
    backgroundColor: "#007AFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: "#007AFF",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  chatButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  suggestionsSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
  },
  suggestionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  suggestionsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1C1C1E",
    marginLeft: 8,
  },
  suggestionsSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
    fontStyle: "italic",
  },
  suggestionCard: {
    flexDirection: "row",
    backgroundColor: "#F7F9FC",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#007AFF",
  },
  suggestionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  suggestionNumberText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 4,
  },
  suggestionAction: {
    fontSize: 14,
    color: "#3C3C43",
    lineHeight: 20,
    marginBottom: 12,
  },
  feedbackButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  feedbackButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#F2F2F7",
    marginHorizontal: 4,
  },
  feedbackButtonActive: {
    backgroundColor: "#E8F5E9",
  },
  feedbackButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8E8E93",
    marginLeft: 4,
  },
  feedbackButtonTextActive: {
    color: "#2E7D32",
  },
  // Krisen-Erkennung
  crisisCard: {
    backgroundColor: "#FFF5F5",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    width: "100%",
    borderWidth: 2,
    borderColor: "#E03131",
  },
  crisisHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  crisisTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#C92A2A",
    marginLeft: 10,
  },
  crisisText: {
    fontSize: 15,
    color: "#5C5F66",
    lineHeight: 22,
    marginBottom: 16,
  },
  crisisHotlines: {
    marginBottom: 16,
  },
  crisisHotlineTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#C92A2A",
    marginBottom: 10,
  },
  hotlineButton: {
    backgroundColor: "#E03131",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#E03131",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  hotlineTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  hotlineNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginTop: 2,
  },
  crisisStrategiesButton: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E03131",
  },
  crisisStrategiesText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#E03131",
    marginLeft: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1C1C1E",
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalIntro: {
    fontSize: 15,
    color: "#5C5F66",
    lineHeight: 22,
    marginBottom: 20,
    fontStyle: "italic",
  },
  strategyCard: {
    backgroundColor: "#F7F9FC",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
  },
  strategyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 8,
  },
  strategyText: {
    fontSize: 14,
    color: "#3C3C43",
    lineHeight: 22,
  },
  modalWarning: {
    flexDirection: "row",
    backgroundColor: "#FFF9DB",
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FFE066",
  },
  modalWarningText: {
    flex: 1,
    fontSize: 13,
    color: "#996A13",
    lineHeight: 20,
    marginLeft: 10,
  },
  modalCloseButton: {
    backgroundColor: "#007AFF",
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  modalCloseButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
});
