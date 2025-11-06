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
  collection,
  addDoc,
  Timestamp,
  query,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "../firebaseconfig";
import { getTodaysLocalEntry, saveEntryLocally, getLocalEntryById, updateLocalEntry } from "../services/localStorageService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePremium } from "../components/PremiumProvider";
import { useAuth } from "../components/AuthProvider";

export default function DailyAnalysisScreen({ route, navigation }) {
  const { canUseFeature, getTrialText, isTrialActive, trialDaysLeft } = usePremium();
  const { isGuestMode } = useAuth();
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
    if (isGuestMode || !auth.currentUser) {
      setCheckingLimit(false);
      setAnalysisValid(false);
      return;
    }

    try {
      const userId = auth.currentUser.uid;

      // 🔒 DATENSCHUTZ: Lade lokalen Eintrag (enthält sensible Daten)
      const localEntry = await getTodaysLocalEntry(userId);

      if (localEntry) {
        console.log("📝 Lokaler Eintrag heute gefunden");

        // Setze Werte aus lokalem Eintrag
        if (localEntry.feelScore != null) setFeelScore(localEntry.feelScore);
        if (localEntry.emotion) setEmotion(localEntry.emotion);
        if (localEntry.text) setText(localEntry.text);
        if (localEntry.theme) setTheme(localEntry.theme);

        setTodayEntry(localEntry);

        // Prüfe ob bereits eine Analyse vorhanden ist
        if (localEntry.analysis) {
          // Analyse existiert bereits lokal
          setAiText(localEntry.analysis);
          setAnalysisValid(true);
          setCanAnalyze(false);
          setTodayAnalysis(localEntry);
          console.log("✅ Analyse bereits vorhanden (lokal)");
        } else {
          // Eintrag vorhanden, aber noch keine Analyse
          setCanAnalyze(true);
          console.log("✅ Eintrag vorhanden, Analyse verfügbar");
        }
      } else {
        // Kein lokaler Eintrag vorhanden
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
    if (!canUseFeature('aiAnalysis')) {
      const trialInfo = getTrialText();
      Alert.alert(
        "Premium Feature",
        `KI-Tagesanalysen sind ein Premium-Feature.\n\n${trialInfo || 'Upgrade auf Premium für unbegrenzte Analysen.'}`,
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
Du bist ein einfühlsamer psychologischer Berater. Analysiere den aktuellen emotionalen Zustand dieser Person.

DATEN:
Emotion: ${emotion}
Wohlfühlscore: ${feelScore}/99
${theme ? `Thema: "${theme}"` : 'Kein spezifisches Thema'}
${text ? `Beschreibung: "${text}"` : 'Keine detaillierte Beschreibung'}

AUFGABE:
Erstelle eine strukturierte Tagesanalyse mit klaren Überschriften.

WICHTIG: Schreibe in fließendem, gut lesbarem Text OHNE Markdown, OHNE Sternchen, OHNE ### Überschriften.

STRUKTUR:
Beginne mit "Emotionale Lage:" gefolgt von 2-3 Sätzen die konkret auf die beschriebenen Gefühle eingehen.

Dann "Psychologische Einordnung:" mit 2-3 Sätzen die psychologische Zusammenhänge erklären (z.B. aus CBT, ACT, Achtsamkeit).

Dann "Perspektive:" mit 1-2 Sätzen die eine hilfreiche neue Sichtweise bieten.

Danach gib GENAU 3 konkrete Handlungsvorschläge im folgenden Format:
[VORSCHLÄGE]
1. Kurzer Titel: Konkrete Anweisung, die zur Person und Situation passt
2. Kurzer Titel: Konkrete Anweisung, die zur Person und Situation passt
3. Kurzer Titel: Konkrete Anweisung, die zur Person und Situation passt
[/VORSCHLÄGE]

Die Vorschläge sollen sofort umsetzbar sein (5-15 Minuten) und zur aktuellen Emotion (${emotion}) passen.
`;

      const reply = await getAiResponse("psychologische Tagesanalyse", prompt);

      // Parse Vorschläge aus der Antwort (unterstützt [VORSCHLÄGE] und [VORSCHLAG])
      const suggestionsMatch = reply.match(/\[VORSCHL[ÄA]GE?\](.*?)\[\/VORSCHL[ÄA]GE?\]/is);
      let cleanedText = reply;

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

        // Entferne die Vorschläge aus dem Haupttext (robuster mit mehreren Varianten)
        cleanedText = reply
          .replace(/\[VORSCHL[ÄA]GE?\][\s\S]*?\[\/VORSCHL[ÄA]GE?\]/gi, '')
          .replace(/\[VORSCHLAG\][\s\S]*?\[\/VORSCHLAG\]/gi, '')
          .trim();
      } else {
        setActionSuggestions([]);
      }

      // Entferne Markdown-Formatierungen (###, **, etc.)
      cleanedText = cleanedText
        .replace(/###\s*/g, '') // Entferne ###
        .replace(/##\s*/g, '')  // Entferne ##
        .replace(/\*\*(.*?)\*\*/g, '$1') // Entferne **bold**
        .replace(/\*(.*?)\*/g, '$1')     // Entferne *italic*
        .trim();

      setAiText(cleanedText);
      // Prüfung, ob die Antwort plausibel ist (kein Fehler-Text)
      const ok = typeof reply === "string" && reply.trim().length > 20 && !/fehler/i.test(reply);
      setAnalysisValid(ok);

      const userId = auth.currentUser?.uid;
      const now = new Date();

      // 🔒 DATENSCHUTZ: Hole heutigen lokalen Eintrag
      const localEntry = await getTodaysLocalEntry(userId);

      if (localEntry) {
        // Update bestehender lokaler Eintrag mit Analyse
        const updatedEntry = await updateLocalEntry(userId, localEntry.localId, {
          analysis: reply, // ✅ NUR LOKAL
          analysisDate: now.toISOString(),
        });

        if (updatedEntry) {
          console.log("✅ Analyse lokal gespeichert");

          // Nur Metadaten in Firestore (für Daily-Limit-Prüfung)
          await addDoc(collection(db, "entries"), {
            userId: userId,
            emotion: emotion,
            feelScore: feelScore,
            analysisDate: Timestamp.now(),
            createdAt: Timestamp.fromDate(new Date(localEntry.createdAt)),
            hasLocalData: true,
            // KEIN text, KEINE analysis - Datenschutz!
          });
          console.log("✅ Analyse-Metadaten in Cloud gespeichert");

          // Markiere als heute bereits verwendet
          setCanAnalyze(false);
          setTodayAnalysis(updatedEntry);
        }
      } else {
        console.error("❌ Kein lokaler Eintrag gefunden - kann Analyse nicht speichern");
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
              size={200}
              width={16}
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
              {/* Gradient Header */}
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.analysisGradientHeader}
              >
                <Ionicons name="sparkles" size={28} color="#fff" />
                <Text style={styles.analysisHeaderTitle}>Deine KI-Analyse</Text>
              </LinearGradient>

              {/* Absätze mit Icons und unterschiedlichen Farben */}
              {aiText.split('\n\n').filter(para => para.trim()).map((paragraph, index) => {
                const trimmedPara = paragraph.trim();
                const headingMatch = trimmedPara.match(/^([^:]+):\s*(.*)$/s);

                if (headingMatch) {
                  const heading = headingMatch[1];
                  const content = headingMatch[2];

                  // Bestimme Icon und Farbe basierend auf Überschrift
                  let icon = "information-circle";
                  let iconColor = "#007AFF";
                  let borderColor = "#007AFF";
                  let bgColor = "#F0F7FF";

                  if (heading.toLowerCase().includes("emotional") || heading.toLowerCase().includes("gefühl")) {
                    icon = "heart";
                    iconColor = "#FF6B9D";
                    borderColor = "#FF6B9D";
                    bgColor = "#FFF0F6";
                  } else if (heading.toLowerCase().includes("psycholog")) {
                    icon = "school";
                    iconColor = "#667eea";
                    borderColor = "#667eea";
                    bgColor = "#F5F7FF";
                  } else if (heading.toLowerCase().includes("perspektiv")) {
                    icon = "eye";
                    iconColor = "#34C759";
                    borderColor = "#34C759";
                    bgColor = "#F0FFF4";
                  }

                  return (
                    <View key={index} style={[styles.analysisSectionCard, { backgroundColor: bgColor, borderLeftColor: borderColor }]}>
                      <View style={styles.analysisSectionHeader}>
                        <View style={[styles.analysisSectionIconBg, { backgroundColor: iconColor + '20' }]}>
                          <Ionicons name={icon} size={20} color={iconColor} />
                        </View>
                        <Text style={[styles.analysisSectionTitle, { color: iconColor }]}>
                          {heading}
                        </Text>
                      </View>
                      <Text style={styles.analysisSectionContent}>{content}</Text>
                    </View>
                  );
                }

                return (
                  <View key={index} style={styles.analysisSectionCard}>
                    <Text style={styles.analysisSectionContent}>{trimmedPara}</Text>
                  </View>
                );
              })}

              {analysisValid && (
                <View style={styles.successBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#34a853" />
                  <Text style={styles.successText}>
                    {!canAnalyze ? "Heute erstellt" : "Gespeichert"}
                  </Text>
                </View>
              )}

              {/* Handlungsvorschläge mit verbessertem Design */}
              {actionSuggestions.length > 0 && (
                <View style={styles.suggestionsSection}>
                  <LinearGradient
                    colors={['#FF9500', '#FF6B00']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.suggestionsGradientHeader}
                  >
                    <Ionicons name="rocket" size={24} color="#fff" />
                    <Text style={styles.suggestionsGradientTitle}>Handlungsvorschläge</Text>
                  </LinearGradient>

                  <Text style={styles.suggestionsSubtitle}>
                    Wähle eine Strategie, die zu dir passt:
                  </Text>

                  {actionSuggestions.map((suggestion, index) => {
                    const colors = [
                      { bg: '#E8F5E9', border: '#34C759', icon: '#34C759' },
                      { bg: '#FFF3E0', border: '#FF9500', icon: '#FF9500' },
                      { bg: '#F3E5F5', border: '#9C27B0', icon: '#9C27B0' },
                    ];
                    const color = colors[index % 3];

                    return (
                      <View key={index} style={[styles.suggestionCard, { backgroundColor: color.bg, borderLeftColor: color.border }]}>
                        <View style={[styles.suggestionNumber, { backgroundColor: color.icon }]}>
                          <Text style={styles.suggestionNumberText}>{index + 1}</Text>
                        </View>
                        <View style={styles.suggestionContent}>
                          <Text style={[styles.suggestionTitle, { color: color.icon }]}>{suggestion.title}</Text>
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
                                name="thumbs-up"
                                size={16}
                                color={suggestionFeedback[index] === "helpful" ? "#37B24D" : "#8E8E93"}
                              />
                              <Text style={[
                                styles.feedbackButtonText,
                                suggestionFeedback[index] === "helpful" && styles.feedbackButtonTextActive
                              ]}>
                                Hilfreich
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
                                name="thumbs-down"
                                size={16}
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
                    );
                  })}
                </View>
              )}
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
    marginVertical: 24,
  },
  scoreNumber: {
    fontSize: 56,
    fontWeight: "800",
    color: "#007aff",
  },
  scoreLabel: {
    fontSize: 15,
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
    borderRadius: 20,
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    marginTop: 20,
    overflow: 'hidden',
  },
  analysisGradientHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  analysisHeaderTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    marginLeft: 12,
    letterSpacing: 0.5,
  },
  analysisSectionCard: {
    backgroundColor: "#F7F9FC",
    borderRadius: 16,
    padding: 18,
    marginVertical: 10,
    width: "100%",
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  analysisSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  analysisSectionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  analysisSectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  analysisSectionContent: {
    fontSize: 15,
    lineHeight: 24,
    color: "#2C3E50",
    letterSpacing: 0.2,
  },
  // Alte Styles als Fallback behalten
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
  paragraphContainer: {
    backgroundColor: "#F7F9FC",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: "#007AFF",
  },
  resultText: {
    fontSize: 16,
    lineHeight: 26,
    color: "#1C1C1E",
  },
  headingText: {
    fontWeight: "700",
    color: "#007AFF",
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
  suggestionsSection: {
    marginTop: 20,
    width: "100%",
  },
  suggestionsGradientHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
  },
  suggestionsGradientTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    marginLeft: 10,
    letterSpacing: 0.5,
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    width: "100%",
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
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
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  suggestionAction: {
    fontSize: 14,
    color: "#3C3C43",
    lineHeight: 22,
    marginBottom: 12,
  },
  feedbackButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 10,
  },
  feedbackButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#E5E5EA",
  },
  feedbackButtonActive: {
    backgroundColor: "#E8F5E9",
    borderColor: "#34C759",
  },
  feedbackButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8E8E93",
    marginLeft: 6,
  },
  feedbackButtonTextActive: {
    color: "#34C759",
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
