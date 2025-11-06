import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../components/AuthProvider";
import { db } from "../firebaseconfig";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
  setDoc,
  getDoc,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ScreenHeader from "../components/ScreenHeader";
import { Platform } from "react-native";
import * as Application from "expo-application";

const ADMIN_EMAIL = "finn_bauermeister@web.de";

export default function AdminScreen({ navigation }) {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Sicherheitscheck: Nur Admin darf diese Seite sehen
    if (user?.email !== ADMIN_EMAIL) {
      Alert.alert(
        "Zugriff verweigert",
        "Du hast keine Berechtigung für diesen Bereich.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
      return;
    }

    // Stelle sicher, dass Admin-Flag in Firestore gesetzt ist
    setupAdminFlag();
  }, []);

  const setupAdminFlag = async () => {
    try {
      if (!user?.uid) return;

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // Erstelle User-Dokument mit Admin-Flag
        await setDoc(userDocRef, {
          email: user.email,
          isAdmin: true,
          createdAt: new Date(),
        });
        console.log("✅ Admin-Dokument erstellt");
      } else if (!userDoc.data().isAdmin) {
        // Update bestehendes Dokument mit Admin-Flag
        await updateDoc(userDocRef, {
          isAdmin: true,
        });
        console.log("✅ Admin-Flag hinzugefügt");
      }

      // Jetzt User laden
      loadUsers();
    } catch (error) {
      console.error("Error setting up admin flag:", error);
      Alert.alert(
        "Setup Fehler",
        "Konnte Admin-Flag nicht setzen. Bitte stelle sicher, dass du als " + ADMIN_EMAIL + " angemeldet bist."
      );
      navigation.goBack();
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);

      // Alle User aus Firestore laden
      const usersRef = collection(db, "users");
      const q = query(usersRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      const userList = [];
      querySnapshot.forEach((doc) => {
        userList.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      setUsers(userList);
    } catch (error) {
      console.error("Error loading users:", error);
      Alert.alert("Fehler", "Konnte User nicht laden: " + error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const togglePremium = async (userId, currentStatus) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        isPremium: !currentStatus,
      });

      // Lokale State aktualisieren
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.id === userId ? { ...u, isPremium: !currentStatus } : u
        )
      );

      Alert.alert(
        "Erfolg",
        `Premium-Status wurde ${!currentStatus ? "aktiviert" : "deaktiviert"}.`
      );
    } catch (error) {
      console.error("Error updating premium status:", error);
      Alert.alert("Fehler", "Konnte Premium-Status nicht ändern: " + error.message);
    }
  };

  const resetTrial = async (userId, userEmail) => {
    Alert.alert(
      "Trial zurücksetzen?",
      `Möchtest du den Trial für ${userEmail} wirklich zurücksetzen?`,
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Zurücksetzen",
          style: "destructive",
          onPress: async () => {
            try {
              // Device ID berechnen (gleiche Logik wie in PremiumProvider)
              const deviceId = await getDeviceId();
              const trialKey = `trialStartDate_${deviceId}`;

              // Trial-Datum aus AsyncStorage löschen
              await AsyncStorage.removeItem(trialKey);

              Alert.alert(
                "Erfolg",
                "Trial wurde zurückgesetzt. User muss App neu starten, um neuen 5-Tage-Trial zu erhalten."
              );
            } catch (error) {
              console.error("Error resetting trial:", error);
              Alert.alert("Fehler", "Konnte Trial nicht zurücksetzen: " + error.message);
            }
          },
        },
      ]
    );
  };

  // Device ID Funktion (identisch mit PremiumProvider)
  const getDeviceId = async () => {
    try {
      if (Platform.OS === "ios") {
        const idfv = await Application.getIosIdForVendorAsync();
        return idfv || "unknown-ios-device";
      } else if (Platform.OS === "android") {
        const androidId = Application.androidId;
        return androidId || "unknown-android-device";
      } else {
        return "unknown-device";
      }
    } catch (error) {
      console.error("Error getting device ID:", error);
      return "fallback-device-id";
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unbekannt";

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch (error) {
      return "Unbekannt";
    }
  };

  const renderUserCard = (user) => {
    const isPremium = user.isPremium || false;

    return (
      <View key={user.id} style={styles.userCard}>
        {/* Header */}
        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <Ionicons
              name="person-circle"
              size={40}
              color={isPremium ? "#FFB900" : "#666"}
            />
            <View style={styles.userDetails}>
              <Text style={styles.userEmail}>{user.email || "Keine Email"}</Text>
              <Text style={styles.userId}>ID: {user.id.substring(0, 8)}...</Text>
              <Text style={styles.userDate}>
                Registriert: {formatDate(user.createdAt)}
              </Text>
            </View>
          </View>

          {/* Premium Badge */}
          {isPremium && (
            <View style={styles.premiumBadge}>
              <Ionicons name="diamond" size={16} color="#FFB900" />
              <Text style={styles.premiumBadgeText}>Premium</Text>
            </View>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Actions */}
        <View style={styles.actions}>
          {/* Premium Toggle */}
          <View style={styles.actionRow}>
            <View style={styles.actionLabel}>
              <Ionicons
                name="diamond"
                size={20}
                color={isPremium ? "#FFB900" : "#666"}
              />
              <Text style={styles.actionText}>Premium-Status</Text>
            </View>
            <Switch
              value={isPremium}
              onValueChange={() => togglePremium(user.id, isPremium)}
              trackColor={{ false: "#ccc", true: "#FFE066" }}
              thumbColor={isPremium ? "#FFB900" : "#f4f3f4"}
            />
          </View>

          {/* Trial Reset Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => resetTrial(user.id, user.email)}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={20} color="#007AFF" />
            <Text style={styles.actionButtonText}>Trial zurücksetzen</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <LinearGradient colors={["#EAF4FF", "#FFFFFF"]} style={styles.gradient}>
        <ScreenHeader title="Admin-Panel" onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Lade User-Daten...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#EAF4FF", "#FFFFFF"]} style={styles.gradient}>
      <View style={styles.topRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={32} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScreenHeader title="Admin-Panel" subtitle="User-Verwaltung" />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark" size={32} color="#34C759" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Admin-Bereich</Text>
            <Text style={styles.infoText}>
              Hier kannst du Premium-Status verwalten und Trials zurücksetzen.
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{users.length}</Text>
            <Text style={styles.statLabel}>Gesamt User</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {users.filter((u) => u.isPremium).length}
            </Text>
            <Text style={styles.statLabel}>Premium User</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {users.filter((u) => !u.isPremium).length}
            </Text>
            <Text style={styles.statLabel}>Free User</Text>
          </View>
        </View>

        {/* User List */}
        <Text style={styles.sectionTitle}>Alle User</Text>

        {users.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Keine User gefunden</Text>
          </View>
        ) : (
          users.map((user) => renderUserCard(user))
        )}

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  topRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 10,
    marginTop: 50,
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
  container: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },

  // Info Card
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#E8F5E9",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#34C759",
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#34C759",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: "#1B5E20",
    lineHeight: 20,
  },

  // Stats
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "800",
    color: "#007AFF",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },

  // Section
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
  },

  // User Card
  userCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  userInfo: {
    flexDirection: "row",
    flex: 1,
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  userId: {
    fontSize: 12,
    color: "#999",
    marginBottom: 2,
  },
  userDate: {
    fontSize: 12,
    color: "#666",
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF9E6",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FFE066",
  },
  premiumBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFB900",
    marginLeft: 4,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: "#E5E5EA",
    marginVertical: 16,
  },

  // Actions
  actions: {
    gap: 12,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionLabel: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5F2FF",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#B3D9FF",
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#007AFF",
    marginLeft: 8,
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginTop: 16,
  },
});
