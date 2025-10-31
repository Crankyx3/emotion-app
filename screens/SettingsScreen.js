import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../components/AuthProvider";
import { db } from "../firebaseconfig";
import { collection, query, where, getDocs, deleteDoc } from "firebase/firestore";
import ScreenHeader from "../components/ScreenHeader";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";

export default function SettingsScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalEntries: 0,
    dailyAnalyses: 0,
    weeklyAnalyses: 0,
  });
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);

  useEffect(() => {
    loadStats();
    calculateStreak();
  }, []);

  const loadStats = async () => {
    if (!user) return;

    try {
      // Zähle alle Einträge
      const entriesSnapshot = await getDocs(
        query(collection(db, "entries"), where("userId", "==", user.uid))
      );

      // Filtere nach Typ
      let totalEntries = 0;
      let dailyAnalyses = 0;
      let weeklyAnalyses = 0;

      entriesSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.type === "dailyEntry") {
          totalEntries++;
        } else if (data.type === "dailyAnalysis") {
          dailyAnalyses++;
        } else if (data.type === "weeklyAnalysis") {
          weeklyAnalyses++;
        } else {
          // Falls kein type gesetzt ist, zähle als Entry
          totalEntries++;
        }
      });

      setStats({
        totalEntries,
        dailyAnalyses,
        weeklyAnalyses,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const calculateStreak = async () => {
    try {
      if (!user) return;

      // Lade alle Einträge des Users
      const q = query(
        collection(db, "entries"),
        where("userId", "==", user.uid)
      );
      const snapshot = await getDocs(q);

      // Extrahiere Datum (ohne Uhrzeit) für jeden Eintrag
      const entryDates = snapshot.docs
        .map(doc => {
          const data = doc.data();
          if (!data.createdAt) return null;
          const date = data.createdAt.toDate();
          // Normalisiere auf Mitternacht
          const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          return normalized.getTime();
        })
        .filter(d => d !== null);

      // Entferne Duplikate (mehrere Einträge am selben Tag)
      const uniqueDates = [...new Set(entryDates)].sort((a, b) => b - a); // Neueste zuerst

      if (uniqueDates.length === 0) {
        setCurrentStreak(0);
        setLongestStreak(0);
        return;
      }

      // Berechne Current Streak (ab heute rückwärts)
      let current = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTime = today.getTime();

      for (let i = 0; i < uniqueDates.length; i++) {
        const expectedDate = todayTime - (i * 24 * 60 * 60 * 1000);
        if (uniqueDates[i] === expectedDate) {
          current++;
        } else {
          break; // Lücke gefunden
        }
      }

      // Berechne Longest Streak (alle Einträge durchgehen)
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
    } catch (err) {
      console.error("Fehler beim Berechnen des Streaks:", err);
    }
  };

  const handleResetData = () => {
    Alert.alert(
      "⚠️ Alle Daten löschen?",
      "Diese Aktion kann nicht rückgängig gemacht werden!\n\nFolgende Daten werden gelöscht:\n• Alle Tageseinträge\n• Alle Tagesanalysen\n• Alle Wochenanalysen\n• Alle Chat-Verläufe\n• Chart-Verlauf",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Alles löschen",
          style: "destructive",
          onPress: confirmResetData,
        },
      ]
    );
  };

  const confirmResetData = async () => {
    setLoading(true);
    try {
      // Lade nur Einträge des aktuellen Users
      const userEntriesQuery = query(
        collection(db, "entries"),
        where("userId", "==", user.uid)
      );
      const userEntriesSnapshot = await getDocs(userEntriesQuery);

      console.log(`Lösche ${userEntriesSnapshot.size} Einträge des Users...`);

      // Hole auch alle Wochenanalysen des Users
      const weeklyAnalysesSnapshot = await getDocs(
        query(collection(db, "weeklyAnalyses"), where("userId", "==", user.uid))
      );

      console.log(`Lösche ${weeklyAnalysesSnapshot.size} Wochenanalysen...`);

      // Hole alle Chats des Users
      const chatsSnapshot = await getDocs(
        query(collection(db, "chats"), where("userId", "==", user.uid))
      );

      console.log(`Lösche ${chatsSnapshot.size} Chats...`);

      // Hole alle Chat-Nachrichten des Users
      const chatMessagesSnapshot = await getDocs(
        query(collection(db, "chatMessages"), where("userId", "==", user.uid))
      );

      console.log(`Lösche ${chatMessagesSnapshot.size} Chat-Nachrichten...`);

      // Erstelle Array mit allen Lösch-Promises
      const deletePromises = [
        ...userEntriesSnapshot.docs.map((doc) => deleteDoc(doc.ref)),
        ...weeklyAnalysesSnapshot.docs.map((doc) => deleteDoc(doc.ref)),
        ...chatsSnapshot.docs.map((doc) => deleteDoc(doc.ref)),
        ...chatMessagesSnapshot.docs.map((doc) => deleteDoc(doc.ref)),
      ];

      // Führe alle Löschungen parallel aus
      await Promise.all(deletePromises);

      // Aktualisiere Stats
      await loadStats();

      Alert.alert(
        "✅ Erfolgreich gelöscht",
        `${userEntriesSnapshot.size} Einträge, ${weeklyAnalysesSnapshot.size} Wochenanalysen und ${chatsSnapshot.size} Chat-Verläufe wurden vollständig entfernt.\n\n💡 Hinweis: Bitte starte die App neu, damit alle Änderungen vollständig übernommen werden.`,
        [{ text: "OK", style: "default" }]
      );
    } catch (error) {
      console.error("Error resetting data:", error);
      Alert.alert(
        "Fehler",
        "Daten konnten nicht gelöscht werden. Bitte erneut versuchen.\n\n" + error.message
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    setLoading(true);
    try {
      // Sammle alle Daten der letzten 30 Tage
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Lade Einträge
      const entriesQuery = query(
        collection(db, "entries"),
        where("userId", "==", user.uid)
      );
      const entriesSnapshot = await getDocs(entriesQuery);

      // Filtere nach den letzten 30 Tagen
      const recentEntries = entriesSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate().toISOString(),
          analysisDate: doc.data().analysisDate?.toDate().toISOString(),
        }))
        .filter(entry => {
          const entryDate = new Date(entry.createdAt);
          return entryDate >= thirtyDaysAgo;
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Lade Wochenanalysen
      const weeklyQuery = query(
        collection(db, "weeklyAnalyses"),
        where("userId", "==", user.uid)
      );
      const weeklySnapshot = await getDocs(weeklyQuery);
      const weeklyAnalyses = weeklySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          analysisDate: doc.data().analysisDate?.toDate().toISOString(),
        }))
        .filter(analysis => {
          const analysisDate = new Date(analysis.analysisDate);
          return analysisDate >= thirtyDaysAgo;
        });

      // Erstelle Export-Objekt
      const exportData = {
        exportDate: new Date().toISOString(),
        user: {
          email: user.email,
          userId: user.uid,
          memberSince: user.metadata?.creationTime,
        },
        period: {
          from: thirtyDaysAgo.toISOString(),
          to: new Date().toISOString(),
        },
        summary: {
          totalEntries: recentEntries.length,
          weeklyAnalyses: weeklyAnalyses.length,
          currentStreak: currentStreak,
          longestStreak: longestStreak,
        },
        entries: recentEntries.map(e => ({
          date: e.createdAt,
          emotion: e.emotion,
          feelScore: e.feelScore,
          sleep: e.sleep,
          energy: e.energy,
          selfWorth: e.selfWorth,
          theme: e.theme,
          text: e.text,
          gratitude: e.gratitude,
          analysis: e.analysis,
        })),
        weeklyAnalyses: weeklyAnalyses.map(a => ({
          date: a.analysisDate,
          analysis: a.analysis,
          mood: a.highlight?.mood,
          entriesCount: a.entriesCount,
          avgStats: a.avgStats,
        })),
      };

      // Berechne Durchschnittswerte
      const avgFeel = recentEntries.length > 0
        ? (recentEntries.reduce((sum, e) => sum + (e.feelScore || 0), 0) / recentEntries.length).toFixed(1)
        : 'N/A';
      const avgSleep = recentEntries.length > 0
        ? (recentEntries.reduce((sum, e) => sum + (e.sleep || 0), 0) / recentEntries.length).toFixed(1)
        : 'N/A';
      const avgEnergy = recentEntries.length > 0
        ? (recentEntries.reduce((sum, e) => sum + (e.energy || 0), 0) / recentEntries.length).toFixed(1)
        : 'N/A';
      const avgSelfWorth = recentEntries.length > 0
        ? (recentEntries.reduce((sum, e) => sum + (e.selfWorth || 0), 0) / recentEntries.length).toFixed(1)
        : 'N/A';

      // Konvertiere zu lesbarem Text
      const textContent = `╔══════════════════════════════════════════════════════════════╗
║          KI-STIMMUNGSHELFER - THERAPEUTEN-EXPORT            ║
╚══════════════════════════════════════════════════════════════╝

📅 Export erstellt: ${new Date().toLocaleDateString("de-DE")} um ${new Date().toLocaleTimeString("de-DE")}
⏱️  Zeitraum: ${thirtyDaysAgo.toLocaleDateString("de-DE")} - ${new Date().toLocaleDateString("de-DE")} (30 Tage)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 ZUSAMMENFASSUNG
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Einträge gesamt: ${recentEntries.length}
Wochenanalysen: ${weeklyAnalyses.length}
Aktueller Streak: ${currentStreak} Tage
Längster Streak: ${longestStreak} Tage

DURCHSCHNITTSWERTE (${recentEntries.length} Einträge):
• Wohlfühlscore: ${avgFeel} / 99
• Schlafqualität: ${avgSleep} / 10
• Energielevel: ${avgEnergy} / 10
• Selbstwertgefühl: ${avgSelfWorth} / 10


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 TAGESEINTRÄGE (${recentEntries.length})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${recentEntries.map((e, i) => `
┌─ ${i + 1}. ${new Date(e.createdAt).toLocaleDateString("de-DE", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} ─────────────
│
│ 😊 Emotion: ${e.emotion}
│ 💙 Wohlfühlscore: ${e.feelScore}/99
│ 🛏️  Schlaf: ${e.sleep}/10  |  ⚡ Energie: ${e.energy}/10  |  ❤️  Selbstwert: ${e.selfWorth}/10
│
│ 📌 THEMA:
│    ${e.theme || "(Kein Thema angegeben)"}
│
│ ✍️  BESCHREIBUNG:
│    ${e.text ? e.text.split('\n').map(line => `   ${line}`).join('\n│') : '   (Keine Beschreibung)'}
${e.gratitude ? `│\n│ 💚 DANKBARKEIT:\n│    ${e.gratitude.split('\n').map(line => `   ${line}`).join('\n│')}` : ''}
${e.analysis ? `│\n│ 🧠 KI-ANALYSE:\n│    ${e.analysis.split('\n').map(line => `   ${line}`).join('\n│')}` : ''}
│
└────────────────────────────────────────────────────────────────
`).join('\n')}


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧭 WOCHENANALYSEN (${weeklyAnalyses.length})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${weeklyAnalyses.length > 0 ? weeklyAnalyses.map((a, i) => `
┌─ ${i + 1}. ${new Date(a.analysisDate).toLocaleDateString("de-DE", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} ─────────────
│
│ 🌡️  Stimmung: ${a.highlight?.mood === 'positiv' ? '🌿 Positiv' : a.highlight?.mood === 'negativ' ? '🌧️  Herausfordernd' : '🌤️  Neutral'}
│ 📅 Einträge: ${a.entriesCount} Tage
│ 📊 Durchschnitt: Schlaf ${a.avgStats?.sleep?.toFixed(1)}/10  |  Energie ${a.avgStats?.energy?.toFixed(1)}/10  |  Selbstwert ${a.avgStats?.selfWorth?.toFixed(1)}/10
│
│ 🧠 WOCHENANALYSE:
│    ${a.analysis ? a.analysis.split('\n').map(line => `   ${line}`).join('\n│') : '(Keine Analyse)'}
│
└────────────────────────────────────────────────────────────────
`).join('\n') : '(Keine Wochenanalysen im ausgewählten Zeitraum)'}


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ️  HINWEISE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Dieser Export wurde automatisch durch die KI-Stimmungshelfer App erstellt
• Die KI-Analysen basieren auf GPT-4 und dienen zur Unterstützung, nicht zur Diagnose
• Alle Daten sind vertraulich zu behandeln
• Patient: ${user.email}

Für Rückfragen: KI-Stimmungshelfer App v1.0.0

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

      // Speichere in temporärer Datei
      const filename = `stimmungshelfer_export_${new Date().toISOString().split('T')[0]}.txt`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, textContent);

      // Teile Datei
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/plain",
          dialogTitle: "Export für Therapeuten teilen",
        });
        Alert.alert(
          "✅ Export erfolgreich",
          `Daten der letzten 30 Tage (${recentEntries.length} Einträge) wurden exportiert.`
        );
      } else {
        Alert.alert(
          "Fehler",
          "Teilen ist auf diesem Gerät nicht verfügbar."
        );
      }
    } catch (error) {
      console.error("Error exporting data:", error);
      Alert.alert("Fehler", "Export fehlgeschlagen.\n\n" + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Abmelden", "Möchtest du dich wirklich abmelden?", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Abmelden",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
          } catch (error) {
            Alert.alert("Fehler", "Abmelden fehlgeschlagen.");
          }
        },
      },
    ]);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unbekannt";
    const date = new Date(timestamp);
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <LinearGradient colors={["#EAF4FF", "#FFFFFF"]} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={32} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <ScreenHeader
          title="Einstellungen"
          subtitle="Account & Datenverwaltung"
        />

        {/* Account Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Account-Informationen</Text>

          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Ionicons name="mail" size={20} color="#8E8E93" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>E-Mail</Text>
                <Text style={styles.infoValue}>{user?.email}</Text>
              </View>
            </View>

            <View style={[styles.infoRow, styles.divider]}>
              <Ionicons name="calendar" size={20} color="#8E8E93" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Mitglied seit</Text>
                <Text style={styles.infoValue}>
                  {formatDate(user?.metadata?.creationTime)}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="shield-checkmark" size={20} color="#8E8E93" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>User ID</Text>
                <Text style={styles.infoValueSmall} numberOfLines={1}>
                  {user?.uid}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Statistiken */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Deine Statistiken</Text>

          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.totalEntries}</Text>
              <Text style={styles.statLabel}>Tageseinträge</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.dailyAnalyses}</Text>
              <Text style={styles.statLabel}>Tagesanalysen</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.weeklyAnalyses}</Text>
              <Text style={styles.statLabel}>Wochenanalysen</Text>
            </View>
          </View>

          {/* Streak Stats */}
          {currentStreak > 0 && (
            <View style={[styles.statsContainer, { marginTop: 12 }]}>
              <View style={[styles.statCard, styles.streakStatCard]}>
                <Text style={styles.streakEmoji}>🔥</Text>
                <Text style={[styles.statNumber, styles.streakNumber]}>
                  {currentStreak}
                </Text>
                <Text style={styles.statLabel}>
                  Aktueller Streak ({currentStreak === 1 ? "Tag" : "Tage"})
                </Text>
              </View>
              <View style={[styles.statCard, styles.streakStatCard]}>
                <Text style={styles.streakEmoji}>💪</Text>
                <Text style={[styles.statNumber, styles.streakNumber]}>
                  {longestStreak}
                </Text>
                <Text style={styles.statLabel}>
                  Längster Streak ({longestStreak === 1 ? "Tag" : "Tage"})
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Datenverwaltung */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🗂️ Datenverwaltung</Text>

          <TouchableOpacity
            style={styles.exportButton}
            onPress={handleExportData}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#007AFF" />
            ) : (
              <>
                <Ionicons name="download-outline" size={24} color="#007AFF" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.exportButtonTitle}>Daten exportieren</Text>
                  <Text style={styles.exportButtonSubtitle}>
                    Letzte 30 Tage für Therapeuten exportieren
                  </Text>
                </View>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleResetData}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={24} color="#fff" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.dangerButtonTitle}>Alle Daten löschen</Text>
                  <Text style={styles.dangerButtonSubtitle}>
                    Entfernt alle Einträge und Analysen
                  </Text>
                </View>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={24} color="#007AFF" />
          <Text style={styles.logoutButtonText}>Abmelden</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.versionText}>KI-Stimmungshelfer v1.0.0</Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    paddingVertical: 40,
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
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  divider: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F2F2F7",
    marginVertical: 4,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#8E8E93",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  infoValueSmall: {
    fontSize: 12,
    fontWeight: "500",
    color: "#1C1C1E",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    flex: 1,
    marginHorizontal: 4,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "700",
    color: "#007AFF",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#8E8E93",
    textAlign: "center",
  },
  dangerButton: {
    backgroundColor: "#ff3b30",
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#ff3b30",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  dangerButtonTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 2,
  },
  dangerButtonSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
  },
  logoutButton: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: "#007AFF",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#007AFF",
    marginLeft: 8,
  },
  versionText: {
    textAlign: "center",
    color: "#8E8E93",
    fontSize: 12,
    marginTop: 24,
    marginBottom: 8,
  },
  streakStatCard: {
    backgroundColor: "#FFF5E5",
    borderWidth: 2,
    borderColor: "#FFD280",
  },
  streakEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  streakNumber: {
    color: "#FF6B35",
  },
  exportButton: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#007AFF",
    shadowColor: "#007AFF",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  exportButtonTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#007AFF",
    marginBottom: 2,
  },
  exportButtonSubtitle: {
    fontSize: 13,
    color: "#007AFF",
    opacity: 0.8,
  },
});
