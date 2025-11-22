import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  SafeAreaView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "../components/ScreenHeader";

export default function EmergencyScreen({ navigation }) {
  const [expandedStrategy, setExpandedStrategy] = useState(null);

  const callHotline = (number, name) => {
    Alert.alert(
      `${name} anrufen?`,
      `Möchtest du ${number} anrufen? Dieser Anruf ist kostenlos und anonym.`,
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Anrufen",
          onPress: () => Linking.openURL(`tel:${number}`),
        },
      ]
    );
  };

  const openWebsite = (url, name) => {
    Alert.alert(
      `${name} öffnen?`,
      `Möchtest du die Website öffnen?`,
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Öffnen",
          onPress: () => Linking.openURL(url),
        },
      ]
    );
  };

  const hotlines = [
    {
      name: "Telefonseelsorge",
      numbers: ["0800 111 0 111", "0800 111 0 222"],
      description: "24/7 kostenlos & anonym",
      icon: "call",
      color: "#E03131",
    },
    {
      name: "Krisenchat (unter 25)",
      website: "https://krisenchat.de",
      description: "Chat & WhatsApp für junge Menschen",
      icon: "chatbubbles",
      color: "#37B24D",
    },
    {
      name: "Nummer gegen Kummer",
      numbers: ["116 111"],
      description: "Mo-Sa 14-20 Uhr (Kinder & Jugendliche)",
      icon: "heart",
      color: "#FF9500",
    },
    {
      name: "Info-Telefon Depression",
      numbers: ["0800 334 4533"],
      description: "Mo, Di, Do 13-17 Uhr, Mi, Fr 8:30-12:30 Uhr",
      icon: "information-circle",
      color: "#667eea",
    },
  ];

  const immediateStrategies = [
    {
      title: "⚠️ KEINE Beruhigung suchen!",
      icon: "close-circle",
      color: "#E03131",
      steps: [
        "❌ NICHT googeln oder nachforschen",
        "❌ NICHT andere um Beruhigung fragen",
        "❌ NICHT checken oder kontrollieren",
        "✅ Der Drang ist stark - das ist OK",
        "✅ Lass die Unsicherheit da sein",
      ],
    },
    {
      title: "Gedanken-Defusion",
      icon: "cloud-outline",
      color: "#667eea",
      steps: [
        "Sage: 'Ich habe den Gedanken, dass...'",
        "Nicht: 'Es ist so', sondern: 'Ich denke, dass...'",
        "Der Gedanke ist wie eine Wolke am Himmel",
        "Er kommt und geht - du bist nicht der Gedanke",
        "Beobachte ihn ohne zu kämpfen",
      ],
    },
    {
      title: "Unsicherheit akzeptieren",
      icon: "help-circle",
      color: "#FF9500",
      steps: [
        "Sage laut: 'Vielleicht, vielleicht auch nicht'",
        "Oder: 'Ich weiß es nicht - und das ist OK'",
        "Unsicherheit ist Teil des Lebens",
        "Du musst es nicht zu 100% wissen",
        "Kannst du mit diesem Vielleicht leben?",
      ],
    },
    {
      title: "5-4-3-2-1 Grounding",
      icon: "eye",
      color: "#007AFF",
      steps: [
        "Nenne 5 Dinge, die du SEHEN kannst",
        "Nenne 4 Dinge, die du HÖREN kannst",
        "Nenne 3 Dinge, die du FÜHLEN kannst",
        "Nenne 2 Dinge, die du RIECHEN kannst",
        "Nenne 1 Ding, das du SCHMECKEN kannst",
      ],
    },
    {
      title: "Box-Atmung (4-4-4-4)",
      icon: "square",
      color: "#34C759",
      steps: [
        "Atme 4 Sekunden ein",
        "Halte 4 Sekunden",
        "Atme 4 Sekunden aus",
        "Halte 4 Sekunden",
        "Wiederhole 5-10 Mal",
      ],
    },
    {
      title: "Gedanken vorbeiziehen lassen",
      icon: "water",
      color: "#5AC8FA",
      steps: [
        "Stelle dir vor: Gedanken sind Blätter auf einem Fluss",
        "Sie kommen... und treiben vorbei",
        "Du musst sie nicht festhalten oder wegstoßen",
        "Beobachte sie einfach beim Vorbeifließen",
        "Atme dabei ruhig weiter",
      ],
    },
  ];

  return (
    <LinearGradient colors={["#FFE5E5", "#FFFFFF"]} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={28} color="#E03131" />
        </TouchableOpacity>

        <ScreenHeader
          title="🆘 OCD Notfall-Hilfe"
          subtitle="Bei starken Zwangsgedanken - Du bist nicht allein"
        />

        <ScrollView contentContainerStyle={styles.container}>
          {/* Notfall-Warnung */}
          <View style={styles.emergencyCard}>
            <Ionicons name="alert-circle" size={32} color="#E03131" />
            <View style={styles.emergencyContent}>
              <Text style={styles.emergencyTitle}>Akute Gefahr?</Text>
              <Text style={styles.emergencyText}>
                Bei akuter Selbstgefährdung rufe bitte sofort den Notruf 112 oder gehe zur nächsten Notaufnahme!
              </Text>
              <TouchableOpacity
                style={styles.emergencyButton}
                onPress={() => Linking.openURL("tel:112")}
              >
                <Ionicons name="call" size={20} color="#fff" />
                <Text style={styles.emergencyButtonText}>112 anrufen</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Hotlines */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📞 Hilfe-Hotlines</Text>
            <Text style={styles.sectionSubtitle}>
              Kostenlos, anonym und vertraulich
            </Text>

            {hotlines.map((hotline, index) => (
              <View key={index} style={[styles.hotlineCard, { borderLeftColor: hotline.color }]}>
                <View style={[styles.hotlineIcon, { backgroundColor: hotline.color + '20' }]}>
                  <Ionicons name={hotline.icon} size={28} color={hotline.color} />
                </View>
                <View style={styles.hotlineContent}>
                  <Text style={styles.hotlineName}>{hotline.name}</Text>
                  <Text style={styles.hotlineDescription}>{hotline.description}</Text>

                  {hotline.numbers && hotline.numbers.map((number, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.numberButton}
                      onPress={() => callHotline(number, hotline.name)}
                    >
                      <Ionicons name="call" size={18} color={hotline.color} />
                      <Text style={[styles.numberText, { color: hotline.color }]}>
                        {number}
                      </Text>
                    </TouchableOpacity>
                  ))}

                  {hotline.website && (
                    <TouchableOpacity
                      style={styles.numberButton}
                      onPress={() => openWebsite(hotline.website, hotline.name)}
                    >
                      <Ionicons name="globe" size={18} color={hotline.color} />
                      <Text style={[styles.numberText, { color: hotline.color }]}>
                        Website öffnen
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>

          {/* Sofort-Strategien */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚡ Sofort-Hilfe Strategien</Text>
            <Text style={styles.sectionSubtitle}>
              Übungen, die dir JETZT helfen können
            </Text>

            {immediateStrategies.map((strategy, index) => (
              <View key={index} style={styles.strategyCard}>
                <TouchableOpacity
                  style={styles.strategyHeader}
                  onPress={() => setExpandedStrategy(expandedStrategy === index ? null : index)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.strategyIconBg, { backgroundColor: strategy.color + '20' }]}>
                    <Ionicons name={strategy.icon} size={24} color={strategy.color} />
                  </View>
                  <Text style={styles.strategyTitle}>{strategy.title}</Text>
                  <Ionicons
                    name={expandedStrategy === index ? "chevron-up" : "chevron-down"}
                    size={24}
                    color="#8E8E93"
                  />
                </TouchableOpacity>

                {expandedStrategy === index && (
                  <View style={styles.strategySteps}>
                    {strategy.steps.map((step, idx) => (
                      <View key={idx} style={styles.stepRow}>
                        <View style={[styles.stepNumber, { backgroundColor: strategy.color }]}>
                          <Text style={styles.stepNumberText}>{idx + 1}</Text>
                        </View>
                        <Text style={styles.stepText}>{step}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Wichtiger Hinweis */}
          <View style={styles.disclaimerCard}>
            <Ionicons name="shield-checkmark" size={24} color="#007AFF" />
            <Text style={styles.disclaimerText}>
              Diese App ersetzt keine professionelle Hilfe. Bei anhaltenden Beschwerden wende dich bitte an einen Therapeuten oder Arzt.
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  backButton: {
    position: "absolute",
    top: 60,
    left: 20,
    zIndex: 10,
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    borderRadius: 25,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  // Emergency Card
  emergencyCard: {
    backgroundColor: "#FFF5F5",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: "#FF6B6B",
    flexDirection: "row",
    alignItems: "flex-start",
  },
  emergencyContent: {
    flex: 1,
    marginLeft: 12,
  },
  emergencyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#E03131",
    marginBottom: 8,
  },
  emergencyText: {
    fontSize: 14,
    color: "#C92A2A",
    lineHeight: 20,
    marginBottom: 12,
  },
  emergencyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E03131",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  emergencyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  // Sections
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1C1C1E",
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#8E8E93",
    marginBottom: 16,
  },

  // Hotline Cards
  hotlineCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  hotlineIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  hotlineContent: {
    flex: 1,
  },
  hotlineName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 4,
  },
  hotlineDescription: {
    fontSize: 13,
    color: "#8E8E93",
    marginBottom: 12,
  },
  numberButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 8,
  },
  numberText: {
    fontSize: 16,
    fontWeight: "600",
  },

  // Strategy Cards
  strategyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  strategyHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  strategyIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  strategyTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#1C1C1E",
  },
  strategySteps: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    backgroundColor: "#F7F9FC",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: "#2C3E50",
    lineHeight: 22,
  },

  // Disclaimer
  disclaimerCard: {
    flexDirection: "row",
    backgroundColor: "#E3F2FD",
    borderRadius: 12,
    padding: 16,
    alignItems: "flex-start",
    marginTop: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    color: "#1565C0",
    lineHeight: 20,
    marginLeft: 12,
  },
});
