import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../components/AuthProvider";
import { db, auth } from "../firebaseconfig";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import ScreenHeader from "../components/ScreenHeader";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Privacy Settings
  const [aiAnalysisEnabled, setAiAnalysisEnabled] = useState(true);
  const [chatHistoryEnabled, setChatHistoryEnabled] = useState(true);

  useEffect(() => {
    loadStats();
    calculateStreak();
    loadPrivacySettings();
  }, []);

  const loadPrivacySettings = async () => {
    try {
      const aiSetting = await AsyncStorage.getItem(`aiAnalysisEnabled_${user.uid}`);
      const chatSetting = await AsyncStorage.getItem(`chatHistoryEnabled_${user.uid}`);

      if (aiSetting !== null) setAiAnalysisEnabled(aiSetting === 'true');
      if (chatSetting !== null) setChatHistoryEnabled(chatSetting === 'true');
    } catch (error) {
      console.error("Error loading privacy settings:", error);
    }
  };

  const toggleAiAnalysis = async (value) => {
    try {
      await AsyncStorage.setItem(`aiAnalysisEnabled_${user.uid}`, value.toString());
      setAiAnalysisEnabled(value);

      Alert.alert(
        value ? "KI-Analysen aktiviert" : "KI-Analysen deaktiviert",
        value
          ? "Du erhältst wieder KI-gestützte Analysen deiner Einträge."
          : "Deine Einträge werden nicht mehr an OpenAI gesendet. Bestehende Analysen bleiben erhalten.",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Error saving AI analysis setting:", error);
    }
  };

  const toggleChatHistory = async (value) => {
    try {
      await AsyncStorage.setItem(`chatHistoryEnabled_${user.uid}`, value.toString());
      setChatHistoryEnabled(value);

      Alert.alert(
        value ? "Chat-Historie aktiviert" : "Chat-Historie deaktiviert",
        value
          ? "Deine Chat-Verläufe werden wieder gespeichert."
          : "Neue Chat-Nachrichten werden nicht mehr gespeichert. Bestehende Chats bleiben erhalten.",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Error saving chat history setting:", error);
    }
  };

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

  const handleDeleteAccount = () => {
    Alert.alert(
      "🚨 Account unwiderruflich löschen?",
      "Diese Aktion kann NICHT rückgängig gemacht werden!\n\nFolgende Daten werden PERMANENT gelöscht:\n• Dein gesamter Account\n• Alle Tageseinträge\n• Alle Analysen\n• Alle Chat-Verläufe\n• Alle persönlichen Daten\n\nDu kannst dich danach NICHT mehr mit dieser E-Mail anmelden!",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Weiter",
          style: "destructive",
          onPress: () => {
            // Zeige Passwort-Dialog für Re-Authentication
            setPassword("");
            setPasswordError("");
            setShowPasswordModal(true);
          },
        },
      ]
    );
  };

  const handlePasswordSubmit = async () => {
    if (!password.trim()) {
      setPasswordError("Bitte gib dein Passwort ein");
      return;
    }

    setLoading(true);
    setPasswordError("");

    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) {
        throw new Error("Kein Benutzer angemeldet");
      }

      // Re-Authentication durchführen
      const credential = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(currentUser, credential);

      // Schließe Modal
      setShowPasswordModal(false);
      setPassword("");

      // Jetzt Account löschen
      await confirmDeleteAccount();
    } catch (error) {
      console.error("Re-authentication error:", error);

      if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        setPasswordError("Falsches Passwort. Bitte versuche es erneut.");
      } else if (error.code === "auth/too-many-requests") {
        setPasswordError("Zu viele Versuche. Bitte später erneut versuchen.");
      } else {
        setPasswordError("Fehler bei der Anmeldung: " + error.message);
      }
      setLoading(false);
    }
  };

  const confirmDeleteAccount = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert("Fehler", "Kein Benutzer angemeldet.");
        setLoading(false);
        return;
      }

      // 1. Lösche alle Firestore-Daten
      const deletePromises = [];

      // Entries
      const entriesSnap = await getDocs(
        query(collection(db, "entries"), where("userId", "==", currentUser.uid))
      );
      deletePromises.push(...entriesSnap.docs.map(d => deleteDoc(d.ref)));

      // Weekly Analyses
      const weeklySnap = await getDocs(
        query(collection(db, "weeklyAnalyses"), where("userId", "==", currentUser.uid))
      );
      deletePromises.push(...weeklySnap.docs.map(d => deleteDoc(d.ref)));

      // Chats
      const chatsSnap = await getDocs(
        query(collection(db, "chats"), where("userId", "==", currentUser.uid))
      );
      deletePromises.push(...chatsSnap.docs.map(d => deleteDoc(d.ref)));

      // Chat Messages
      const messagesSnap = await getDocs(
        query(collection(db, "chatMessages"), where("userId", "==", currentUser.uid))
      );
      deletePromises.push(...messagesSnap.docs.map(d => deleteDoc(d.ref)));

      // User Profile
      deletePromises.push(deleteDoc(doc(db, "users", currentUser.uid)));

      // Lösche alle Firestore-Daten parallel
      await Promise.all(deletePromises);

      // 2. Lösche Firebase Auth Account
      await deleteUser(currentUser);

      Alert.alert(
        "✅ Account gelöscht",
        "Dein Account und alle Daten wurden vollständig entfernt. Auf Wiedersehen!",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Error deleting account:", error);
      Alert.alert(
        "Fehler",
        "Account konnte nicht gelöscht werden.\n\n" + error.message
      );
    } finally {
      setLoading(false);
    }
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

        {/* Privacy & Datenschutz */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔒 Datenschutz & Privatsphäre</Text>

          {/* KI-Analysen Toggle */}
          <View style={styles.privacyOption}>
            <View style={{ flex: 1 }}>
              <Text style={styles.privacyOptionTitle}>KI-Analysen nutzen</Text>
              <Text style={styles.privacyOptionDescription}>
                Sendet deine Texte an OpenAI für psychologische Analysen
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.toggle, aiAnalysisEnabled && styles.toggleActive]}
              onPress={() => toggleAiAnalysis(!aiAnalysisEnabled)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.toggleThumb,
                  aiAnalysisEnabled && styles.toggleThumbActive,
                ]}
              />
            </TouchableOpacity>
          </View>

          {/* Chat-Historie Toggle */}
          <View style={styles.privacyOption}>
            <View style={{ flex: 1 }}>
              <Text style={styles.privacyOptionTitle}>Chat-Historie speichern</Text>
              <Text style={styles.privacyOptionDescription}>
                Speichert deine Gespräche mit dem KI-Assistenten
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.toggle, chatHistoryEnabled && styles.toggleActive]}
              onPress={() => toggleChatHistory(!chatHistoryEnabled)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.toggleThumb,
                  chatHistoryEnabled && styles.toggleThumbActive,
                ]}
              />
            </TouchableOpacity>
          </View>

          {/* Link zur Datenschutzerklärung */}
          <TouchableOpacity
            style={styles.privacyLink}
            onPress={() => navigation.navigate("PrivacyPolicy")}
          >
            <Ionicons name="shield-checkmark-outline" size={24} color="#007AFF" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.privacyLinkTitle}>Datenschutzerklärung</Text>
              <Text style={styles.privacyLinkSubtitle}>
                Lies unsere vollständige Datenschutzerklärung
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>
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

        {/* Account Löschen */}
        <TouchableOpacity
          style={styles.deleteAccountButton}
          onPress={handleDeleteAccount}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="trash-bin-outline" size={24} color="#fff" />
              <Text style={styles.deleteAccountButtonText}>Account unwiderruflich löschen</Text>
            </>
          )}
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.versionText}>KI-Stimmungshelfer v1.0.0</Text>
      </ScrollView>

      {/* Password Re-Authentication Modal */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          if (!loading) {
            setShowPasswordModal(false);
            setPassword("");
            setPasswordError("");
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🔐 Passwort bestätigen</Text>
            <Text style={styles.modalDescription}>
              Aus Sicherheitsgründen musst du dein Passwort eingeben, um deinen Account zu löschen.
            </Text>

            <TextInput
              style={[styles.modalInput, passwordError && styles.modalInputError]}
              secureTextEntry
              placeholder="Dein Passwort"
              placeholderTextColor="#999"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setPasswordError("");
              }}
              autoFocus
              editable={!loading}
            />

            {passwordError ? (
              <Text style={styles.modalErrorText}>{passwordError}</Text>
            ) : null}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  if (!loading) {
                    setShowPasswordModal(false);
                    setPassword("");
                    setPasswordError("");
                  }
                }}
                disabled={loading}
              >
                <Text style={styles.modalCancelButtonText}>Abbrechen</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton, loading && styles.modalButtonDisabled]}
                onPress={handlePasswordSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>Bestätigen</Text>
                )}
              </TouchableOpacity>
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
  deleteAccountButton: {
    backgroundColor: "#8B0000",
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    shadowColor: "#8B0000",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  deleteAccountButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "85%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 12,
    textAlign: "center",
  },
  modalDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
    lineHeight: 20,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: "#E5E5EA",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: "#F9F9F9",
    marginBottom: 12,
  },
  modalInputError: {
    borderColor: "#ff3b30",
  },
  modalErrorText: {
    color: "#ff3b30",
    fontSize: 13,
    marginBottom: 12,
    fontWeight: "500",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalCancelButton: {
    backgroundColor: "#F2F2F7",
    marginRight: 8,
  },
  modalCancelButtonText: {
    color: "#666",
    fontWeight: "600",
    fontSize: 15,
  },
  modalConfirmButton: {
    backgroundColor: "#8B0000",
    marginLeft: 8,
  },
  modalConfirmButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  // Privacy Settings Styles
  privacyOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  privacyOptionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 4,
  },
  privacyOptionDescription: {
    fontSize: 12,
    color: "#8E8E93",
    lineHeight: 16,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#E5E5EA",
    padding: 2,
    justifyContent: "center",
    marginLeft: 12,
  },
  toggleActive: {
    backgroundColor: "#34C759",
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    alignSelf: "flex-end",
  },
  privacyLink: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#007AFF",
    shadowColor: "#007AFF",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  privacyLinkTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#007AFF",
    marginBottom: 2,
  },
  privacyLinkSubtitle: {
    fontSize: 12,
    color: "#007AFF",
    opacity: 0.8,
  },
});
