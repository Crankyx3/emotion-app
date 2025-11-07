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
              🔐 Der Schutz deiner persönlichen und sensiblen Daten hat für uns höchste Priorität.
              Diese App speichert alle sensiblen Daten (Texte, Analysen, Dankbarkeit) ausschließlich
              lokal auf deinem Gerät - für maximale Privatsphäre!
            </Text>

            <Text style={styles.sectionTitle}>🔒 1. Verantwortlicher</Text>
            <Text style={styles.text}>
              Verantwortlich für die Datenverarbeitung in dieser App:{"\n\n"}
              Finn Bauermeister-Kutschker{"\n"}
              Nadorster Str. 270{"\n"}
              26125 Oldenburg{"\n"}
              Deutschland{"\n\n"}
              E-Mail: appsbycrank@gmail.com
            </Text>

            <Text style={styles.sectionTitle}>📊 2. Welche Daten erfassen wir?</Text>

            <Text style={styles.subsectionTitle}>Account-Daten (in der Cloud):</Text>
            <Text style={styles.bulletPoint}>• E-Mail-Adresse (für Login via Firebase Auth)</Text>
            <Text style={styles.bulletPoint}>• Dein Name (freiwillig, für Begrüßung)</Text>
            <Text style={styles.bulletPoint}>• Passwort (verschlüsselt bei Firebase)</Text>
            <Text style={styles.bulletPoint}>• User-ID (automatisch generiert)</Text>

            <Text style={styles.subsectionTitle}>Metadaten in der Cloud (Firebase):</Text>
            <Text style={styles.bulletPoint}>• Ausgewählte Emotion (z.B. "😊 Glücklich")</Text>
            <Text style={styles.bulletPoint}>• Wohlfühlscore (1-99)</Text>
            <Text style={styles.bulletPoint}>• Datum und Uhrzeit der Einträge</Text>
            <Text style={styles.bulletPoint}>• User-ID (Verknüpfung zu deinem Account)</Text>

            <Text style={styles.subsectionTitle}>🔐 NUR lokal auf deinem Gerät:</Text>
            <Text style={styles.bulletPoint}>• ✅ Deine vollständigen Texte und Beschreibungen</Text>
            <Text style={styles.bulletPoint}>• ✅ Dankbarkeitsnotizen</Text>
            <Text style={styles.bulletPoint}>• ✅ KI-generierte Analysen deiner Einträge</Text>
            <Text style={styles.bulletPoint}>• ✅ Chat-Verläufe mit dem KI-Assistent</Text>
            <Text style={styles.bulletPoint}>• ✅ Alle persönlichen, sensiblen Inhalte</Text>

            <Text style={styles.important}>
              🔐 WICHTIG: Deine Texte, Gedanken und KI-Analysen verlassen NIEMALS dauerhaft dein Gerät!
              Sie werden ausschließlich lokal gespeichert. Nur anonymisierte Metadaten (Emotionen, Scores)
              werden in der Cloud gespeichert, um Charts und Statistiken zu erstellen.
            </Text>

            <Text style={styles.sectionTitle}>🎯 3. Wofür nutzen wir deine Daten?</Text>

            <Text style={styles.subsectionTitle}>Lokale Daten (auf deinem Gerät):</Text>
            <Text style={styles.bulletPoint}>• Anzeige deiner Tagebucheinträge</Text>
            <Text style={styles.bulletPoint}>• KI-gestützte Stimmungsanalysen</Text>
            <Text style={styles.bulletPoint}>• Chat mit KI-Assistent</Text>
            <Text style={styles.bulletPoint}>• Streak-Berechnung</Text>

            <Text style={styles.subsectionTitle}>Cloud-Daten (Metadaten):</Text>
            <Text style={styles.bulletPoint}>• Emotionsverlauf-Charts erstellen</Text>
            <Text style={styles.bulletPoint}>• Statistiken über deine Stimmung</Text>
            <Text style={styles.bulletPoint}>• Synchronisation zwischen mehreren Geräten (nur Metadaten)</Text>

            <Text style={styles.important}>
              ⚠️ Garantie: Deine Texte und Einträge werden NIEMALS an Dritte verkauft,
              zu Werbezwecken genutzt oder dauerhaft in der Cloud gespeichert!
            </Text>

            <Text style={styles.sectionTitle}>🤖 4. KI & OpenAI (ChatGPT)</Text>
            <Text style={styles.text}>
              Für KI-Analysen nutzen wir OpenAI (GPT-4o-mini). Dabei gilt:{"\n\n"}
              • ✅ Deine Texte werden temporär an OpenAI-Server gesendet (nur für Analyse){"\n"}
              • ✅ Die KI-Antwort wird lokal auf deinem Gerät gespeichert{"\n"}
              • ✅ Keine persönlichen Daten (Name, E-Mail) werden mitgesendet{"\n"}
              • ✅ OpenAI speichert Daten für max. 30 Tage, dann automatische Löschung{"\n"}
              • ✅ OpenAI nutzt deine Daten NICHT für KI-Training{"\n"}
              • ✅ Du kannst KI-Analysen jederzeit in den Einstellungen deaktivieren{"\n\n"}
              Mehr Infos: https://openai.com/policies/api-data-usage-policies
            </Text>

            <Text style={styles.sectionTitle}>🔐 5. Datensicherheit</Text>
            <Text style={styles.subsectionTitle}>Lokale Daten (auf deinem Gerät):</Text>
            <Text style={styles.bulletPoint}>• Speicherung in AsyncStorage (React Native)</Text>
            <Text style={styles.bulletPoint}>• Geschützt durch dein Geräte-Passwort/Biometrie</Text>
            <Text style={styles.bulletPoint}>• Kein Zugriff von außen möglich</Text>
            <Text style={styles.bulletPoint}>• Bei App-Deinstallation werden lokale Daten gelöscht</Text>

            <Text style={styles.subsectionTitle}>Cloud-Daten (Metadaten):</Text>
            <Text style={styles.bulletPoint}>• Verschlüsselte Übertragung (HTTPS/TLS)</Text>
            <Text style={styles.bulletPoint}>• Speicherung bei Firebase (Google Cloud, EU-Server)</Text>
            <Text style={styles.bulletPoint}>• Zugriff nur mit deinem Account möglich</Text>
            <Text style={styles.bulletPoint}>• Keine Weitergabe an Dritte</Text>

            <Text style={styles.sectionTitle}>🌍 6. Datenübermittlung</Text>
            <Text style={styles.text}>
              Deine Metadaten werden gespeichert bei:{"\n\n"}
              • Firebase/Google Cloud (Server in der EU){"\n"}
              • Firebase Authentication (Account-Verwaltung){"\n"}
              • Firestore Database (Metadaten-Speicherung){"\n\n"}
              Temporäre Übermittlung für KI-Analysen:{"\n\n"}
              • OpenAI (USA) - nur deine Texte für Analysen, max. 30 Tage{"\n"}
              • Nutzung von EU-Standardvertragsklauseln{"\n"}
              • Keine dauerhafte Speicherung
            </Text>

            <Text style={styles.sectionTitle}>⏱️ 7. Speicherdauer</Text>
            <Text style={styles.subsectionTitle}>Lokale Daten:</Text>
            <Text style={styles.bulletPoint}>• Bis zur manuellen Löschung durch dich (Einstellungen)</Text>
            <Text style={styles.bulletPoint}>• Automatisch bei App-Deinstallation gelöscht</Text>

            <Text style={styles.subsectionTitle}>Cloud-Daten (Metadaten):</Text>
            <Text style={styles.bulletPoint}>• Solange dein Account existiert</Text>
            <Text style={styles.bulletPoint}>• Bei Account-Löschung: Sofortige, vollständige Löschung</Text>

            <Text style={styles.subsectionTitle}>OpenAI:</Text>
            <Text style={styles.bulletPoint}>• Automatische Löschung nach 30 Tagen</Text>

            <Text style={styles.sectionTitle}>✅ 8. Deine Rechte (DSGVO)</Text>
            <Text style={styles.bulletPoint}>• ℹ️ Auskunft: Welche Daten haben wir über dich?</Text>
            <Text style={styles.bulletPoint}>• ✏️ Berichtigung: Daten korrigieren</Text>
            <Text style={styles.bulletPoint}>• 🗑️ Löschung: Account und alle Daten löschen (in Einstellungen)</Text>
            <Text style={styles.bulletPoint}>• 📦 Datenübertragbarkeit: Lokale Daten exportieren (in Einstellungen)</Text>
            <Text style={styles.bulletPoint}>• 🚫 Widerspruch: KI-Analysen deaktivieren (in Einstellungen)</Text>
            <Text style={styles.bulletPoint}>• 🔒 Einschränkung: Verarbeitung einschränken</Text>

            <Text style={styles.text}>
              Kontakt für Datenschutzanfragen:{"\n"}
              E-Mail: appsbycrank@gmail.com
            </Text>

            <Text style={styles.sectionTitle}>🍪 9. Cookies & Tracking</Text>
            <Text style={styles.text}>
              Diese App nutzt:{"\n\n"}
              ✅ KEINE Werbe-Tracker{"\n"}
              ✅ KEINE Analyse-Tools (Google Analytics o.ä.){"\n"}
              ✅ KEINE Third-Party-Cookies{"\n"}
              ✅ Nur technisch notwendige Session-Daten (Firebase Auth){"\n\n"}
              Wir tracken dich nicht und verkaufen keine Daten!
            </Text>

            <Text style={styles.sectionTitle}>👶 10. Mindestalter</Text>
            <Text style={styles.text}>
              Diese App ist für Personen ab 16 Jahren konzipiert. Wenn du jünger bist,
              benötigst du die Zustimmung deiner Erziehungsberechtigten.
            </Text>

            <Text style={styles.sectionTitle}>💰 11. Premium & Zahlungen</Text>
            <Text style={styles.text}>
              Bei Premium-Käufen über RevenueCat/App Stores:{"\n\n"}
              • Verarbeitung durch Apple/Google{"\n"}
              • Wir erhalten nur: User-ID, Abo-Status, Ablaufdatum{"\n"}
              • Keine Zahlungsdaten (diese bleiben bei Apple/Google)
            </Text>

            <Text style={styles.sectionTitle}>📝 12. Änderungen</Text>
            <Text style={styles.text}>
              Wir können diese Datenschutzerklärung aktualisieren. Bei wesentlichen Änderungen
              informieren wir dich in der App. Das Datum der letzten Aktualisierung findest du oben.
            </Text>

            <Text style={styles.sectionTitle}>📧 13. Kontakt & Beschwerden</Text>
            <Text style={styles.text}>
              Fragen zum Datenschutz?{"\n"}
              E-Mail: appsbycrank@gmail.com{"\n\n"}
              Du hast auch das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren:{"\n\n"}
              Die Landesbeauftragte für den Datenschutz Niedersachsen{"\n"}
              Prinzenstraße 5{"\n"}
              30159 Hannover{"\n"}
              www.lfd.niedersachsen.de
            </Text>

            <View style={styles.footer}>
              <Ionicons name="shield-checkmark" size={32} color="#34C759" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.footerTitle}>🔐 Privacy First!</Text>
                <Text style={styles.footerText}>
                  Deine Privatsphäre ist uns wichtig. Durch die lokale Speicherung aller sensiblen
                  Daten haben nur DU Zugriff auf deine Gedanken und Gefühle.
                </Text>
              </View>
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
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
    fontWeight: "500",
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
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#FFB900",
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 32,
    padding: 20,
    backgroundColor: "#E8F5E9",
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#34C759",
  },
  footerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 6,
  },
  footerText: {
    fontSize: 13,
    color: "#1C1C1E",
    lineHeight: 18,
  },
});
