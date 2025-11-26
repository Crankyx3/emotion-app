import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components/Card';
import Button from '../components/Button';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../theme';
import { usePremium } from '../components/PremiumProvider';

export default function PaywallScreen({ navigation }) {
  const { purchasePremium, restorePurchases, isTrialActive, trialDaysLeft } = usePremium();
  const [selectedPlan, setSelectedPlan] = useState('yearly'); // 'monthly' oder 'yearly'
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const plans = {
    monthly: {
      price: '8,99€',
      period: '/Monat',
      total: '8,99€ pro Monat',
      savings: null,
      value: 8.99,
    },
    yearly: {
      price: '91,70€',
      period: '/Jahr',
      total: '7,64€ pro Monat',
      savings: '15% SPAREN',
      value: 91.70,
      popular: true,
    },
  };

  const features = [
    { icon: 'infinite', text: 'Unbegrenzte Tageseinträge', color: Colors.primary },
    { icon: 'analytics', text: 'Unbegrenzte KI-Analysen', color: Colors.success },
    { icon: 'chatbubbles', text: 'KI-Chat (100 Nachrichten/Tag)', color: Colors.info },
    { icon: 'calendar', text: 'Wochenanalysen', color: Colors.warning },
    { icon: 'leaf', text: 'Alle Meditationen & Übungen', color: '#2ecc71' },
    { icon: 'bar-chart', text: 'Erweiterte Statistiken', color: Colors.primary },
    { icon: 'download', text: 'Export-Funktion (PDF/CSV)', color: Colors.success },
    { icon: 'cloud-done', text: 'Cloud-Backup', color: Colors.info },
  ];

  const handlePurchase = async () => {
    setPurchasing(true);

    try {
      const result = await purchasePremium(selectedPlan);

      if (result.success) {
        Alert.alert(
          'Willkommen bei Premium! 🎉',
          'Du hast jetzt Zugriff auf alle Features!',
          [
            {
              text: 'Los geht\'s!',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else if (result.cancelled) {
        // Kauf wurde vom User abgebrochen - keine Fehlermeldung
        return;
      } else {
        // Zeige spezifische Fehlermeldung
        const errorMessage = result.error || 'Der Kauf konnte nicht abgeschlossen werden. Bitte versuche es erneut.';
        Alert.alert(
          'Fehler beim Kauf',
          errorMessage,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Fehler', 'Ein Fehler ist aufgetreten.');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <LinearGradient colors={[Colors.background, Colors.surface]} style={styles.gradient}>
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="close" size={28} color={Colors.text} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="diamond" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Upgrade auf Premium</Text>
          <Text style={styles.subtitle}>
            Entfalte das volle Potenzial deiner emotionalen Reise
          </Text>

          {/* Trial Badge */}
          {isTrialActive && (
            <View style={styles.trialBadge}>
              <Ionicons name="time" size={16} color={Colors.warning} />
              <Text style={styles.trialText}>
                Noch {trialDaysLeft} Tag{trialDaysLeft !== 1 ? 'e' : ''} kostenlos
              </Text>
            </View>
          )}
        </View>

        {/* Pricing Cards */}
        <View style={styles.pricingSection}>
          {/* Yearly Plan */}
          <TouchableOpacity
            style={[
              styles.pricingCard,
              selectedPlan === 'yearly' && styles.pricingCardSelected,
              plans.yearly.popular && styles.pricingCardPopular,
            ]}
            onPress={() => setSelectedPlan('yearly')}
            activeOpacity={0.8}
          >
            {plans.yearly.popular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularText}>BELIEBTESTE</Text>
              </View>
            )}

            <View style={styles.pricingHeader}>
              <View style={styles.radioButton}>
                {selectedPlan === 'yearly' && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
              <Text style={styles.planName}>Jährlich</Text>
              {plans.yearly.savings && (
                <View style={styles.savingsBadge}>
                  <Text style={styles.savingsText}>{plans.yearly.savings}</Text>
                </View>
              )}
            </View>

            <View style={styles.pricingBody}>
              <Text style={styles.price}>{plans.yearly.price}</Text>
              <Text style={styles.period}>{plans.yearly.period}</Text>
            </View>

            <Text style={styles.priceDetail}>{plans.yearly.total}</Text>
          </TouchableOpacity>

          {/* Monthly Plan */}
          <TouchableOpacity
            style={[
              styles.pricingCard,
              selectedPlan === 'monthly' && styles.pricingCardSelected,
            ]}
            onPress={() => setSelectedPlan('monthly')}
            activeOpacity={0.8}
          >
            <View style={styles.pricingHeader}>
              <View style={styles.radioButton}>
                {selectedPlan === 'monthly' && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
              <Text style={styles.planName}>Monatlich</Text>
            </View>

            <View style={styles.pricingBody}>
              <Text style={styles.price}>{plans.monthly.price}</Text>
              <Text style={styles.period}>{plans.monthly.period}</Text>
            </View>

            <Text style={styles.priceDetail}>{plans.monthly.total}</Text>
          </TouchableOpacity>
        </View>

        {/* Features List */}
        <Card style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>Premium Features</Text>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: feature.color + '20' }]}>
                <Ionicons name={feature.icon} size={20} color={feature.color} />
              </View>
              <Text style={styles.featureText}>{feature.text}</Text>
            </View>
          ))}
        </Card>

        {/* CTA Button */}
        <Button
          variant="primary"
          size="large"
          icon="diamond"
          fullWidth
          loading={purchasing}
          onPress={handlePurchase}
          style={styles.ctaButton}
        >
          {isTrialActive
            ? `Jetzt ${selectedPlan === 'yearly' ? '91,70€' : '8,99€'} sichern`
            : `Premium für ${selectedPlan === 'yearly' ? '91,70€' : '8,99€'} freischalten`
          }
        </Button>

        {/* Info Text */}
        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            {isTrialActive
              ? `Nach Ende deiner kostenlosen 5-Tage-Testphase wird dein Abo automatisch ${selectedPlan === 'yearly' ? 'jährlich' : 'monatlich'} verlängert. Jederzeit kündbar.`
              : 'Jederzeit kündbar. Keine versteckten Kosten.'
            }
          </Text>

          <TouchableOpacity
            style={styles.restoreButton}
            disabled={restoring}
            onPress={async () => {
              setRestoring(true);
              try {
                const result = await restorePurchases();

                if (result.success && result.restored) {
                  Alert.alert(
                    'Erfolgreich! ✅',
                    'Deine Käufe wurden wiederhergestellt.',
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                  );
                } else if (result.success && result.restored === false) {
                  Alert.alert(
                    'Keine Käufe gefunden',
                    'Es wurden keine früheren Käufe auf diesem Konto gefunden.'
                  );
                } else {
                  Alert.alert(
                    'Fehler',
                    result.error || 'Käufe konnten nicht wiederhergestellt werden.'
                  );
                }
              } catch (error) {
                Alert.alert('Fehler', 'Ein Fehler ist aufgetreten.');
              } finally {
                setRestoring(false);
              }
            }}
          >
            <Text style={styles.restoreText}>
              {restoring ? 'Wiederherstellen...' : 'Käufe wiederherstellen'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Trust Signals */}
        <View style={styles.trustSignals}>
          <View style={styles.trustItem}>
            <Ionicons name="shield-checkmark" size={20} color={Colors.success} />
            <Text style={styles.trustText}>Sichere Zahlung</Text>
          </View>
          <View style={styles.trustItem}>
            <Ionicons name="repeat" size={20} color={Colors.success} />
            <Text style={styles.trustText}>Jederzeit kündbar</Text>
          </View>
          <View style={styles.trustItem}>
            <Ionicons name="lock-closed" size={20} color={Colors.success} />
            <Text style={styles.trustText}>Datenschutz garantiert</Text>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.round,
    ...Shadows.medium,
  },
  container: {
    paddingTop: 80,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h1,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body,
    textAlign: 'center',
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warningLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  trialText: {
    ...Typography.bodyBold,
    color: Colors.warning,
    marginLeft: Spacing.xs,
  },
  pricingSection: {
    marginBottom: Spacing.xl,
  },
  pricingCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.border,
    ...Shadows.small,
  },
  pricingCardSelected: {
    borderColor: Colors.primary,
    borderWidth: 3,
    ...Shadows.medium,
  },
  pricingCardPopular: {
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  popularText: {
    ...Typography.small,
    color: Colors.textLight,
    fontWeight: '700',
  },
  pricingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  planName: {
    ...Typography.h4,
    flex: 1,
  },
  savingsBadge: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  savingsText: {
    ...Typography.small,
    color: Colors.success,
    fontWeight: '700',
  },
  pricingBody: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Spacing.xs,
  },
  price: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.text,
  },
  period: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },
  priceDetail: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  featuresCard: {
    marginBottom: Spacing.lg,
  },
  featuresTitle: {
    ...Typography.h3,
    marginBottom: Spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  featureText: {
    ...Typography.body,
    flex: 1,
  },
  ctaButton: {
    marginBottom: Spacing.lg,
  },
  infoSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  infoText: {
    ...Typography.caption,
    textAlign: 'center',
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  restoreButton: {
    paddingVertical: Spacing.sm,
  },
  restoreText: {
    ...Typography.body,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  trustSignals: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.xs,
    marginVertical: Spacing.xs,
  },
  trustText: {
    ...Typography.caption,
    color: Colors.success,
    marginLeft: 6,
  },
});
