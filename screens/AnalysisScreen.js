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
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../firebaseconfig";
import { getAiResponse } from "../openaiService";

export default function AnalysisScreen() {
  const navigation = useNavigation();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiText, setAiText] = useState(null);
  const [highlight, setHighlight] = useState(null);
  const [expanded, setExpanded] = useState(false); // <--- NEU: Text ein-/ausklappen

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

      setHighlight({
        mood,
        title: titleMap[mood],
        colors: colorMap[mood],
      });

      setAiText(reply);
      setExpanded(false); // zurücksetzen bei neuer Analyse
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

        {/* Statistikkarte */}
        <View style={styles.statsBox}>
          <Text style={styles.stat}>📅 Tage berücksichtigt: {entries.length}</Text>
          <Text style={styles.stat}>💙 Ø Wohlfühlwert: {avg.toFixed(1)} / 99</Text>
          <Text style={styles.stat}>🛏️ Ø Schlaf: {avgSleep.toFixed(1)} / 10</Text>
          <Text style={styles.stat}>⚡ Ø Energie: {avgEnergy.toFixed(1)} / 10</Text>
          <Text style={styles.stat}>❤️ Ø Selbstwert: {avgSelfWorth.toFixed(1)} / 10</Text>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleWeeklyAnalysis}
          disabled={analyzing}
        >
          <Text style={styles.buttonText}>
            {analyzing ? "Analysiere Woche..." : "KI-Wochenanalyse starten"}
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
});
