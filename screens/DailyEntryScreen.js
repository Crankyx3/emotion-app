import React, { useState, useRef, useMemo, useEffect } from "react";
import ScreenHeader from "../components/ScreenHeader";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  Animated,
  ActivityIndicator,
  Modal,
} from "react-native";
import { collection, addDoc, Timestamp, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "../firebaseconfig";
import { getAiResponse } from "../openaiService";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { saveEntryLocally, getLocalEntries, getTodaysLocalEntry } from "../services/localStorageService";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../components/AuthProvider";
import GuestBlockModal from "../components/GuestBlockModal";
import { startRecording, stopRecording, cancelRecording, getRecordingDuration } from "../services/audioRecordingService";
import { transcribeAudioWithRetry } from "../services/whisperService";

export default function DailyEntryScreen() {
  const navigation = useNavigation();
  const { isGuestMode, exitGuestMode } = useAuth();

  const [selectedEmotion, setSelectedEmotion] = useState(null);
  const [text, setText] = useState("");
  const [gratitude, setGratitude] = useState("");

  // Ladezustand + progress für Ladebalken
  const [loading, setLoading] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  // Daily Entry Limit
  const [canCreateEntry, setCanCreateEntry] = useState(true);
  const [checkingLimit, setCheckingLimit] = useState(true);
  const [todayEntry, setTodayEntry] = useState(null);

  // Streak Tracker
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);

  // Guest Mode
  const [showGuestModal, setShowGuestModal] = useState(false);

  // Smart Input Helper
  const [showInputHelper, setShowInputHelper] = useState(false);
  const [showGratitudeHelper, setShowGratitudeHelper] = useState(false);

  // Voice Recording (Main Text)
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recordingInterval = useRef(null);

  // Voice Recording (Gratitude)
  const [isRecordingGratitude, setIsRecordingGratitude] = useState(false);
  const [gratitudeRecordingDuration, setGratitudeRecordingDuration] = useState(0);
  const [isTranscribingGratitude, setIsTranscribingGratitude] = useState(false);
  const gratitudeRecordingInterval = useRef(null);

  const quickPhrases = [
    { category: "Gefühle", phrases: [
      "Ich fühle mich heute...",
      "Es beschäftigt mich, dass...",
      "Ich bin froh über...",
      "Mir macht Sorgen, dass...",
      "Ich habe bemerkt, dass...",
    ]},
    { category: "Tag", phrases: [
      "Heute war ein guter Tag, weil...",
      "Mein Tag war herausfordernd, weil...",
      "Ich habe heute erreicht, dass...",
      "Was mir heute wichtig war...",
      "Ein besonderer Moment heute war...",
    ]},
    { category: "Gedanken", phrases: [
      "Ich denke oft darüber nach, wie...",
      "Mir ist klar geworden, dass...",
      "Ich frage mich, ob...",
      "Es fällt mir schwer zu...",
      "Ich möchte gerne...",
    ]},
  ];

  const quickGratitudePhrases = [
    { category: "Personen", phrases: [
      "Meine Familie und Freunde",
      "Die Unterstützung von...",
      "Zeit mit...",
      "Ein nettes Gespräch mit...",
      "Die Hilfe von...",
    ]},
    { category: "Alltag", phrases: [
      "Ein gemütliches Zuhause",
      "Gutes Essen heute",
      "Schönes Wetter",
      "Ruhe und Entspannung",
      "Zeit für mich selbst",
    ]},
    { category: "Momente", phrases: [
      "Ein Lächeln heute",
      "Ein besonderer Moment",
      "Sonnenschein am Morgen",
      "Einen Erfolg heute",
      "Etwas Neues gelernt",
    ]},
  ];

  const addPhrase = (phrase) => {
    const separator = text.length > 0 && !text.endsWith(" ") ? " " : "";
    setText(text + separator + phrase);
    setShowInputHelper(false);
  };

  const addGratitudePhrase = (phrase) => {
    const separator = gratitude.length > 0 && !gratitude.endsWith(" ") ? ", " : "";
    setGratitude(gratitude + separator + phrase);
    setShowGratitudeHelper(false);
  };

  // Voice Recording Functions
  const handleStartRecording = async () => {
    try {
      await startRecording();
      setIsRecordingAudio(true);
      setRecordingDuration(0);

      // Update duration every second
      recordingInterval.current = setInterval(async () => {
        const duration = await getRecordingDuration();
        setRecordingDuration(Math.floor(duration / 1000));
      }, 1000);
    } catch (error) {
      console.error('Recording error:', error);
      Alert.alert(
        'Fehler',
        'Mikrofonzugriff konnte nicht gestartet werden. Bitte erlaube den Mikrofonzugriff in den Einstellungen.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleStopRecording = async () => {
    try {
      // Clear interval
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
        recordingInterval.current = null;
      }

      const audioUri = await stopRecording();
      setIsRecordingAudio(false);
      setIsTranscribing(true);

      // Transcribe audio
      try {
        const transcription = await transcribeAudioWithRetry(audioUri);

        // Add transcription to text
        const separator = text.length > 0 && !text.endsWith(" ") ? " " : "";
        setText(text + separator + transcription);

        Alert.alert(
          'Erfolgreich!',
          'Deine Aufnahme wurde in Text umgewandelt.',
          [{ text: 'OK' }]
        );
      } catch (transcriptionError) {
        console.error('Transcription error:', transcriptionError);
        Alert.alert(
          'Fehler bei der Umwandlung',
          'Die Spracherkennung ist fehlgeschlagen. Bitte versuche es erneut.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Stop recording error:', error);
      Alert.alert(
        'Fehler',
        'Die Aufnahme konnte nicht gestoppt werden.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleCancelRecording = async () => {
    try {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
        recordingInterval.current = null;
      }

      await cancelRecording();
      setIsRecordingAudio(false);
      setRecordingDuration(0);
    } catch (error) {
      console.error('Cancel recording error:', error);
    }
  };

  // Gratitude Voice Recording Functions
  const handleStartGratitudeRecording = async () => {
    try {
      await startRecording();
      setIsRecordingGratitude(true);
      setGratitudeRecordingDuration(0);

      // Update duration every second
      gratitudeRecordingInterval.current = setInterval(async () => {
        const duration = await getRecordingDuration();
        setGratitudeRecordingDuration(Math.floor(duration / 1000));
      }, 1000);
    } catch (error) {
      console.error('Recording error:', error);
      Alert.alert(
        'Fehler',
        'Mikrofonzugriff konnte nicht gestartet werden. Bitte erlaube den Mikrofonzugriff in den Einstellungen.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleStopGratitudeRecording = async () => {
    try {
      // Clear interval
      if (gratitudeRecordingInterval.current) {
        clearInterval(gratitudeRecordingInterval.current);
        gratitudeRecordingInterval.current = null;
      }

      const audioUri = await stopRecording();
      setIsRecordingGratitude(false);
      setIsTranscribingGratitude(true);

      // Transcribe audio
      try {
        const transcription = await transcribeAudioWithRetry(audioUri);

        // Add transcription to gratitude
        const separator = gratitude.length > 0 && !gratitude.endsWith(" ") ? ", " : "";
        setGratitude(gratitude + separator + transcription);

        Alert.alert(
          'Erfolgreich!',
          'Deine Aufnahme wurde in Text umgewandelt.',
          [{ text: 'OK' }]
        );
      } catch (transcriptionError) {
        console.error('Transcription error:', transcriptionError);
        Alert.alert(
          'Fehler bei der Umwandlung',
          'Die Spracherkennung ist fehlgeschlagen. Bitte versuche es erneut.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Stop recording error:', error);
      Alert.alert(
        'Fehler',
        'Die Aufnahme konnte nicht gestoppt werden.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsTranscribingGratitude(false);
    }
  };

  const handleCancelGratitudeRecording = async () => {
    try {
      if (gratitudeRecordingInterval.current) {
        clearInterval(gratitudeRecordingInterval.current);
        gratitudeRecordingInterval.current = null;
      }

      await cancelRecording();
      setIsRecordingGratitude(false);
      setGratitudeRecordingDuration(0);
    } catch (error) {
      console.error('Cancel recording error:', error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
      if (gratitudeRecordingInterval.current) {
        clearInterval(gratitudeRecordingInterval.current);
      }
      if (isRecordingAudio) {
        cancelRecording();
      }
      if (isRecordingGratitude) {
        cancelRecording();
      }
    };
  }, []);

  const emotions = [
    { key: "happy", emoji: "😊", label: "Glücklich", value: 85 },
    { key: "content", emoji: "😌", label: "Zufrieden", value: 75 },
    { key: "neutral", emoji: "😐", label: "Neutral", value: 50 },
    { key: "stressed", emoji: "😤", label: "Gestresst", value: 35 },
    { key: "anxious", emoji: "😟", label: "Ängstlich", value: 30 },
    { key: "sad", emoji: "😔", label: "Traurig", value: 25 },
  ];

  // Prüfen, ob heute bereits ein Eintrag erstellt wurde (bei jedem Screen-Fokus)
  useFocusEffect(
    React.useCallback(() => {
      const checkTodayEntry = async () => {
        // Skip im Gastmodus oder wenn nicht eingeloggt
        if (isGuestMode || !auth.currentUser) {
          setCheckingLimit(false);
          setCanCreateEntry(false);
          return;
        }

        try {
          // 🔒 DATENSCHUTZ: Prüfe lokalen Storage für heutigen Eintrag
          const todayEntry = await getTodaysLocalEntry(auth.currentUser.uid);

          if (todayEntry) {
            setCanCreateEntry(false);
            setTodayEntry(todayEntry);
            console.log("📝 Heute bereits Eintrag erstellt (lokal)");
          } else {
            setCanCreateEntry(true);
            setTodayEntry(null);
            console.log("✅ Kein Eintrag heute - kann erstellen");
          }
        } catch (err) {
          console.error("Fehler beim Prüfen des Eintrags:", err);
          // Im Fehlerfall: Erstellung erlauben
          setCanCreateEntry(true);
        } finally {
          setCheckingLimit(false);
        }
      };

      setCheckingLimit(true);
      checkTodayEntry();
    }, [isGuestMode])
  );

  // Berechne Streak
  useEffect(() => {
    const calculateStreak = async () => {
      try {
        if (!auth.currentUser) return;

        // 🔒 DATENSCHUTZ: Lade Einträge aus lokalem Storage
        const localEntries = await getLocalEntries(auth.currentUser.uid);

        const entryDates = localEntries
          .map(entry => {
            if (!entry.createdAt) return null;
            const date = new Date(entry.createdAt);
            const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            return normalized.getTime();
          })
          .filter(d => d !== null);

        const uniqueDates = [...new Set(entryDates)].sort((a, b) => b - a);

        if (uniqueDates.length === 0) {
          setCurrentStreak(0);
          setLongestStreak(0);
          return;
        }

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
      } catch (err) {
        console.error("Fehler beim Berechnen des Streaks:", err);
      }
    };

    calculateStreak();
  }, [todayEntry]);

  // Score basiert auf der gewählten Emotion
  // Optional: Kleiner Bonus für Dankbarkeit, da Dankbarkeit psychologisch mit Wohlbefinden korreliert
  const computeFeelScore = () => {
    const selectedEmotionObj = emotions.find(e => `${e.emoji} ${e.label}` === selectedEmotion);
    if (!selectedEmotionObj) return 50;

    let score = selectedEmotionObj.value;

    // Optional: Bonus für Dankbarkeit (+5 Punkte)
    if (gratitude.trim().length > 20) score += 5;

    return Math.min(99, Math.max(1, Math.round(score)));
  };

  const feelScore = useMemo(computeFeelScore, [selectedEmotion, text, gratitude]);

  const handleSave = async () => {
    // Guest Mode Check
    if (isGuestMode) {
      setShowGuestModal(true);
      return;
    }

    if (!canCreateEntry) {
      Alert.alert(
        "Eintrag bereits vorhanden",
        "Du hast heute bereits einen Eintrag erstellt. Du kannst nur einmal pro Tag einen neuen Eintrag anlegen."
      );
      return;
    }

    if (!selectedEmotion) {
      Alert.alert("Hinweis", "Bitte wähle zuerst deine Stimmung.");
      return;
    }

    if (!text.trim()) {
      Alert.alert("Hinweis", "Bitte beschreibe kurz, was dich beschäftigt.");
      return;
    }

    setLoading(true);
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 0.92,
      duration: 12000,
      useNativeDriver: false,
    }).start();

    try {
      const fullInput = `
Emotion: ${selectedEmotion}
Wohlfühlscore: ${feelScore}/99
Beschreibung: ${text}
${gratitude.trim() ? `Dankbarkeit: ${gratitude}` : ''}
`;
      const aiReply = await getAiResponse(selectedEmotion, fullInput);

      const userId = auth.currentUser?.uid;

      // 1. LOKAL SPEICHERN (vollständige Daten inkl. Text & KI-Analyse)
      const localEntry = await saveEntryLocally(userId, {
        emotion: selectedEmotion,
        feelScore: feelScore,
        theme: text.substring(0, 50),
        text,
        gratitude: gratitude.trim() || null,
        analysis: aiReply || null,
      });

      // 2. NUR METADATEN in Cloud (für Charts & Statistiken)
      // KEIN Text, KEINE KI-Analyse - Datenschutz!
      await addDoc(collection(db, "entries"), {
        userId: userId,
        emotion: selectedEmotion,
        feelScore: feelScore,
        createdAt: Timestamp.now(),
        // Hinweis: Texte & Analysen nur lokal gespeichert
        hasLocalData: true,
      });

      // Sofort State aktualisieren: Heute bereits Eintrag erstellt
      setCanCreateEntry(false);
      setTodayEntry(localEntry);

      Animated.timing(progress, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false,
      }).start(() => {
        setTimeout(() => {
          setLoading(false);
          progress.setValue(0);

          navigation.navigate("DailyAnalysis", {
            aiReply,
            localEntryId: localEntry.localId,  // Für lokales Laden
            emotion: selectedEmotion,
            text,
            theme: text.substring(0, 50),
            feelScore: feelScore,
          });
        }, 220);
      });

      // Reset
      setSelectedEmotion(null);
      setText("");
      setGratitude("");
    } catch (error) {
      setLoading(false);
      console.error("Fehler beim Speichern:", error);
      Alert.alert("Fehler", error.message || "Beim Speichern ist ein Fehler aufgetreten.");
    }
  };

  if (checkingLimit) {
    return (
      <LinearGradient colors={["#F6FBFF", "#FFFFFF"]} style={styles.background}>
        <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={{ marginTop: 16, fontSize: 16, color: "#8E8E93" }}>Prüfe Verfügbarkeit...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#F6FBFF", "#FFFFFF"]} style={styles.background}>
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => navigation.navigate("Settings")}
      >
        <Ionicons name="settings-outline" size={28} color="#007AFF" />
      </TouchableOpacity>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <View style={styles.topRow}>
              <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
                <Ionicons name="chevron-back" size={24} color="#007AFF" />
              </TouchableOpacity>
              <ScreenHeader title="Wie fühlst du dich?" subtitle="Nimm dir einen Moment für dich" />
            </View>

            {/* Status: Eintrag bereits vorhanden */}
            {!canCreateEntry && todayEntry && (
              <View style={styles.limitCard}>
                <Ionicons name="checkmark-circle" size={28} color="#37B24D" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.limitTitle}>✅ Heute bereits eingetragen</Text>
                  <Text style={styles.limitSubtitle}>
                    Du hast heute schon einen Eintrag erstellt. Ein neuer Eintrag ist morgen möglich.
                  </Text>
                  {todayEntry.emotion && (
                    <Text style={styles.limitInfo}>
                      Heutige Stimmung: {todayEntry.emotion}
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Streak Tracker */}
            {currentStreak > 0 && (
              <View style={styles.streakCard}>
                <View style={styles.streakContent}>
                  <View style={styles.streakMain}>
                    <Text style={styles.streakEmoji}>🔥</Text>
                    <View style={styles.streakInfo}>
                      <Text style={styles.streakNumber}>{currentStreak}</Text>
                      <Text style={styles.streakLabel}>
                        {currentStreak === 1 ? "Tag" : "Tage"} am Stück
                      </Text>
                    </View>
                  </View>
                  {longestStreak > currentStreak && (
                    <View style={styles.longestBadge}>
                      <Ionicons name="trophy" size={14} color="#FFB900" />
                      <Text style={styles.longestText}>
                        Rekord: {longestStreak} {longestStreak === 1 ? "Tag" : "Tage"}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Emotion-Auswahl mit großen Buttons */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Wie fühlst du dich gerade?</Text>
              <View style={styles.emotionsGrid}>
                {emotions.map((emo) => {
                  const selected = selectedEmotion === `${emo.emoji} ${emo.label}`;
                  return (
                    <TouchableOpacity
                      key={emo.key}
                      style={[styles.emotionCard, selected && styles.emotionCardSelected]}
                      onPress={() => setSelectedEmotion(`${emo.emoji} ${emo.label}`)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.emotionEmoji}>{emo.emoji}</Text>
                      <Text style={[styles.emotionLabel, selected && styles.emotionLabelSelected]}>
                        {emo.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Haupttext: Was beschäftigt dich? */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Was beschäftigt dich heute?</Text>
              <TextInput
                style={[styles.input, styles.mainTextArea]}
                placeholder="Erzähl, was dich bewegt, wie dein Tag war, was du fühlst oder denkst..."
                placeholderTextColor="#999"
                value={text}
                onChangeText={setText}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
              />
              <View style={styles.inputHelperRow}>
                <Text style={styles.charCount}>{text.length} Zeichen</Text>
                <View style={styles.inputButtonsRow}>
                  {/* Voice Recording Button */}
                  {!isRecordingAudio && !isTranscribing && (
                    <TouchableOpacity
                      style={[styles.inputHelperButton, styles.voiceButton]}
                      onPress={handleStartRecording}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="mic" size={18} color="#E03131" />
                      <Text style={[styles.inputHelperText, { color: "#E03131" }]}>Sprechen</Text>
                    </TouchableOpacity>
                  )}

                  {/* Recording in Progress */}
                  {isRecordingAudio && (
                    <View style={styles.recordingContainer}>
                      <TouchableOpacity
                        style={styles.recordingStopButton}
                        onPress={handleStopRecording}
                        activeOpacity={0.7}
                      >
                        <View style={styles.recordingPulse} />
                        <Ionicons name="stop-circle" size={24} color="#E03131" />
                        <Text style={styles.recordingTime}>
                          {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.recordingCancelButton}
                        onPress={handleCancelRecording}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="close-circle" size={20} color="#8E8E93" />
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Transcribing */}
                  {isTranscribing && (
                    <View style={styles.transcribingContainer}>
                      <ActivityIndicator size="small" color="#007AFF" />
                      <Text style={styles.transcribingText}>Wird umgewandelt...</Text>
                    </View>
                  )}

                  {/* Quick Input Helper */}
                  <TouchableOpacity
                    style={styles.inputHelperButton}
                    onPress={() => setShowInputHelper(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="bulb" size={18} color="#007AFF" />
                    <Text style={styles.inputHelperText}>Schnell</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Dankbarkeit (optional) */}
            <View style={styles.section}>
              <View style={styles.gratitudeHeader}>
                <Text style={styles.sectionTitle}>💚 Wofür bist du dankbar?</Text>
                <View style={styles.optionalBadge}>
                  <Text style={styles.optionalBadgeText}>Optional</Text>
                </View>
              </View>
              <TextInput
                style={[styles.input, styles.gratitudeInput]}
                placeholder="z.B. Sonnenschein, nettes Gespräch, Zeit für mich..."
                placeholderTextColor="#999"
                value={gratitude}
                onChangeText={setGratitude}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <View style={styles.inputHelperRow}>
                <Text style={styles.charCount}>{gratitude.length} Zeichen</Text>
                <View style={styles.inputButtonsRow}>
                  {/* Voice Recording Button */}
                  {!isRecordingGratitude && !isTranscribingGratitude && (
                    <TouchableOpacity
                      style={[styles.inputHelperButton, styles.voiceButton]}
                      onPress={handleStartGratitudeRecording}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="mic" size={18} color="#E03131" />
                      <Text style={[styles.inputHelperText, { color: "#E03131" }]}>Sprechen</Text>
                    </TouchableOpacity>
                  )}

                  {/* Recording in Progress */}
                  {isRecordingGratitude && (
                    <View style={styles.recordingContainer}>
                      <TouchableOpacity
                        style={styles.recordingStopButton}
                        onPress={handleStopGratitudeRecording}
                        activeOpacity={0.7}
                      >
                        <View style={styles.recordingPulse} />
                        <Ionicons name="stop-circle" size={24} color="#E03131" />
                        <Text style={styles.recordingTime}>
                          {Math.floor(gratitudeRecordingDuration / 60)}:{(gratitudeRecordingDuration % 60).toString().padStart(2, '0')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.recordingCancelButton}
                        onPress={handleCancelGratitudeRecording}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="close-circle" size={20} color="#8E8E93" />
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Transcribing */}
                  {isTranscribingGratitude && (
                    <View style={styles.transcribingContainer}>
                      <ActivityIndicator size="small" color="#007AFF" />
                      <Text style={styles.transcribingText}>Wird umgewandelt...</Text>
                    </View>
                  )}

                  {/* Quick Input Helper */}
                  <TouchableOpacity
                    style={styles.inputHelperButton}
                    onPress={() => setShowGratitudeHelper(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="bulb" size={18} color="#007AFF" />
                    <Text style={styles.inputHelperText}>Schnell</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Speichern-Button */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.saveWrapper}
                onPress={handleSave}
                disabled={loading || !canCreateEntry}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={loading || !canCreateEntry ? ["#CCCCCC", "#999999"] : ["#34a3ff", "#007aff"]}
                  start={[0, 0]}
                  end={[1, 1]}
                  style={[styles.saveButton, (loading || !canCreateEntry) && styles.saveButtonDisabled]}
                >
                  <Text style={styles.saveText}>
                    {loading ? "Speichere..." : !canCreateEntry ? "Heute bereits genutzt" : "Speichern & Analysieren"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {loading && (
                <View style={styles.loadingRow}>
                  <View style={styles.progressWrapper}>
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
                  <ActivityIndicator size="small" color="#007aff" style={{ marginLeft: 12 }} />
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Smart Input Helper Modal */}
      <Modal
        visible={showInputHelper}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInputHelper(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="bulb" size={28} color="#007AFF" />
              <Text style={styles.modalTitle}>Schnell-Eingaben</Text>
              <TouchableOpacity onPress={() => setShowInputHelper(false)}>
                <Ionicons name="close-circle" size={32} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Wähle einen Satzanfang zum schnellen Eintragen:
            </Text>

            <ScrollView style={styles.modalScroll}>
              {quickPhrases.map((group, idx) => (
                <View key={idx} style={styles.phraseGroup}>
                  <Text style={styles.phraseCategory}>{group.category}</Text>
                  {group.phrases.map((phrase, pIdx) => (
                    <TouchableOpacity
                      key={pIdx}
                      style={styles.phraseButton}
                      onPress={() => addPhrase(phrase)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
                      <Text style={styles.phraseText}>{phrase}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Gratitude Quick Input Helper Modal */}
      <Modal
        visible={showGratitudeHelper}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGratitudeHelper(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="heart" size={28} color="#37B24D" />
              <Text style={styles.modalTitle}>Dankbarkeit - Schnell-Eingaben</Text>
              <TouchableOpacity onPress={() => setShowGratitudeHelper(false)}>
                <Ionicons name="close-circle" size={32} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Wähle eine Dankbarkeit zum schnellen Eintragen:
            </Text>

            <ScrollView style={styles.modalScroll}>
              {quickGratitudePhrases.map((group, idx) => (
                <View key={idx} style={styles.phraseGroup}>
                  <Text style={styles.phraseCategory}>{group.category}</Text>
                  {group.phrases.map((phrase, pIdx) => (
                    <TouchableOpacity
                      key={pIdx}
                      style={styles.phraseButton}
                      onPress={() => addGratitudePhrase(phrase)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add-circle-outline" size={20} color="#37B24D" />
                      <Text style={styles.phraseText}>{phrase}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Guest Mode Block Modal */}
      <GuestBlockModal
        visible={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        onRegister={() => {
          setShowGuestModal(false);
          exitGuestMode();
        }}
        featureName="Tageseintrag erstellen"
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
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
    padding: 18,
    paddingBottom: 40,
  },
  topRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  back: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  section: { width: "100%", marginTop: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 14,
  },

  // Emotion Grid
  emotionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  emotionCard: {
    width: "31%",
    aspectRatio: 1,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 12,
    marginBottom: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#E5E5EA",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emotionCardSelected: {
    backgroundColor: "#E3F2FD",
    borderColor: "#007AFF",
    shadowColor: "#007AFF",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  emotionEmoji: {
    fontSize: 42,
    marginBottom: 8,
  },
  emotionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    textAlign: "center",
  },
  emotionLabelSelected: {
    color: "#007AFF",
    fontWeight: "700",
  },

  // Text Inputs
  input: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    width: "100%",
    borderWidth: 1.5,
    borderColor: "#E5E5EA",
    fontSize: 15,
    color: "#1C1C1E",
  },
  mainTextArea: {
    minHeight: 180,
    textAlignVertical: "top",
  },
  gratitudeInput: {
    minHeight: 90,
    textAlignVertical: "top",
    backgroundColor: "#F9FFF9",
    borderColor: "#C8E6C9",
  },
  charCount: {
    fontSize: 12,
    color: "#999",
    marginTop: 6,
    textAlign: "right",
  },

  // Gratitude Header
  gratitudeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  optionalBadge: {
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  optionalBadgeText: {
    fontSize: 11,
    color: "#666",
    fontWeight: "600",
  },

  // Footer & Button
  footer: { width: "100%", marginTop: 30, alignItems: "center" },
  saveWrapper: { width: "100%", paddingHorizontal: 6 },
  saveButton: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: { opacity: 0.95 },
  saveText: { color: "#fff", fontSize: 17, fontWeight: "800" },

  loadingRow: {
    marginTop: 16,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
  },
  progressWrapper: {
    flex: 1,
    height: 8,
    backgroundColor: "#eef6fb",
    borderRadius: 8,
    overflow: "hidden",
  },
  progressBar: { height: "100%", backgroundColor: "#007aff" },

  // Limit Card
  limitCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    width: "100%",
    borderWidth: 2,
    borderColor: "#C8E6C9",
  },
  limitTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1B5E20",
    marginBottom: 6,
  },
  limitSubtitle: {
    fontSize: 14,
    color: "#2E7D32",
    lineHeight: 20,
    marginBottom: 6,
  },
  limitInfo: {
    fontSize: 13,
    color: "#388E3C",
    fontWeight: "600",
    marginTop: 4,
  },

  // Streak Tracker
  streakCard: {
    width: "100%",
    backgroundColor: "#FFF5E5",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
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
    fontSize: 40,
    marginRight: 12,
  },
  streakInfo: {
    justifyContent: "center",
  },
  streakNumber: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FF6B35",
    lineHeight: 32,
  },
  streakLabel: {
    fontSize: 13,
    color: "#8B5E3C",
    fontWeight: "600",
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
    fontSize: 12,
    color: "#8B5E3C",
    fontWeight: "700",
    marginLeft: 4,
  },

  // Smart Input Helper
  inputHelperRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  inputButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inputHelperButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  voiceButton: {
    backgroundColor: "#FFE5E5",
  },
  inputHelperText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#007AFF",
  },

  // Voice Recording Styles
  recordingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recordingStopButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFE5E5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  recordingPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E03131",
    opacity: 0.8,
  },
  recordingTime: {
    fontSize: 13,
    fontWeight: "700",
    color: "#E03131",
  },
  recordingCancelButton: {
    padding: 6,
  },
  transcribingContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 8,
  },
  transcribingText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#007AFF",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  modalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: "#1C1C1E",
    marginLeft: 12,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#8E8E93",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  modalScroll: {
    paddingHorizontal: 20,
  },
  phraseGroup: {
    marginBottom: 24,
  },
  phraseCategory: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 12,
  },
  phraseButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F9FC",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    gap: 12,
  },
  phraseText: {
    flex: 1,
    fontSize: 15,
    color: "#3C3C43",
  },
});
