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
import { usePremium } from "../components/PremiumProvider";
import { db, auth } from "../firebaseconfig";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import ScreenHeader from "../components/ScreenHeader";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { deleteAllLocalEntries, deleteAllLocalWeeklyAnalyses, getLocalEntries, getLocalWeeklyAnalyses } from "../services/localStorageService";
import { runFullTestSuite, runQuickHealthCheck } from "../services/testService";

export default function SettingsScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const { isPremium, isTrialActive, trialDaysLeft, getTrialTimeRemaining } = usePremium();
  const [loading, setLoading] = useState(false);
  const [trialTimeRemaining, setTrialTimeRemaining] = useState(null);
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

  // Test Suite
  const [showTestModal, setShowTestModal] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [testRunning, setTestRunning] = useState(false);

  useEffect(() => {
    loadStats();
    calculateStreak();
    loadPrivacySettings();
    loadTrialTime();
  }, []);

  const loadTrialTime = async () => {
    if (isTrialActive) {
      const timeData = await getTrialTimeRemaining();
      setTrialTimeRemaining(timeData);
    }
  };

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
      // 🔒 DATENSCHUTZ: Stats aus lokalem Storage
      const localEntries = await getLocalEntries(user.uid);
      const localWeeklyAnalyses = await getLocalWeeklyAnalyses(user.uid);

      // Zähle Einträge mit Analysen
      const totalEntries = localEntries.length;
      const dailyAnalyses = localEntries.filter(e => e.analysis).length;
      const weeklyAnalyses = localWeeklyAnalyses.length;

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

      // 🔒 DATENSCHUTZ: Lade Einträge aus lokalem Storage
      const localEntries = await getLocalEntries(user.uid);

      // Extrahiere Datum (ohne Uhrzeit) für jeden Eintrag
      const entryDates = localEntries
        .map(entry => {
          if (!entry.createdAt) return null;
          const date = new Date(entry.createdAt);
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

  const handleRunTests = async (fullSuite = true) => {
    setTestRunning(true);
    setShowTestModal(true);
    setTestResults(null);

    try {
      let results;
      if (fullSuite) {
        // Full test suite (skips expensive tests by default)
        results = await runFullTestSuite({
          skipExpensiveTests: true, // Don't call OpenAI (costs money)
          skipDestructiveTests: true, // Don't delete data
          includePerformanceTests: false // Skip performance tests for faster execution
        });
      } else {
        // Quick health check
        results = await runQuickHealthCheck();
      }

      setTestResults(results);
    } catch (error) {
      console.error('Test suite error:', error);
      Alert.alert(
        'Test-Fehler',
        'Die Tests konnten nicht vollständig ausgeführt werden.\n\n' + error.message
      );
    } finally {
      setTestRunning(false);
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
      const userId = user.uid;

      // 🔒 DATENSCHUTZ: Lösche ZUERST lokale Daten
      await deleteAllLocalEntries(userId);
      await deleteAllLocalWeeklyAnalyses(userId);
      console.log("✅ Lokale Daten gelöscht");

      // Lösche Chat-Daten aus AsyncStorage
      const chatKeys = await AsyncStorage.getAllKeys();
      const userChatKeys = chatKeys.filter(key => key.includes(`chatMessages_${userId}`));
      await AsyncStorage.multiRemove(userChatKeys);
      console.log("✅ Lokale Chat-Daten gelöscht");

      // Dann Firestore Metadaten löschen
      const userEntriesQuery = query(
        collection(db, "entries"),
        where("userId", "==", userId)
      );
      const userEntriesSnapshot = await getDocs(userEntriesQuery);

      console.log(`Lösche ${userEntriesSnapshot.size} Cloud-Metadaten...`);

      // Hole auch alle Wochenanalysen des Users
      const weeklyAnalysesSnapshot = await getDocs(
        query(collection(db, "weeklyAnalyses"), where("userId", "==", userId))
      );

      console.log(`Lösche ${weeklyAnalysesSnapshot.size} Wochenanalyse-Metadaten...`);

      // Hole alle Chats des Users
      const chatsSnapshot = await getDocs(
        query(collection(db, "chats"), where("userId", "==", userId))
      );

      console.log(`Lösche ${chatsSnapshot.size} Chats...`);

      // Hole alle Chat-Nachrichten des Users
      const chatMessagesSnapshot = await getDocs(
        query(collection(db, "chatMessages"), where("userId", "==", userId))
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
        `Alle Daten wurden vollständig entfernt:\n• Lokale Einträge & Analysen\n• Cloud-Metadaten\n• Chat-Verläufe\n\n💡 Hinweis: Bitte starte die App neu, damit alle Änderungen vollständig übernommen werden.`,
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

      const userId = currentUser.uid;

      // 🔒 DATENSCHUTZ: 1. Lösche ZUERST alle lokalen Daten
      await deleteAllLocalEntries(userId);
      await deleteAllLocalWeeklyAnalyses(userId);
      console.log("✅ Lokale Daten gelöscht");

      // Lösche Chat-Daten aus AsyncStorage
      const chatKeys = await AsyncStorage.getAllKeys();
      const userChatKeys = chatKeys.filter(key => key.includes(`chatMessages_${userId}`));
      await AsyncStorage.multiRemove(userChatKeys);

      // Lösche alle anderen AsyncStorage Keys des Users
      const allUserKeys = chatKeys.filter(key => key.includes(userId));
      await AsyncStorage.multiRemove(allUserKeys);
      console.log("✅ Alle lokalen Daten gelöscht");

      // 2. Lösche alle Firestore-Metadaten
      const deletePromises = [];

      // Entries
      const entriesSnap = await getDocs(
        query(collection(db, "entries"), where("userId", "==", userId))
      );
      deletePromises.push(...entriesSnap.docs.map(d => deleteDoc(d.ref)));

      // Weekly Analyses
      const weeklySnap = await getDocs(
        query(collection(db, "weeklyAnalyses"), where("userId", "==", userId))
      );
      deletePromises.push(...weeklySnap.docs.map(d => deleteDoc(d.ref)));

      // Chats
      const chatsSnap = await getDocs(
        query(collection(db, "chats"), where("userId", "==", userId))
      );
      deletePromises.push(...chatsSnap.docs.map(d => deleteDoc(d.ref)));

      // Chat Messages
      const messagesSnap = await getDocs(
        query(collection(db, "chatMessages"), where("userId", "==", userId))
      );
      deletePromises.push(...messagesSnap.docs.map(d => deleteDoc(d.ref)));

      // User Profile
      deletePromises.push(deleteDoc(doc(db, "users", userId)));

      // Lösche alle Firestore-Daten parallel
      await Promise.all(deletePromises);

      // 3. Lösche Firebase Auth Account
      await deleteUser(currentUser);

      Alert.alert(
        "✅ Account gelöscht",
        "Dein Account und alle Daten (lokal & cloud) wurden vollständig entfernt. Auf Wiedersehen!",
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

        {/* Premium/Trial Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💎 Premium-Status</Text>

          {isPremium ? (
            <View style={[styles.card, styles.premiumCard]}>
              <View style={styles.premiumHeader}>
                <Ionicons name="checkmark-circle" size={48} color="#34C759" />
                <View style={styles.premiumInfo}>
                  <Text style={styles.premiumTitle}>Premium aktiv</Text>
                  <Text style={styles.premiumSubtitle}>
                    Du hast vollen Zugriff auf alle Features
                  </Text>
                </View>
              </View>
              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#34C759" />
                  <Text style={styles.featureText}>Unbegrenzte Tageseinträge</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#34C759" />
                  <Text style={styles.featureText}>Unbegrenzte KI-Analysen</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={18} color="#34C759" />
                  <Text style={styles.featureText}>Unbegrenzter KI-Chat</Text>
                </View>
              </View>
            </View>
          ) : isTrialActive ? (
            <View style={[styles.card, styles.trialCard]}>
              <View style={styles.trialHeader}>
                <Ionicons name="time" size={48} color="#FF9500" />
                <View style={styles.trialInfo}>
                  <Text style={styles.trialTitle}>Trial aktiv 🎉</Text>
                  <Text style={styles.trialSubtitle}>
                    Teste alle Premium-Features kostenlos
                  </Text>
                </View>
              </View>

              {trialTimeRemaining && !trialTimeRemaining.expired && (
                <View style={styles.trialTimeContainer}>
                  <Text style={styles.trialTimeLabel}>Verbleibende Zeit:</Text>
                  <View style={styles.trialTimerRow}>
                    <View style={styles.trialTimerSegment}>
                      <Text style={styles.trialTimerNumber}>{trialTimeRemaining.days}</Text>
                      <Text style={styles.trialTimerLabel}>
                        Tag{trialTimeRemaining.days !== 1 ? 'e' : ''}
                      </Text>
                    </View>
                    <Text style={styles.trialTimerSeparator}>:</Text>
                    <View style={styles.trialTimerSegment}>
                      <Text style={styles.trialTimerNumber}>
                        {String(trialTimeRemaining.hours).padStart(2, '0')}
                      </Text>
                      <Text style={styles.trialTimerLabel}>Std</Text>
                    </View>
                    <Text style={styles.trialTimerSeparator}>:</Text>
                    <View style={styles.trialTimerSegment}>
                      <Text style={styles.trialTimerNumber}>
                        {String(trialTimeRemaining.minutes).padStart(2, '0')}
                      </Text>
                      <Text style={styles.trialTimerLabel}>Min</Text>
                    </View>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={() => navigation.navigate('Paywall')}
                activeOpacity={0.8}
              >
                <Ionicons name="diamond" size={20} color="#fff" />
                <Text style={styles.upgradeButtonText}>Premium upgraden</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.card, styles.freeCard]}>
              <View style={styles.freeHeader}>
                <Ionicons name="lock-closed" size={48} color="#FF3B30" />
                <View style={styles.freeInfo}>
                  <Text style={styles.freeTitle}>Trial abgelaufen</Text>
                  <Text style={styles.freeSubtitle}>
                    Upgrade zu Premium für unbegrenzten Zugang
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.upgradeButton, styles.upgradeButtonPrimary]}
                onPress={() => navigation.navigate('Paywall')}
                activeOpacity={0.8}
              >
                <Ionicons name="diamond" size={20} color="#fff" />
                <Text style={styles.upgradeButtonText}>Jetzt upgraden</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

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
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={24} color="#007AFF" />
          <Text style={styles.logoutButtonText}>Abmelden</Text>
        </TouchableOpacity>

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

          {/* Test Suite Button */}
          <TouchableOpacity
            style={styles.testButton}
            onPress={() => handleRunTests(true)}
            disabled={loading || testRunning}
          >
            {testRunning ? (
              <ActivityIndicator color="#007AFF" />
            ) : (
              <>
                <Ionicons name="flask-outline" size={24} color="#007AFF" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.testButtonTitle}>🧪 App-Tests durchführen</Text>
                  <Text style={styles.testButtonSubtitle}>
                    Teste alle Funktionen (Datenbank, Storage, APIs)
                  </Text>
                </View>
              </>
            )}
          </TouchableOpacity>

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
        </View>

        {/* Admin Panel (nur für Admin sichtbar) */}
        {user?.email === "finn_bauermeister@web.de" && (
          <TouchableOpacity
            style={styles.adminButton}
            onPress={() => navigation.navigate("Admin")}
            activeOpacity={0.8}
          >
            <Ionicons name="shield-checkmark" size={24} color="#FFB900" />
            <Text style={styles.adminButtonText}>Admin-Panel</Text>
            <Ionicons name="chevron-forward" size={20} color="#FFB900" />
          </TouchableOpacity>
        )}

        {/* App Version */}
        <Text style={styles.versionText}>KI-Stimmungshelfer v1.0.0</Text>
      </ScrollView>

      {/* Test Results Modal */}
      <Modal
        visible={showTestModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          if (!testRunning) {
            setShowTestModal(false);
            setTestResults(null);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.testModalContent}>
            <View style={styles.testModalHeader}>
              <Text style={styles.testModalTitle}>🧪 Test-Ergebnisse</Text>
              {!testRunning && (
                <TouchableOpacity
                  onPress={() => {
                    setShowTestModal(false);
                    setTestResults(null);
                  }}
                >
                  <Ionicons name="close-circle" size={32} color="#8E8E93" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.testModalScroll}>
              {testRunning && !testResults && (
                <View style={styles.testLoadingContainer}>
                  <ActivityIndicator size="large" color="#007AFF" />
                  <Text style={styles.testLoadingText}>Tests werden ausgeführt...</Text>
                  <Text style={styles.testLoadingSubtext}>Dies kann einige Sekunden dauern</Text>
                </View>
              )}

              {testResults && (
                <>
                  {/* Summary */}
                  <View style={styles.testSummaryCard}>
                    <Text style={styles.testSummaryTitle}>Zusammenfassung</Text>
                    <View style={styles.testSummaryRow}>
                      <View style={styles.testSummaryItem}>
                        <Text style={styles.testSummaryNumber}>{testResults.summary.total}</Text>
                        <Text style={styles.testSummaryLabel}>Tests</Text>
                      </View>
                      <View style={styles.testSummaryItem}>
                        <Text style={[styles.testSummaryNumber, { color: '#34C759' }]}>
                          {testResults.summary.passed}
                        </Text>
                        <Text style={styles.testSummaryLabel}>Erfolg</Text>
                      </View>
                      <View style={styles.testSummaryItem}>
                        <Text style={[styles.testSummaryNumber, { color: '#FF3B30' }]}>
                          {testResults.summary.failed}
                        </Text>
                        <Text style={styles.testSummaryLabel}>Fehler</Text>
                      </View>
                      <View style={styles.testSummaryItem}>
                        <Text style={[styles.testSummaryNumber, { color: '#FF9500' }]}>
                          {testResults.summary.warnings}
                        </Text>
                        <Text style={styles.testSummaryLabel}>Warnung</Text>
                      </View>
                    </View>
                    <Text style={styles.testSummaryDuration}>
                      Dauer: {(testResults.summary.duration / 1000).toFixed(2)}s
                    </Text>
                  </View>

                  {/* Individual Results */}
                  {testResults.results.map((result, index) => (
                    <View
                      key={index}
                      style={[
                        styles.testResultCard,
                        result.status === 'success' && styles.testResultSuccess,
                        result.status === 'error' && styles.testResultError,
                        result.status === 'warning' && styles.testResultWarning,
                        result.status === 'skipped' && styles.testResultSkipped,
                      ]}
                    >
                      <View style={styles.testResultHeader}>
                        <View style={styles.testResultTitleRow}>
                          <Ionicons
                            name={
                              result.status === 'success'
                                ? 'checkmark-circle'
                                : result.status === 'error'
                                ? 'close-circle'
                                : result.status === 'warning'
                                ? 'warning'
                                : 'remove-circle'
                            }
                            size={20}
                            color={
                              result.status === 'success'
                                ? '#34C759'
                                : result.status === 'error'
                                ? '#FF3B30'
                                : result.status === 'warning'
                                ? '#FF9500'
                                : '#8E8E93'
                            }
                          />
                          <Text style={styles.testResultName}>{result.name}</Text>
                        </View>
                        {result.duration && (
                          <Text style={styles.testResultDuration}>{result.duration}ms</Text>
                        )}
                      </View>
                      <Text style={styles.testResultMessage}>{result.message}</Text>
                      {result.error && (
                        <Text style={styles.testResultError}>{result.error}</Text>
                      )}
                    </View>
                  ))}
                </>
              )}
            </ScrollView>

            {/* Actions */}
            {testResults && !testRunning && (
              <View style={styles.testModalActions}>
                <TouchableOpacity
                  style={styles.testModalButton}
                  onPress={() => handleRunTests(true)}
                >
                  <Ionicons name="refresh" size={20} color="#007AFF" />
                  <Text style={styles.testModalButtonText}>Neu testen</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.testModalButton, styles.testModalButtonPrimary]}
                  onPress={() => {
                    setShowTestModal(false);
                    setTestResults(null);
                  }}
                >
                  <Text style={[styles.testModalButtonText, { color: '#FFF' }]}>Schließen</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

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
    marginTop: 4,
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
    marginBottom: 24,
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
    marginBottom: 20,
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
  // Premium/Trial Card Styles
  premiumCard: {
    backgroundColor: "#E8F5E9",
    borderWidth: 2,
    borderColor: "#34C759",
  },
  premiumHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  premiumInfo: {
    marginLeft: 16,
    flex: 1,
  },
  premiumTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1B5E20",
    marginBottom: 4,
  },
  premiumSubtitle: {
    fontSize: 14,
    color: "#2E7D32",
  },
  featureList: {
    borderTopWidth: 1,
    borderTopColor: "#C8E6C9",
    paddingTop: 16,
    marginTop: 16,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  featureText: {
    fontSize: 14,
    color: "#1B5E20",
    marginLeft: 10,
    fontWeight: "500",
  },
  trialCard: {
    backgroundColor: "#FFF9E6",
    borderWidth: 2,
    borderColor: "#FFE066",
  },
  trialHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  trialInfo: {
    marginLeft: 16,
    flex: 1,
  },
  trialTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#996A13",
    marginBottom: 4,
  },
  trialSubtitle: {
    fontSize: 14,
    color: "#8B5E3C",
  },
  trialTimeContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(153, 106, 19, 0.2)",
  },
  trialTimeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#996A13",
    marginBottom: 12,
    textAlign: "center",
  },
  trialTimerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  trialTimerSegment: {
    alignItems: "center",
    paddingHorizontal: 12,
  },
  trialTimerNumber: {
    fontSize: 28,
    fontWeight: "800",
    color: "#996A13",
    lineHeight: 32,
  },
  trialTimerLabel: {
    fontSize: 12,
    color: "#8B5E3C",
    fontWeight: "600",
    marginTop: 2,
  },
  trialTimerSeparator: {
    fontSize: 24,
    fontWeight: "700",
    color: "#996A13",
    marginHorizontal: 4,
  },
  upgradeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 4,
  },
  upgradeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
  freeCard: {
    backgroundColor: "#FFEBEE",
    borderWidth: 2,
    borderColor: "#FF3B30",
  },
  freeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  freeInfo: {
    marginLeft: 16,
    flex: 1,
  },
  freeTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#B71C1C",
    marginBottom: 4,
  },
  freeSubtitle: {
    fontSize: 14,
    color: "#C62828",
  },
  upgradeButtonPrimary: {
    backgroundColor: "#FF3B30",
  },
  adminButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF9E6",
    borderRadius: 16,
    padding: 18,
    marginTop: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#FFE066",
    shadowColor: "#FFB900",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  adminButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#996A13",
    marginLeft: 10,
    marginRight: 10,
    flex: 1,
  },
  // Test Button Styles
  testButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#007AFF",
    shadowColor: "#007AFF",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  testButtonTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 4,
  },
  testButtonSubtitle: {
    fontSize: 12,
    color: "#8E8E93",
    lineHeight: 16,
  },
  // Test Modal Styles
  testModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: "90%",
    minHeight: "70%",
  },
  testModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  testModalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1C1C1E",
  },
  testModalScroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  testLoadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  testLoadingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
    marginTop: 16,
  },
  testLoadingSubtext: {
    fontSize: 14,
    color: "#8E8E93",
    marginTop: 8,
  },
  testSummaryCard: {
    backgroundColor: "#F7F9FC",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  testSummaryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 16,
  },
  testSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  testSummaryItem: {
    alignItems: "center",
  },
  testSummaryNumber: {
    fontSize: 32,
    fontWeight: "800",
    color: "#007AFF",
  },
  testSummaryLabel: {
    fontSize: 12,
    color: "#8E8E93",
    marginTop: 4,
    fontWeight: "600",
  },
  testSummaryDuration: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
    marginTop: 8,
  },
  testResultCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#E5E5EA",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  testResultSuccess: {
    borderLeftColor: "#34C759",
    backgroundColor: "#F0FFF4",
  },
  testResultError: {
    borderLeftColor: "#FF3B30",
    backgroundColor: "#FFF5F5",
  },
  testResultWarning: {
    borderLeftColor: "#FF9500",
    backgroundColor: "#FFF9F0",
  },
  testResultSkipped: {
    borderLeftColor: "#8E8E93",
    backgroundColor: "#F9F9F9",
  },
  testResultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  testResultTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  testResultName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1C1C1E",
    marginLeft: 8,
    flex: 1,
  },
  testResultDuration: {
    fontSize: 12,
    color: "#8E8E93",
  },
  testResultMessage: {
    fontSize: 13,
    color: "#3C3C43",
    lineHeight: 18,
  },
  testResultError: {
    fontSize: 12,
    color: "#FF3B30",
    marginTop: 6,
    fontFamily: "monospace",
  },
  testModalActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
    gap: 12,
  },
  testModalButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#007AFF",
    backgroundColor: "#fff",
  },
  testModalButtonPrimary: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  testModalButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#007AFF",
    marginLeft: 6,
  },
});
