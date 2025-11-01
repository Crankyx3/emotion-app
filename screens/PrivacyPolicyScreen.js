import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

export default function PrivacyPolicyScreen({ navigation, route }) {
  const { fromRegistration } = route.params || {};

  return (
    <LinearGradient colors={["#EAF4FF", "#FFFFFF"]} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={28} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Datenschutzerklärung</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.content}>
            <Text style={styles.lastUpdated}>Stand: {new Date().toLocaleDateString("de-DE")}</Text>

            <Text style={styles.intro}>
              Der Schutz deiner persönlichen und sensiblen Daten hat für uns höchste Priorität.
              Diese Datenschutzerklärung erklärt, welche Daten wir erfassen, wie wir sie nutzen
              und welche Rechte du hast.
            </Text>

            <Text style={styles.sectionTitle}>🔒 1. Verantwortlicher</Text>
            <Text style={styles.text}>
              Verantwortlich für die Datenverarbeitung in dieser App:{"\n"}
              KI-Stimmungshelfer{"\n"}
              [Deine Adresse]{"\n"}
              [Kontakt-E-Mail]
            </Text>

            <Text style={styles.sectionTitle}>📊 2. Welche Daten erfassen wir?</Text>
            <Text style={styles.subsectionTitle}>Account-Daten:</Text>
            <Text style={styles.bulletPoint}>• E-Mail-Adresse (für Login)</Text>
            <Text style={styles.bulletPoint}>• Dein Name (freiwillig)</Text>
            <Text style={styles.bulletPoint}>• Passwort (verschlüsselt gespeichert)</Text>

            <Text style={styles.subsectionTitle}>Tagebuch-Einträge:</Text>
            <Text style={styles.bulletPoint}>• Emotionen und Wohlfühlscores</Text>
            <Text style={styles.bulletPoint}>• Deine Texte und Beschreibungen</Text>
            <Text style={styles.bulletPoint}>• Themen und Dankbarkeitsnotizen</Text>
            <Text style={styles.bulletPoint}>• Datum und Uhrzeit der Einträge</Text>

            <Text style={styles.subsectionTitle}>KI-Analysen:</Text>
            <Text style={styles.bulletPoint}>• KI-generierte Analysen deiner Einträge</Text>
            <Text style={styles.bulletPoint}>• Chat-Verläufe mit dem KI-Assistent</Text>

            <Text style={styles.sectionTitle}>🎯 3. Wofür nutzen wir deine Daten?</Text>
            <Text style={styles.bulletPoint}>• Bereitstellung der App-Funktionen (Tagebuch, Analysen)</Text>
            <Text style={styles.bulletPoint}>• KI-gestützte Stimmungsanalysen</Text>
            <Text style={styles.bulletPoint}>• Personalisierte Empfehlungen</Text>
            <Text style={styles.bulletPoint}>• Verbesserung der App</Text>

            <Text style={styles.important}>
              ⚠️ Wichtig: Deine Texte und Einträge werden NIEMALS an Dritte verkauft oder
              zu Werbezwecken genutzt!
            </Text>

            <Text style={styles.sectionTitle}>🤖 4. KI & OpenAI</Text>
            <Text style={styles.text}>
              Für KI-Analysen nutzen wir OpenAI (GPT-4o-mini). Dabei werden:{"\n\n"}
              • Deine Texte temporär an OpenAI-Server gesendet{"\n"}
              • Keine persönlichen Daten (Name, E-Mail) mitgesendet{"\n"}
              • Daten von OpenAI für 30 Tage gespeichert, dann gelöscht{"\n"}
              • OpenAI nutzt deine Daten NICHT für Training{"\n\n"}
              Du kannst KI-Analysen jederzeit in den Einstellungen deaktivieren.
            </Text>

            <Text style={styles.sectionTitle}>🔐 5. Datensicherheit</Text>
            <Text style={styles.bulletPoint}>• Alle Daten werden verschlüsselt übertragen (HTTPS)</Text>
            <Text style={styles.bulletPoint}>• Passwörter werden verschlüsselt gespeichert</Text>
            <Text style={styles.bulletPoint}>• Speicherung bei Firebase (Google Cloud, EU-Server)</Text>
            <Text style={styles.bulletPoint}>• Zugriff nur mit deinem Account möglich</Text>
            <Text style={styles.bulletPoint}>• Keine Weitergabe an Dritte ohne deine Zustimmung</Text>

            <Text style={styles.sectionTitle}>🌍 6. Datenübermittlung</Text>
            <Text style={styles.text}>
              Deine Daten werden gespeichert bei:{"\n\n"}
              • Firebase/Google Cloud (Server in der EU){"\n"}
              • OpenAI (USA) - nur für KI-Analysen, temporär{"\n\n"}
              Für die Übermittlung in die USA (OpenAI) nutzen wir EU-Standardvertragsklauseln.
            </Text>

            <Text style={styles.sectionTitle}>⏱️ 7. Speicherdauer</Text>
            <Text style={styles.bulletPoint}>• Deine Daten werden gespeichert, solange dein Account existiert</Text>
            <Text style={styles.bulletPoint}>• Bei Account-Löschung: Sofortige, vollständige Löschung aller Daten</Text>
            <Text style={styles.bulletPoint}>• OpenAI: Automatische Löschung nach 30 Tagen</Text>

            <Text style={styles.sectionTitle}>✅ 8. Deine Rechte (DSGVO)</Text>
            <Text style={styles.bulletPoint}>• Auskunft: Welche Daten haben wir über dich?</Text>
            <Text style={styles.bulletPoint}>• Berichtigung: Daten korrigieren</Text>
            <Text style={styles.bulletPoint}>• Löschung: Account und alle Daten löschen (in Einstellungen)</Text>
            <Text style={styles.bulletPoint}>• Datenübertragbarkeit: Daten exportieren (in Einstellungen)</Text>
            <Text style={styles.bulletPoint}>• Widerspruch: KI-Analysen deaktivieren (in Einstellungen)</Text>

            <Text style={styles.sectionTitle}>🍪 9. Cookies & Tracking</Text>
            <Text style={styles.text}>
              Diese App nutzt:{"\n\n"}
              • KEINE Werbe-Tracker{"\n"}
              • KEINE Analyse-Tools (Google Analytics o.ä.){"\n"}
              • Nur technisch notwendige Session-Daten{"\n\n"}
              Wir tracken dich nicht!
            </Text>

            <Text style={styles.sectionTitle}>👶 10. Mindestalter</Text>
            <Text style={styles.text}>
              Diese App ist für Personen ab 16 Jahren konzipiert. Wenn du jünger bist,
              sprich bitte mit deinen Erziehungsberechtigten.
            </Text>

            <Text style={styles.sectionTitle}>📝 11. Änderungen</Text>
            <Text style={styles.text}>
              Wir können diese Datenschutzerklärung aktualisieren. Bei wesentlichen Änderungen
              informieren wir dich in der App.
            </Text>

            <Text style={styles.sectionTitle}>📧 12. Kontakt</Text>
            <Text style={styles.text}>
              Fragen zum Datenschutz?{"\n"}
              E-Mail: [datenschutz@ki-stimmungshelfer.de]{"\n\n"}
              Du hast auch das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren.
            </Text>

            <View style={styles.footer}>
              <Ionicons name="shield-checkmark" size={24} color="#34C759" />
              <Text style={styles.footerText}>
                Deine Privatsphäre ist uns wichtig. Wir nehmen den Schutz deiner sensiblen
                Daten sehr ernst.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
    backgroundColor: "#fff",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1C1C1E",
  },
  container: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  content: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  lastUpdated: {
    fontSize: 12,
    color: "#8E8E93",
    marginBottom: 16,
    fontStyle: "italic",
  },
  intro: {
    fontSize: 15,
    color: "#1C1C1E",
    lineHeight: 22,
    marginBottom: 24,
    backgroundColor: "#E3F2FD",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#007AFF",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1C1C1E",
    marginTop: 24,
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1C1C1E",
    marginTop: 12,
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    color: "#1C1C1E",
    lineHeight: 20,
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 14,
    color: "#1C1C1E",
    lineHeight: 22,
    marginLeft: 8,
    marginBottom: 6,
  },
  important: {
    fontSize: 14,
    color: "#1C1C1E",
    lineHeight: 20,
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: "#FFF3CD",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#FFB900",
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 32,
    padding: 16,
    backgroundColor: "#E8F5E9",
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#34C759",
  },
  footerText: {
    fontSize: 13,
    color: "#1C1C1E",
    lineHeight: 18,
    marginLeft: 12,
    flex: 1,
  },
});
