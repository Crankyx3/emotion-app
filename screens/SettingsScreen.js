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

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalEntries: 0,
    dailyAnalyses: 0,
    weeklyAnalyses: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    if (!user) return;

    try {
      // Zähle Tageseinträge
      const entriesSnapshot = await getDocs(
        query(collection(db, "dailyEntries"), where("userId", "==", user.uid))
      );

      // Zähle Tagesanalysen
      const dailyAnalysesSnapshot = await getDocs(
        query(collection(db, "dailyAnalyses"), where("userId", "==", user.uid))
      );

      // Zähle Wochenanalysen
      const weeklyAnalysesSnapshot = await getDocs(
        query(collection(db, "weeklyAnalyses"), where("userId", "==", user.uid))
      );

      setStats({
        totalEntries: entriesSnapshot.size,
        dailyAnalyses: dailyAnalysesSnapshot.size,
        weeklyAnalyses: weeklyAnalysesSnapshot.size,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const handleResetData = () => {
    Alert.alert(
      "⚠️ Alle Daten löschen?",
      "Diese Aktion kann nicht rückgängig gemacht werden!\n\nFolgende Daten werden gelöscht:\n• Alle Tageseinträge\n• Alle Tagesanalysen\n• Alle Wochenanalysen\n• Chart-Verlauf",
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
      // Lösche Tageseinträge
      const entriesSnapshot = await getDocs(
        query(collection(db, "dailyEntries"), where("userId", "==", user.uid))
      );
      const deleteEntriesPromises = entriesSnapshot.docs.map((doc) =>
        deleteDoc(doc.ref)
      );

      // Lösche Tagesanalysen
      const dailyAnalysesSnapshot = await getDocs(
        query(collection(db, "dailyAnalyses"), where("userId", "==", user.uid))
      );
      const deleteDailyAnalysesPromises = dailyAnalysesSnapshot.docs.map((doc) =>
        deleteDoc(doc.ref)
      );

      // Lösche Wochenanalysen
      const weeklyAnalysesSnapshot = await getDocs(
        query(collection(db, "weeklyAnalyses"), where("userId", "==", user.uid))
      );
      const deleteWeeklyAnalysesPromises = weeklyAnalysesSnapshot.docs.map((doc) =>
        deleteDoc(doc.ref)
      );

      // Führe alle Löschungen parallel aus
      await Promise.all([
        ...deleteEntriesPromises,
        ...deleteDailyAnalysesPromises,
        ...deleteWeeklyAnalysesPromises,
      ]);

      // Aktualisiere Stats
      setStats({
        totalEntries: 0,
        dailyAnalyses: 0,
        weeklyAnalyses: 0,
      });

      Alert.alert(
        "✅ Erfolgreich gelöscht",
        "Alle Daten wurden vollständig entfernt."
      );
    } catch (error) {
      console.error("Error resetting data:", error);
      Alert.alert(
        "Fehler",
        "Daten konnten nicht gelöscht werden. Bitte erneut versuchen."
      );
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
        </View>

        {/* Datenverwaltung */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🗂️ Datenverwaltung</Text>

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
});
