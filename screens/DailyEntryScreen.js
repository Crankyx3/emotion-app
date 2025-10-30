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
import Slider from "@react-native-community/slider";
import { collection, addDoc, Timestamp, updateDoc, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db, auth } from "../firebaseconfig";
import { getAiResponse } from "../openaiService";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

export default function DailyEntryScreen() {
  const navigation = useNavigation();

  const [selectedEmotion, setSelectedEmotion] = useState(null);
  const [text, setText] = useState("");
  const [theme, setTheme] = useState("");
  const [sleep, setSleep] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [selfWorth, setSelfWorth] = useState(5);

  // Ladezustand + progress für Ladebalken
  const [loading, setLoading] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  // Daily Entry Limit
  const [canCreateEntry, setCanCreateEntry] = useState(true);
  const [checkingLimit, setCheckingLimit] = useState(true);
  const [todayEntry, setTodayEntry] = useState(null);

  const emotions = [
    { key: "happy", label: "😊 Glücklich" },
    { key: "sad", label: "😔 Traurig" },
    { key: "stressed", label: "😤 Gestresst" },
    { key: "anxious", label: "😟 Ängstlich" },
    { key: "neutral", label: "😐 Neutral" },
  ];

  // Prüfen, ob heute bereits ein Eintrag erstellt wurde
  useEffect(() => {
    const checkTodayEntry = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Erst nach userId filtern, dann clientseitig nach Datum
        const q = query(
          collection(db, "entries"),
          where("userId", "==", auth.currentUser.uid)
        );

        const snapshot = await getDocs(q);

        // Clientseitig nach heutigem Datum filtern
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

  const computePreviewScore = () => {
    const emotionValue = {
      "😊 Glücklich": 10,
      "😐 Neutral": 6,
      "😤 Gestresst": 4,
      "😟 Ängstlich": 3,
      "😔 Traurig": 2,
    }[selectedEmotion] || 5;
    const baseScore = emotionValue * 0.4 + sleep * 0.2 + energy * 0.2 + selfWorth * 0.2;
    const feelScore = Math.min(99, Math.max(1, Math.round(baseScore * 9.9)));
    return feelScore;
  };

  const previewScore = useMemo(computePreviewScore, [selectedEmotion, sleep, energy, selfWorth]);

  const handleSave = async () => {
    if (!canCreateEntry) {
      Alert.alert(
        "Eintrag bereits vorhanden",
        "Du hast heute bereits einen Eintrag erstellt. Du kannst nur einmal pro Tag einen neuen Eintrag anlegen."
      );
      return;
    }

    if (!selectedEmotion) {
      Alert.alert("Hinweis", "Bitte wähle zuerst eine Emotion.");
      return;
    }

    // Start Ladeanimation
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
Schlafqualität: ${sleep}/10
Energielevel: ${energy}/10
Selbstwertgefühl: ${selfWorth}/10
Wohlfühlscore: ${previewScore}/99
Thema: ${theme}
Beschreibung: ${text}
`;
      const aiReply = await getAiResponse(selectedEmotion, fullInput);

      const docRef = await addDoc(collection(db, "entries"), {
        userId: auth.currentUser?.uid,
        emotion: selectedEmotion,
        sleep,
        energy,
        selfWorth,
        feelScore: previewScore,
        theme,
        text,
        analysis: aiReply || null,
        createdAt: Timestamp.now(),
      });

      // ID im Dokument speichern
      await updateDoc(docRef, { id: docRef.id });

      // Ladebalken auf 100% animieren und dann navigieren
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
            theme,
            sleep,
            energy,
            selfWorth,
            feelScore: previewScore,
          });
        }, 220);
      });

      // Reset
      setSelectedEmotion(null);
      setText("");
      setTheme("");
      setSleep(5);
      setEnergy(5);
      setSelfWorth(5);
    } catch (error) {
      setLoading(false);
      console.error("Fehler beim Speichern:", error);
      Alert.alert("Fehler", error.message || "Beim Speichern ist ein Fehler aufgetreten.");
    }
  };

  const colorForScore = (s) => {
    if (s >= 70) return "#2ECC71";
    if (s >= 40) return "#F1C40F";
    return "#E74C3C";
  };

  // Zeige Lade-Indikator während Limit-Prüfung
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
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <View style={styles.topRow}>
              <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
                <Ionicons name="chevron-back" size={24} color="#007AFF" />
              </TouchableOpacity>
              <ScreenHeader title="Wie fühlst du dich heute?" subtitle="Kurz eintragen — wir analysieren es für dich" />
            </View>

            {/* Status-Karte: Eintrag heute bereits erstellt */}
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
                      Heutige Emotion: {todayEntry.emotion} • Score: {todayEntry.feelScore}/99
                    </Text>
                  )}
                </View>
              </View>
            )}

            <View style={styles.previewRow}>
              <View style={[styles.scoreCircle, { borderColor: colorForScore(previewScore) }]}>
                <Text style={[styles.scoreNumber, { color: colorForScore(previewScore) }]}>{previewScore}</Text>
                <Text style={styles.scoreLabel}>von 99</Text>
              </View>
              <View style={styles.previewText}>
                <Text style={styles.previewTitle}>Sofort-Vorschau</Text>
                <Text style={styles.previewSub}>Dein Wohlfühlscore basiert auf Emotion, Schlaf, Energie und Selbstwert.</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Emotion wählen</Text>
              <View style={styles.emotionsContainer}>
                {emotions.map((emo) => {
                  const selected = selectedEmotion === emo.label;
                  return (
                    <TouchableOpacity
                      key={emo.key}
                      style={[styles.emotionButton, selected && styles.selectedEmotion]}
                      onPress={() => setSelectedEmotion(emo.label)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.emotionText, selected && styles.emotionTextSelected]}>{emo.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Schlafqualität: <Text style={styles.badge}>{sleep}</Text></Text>
              <Slider style={styles.slider} minimumValue={1} maximumValue={10} step={1} value={sleep} onValueChange={setSleep} minimumTrackTintColor="#007aff" maximumTrackTintColor="#dfe6ef" />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Energielevel: <Text style={styles.badge}>{energy}</Text></Text>
              <Slider style={styles.slider} minimumValue={1} maximumValue={10} step={1} value={energy} onValueChange={setEnergy} minimumTrackTintColor="#007aff" maximumTrackTintColor="#dfe6ef" />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Selbstwertgefühl: <Text style={styles.badge}>{selfWorth}</Text></Text>
              <Slider style={styles.slider} minimumValue={1} maximumValue={10} step={1} value={selfWorth} onValueChange={setSelfWorth} minimumTrackTintColor="#007aff" maximumTrackTintColor="#dfe6ef" />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Hauptthema</Text>
              <TextInput style={styles.input} placeholder="z. B. Arbeit, Beziehung..." value={theme} onChangeText={setTheme} returnKeyType="next" />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Kurzbeschreibung</Text>
              <TextInput style={[styles.input, styles.textArea]} placeholder="Was beschäftigt dich heute?" value={text} onChangeText={setText} multiline />
            </View>

            <View style={styles.footer}>
              <TouchableOpacity style={styles.saveWrapper} onPress={handleSave} disabled={loading || !canCreateEntry} activeOpacity={0.9}>
                <LinearGradient
                  colors={loading || !canCreateEntry ? ["#CCCCCC", "#999999"] : ["#34a3ff", "#007aff"]}
                  start={[0,0]}
                  end={[1,1]}
                  style={[styles.saveButton, (loading || !canCreateEntry) && styles.saveButtonDisabled]}
                >
                  <Text style={styles.saveText}>
                    {loading ? "Sende & analysiere…" : !canCreateEntry ? "Heute bereits genutzt" : "Senden & analysieren"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {loading && (
                <View style={styles.loadingRow}>
                  <View style={styles.progressWrapper}>
                    <Animated.View style={[styles.progressBar, { width: progress.interpolate({ inputRange: [0,1], outputRange: ["0%","100%"] }) }]} />
                  </View>
                  <ActivityIndicator size="small" color="#007aff" style={{ marginLeft: 12 }} />
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: {
    padding: 18,
    paddingBottom: 40,
    alignItems: "center",
  },
  topRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  back: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  previewRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    marginBottom: 16,
  },
  scoreCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  scoreNumber: {
    fontSize: 20,
    fontWeight: "800",
  },
  scoreLabel: {
    fontSize: 12,
    color: "#7f8c8d",
    marginTop: 4,
  },
  previewText: { flex: 1 },
  previewTitle: { fontSize: 14, fontWeight: "700", color: "#222", marginBottom: 4 },
  previewSub: { fontSize: 12, color: "#6b7280" },

  section: { width: "100%", marginTop: 12 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#333", marginBottom: 8 },
  emotionsContainer: { flexDirection: "row", flexWrap: "wrap" },
  emotionButton: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  selectedEmotion: {
    backgroundColor: "#e6f6ff",
    borderColor: "#b3e0ff",
  },
  emotionText: { fontSize: 15 },
  emotionTextSelected: { color: "#007aff", fontWeight: "700" },

  slider: { width: "100%", height: 40 },

  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    width: "100%",
    elevation: 2,
    borderWidth: 1,
    borderColor: "transparent",
  },
  textArea: { height: 110, textAlignVertical: "top" },

  badge: { fontWeight: "800", color: "#111" },

  footer: { width: "100%", marginTop: 18, alignItems: "center" },
  saveWrapper: { width: "100%", paddingHorizontal: 6 },
  saveButton: {
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: { opacity: 0.95 },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  loadingRow: {
    marginTop: 12,
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
});
