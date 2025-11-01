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
} from "react-native";
import { collection, addDoc, Timestamp, updateDoc, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "../firebaseconfig";
import { getAiResponse } from "../openaiService";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../components/AuthProvider";
import GuestBlockModal from "../components/GuestBlockModal";

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

  const emotions = [
    { key: "happy", emoji: "😊", label: "Glücklich", value: 85 },
    { key: "content", emoji: "😌", label: "Zufrieden", value: 75 },
    { key: "neutral", emoji: "😐", label: "Neutral", value: 50 },
    { key: "stressed", emoji: "😤", label: "Gestresst", value: 35 },
    { key: "anxious", emoji: "😟", label: "Ängstlich", value: 30 },
    { key: "sad", emoji: "😔", label: "Traurig", value: 25 },
  ];

  // Prüfen, ob heute bereits ein Eintrag erstellt wurde
  useEffect(() => {
    const checkTodayEntry = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const q = query(
          collection(db, "entries"),
          where("userId", "==", auth.currentUser.uid)
        );

        const snapshot = await getDocs(q);

        const todayEntries = snapshot.docs.filter((doc) => {
          const data = doc.data();
          if (!data.createdAt) return false;
          const entryDate = data.createdAt.toDate();
          return entryDate >= today && entryDate < tomorrow;
        });

        if (todayEntries.length > 0) {
          const entry = todayEntries[0].data();
          setCanCreateEntry(false);
          setTodayEntry(entry);
        } else {
          setCanCreateEntry(true);
        }
      } catch (err) {
        console.error("Fehler beim Prüfen des Eintrags:", err);
      } finally {
        setCheckingLimit(false);
      }
    };

    checkTodayEntry();
  }, []);

  // Berechne Streak
  useEffect(() => {
    const calculateStreak = async () => {
      try {
        if (!auth.currentUser) return;

        const q = query(
          collection(db, "entries"),
          where("userId", "==", auth.currentUser.uid)
        );
        const snapshot = await getDocs(q);

        const entryDates = snapshot.docs
          .map(doc => {
            const data = doc.data();
            if (!data.createdAt) return null;
            const date = data.createdAt.toDate();
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

      const docRef = await addDoc(collection(db, "entries"), {
        userId: auth.currentUser?.uid,
        emotion: selectedEmotion,
        feelScore: feelScore,
        theme: text.substring(0, 50), // Erste 50 Zeichen als "Thema"
        text,
        gratitude: gratitude.trim() || null,
        analysis: aiReply || null,
        createdAt: Timestamp.now(),
      });

      await updateDoc(docRef, { id: docRef.id });

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
              <Text style={styles.charCount}>{text.length} Zeichen</Text>
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
});
