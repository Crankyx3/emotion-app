import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import ScreenHeader from "../components/ScreenHeader";
import { Colors, Spacing, Typography, BorderRadius, Shadows } from "../theme";

export default function ImpressumScreen({ navigation }) {
  const handleEmailPress = () => {
    Linking.openURL('mailto:appsbycrank@gmail.com');
  };

  return (
    <LinearGradient colors={["#EAF4FF", "#FFFFFF"]} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
        </TouchableOpacity>

        <ScreenHeader title="Impressum" subtitle="Angaben gemäß § 5 TMG" />

        {/* Verantwortlicher */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Verantwortlich für den Inhalt</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.infoText}>Finn Bauermeister-Kutschker</Text>
            <Text style={styles.infoText}>Nadorster Str. 270</Text>
            <Text style={styles.infoText}>26125 Oldenburg</Text>
            <Text style={styles.infoText}>Deutschland</Text>
          </View>
        </View>

        {/* Kontakt */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="mail-outline" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Kontakt</Text>
          </View>
          <View style={styles.card}>
            <TouchableOpacity onPress={handleEmailPress} style={styles.emailButton}>
              <Ionicons name="mail" size={18} color={Colors.primary} />
              <Text style={styles.emailText}>appsbycrank@gmail.com</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* EU-Streitschlichtung */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark-outline" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>EU-Streitschlichtung</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.bodyText}>
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
            </Text>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://ec.europa.eu/consumers/odr/')}
              style={styles.linkButton}
            >
              <Text style={styles.linkText}>https://ec.europa.eu/consumers/odr/</Text>
            </TouchableOpacity>
            <Text style={styles.bodyText} style={{ marginTop: 12 }}>
              Unsere E-Mail-Adresse finden Sie oben im Impressum.
            </Text>
          </View>
        </View>

        {/* Verbraucherstreitbeilegung */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Verbraucherstreitbeilegung</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.bodyText}>
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
              Verbraucherschlichtungsstelle teilzunehmen.
            </Text>
          </View>
        </View>

        {/* Haftungsausschluss */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="alert-circle-outline" size={20} color={Colors.warning} />
            <Text style={styles.sectionTitle}>Haftungsausschluss</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.disclaimerTitle}>Haftung für Inhalte</Text>
            <Text style={styles.bodyText}>
              Die Inhalte unserer App wurden mit größter Sorgfalt erstellt. Für die Richtigkeit,
              Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.
            </Text>

            <Text style={[styles.disclaimerTitle, { marginTop: 16 }]}>Datenschutz</Text>
            <Text style={styles.bodyText}>
              Diese App speichert alle sensiblen Daten (Tagebucheinträge, KI-Analysen) ausschließlich
              lokal auf Ihrem Gerät. Nur Metadaten (Emotionen, Scores, Zeitstempel) werden für
              statistische Auswertungen in der Cloud gespeichert.
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Stand: {new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    padding: Spacing.lg,
    paddingTop: 60,
  },
  backButton: {
    position: "absolute",
    top: 60,
    left: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
    fontSize: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadows.small,
  },
  infoText: {
    ...Typography.body,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  bodyText: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  emailButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  emailText: {
    ...Typography.bodyMedium,
    color: Colors.primary,
    marginLeft: Spacing.sm,
    textDecorationLine: "underline",
  },
  linkButton: {
    marginTop: 8,
    paddingVertical: 8,
  },
  linkText: {
    ...Typography.body,
    color: Colors.primary,
    textDecorationLine: "underline",
  },
  disclaimerTitle: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  footer: {
    alignItems: "center",
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  footerText: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
});
