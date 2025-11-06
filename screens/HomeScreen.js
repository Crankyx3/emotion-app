import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenHeader from "../components/ScreenHeader";
import { MenuCard, InfoCard } from "../components/Card";
import Button from "../components/Button";
import { Colors, Spacing, Typography, BorderRadius, Shadows } from "../theme";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db, auth } from "../firebaseconfig";
import { useAuth } from "../components/AuthProvider";
import { usePremium } from "../components/PremiumProvider";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocalEntries, getTodaysLocalEntry } from "../services/localStorageService";

export default function HomeScreen({ navigation }) {
  const { userName, isGuestMode, exitGuestMode } = useAuth();
  const { isPremium, isTrialActive, trialDaysLeft, getTrialTimeRemaining } = usePremium();
  const [loading, setLoading] = useState(true);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [dailyEntryDone, setDailyEntryDone] = useState(false);
  const [dailyAnalysisDone, setDailyAnalysisDone] = useState(false);
  const [weeklyAnalysisDone, setWeeklyAnalysisDone] = useState(false);
  const [daysUntilWeekly, setDaysUntilWeekly] = useState(0);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // Trial Countdown Timer
  const [trialTimeRemaining, setTrialTimeRemaining] = useState(null);

  // Prüfe ob neuer Nutzer und zeige Welcome Modal
  useEffect(() => {
    checkFirstTimeUser();
  }, []);

  // Trial Timer: Aktualisiere jede Sekunde
  useEffect(() => {
    if (!isTrialActive || isPremium) return;

    const updateTrialTimer = async () => {
      const timeData = await getTrialTimeRemaining();
      setTrialTimeRemaining(timeData);
    };

    // Sofort aktualisieren
    updateTrialTimer();

    // Dann jede Sekunde aktualisieren
    const interval = setInterval(updateTrialTimer, 1000);

    return () => clearInterval(interval);
  }, [isTrialActive, isPremium]);

  const checkFirstTimeUser = async () => {
    try {
      if (isGuestMode || !auth.currentUser) return;

      const hasSeenWelcome = await AsyncStorage.getItem(`hasSeenWelcome_${auth.currentUser.uid}`);

      if (!hasSeenWelcome) {
        // Zeige Modal nach kurzer Verzögerung (damit Screen geladen ist)
        setTimeout(() => {
          setShowWelcomeModal(true);
        }, 500);
      }
    } catch (error) {
      console.error('Error checking first time user:', error);
    }
  };

  const handleCloseWelcome = async (openGuide = false) => {
    try {
      // Markiere als gesehen
      await AsyncStorage.setItem(`hasSeenWelcome_${auth.currentUser.uid}`, 'true');
      setShowWelcomeModal(false);

      // Öffne Guide falls gewünscht
      if (openGuide) {
        setTimeout(() => {
          navigation.navigate('AppGuide');
        }, 300);
      }
    } catch (error) {
      console.error('Error closing welcome:', error);
    }
  };

  // Aktualisiere Dashboard-Daten wenn Screen fokussiert wird
  useFocusEffect(
    React.useCallback(() => {
      loadDashboardData();
    }, [])
  );

  const loadDashboardData = async () => {
    if (isGuestMode || !auth.currentUser) {
      setLoading(false);
      return;
    }

    try {
      const userId = auth.currentUser.uid;

      // 🔒 DATENSCHUTZ: Streak aus lokalen Einträgen berechnen
      const localEntries = await getLocalEntries(userId);

      const entryDates = localEntries
        .map(entry => {
          if (!entry.createdAt) return null;
          const date = new Date(entry.createdAt);
          const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          return normalized.getTime();
        })
        .filter(d => d !== null);

      const uniqueDates = [...new Set(entryDates)].sort((a, b) => b - a);

      if (uniqueDates.length > 0) {
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
      }

      // 🔒 DATENSCHUTZ: Heutiger Eintrag aus lokalem Storage
      const todayEntry = await getTodaysLocalEntry(userId);
      setDailyEntryDone(!!todayEntry);

      // Tagesanalyse Check (aus Firestore Metadaten)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Nur nach userId filtern, dann clientseitig nach Datum
      // (vermeidet Composite Index Requirement)
      const analysisQuery = query(
        collection(db, "entries"),
        where("userId", "==", userId)
      );
      const analysisSnapshot = await getDocs(analysisQuery);

      // Clientseitig nach heutigem Datum filtern
      const todayAnalyses = analysisSnapshot.docs.filter(doc => {
        const data = doc.data();
        if (!data.analysisDate) return false;
        const analysisDate = data.analysisDate.toDate();
        return analysisDate >= today && analysisDate < tomorrow;
      });

      setDailyAnalysisDone(todayAnalyses.length > 0);

      // Wochenanalyse Check
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const weeklyQuery = query(
        collection(db, "weeklyAnalyses"),
        where("userId", "==", auth.currentUser.uid)
      );

      const weeklySnapshot = await getDocs(weeklyQuery);

      const recentWeekly = weeklySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(analysis => {
          if (!analysis.analysisDate) return false;
          const analysisDate = analysis.analysisDate.toDate();
          return analysisDate >= sevenDaysAgo;
        })
        .sort((a, b) => b.analysisDate.toMillis() - a.analysisDate.toMillis());

      if (recentWeekly.length > 0) {
        const lastWeekly = recentWeekly[0];
        const lastDate = lastWeekly.analysisDate.toDate();
        const now = new Date();
        const diffTime = Math.abs(now - lastDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const daysLeft = 7 - diffDays;

        setWeeklyAnalysisDone(true);
        setDaysUntilWeekly(daysLeft > 0 ? daysLeft : 0);
      } else {
        setWeeklyAnalysisDone(false);
      }

    } catch (err) {
      console.error("Fehler beim Laden der Dashboard-Daten:", err);
    } finally {
      setLoading(false);
    }
  };
  const mainMenuItems = [
    {
      title: "Tagesdaten eintragen",
      subtitle: "Notiere deine Stimmung und wie du dich fühlst",
      icon: "create-outline",
      iconColor: Colors.primary,
      screen: "DailyEntry",
    },
    {
      title: "Tagesanalyse",
      subtitle: "Erhalte deine KI-Analyse des heutigen Tages",
      icon: "analytics-outline",
      iconColor: Colors.success,
      screen: "DailyAnalysis",
    },
    {
      title: "EmotionChart",
      subtitle: "Verfolge deinen emotionalen Verlauf über Zeit",
      icon: "bar-chart-outline",
      iconColor: Colors.warning,
      screen: "EmotionChart",
    },
    {
      title: "KI-Wochenanalyse",
      subtitle: "Lass deine Woche psychologisch reflektieren",
      icon: "brain",
      iconColor: Colors.info,
      screen: "Analysis",
      isMaterialIcon: true,
    },
    {
      title: "KI-Chat",
      subtitle: "Sprich über deine Analysen und stelle Fragen",
      icon: "chatbubbles",
      iconColor: "#FF6B6B",
      screen: "ChatSelection",
    },
  ];

  const guideItems = [
    {
      title: "App-Anleitung",
      subtitle: "Lerne wie du die App optimal nutzt",
      icon: "help-circle-outline",
      iconColor: Colors.primary,
      screen: "AppGuide",
    },
    {
      title: "Meditation & Achtsamkeit",
      subtitle: "Geführte Meditationen und Atemübungen (2-5 Min.)",
      icon: "leaf-outline",
      iconColor: "#2ecc71",
      screen: "Meditation",
    },
    {
      title: "Psycho-Edukation",
      subtitle: "Lerne über mentale Gesundheit und Bewältigungsstrategien",
      icon: "school-outline",
      iconColor: Colors.info,
      screen: "PsychoEducation",
    },
  ];

  const renderAnalysisStatus = (item) => {
    const badges = [];

    // Premium Badge (wenn nicht Premium und nicht Trial)
    if (!isPremium && !isTrialActive) {
      const premiumFeatures = ["Tagesanalyse", "KI-Wochenanalyse", "KI-Chat", "Meditation & Achtsamkeit"];
      if (premiumFeatures.includes(item.title)) {
        badges.push(
          <View key="premium" style={styles.premiumBadge}>
            <Ionicons name="diamond" size={14} color="#FFB900" />
            <Text style={styles.premiumText}>Premium</Text>
          </View>
        );
      }
    }

    // Status Badges
    if (item.title === "Tagesdaten eintragen" && dailyEntryDone) {
      badges.push(
        <View key="done" style={styles.statusBadge}>
          <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
          <Text style={styles.statusText}>Erledigt</Text>
        </View>
      );
    }
    if (item.title === "Tagesanalyse" && dailyAnalysisDone) {
      badges.push(
        <View key="done" style={styles.statusBadge}>
          <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
          <Text style={styles.statusText}>Erledigt</Text>
        </View>
      );
    }
    if (item.title === "KI-Wochenanalyse" && weeklyAnalysisDone) {
      badges.push(
        <View key="weekly" style={[styles.statusBadge, styles.statusBadgeWarning]}>
          <Ionicons name="time-outline" size={16} color={Colors.warning} />
          <Text style={[styles.statusText, { color: Colors.warning }]}>
            in {daysUntilWeekly}d
          </Text>
        </View>
      );
    }

    return badges.length > 0 ? <View style={styles.badgeContainer}>{badges}</View> : null;
  };

  if (loading) {
    return (
      <LinearGradient colors={["#EAF4FF", "#FFFFFF"]} style={styles.gradient}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#EAF4FF", "#FFFFFF"]} style={styles.gradient}>
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => navigation.navigate("Settings")}
      >
        <Ionicons name="settings-outline" size={28} color="#007AFF" />
      </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="KI-Stimmungshelfer" subtitle="Dein persönliches Stimmungs-Dashboard" />

        {/* Streak/Welcome Card */}
        <View style={styles.streakCard}>
          <View style={styles.streakContent}>
            {currentStreak > 0 ? (
              <>
                <View style={styles.streakMain}>
                  <Text style={styles.streakEmoji}>🔥</Text>
                  <View style={styles.streakInfo}>
                    <Text style={styles.streakNumber}>{currentStreak}</Text>
                    <Text style={styles.streakLabel}>
                      {currentStreak === 1 ? "Tag" : "Tage"} Streak
                    </Text>
                  </View>
                </View>
                <View style={styles.streakRight}>
                  {userName && (
                    <Text style={styles.greetingText}>Hey {userName}! 👋</Text>
                  )}
                  {longestStreak > currentStreak && (
                    <View style={styles.longestBadge}>
                      <Ionicons name="trophy" size={14} color="#FFB900" />
                      <Text style={styles.longestText}>
                        Rekord: {longestStreak}
                      </Text>
                    </View>
                  )}
                </View>
              </>
            ) : (
              <View style={styles.welcomeContent}>
                <Text style={styles.welcomeEmoji}>👋</Text>
                <View style={styles.welcomeInfo}>
                  <Text style={styles.welcomeTitle}>
                    {userName ? `Hey ${userName}!` : "Willkommen!"}
                  </Text>
                  <Text style={styles.welcomeSubtitle}>
                    Erstelle deinen ersten Eintrag um eine Streak zu starten
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Guest Mode Banner */}
        {isGuestMode && (
          <View style={styles.guestBanner}>
            <LinearGradient
              colors={['#FF6B6B', '#FF8E8E']}
              style={styles.guestBannerGradient}
            >
              <View style={styles.guestBannerContent}>
                <Ionicons name="eye-off" size={28} color="#FFF" />
                <View style={styles.guestBannerText}>
                  <Text style={styles.guestBannerTitle}>Gastmodus aktiv</Text>
                  <Text style={styles.guestBannerSubtitle}>
                    Registriere dich, um alle Funktionen freizuschalten
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.guestRegisterButton}
                onPress={exitGuestMode}
                activeOpacity={0.8}
              >
                <Text style={styles.guestRegisterButtonText}>Jetzt registrieren</Text>
                <Ionicons name="arrow-forward" size={18} color="#FF6B6B" />
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}

        {/* Premium/Trial Status Card */}
        {!isGuestMode && isTrialActive && trialTimeRemaining && !trialTimeRemaining.expired ? (
          <View style={styles.trialCountdownCard}>
            <LinearGradient
              colors={['#FFE066', '#FFF9E6']}
              style={styles.trialCountdownGradient}
            >
              <View style={styles.trialCountdownHeader}>
                <Ionicons name="rocket" size={32} color="#996A13" />
                <View style={styles.trialCountdownHeaderText}>
                  <Text style={styles.trialCountdownTitle}>Premium Trial aktiv 🎉</Text>
                  <Text style={styles.trialCountdownSubtitle}>Teste alle Features kostenlos</Text>
                </View>
              </View>

              {/* Countdown Timer */}
              <View style={styles.trialTimerContainer}>
                <View style={styles.timerSegment}>
                  <Text style={styles.timerNumber}>{trialTimeRemaining.days}</Text>
                  <Text style={styles.timerLabel}>Tag{trialTimeRemaining.days !== 1 ? 'e' : ''}</Text>
                </View>
                <Text style={styles.timerSeparator}>:</Text>
                <View style={styles.timerSegment}>
                  <Text style={styles.timerNumber}>{String(trialTimeRemaining.hours).padStart(2, '0')}</Text>
                  <Text style={styles.timerLabel}>Std</Text>
                </View>
                <Text style={styles.timerSeparator}>:</Text>
                <View style={styles.timerSegment}>
                  <Text style={styles.timerNumber}>{String(trialTimeRemaining.minutes).padStart(2, '0')}</Text>
                  <Text style={styles.timerLabel}>Min</Text>
                </View>
              </View>

              {/* CTA Button */}
              <TouchableOpacity
                style={styles.trialUpgradeButton}
                onPress={() => navigation.navigate('Paywall')}
                activeOpacity={0.8}
              >
                <Ionicons name="diamond" size={18} color="#007AFF" />
                <Text style={styles.trialUpgradeText}>Jetzt Premium sichern</Text>
                <Ionicons name="arrow-forward" size={18} color="#007AFF" />
              </TouchableOpacity>
            </LinearGradient>
          </View>
        ) : !isGuestMode && !isPremium ? (
          <InfoCard
            type="info"
            icon="diamond"
            title="Teste Premium kostenlos"
            message="Schalte alle Features frei: Unbegrenzte Analysen, KI-Chat, Meditationen & mehr."
          >
            <Button
              variant="primary"
              size="small"
              icon="diamond"
              onPress={() => navigation.navigate('Paywall')}
              style={{ marginTop: Spacing.sm }}
            >
              Jetzt upgraden
            </Button>
          </InfoCard>
        ) : !isGuestMode && isPremium ? (
          <InfoCard
            type="success"
            icon="checkmark-circle"
            title="Premium aktiv"
            message="Du hast Zugriff auf alle Features. Vielen Dank für deine Unterstützung!"
          />
        ) : null}

        {/* Haupt-Menü */}
        {mainMenuItems.map((item, index) => (
          item.isMaterialIcon ? (
            // Spezialbehandlung für Material Icons
            <TouchableOpacity
              key={index}
              style={styles.menuCardContainer}
              activeOpacity={0.8}
              onPress={() => navigation.navigate(item.screen)}
            >
              <View style={styles.menuCardContent}>
                <View style={[styles.menuIconContainer, { backgroundColor: item.iconColor + '20' }]}>
                  <MaterialCommunityIcons name={item.icon} size={28} color={item.iconColor} />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                {renderAnalysisStatus(item)}
                <Ionicons name="chevron-forward" size={22} color={Colors.textMuted} />
              </View>
            </TouchableOpacity>
          ) : (
            <MenuCard
              key={index}
              icon={item.icon}
              iconColor={item.iconColor}
              title={item.title}
              subtitle={item.subtitle}
              badge={renderAnalysisStatus(item)}
              onPress={() => navigation.navigate(item.screen)}
            />
          )
        ))}

        {/* Guides Sektion */}
        <View style={styles.sectionHeader}>
          <Ionicons name="book-outline" size={20} color={Colors.textSecondary} />
          <Text style={styles.sectionTitle}>Guides</Text>
        </View>

        {guideItems.map((item, index) => (
          <MenuCard
            key={index}
            icon={item.icon}
            iconColor={item.iconColor}
            title={item.title}
            subtitle={item.subtitle}
            onPress={() => navigation.navigate(item.screen)}
          />
        ))}
      </ScrollView>

      {/* Welcome Modal für neue Nutzer */}
      <Modal
        visible={showWelcomeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => handleCloseWelcome(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                <Ionicons name="rocket" size={48} color={Colors.primary} />
              </View>
              <Text style={styles.modalTitle}>
                Willkommen{userName ? `, ${userName}` : ''}! 🎉
              </Text>
              <Text style={styles.modalSubtitle}>
                Schön, dass du da bist! Möchtest du eine kurze Einführung, wie die App funktioniert?
              </Text>
            </View>

            {/* Modal Body */}
            <View style={styles.modalBody}>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
                <Text style={styles.featureText}>Verstehe alle Funktionen</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
                <Text style={styles.featureText}>Lerne Best Practices</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
                <Text style={styles.featureText}>Starte optimal durch</Text>
              </View>
            </View>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <Button
                variant="primary"
                size="large"
                icon="book-outline"
                fullWidth
                onPress={() => handleCloseWelcome(true)}
                style={styles.modalButton}
              >
                App-Anleitung öffnen
              </Button>
              <Button
                variant="ghost"
                size="medium"
                fullWidth
                onPress={() => handleCloseWelcome(false)}
              >
                Später ansehen
              </Button>
            </View>
          </View>
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
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.round,
    ...Shadows.medium,
  },
  container: {
    alignItems: "center",
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  streakCard: {
    width: "100%",
    backgroundColor: Colors.streakLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.streakBorder,
    ...Shadows.small,
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
    fontSize: 36,
    marginRight: 12,
  },
  streakInfo: {
    justifyContent: "center",
  },
  streakNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FF6B35",
    lineHeight: 28,
  },
  streakLabel: {
    fontSize: 12,
    color: "#8B5E3C",
    fontWeight: "600",
  },
  streakRight: {
    alignItems: "flex-end",
    gap: 8,
  },
  greetingText: {
    ...Typography.bodyMedium,
    color: Colors.streak,
    marginBottom: 4,
  },
  longestBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.streakBorder,
  },
  longestText: {
    ...Typography.small,
    color: "#8B5E3C",
    fontWeight: "700",
    marginLeft: 4,
  },
  // Welcome Card Styles
  welcomeContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  welcomeEmoji: {
    fontSize: 40,
    marginRight: Spacing.md,
  },
  welcomeInfo: {
    flex: 1,
  },
  welcomeTitle: {
    ...Typography.h4,
    color: Colors.streak,
    marginBottom: 4,
  },
  welcomeSubtitle: {
    ...Typography.caption,
    color: "#8B5E3C",
    lineHeight: 18,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.successLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    marginRight: 4,
  },
  statusBadgeWarning: {
    backgroundColor: Colors.warningLight,
  },
  statusText: {
    ...Typography.small,
    color: Colors.success,
    fontWeight: "600",
    marginLeft: 4,
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF9E6",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "#FFE066",
  },
  premiumText: {
    ...Typography.small,
    color: "#996A13",
    fontWeight: "700",
    marginLeft: 4,
  },
  trialBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.warningLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "#FFE066",
  },
  trialText: {
    ...Typography.small,
    color: Colors.warning,
    fontWeight: "700",
    marginLeft: 4,
  },
  // Trial Countdown Timer Styles
  trialCountdownCard: {
    width: "100%",
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    ...Shadows.medium,
  },
  trialCountdownGradient: {
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: "#FFE066",
    borderRadius: BorderRadius.lg,
  },
  trialCountdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  trialCountdownHeaderText: {
    marginLeft: Spacing.sm,
    flex: 1,
  },
  trialCountdownTitle: {
    ...Typography.h4,
    color: "#996A13",
    marginBottom: 2,
  },
  trialCountdownSubtitle: {
    ...Typography.caption,
    color: "#8B5E3C",
  },
  trialTimerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginVertical: Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(153, 106, 19, 0.2)",
  },
  timerSegment: {
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
  },
  timerNumber: {
    fontSize: 32,
    fontWeight: "800",
    color: "#996A13",
    lineHeight: 36,
  },
  timerLabel: {
    ...Typography.small,
    color: "#8B5E3C",
    fontWeight: "600",
    marginTop: 2,
  },
  timerSeparator: {
    fontSize: 28,
    fontWeight: "700",
    color: "#996A13",
    marginHorizontal: 4,
  },
  trialUpgradeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: "#007AFF",
    marginTop: Spacing.sm,
  },
  trialUpgradeText: {
    ...Typography.bodyMedium,
    color: "#007AFF",
    fontWeight: "700",
    marginHorizontal: Spacing.xs,
  },
  // Guest Mode Banner Styles
  guestBanner: {
    width: "100%",
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    ...Shadows.medium,
  },
  guestBannerGradient: {
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: "#FF8E8E",
    borderRadius: BorderRadius.lg,
  },
  guestBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  guestBannerText: {
    marginLeft: Spacing.sm,
    flex: 1,
  },
  guestBannerTitle: {
    ...Typography.h4,
    color: "#FFF",
    marginBottom: 2,
  },
  guestBannerSubtitle: {
    ...Typography.caption,
    color: "rgba(255, 255, 255, 0.9)",
  },
  guestRegisterButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: "#FF6B6B",
    marginTop: Spacing.sm,
  },
  guestRegisterButtonText: {
    ...Typography.bodyMedium,
    color: "#FF6B6B",
    fontWeight: "700",
    marginRight: Spacing.xs,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginTop: Spacing.xxxl,
    marginBottom: Spacing.sm,
    paddingHorizontal: 5,
  },
  sectionTitle: {
    ...Typography.bodyBold,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  // MenuCard Styles (für MaterialIcon special case)
  menuCardContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
    width: "100%",
    ...Shadows.small,
  },
  menuCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuIconContainer: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    ...Typography.bodyMedium,
  },
  menuSubtitle: {
    ...Typography.caption,
    marginTop: 4,
  },
  // Welcome Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    ...Shadows.large,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.round,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    ...Typography.h2,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  modalSubtitle: {
    ...Typography.body,
    textAlign: 'center',
    color: Colors.textSecondary,
  },
  modalBody: {
    marginBottom: Spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  featureText: {
    ...Typography.body,
    marginLeft: Spacing.md,
    flex: 1,
  },
  modalActions: {
    gap: Spacing.sm,
  },
  modalButton: {
    marginBottom: Spacing.sm,
  },
});
