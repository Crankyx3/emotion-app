import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenHeader from '../components/ScreenHeader';
import { Card, CardHeader, CardContent, InfoCard } from '../components/Card';
import Button from '../components/Button';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../theme';

export default function AppGuideScreen({ navigation }) {
  const [expandedCard, setExpandedCard] = useState(null);

  const toggleCard = (index) => {
    setExpandedCard(expandedCard === index ? null : index);
  };

  const guideSteps = [
    {
      icon: 'create-outline',
      iconColor: Colors.primary,
      title: 'Tagesdaten eintragen',
      shortDesc: 'Halte deine täglichen Emotionen fest',
      fullDesc: 'Wähle deine aktuelle Emotion aus, bewerte dein Wohlbefinden auf einer Skala von 0-99 und beschreibe optional deine Gedanken. Du kannst auch ein Thema und Dankbarkeitsnotizen hinzufügen.',
      tips: [
        'Trage täglich ein, um deine Streak aufzubauen',
        'Sei ehrlich mit deinen Emotionen',
        'Nutze die Textfelder für detaillierte Reflexion',
      ],
    },
    {
      icon: 'analytics-outline',
      iconColor: Colors.success,
      title: 'Tagesanalyse',
      shortDesc: 'Erhalte KI-basierte Einblicke',
      fullDesc: 'Die KI analysiert deinen Tageseintrag psychologisch und gibt dir personalisierte Empfehlungen. Du erhältst Einblicke in deine emotionale Lage und konkrete Handlungsvorschläge.',
      tips: [
        'Nur 1 Analyse pro Tag möglich',
        'Erstelle zuerst einen Tageseintrag',
        'Bewerte die Vorschläge als hilfreich/nicht hilfreich',
      ],
    },
    {
      icon: 'bar-chart-outline',
      iconColor: Colors.warning,
      title: 'EmotionChart',
      shortDesc: 'Visualisiere deinen emotionalen Verlauf',
      fullDesc: 'Sehe deine Emotionen im zeitlichen Verlauf als Grafik. Klicke auf einzelne Einträge, um Details zu sehen und optional eine KI-Analyse für vergangene Tage zu erstellen.',
      tips: [
        'Erkenne Muster in deinen Emotionen',
        'Nutze die Kalenderansicht zur Navigation',
        'Vergleiche verschiedene Zeiträume',
      ],
    },
    {
      icon: 'brain',
      iconColor: Colors.info,
      title: 'KI-Wochenanalyse',
      isMaterialIcon: true,
      shortDesc: 'Wöchentliche psychologische Reflexion',
      fullDesc: 'Alle 7 Tage kannst du eine umfassende Wochenanalyse erstellen lassen. Die KI erkennt wiederkehrende Muster, emotionale Entwicklungen und gibt dir Empfehlungen für die kommende Woche.',
      tips: [
        'Benötigt mindestens 3 Einträge',
        'Nur alle 7 Tage verfügbar',
        'Zeigt Gesamtstimmung (Positiv/Neutral/Negativ)',
      ],
    },
    {
      icon: 'chatbubbles',
      iconColor: '#FF6B6B',
      title: 'KI-Chat',
      shortDesc: 'Sprich über deine Analysen',
      fullDesc: 'Chatte mit dem "Stimmungshelfer" über deine Tages- und Wochenanalysen. Du kannst Fragen stellen, Themen vertiefen oder eine Übersicht der letzten 14 Tage erhalten.',
      tips: [
        '10 Nachrichten pro Tag',
        'Chat-Historie wird gespeichert (optional)',
        'Wähle zwischen Einzel-Analyse oder Gesamtübersicht',
      ],
    },
    {
      icon: 'leaf-outline',
      iconColor: '#2ecc71',
      title: 'Meditation & Achtsamkeit',
      shortDesc: 'Geführte Übungen für innere Ruhe',
      fullDesc: 'Kurze Meditationen (2-5 Min.) und Atemübungen helfen dir, dich zu zentrieren und Stress abzubauen. Perfekt für zwischendurch.',
      tips: [
        'Finde einen ruhigen Ort',
        'Nutze Kopfhörer für beste Erfahrung',
        'Praktiziere regelmäßig für beste Ergebnisse',
      ],
    },
    {
      icon: 'flame',
      iconColor: Colors.streak,
      title: 'Streak-System',
      shortDesc: 'Baue eine tägliche Gewohnheit auf',
      fullDesc: 'Erstelle jeden Tag einen Eintrag, um deine Streak zu erhöhen. Dein längster Streak wird als Rekord angezeigt. Verpasse keinen Tag!',
      tips: [
        'Tägliche Einträge halten die Streak am Leben',
        'Ein verpasster Tag setzt die Streak zurück',
        'Dein Rekord bleibt erhalten',
      ],
    },
    {
      icon: 'shield-checkmark',
      iconColor: Colors.primary,
      title: 'Datenschutz & Privatsphäre',
      shortDesc: 'Deine Daten sind geschützt',
      fullDesc: 'Du kannst in den Einstellungen KI-Analysen und Chat-Speicherung deaktivieren. Alle Daten werden verschlüsselt übertragen und du kannst jederzeit alle Daten löschen oder deinen Account komplett entfernen.',
      tips: [
        'Prüfe die Datenschutzerklärung',
        'Passe Privacy-Einstellungen an',
        'Nutze "Alle Daten löschen" bei Bedarf',
      ],
    },
  ];

  return (
    <LinearGradient colors={[Colors.background, Colors.surface]} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader
          title="App-Anleitung"
          subtitle="So nutzt du den KI-Stimmungshelfer"
        />

        {/* Intro Card */}
        <InfoCard
          type="info"
          icon="information-circle"
          title="Willkommen! 👋"
          message="Diese Anleitung zeigt dir alle Funktionen der App und wie du sie optimal nutzt."
        />

        {/* Guide Steps */}
        {guideSteps.map((step, index) => (
          <Card key={index} variant="base" style={styles.guideCard}>
            <TouchableOpacity
              onPress={() => toggleCard(index)}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: step.iconColor + '20' }]}>
                  {step.isMaterialIcon ? (
                    <MaterialCommunityIcons name={step.icon} size={28} color={step.iconColor} />
                  ) : (
                    <Ionicons name={step.icon} size={28} color={step.iconColor} />
                  )}
                </View>
                <View style={styles.headerText}>
                  <View style={styles.headerTitleRow}>
                    <Text style={styles.stepNumber}>{index + 1}.</Text>
                    <Text style={styles.cardTitle}>{step.title}</Text>
                  </View>
                  <Text style={styles.shortDesc}>{step.shortDesc}</Text>
                </View>
                <Ionicons
                  name={expandedCard === index ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color={Colors.textMuted}
                />
              </View>
            </TouchableOpacity>

            {/* Expanded Content */}
            {expandedCard === index && (
              <View style={styles.expandedContent}>
                <View style={styles.divider} />

                <Text style={styles.fullDescTitle}>Beschreibung</Text>
                <Text style={styles.fullDesc}>{step.fullDesc}</Text>

                {step.tips && (
                  <>
                    <Text style={styles.tipsTitle}>💡 Tipps</Text>
                    {step.tips.map((tip, tipIndex) => (
                      <View key={tipIndex} style={styles.tipItem}>
                        <View style={styles.tipBullet} />
                        <Text style={styles.tipText}>{tip}</Text>
                      </View>
                    ))}
                  </>
                )}
              </View>
            )}
          </Card>
        ))}

        {/* Bottom CTA */}
        <Card variant="elevated" style={styles.ctaCard}>
          <View style={styles.ctaContent}>
            <Text style={styles.ctaTitle}>Bereit loszulegen? 🚀</Text>
            <Text style={styles.ctaSubtitle}>
              Erstelle deinen ersten Tageseintrag und starte deine emotionale Reise!
            </Text>
            <Button
              variant="primary"
              size="large"
              icon="create"
              fullWidth
              onPress={() => navigation.navigate('DailyEntry')}
              style={styles.ctaButton}
            >
              Ersten Eintrag erstellen
            </Button>
          </View>
        </Card>

        {/* Quick Links */}
        <View style={styles.quickLinks}>
          <Text style={styles.quickLinksTitle}>Schnellzugriff</Text>
          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="settings-outline" size={20} color={Colors.primary} />
            <Text style={styles.quickLinkText}>Einstellungen</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          >
            <Ionicons name="shield-checkmark-outline" size={20} color={Colors.primary} />
            <Text style={styles.quickLinkText}>Datenschutzerklärung</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
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
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.lg,
  },
  guideCard: {
    marginVertical: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  headerText: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepNumber: {
    ...Typography.h4,
    color: Colors.primary,
    marginRight: Spacing.xs,
  },
  cardTitle: {
    ...Typography.h4,
    flex: 1,
  },
  shortDesc: {
    ...Typography.caption,
  },
  expandedContent: {
    marginTop: Spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginBottom: Spacing.md,
  },
  fullDescTitle: {
    ...Typography.bodyBold,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  fullDesc: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  tipsTitle: {
    ...Typography.bodyBold,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
    paddingLeft: Spacing.sm,
  },
  tipBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginRight: Spacing.sm,
    marginTop: 8,
  },
  tipText: {
    ...Typography.body,
    flex: 1,
    color: Colors.text,
  },
  ctaCard: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  ctaContent: {
    alignItems: 'center',
  },
  ctaTitle: {
    ...Typography.h3,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  ctaSubtitle: {
    ...Typography.body,
    textAlign: 'center',
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  ctaButton: {
    marginTop: Spacing.sm,
  },
  quickLinks: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  quickLinksTitle: {
    ...Typography.bodyBold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    ...Shadows.small,
  },
  quickLinkText: {
    ...Typography.body,
    flex: 1,
    marginLeft: Spacing.md,
  },
});
