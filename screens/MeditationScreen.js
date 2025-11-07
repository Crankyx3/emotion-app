import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenHeader from "../components/ScreenHeader";
import { usePremium } from "../components/PremiumProvider";

const { width } = Dimensions.get("window");

export default function MeditationScreen({ navigation }) {
  const { canUseFeature, getTrialText } = usePremium();
  const [selectedMeditation, setSelectedMeditation] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [breathPhase, setBreathPhase] = useState("");

  const guidedMeditations = [
    {
      id: 1,
      title: "Achtsamkeitsmeditation",
      duration: 2,
      icon: "🧘‍♀️",
      color: "#007aff",
      description: "Kurze Achtsamkeitsübung für den Moment",
      steps: [
        { time: 20, text: "Setze dich bequem hin und schließe die Augen..." },
        { time: 30, text: "Konzentriere dich auf deinen Atem. Atme natürlich ein und aus..." },
        { time: 40, text: "Beobachte deine Gedanken ohne sie zu bewerten. Lass sie wie Wolken vorbeiziehen..." },
        { time: 30, text: "Bringe deine Aufmerksamkeit zurück zu deinem Körper und öffne langsam die Augen." },
      ],
    },
    {
      id: 2,
      title: "Body Scan",
      duration: 3,
      icon: "🌊",
      color: "#34a853",
      description: "Entspanne deinen Körper von Kopf bis Fuß",
      steps: [
        { time: 20, text: "Lege dich hin oder setze dich bequem. Schließe die Augen..." },
        { time: 30, text: "Spüre deinen Kopf und dein Gesicht. Lass alle Anspannung los..." },
        { time: 30, text: "Entspanne deine Schultern und deinen Nacken..." },
        { time: 30, text: "Spüre deine Arme und Hände. Lass sie schwer werden..." },
        { time: 30, text: "Entspanne deinen Rücken, deinen Bauch..." },
        { time: 30, text: "Lass die Entspannung in deine Beine und Füße fließen..." },
        { time: 30, text: "Spüre deinen ganzen Körper entspannt. Atme ruhig..." },
      ],
    },
    {
      id: 3,
      title: "Positive Affirmationen",
      duration: 3,
      icon: "✨",
      color: "#fbbc05",
      description: "Stärke dein Selbstwertgefühl",
      steps: [
        { time: 20, text: "Setze dich bequem hin und atme tief ein..." },
        { time: 30, text: "Wiederhole: 'Ich bin wertvoll und verdiene Liebe'..." },
        { time: 30, text: "'Ich vertraue meinen Fähigkeiten'..." },
        { time: 30, text: "'Ich bin stark und kann Herausforderungen meistern'..." },
        { time: 30, text: "'Ich akzeptiere mich, wie ich bin'..." },
        { time: 40, text: "Spüre die positiven Gefühle in dir. Atme tief ein und aus..." },
      ],
    },
    {
      id: 4,
      title: "Stressabbau",
      duration: 5,
      icon: "🌸",
      color: "#a142f4",
      description: "Löse Anspannung und finde innere Ruhe",
      steps: [
        { time: 30, text: "Finde einen ruhigen Ort. Setze dich bequem hin..." },
        { time: 40, text: "Atme tief ein durch die Nase, zähle bis 4..." },
        { time: 40, text: "Halte den Atem für 4 Sekunden..." },
        { time: 40, text: "Atme langsam aus durch den Mund, zähle bis 6..." },
        { time: 60, text: "Stelle dir vor, wie Stress deinen Körper mit jedem Ausatmen verlässt..." },
        { time: 60, text: "Spüre, wie Entspannung deinen Körper durchströmt..." },
        { time: 40, text: "Atme weiter ruhig und gleichmäßig..." },
        { time: 30, text: "Öffne langsam die Augen und kehre erfrischt zurück." },
      ],
    },
  ];

  const breathingExercises = [
    {
      id: 1,
      title: "4-7-8 Atmung",
      subtitle: "Beruhigt das Nervensystem",
      icon: "wind",
      color: "#007aff",
      pattern: [
        { phase: "Einatmen", duration: 4, color: "#007aff" },
        { phase: "Halten", duration: 7, color: "#fbbc05" },
        { phase: "Ausatmen", duration: 8, color: "#34a853" },
      ],
      description: "Atme 4 Sekunden ein, halte 7 Sekunden, atme 8 Sekunden aus. Wiederhole 4x.",
    },
    {
      id: 2,
      title: "Box Breathing",
      subtitle: "Für Fokus und Klarheit",
      icon: "square-outline",
      color: "#34a853",
      pattern: [
        { phase: "Einatmen", duration: 4, color: "#007aff" },
        { phase: "Halten", duration: 4, color: "#fbbc05" },
        { phase: "Ausatmen", duration: 4, color: "#34a853" },
        { phase: "Halten", duration: 4, color: "#a142f4" },
      ],
      description: "Einatmen (4s), Halten (4s), Ausatmen (4s), Halten (4s). Wiederhole.",
    },
    {
      id: 3,
      title: "Tiefe Bauchatmung",
      subtitle: "Gegen Angst und Panik",
      icon: "fitness",
      color: "#a142f4",
      pattern: [
        { phase: "Tief Einatmen", duration: 5, color: "#007aff" },
        { phase: "Kurz Halten", duration: 2, color: "#fbbc05" },
        { phase: "Langsam Ausatmen", duration: 6, color: "#34a853" },
      ],
      description: "Atme tief in den Bauch ein (5s), halte kurz (2s), atme langsam aus (6s).",
    },
  ];

  useEffect(() => {
    let interval;
    if (isPlaying && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0 && isPlaying) {
      setIsPlaying(false);
      setSelectedMeditation(null);
    }
    return () => clearInterval(interval);
  }, [isPlaying, timeRemaining]);

  const startMeditation = (meditation) => {
    // Prüfe Premium-Status
    if (!canUseFeature('meditation')) {
      const trialInfo = getTrialText();
      Alert.alert(
        "Premium Feature",
        `Alle Meditationen & Übungen sind ein Premium-Feature.\n\n${trialInfo || 'Upgrade auf Premium für unbegrenzte Meditationen.'}`,
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

    setSelectedMeditation(meditation);
    setTimeRemaining(meditation.duration * 60);
    setIsPlaying(true);
  };

  const startBreathingExercise = (exercise) => {
    // Prüfe Premium-Status
    if (!canUseFeature('meditation')) {
      const trialInfo = getTrialText();
      Alert.alert(
        "Premium Feature",
        `Alle Meditationen & Übungen sind ein Premium-Feature.\n\n${trialInfo || 'Upgrade auf Premium für unbegrenzte Meditationen.'}`,
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

    // Simple breathing exercise implementation
    setSelectedMeditation(exercise);
    setIsPlaying(true);
    // Cycle through breath phases
    let currentPhaseIndex = 0;
    const cyclePhases = () => {
      if (currentPhaseIndex < exercise.pattern.length) {
        const phase = exercise.pattern[currentPhaseIndex];
        setBreathPhase(phase.phase);
        setTimeRemaining(phase.duration);
        currentPhaseIndex++;
        setTimeout(cyclePhases, phase.duration * 1000);
      } else {
        currentPhaseIndex = 0;
        cyclePhases(); // Repeat
      }
    };
    cyclePhases();
  };

  const stopMeditation = () => {
    setIsPlaying(false);
    setSelectedMeditation(null);
    setBreathPhase("");
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const getCurrentStep = () => {
    if (!selectedMeditation || !selectedMeditation.steps) return null;

    const totalDuration = selectedMeditation.duration * 60;
    const elapsed = totalDuration - timeRemaining;

    let cumulativeTime = 0;
    for (let step of selectedMeditation.steps) {
      cumulativeTime += step.time;
      if (elapsed < cumulativeTime) {
        return step.text;
      }
    }
    return selectedMeditation.steps[selectedMeditation.steps.length - 1].text;
  };

  return (
    <LinearGradient colors={["#EAF4FF", "#FFFFFF"]} style={styles.gradient}>
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => navigation.navigate("Settings")}
      >
        <Ionicons name="settings-outline" size={28} color="#007AFF" />
      </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={32} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <ScreenHeader
          title="🧘‍♀️ Meditation & Achtsamkeit"
          subtitle="Finde innere Ruhe und Gelassenheit"
        />

        {/* Guided Meditations Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Geführte Meditationen</Text>
          <Text style={styles.sectionSubtitle}>2-5 Minuten für mehr Achtsamkeit</Text>

          {guidedMeditations.map((meditation, index) => (
            <View
              key={meditation.id}
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: index * 150, type: "timing", duration: 500 }}
            >
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.9}
                onPress={() => startMeditation(meditation)}
              >
                <View style={[styles.iconContainer, { backgroundColor: meditation.color + "15" }]}>
                  <Text style={styles.emoji}>{meditation.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{meditation.title}</Text>
                  <Text style={styles.cardSubtitle}>{meditation.description}</Text>
                  <Text style={styles.duration}>{meditation.duration} Min.</Text>
                </View>
                <Ionicons name="play-circle" size={32} color={meditation.color} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Breathing Exercises Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Atemübungen</Text>
          <Text style={styles.sectionSubtitle}>Bei Stress und Angst</Text>

          {breathingExercises.map((exercise, index) => (
            <View
              key={exercise.id}
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ delay: (guidedMeditations.length + index) * 150, type: "timing", duration: 500 }}
            >
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.9}
                onPress={() => startBreathingExercise(exercise)}
              >
                <View style={[styles.iconContainer, { backgroundColor: exercise.color + "15" }]}>
                  <Ionicons name={exercise.icon} size={28} color={exercise.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{exercise.title}</Text>
                  <Text style={styles.cardSubtitle}>{exercise.subtitle}</Text>
                </View>
                <Ionicons name="play-circle" size={32} color={exercise.color} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Tips Card */}
        <View
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 800, type: "timing", duration: 600 }}
          style={styles.tipsCard}
        >
          <Ionicons name="bulb-outline" size={24} color="#fbbc05" />
          <Text style={styles.tipsText}>
            Tipp: Übe täglich 5-10 Minuten Meditation für beste Ergebnisse. Finde einen ruhigen
            Ort und schalte Ablenkungen aus.
          </Text>
        </View>
      </ScrollView>

      {/* Meditation/Breathing Modal */}
      <Modal
        visible={selectedMeditation !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={stopMeditation}
      >
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={
              selectedMeditation?.color
                ? [selectedMeditation.color + "20", selectedMeditation.color + "05"]
                : ["#EAF4FF", "#FFFFFF"]
            }
            style={styles.modalContent}
          >
            <TouchableOpacity style={styles.closeButton} onPress={stopMeditation}>
              <Ionicons name="close-circle" size={36} color="#666" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>{selectedMeditation?.title}</Text>

            {/* For breathing exercises */}
            {selectedMeditation?.pattern && (
              <View style={styles.breathingContainer}>
                <View
                  from={{ scale: 0.8 }}
                  animate={{ scale: breathPhase.includes("Einatmen") ? 1.3 : 0.8 }}
                  transition={{ type: "timing", duration: timeRemaining * 1000, loop: false }}
                  style={[
                    styles.breathingCircle,
                    {
                      backgroundColor:
                        selectedMeditation.pattern.find((p) => p.phase === breathPhase)?.color ||
                        "#007aff",
                    },
                  ]}
                />
                <Text style={styles.breathPhaseText}>{breathPhase}</Text>
                <Text style={styles.breathTimerText}>{timeRemaining}s</Text>
                <Text style={styles.breathDescription}>{selectedMeditation.description}</Text>
              </View>
            )}

            {/* For guided meditations */}
            {selectedMeditation?.steps && (
              <View style={styles.meditationContainer}>
                <View style={styles.timerContainer}>
                  <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
                </View>
                <Text style={styles.guidanceText}>{getCurrentStep()}</Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${((selectedMeditation.duration * 60 - timeRemaining) /
                          (selectedMeditation.duration * 60)) *
                          100}%`,
                        backgroundColor: selectedMeditation.color,
                      },
                    ]}
                  />
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.stopButton, { backgroundColor: selectedMeditation?.color || "#007aff" }]}
              onPress={stopMeditation}
            >
              <Ionicons name="stop" size={24} color="#fff" />
              <Text style={styles.stopButtonText}>Beenden</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
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
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  topRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    marginTop: 25,
  },
  backButton: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  section: {
    width: "100%",
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 15,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
    width: "100%",
    marginVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
  },
  emoji: {
    fontSize: 28,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#222",
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#666",
    marginTop: 3,
  },
  duration: {
    fontSize: 12,
    color: "#007aff",
    marginTop: 4,
    fontWeight: "600",
  },
  tipsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fffbf0",
    borderRadius: 12,
    padding: 15,
    marginTop: 20,
    width: "100%",
    borderWidth: 1,
    borderColor: "#fbbc0530",
  },
  tipsText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 13,
    color: "#666",
    lineHeight: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: width * 0.9,
    maxHeight: "80%",
    borderRadius: 24,
    padding: 30,
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 15,
    right: 15,
    zIndex: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#222",
    marginTop: 10,
    marginBottom: 30,
    textAlign: "center",
  },
  // Breathing Exercise Styles
  breathingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  breathingCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 30,
    opacity: 0.6,
  },
  breathPhaseText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#222",
    marginBottom: 10,
  },
  breathTimerText: {
    fontSize: 48,
    fontWeight: "300",
    color: "#007aff",
    marginBottom: 20,
  },
  breathDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  // Guided Meditation Styles
  meditationContainer: {
    alignItems: "center",
    width: "100%",
  },
  timerContainer: {
    backgroundColor: "#f1f3f5",
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 40,
    marginBottom: 30,
  },
  timerText: {
    fontSize: 48,
    fontWeight: "300",
    color: "#007aff",
  },
  guidanceText: {
    fontSize: 18,
    color: "#333",
    textAlign: "center",
    lineHeight: 28,
    paddingHorizontal: 10,
    marginBottom: 30,
    minHeight: 80,
  },
  progressBar: {
    width: "100%",
    height: 6,
    backgroundColor: "#e0e0e0",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 20,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  stopButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginTop: 20,
  },
  stopButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});
