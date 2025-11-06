import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs, query, where, addDoc, Timestamp } from "firebase/firestore";
import { db, auth } from "../firebaseconfig";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../components/AuthProvider";
import GuestBlockModal from "../components/GuestBlockModal";
import { getLocalEntries, getLocalWeeklyAnalyses } from "../services/localStorageService";

export default function ChatHistoryScreen() {
  const navigation = useNavigation();
  const { isGuestMode, exitGuestMode } = useAuth();

  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState([]);
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  // Für Modal: Analysen laden
  const [dailyAnalyses, setDailyAnalyses] = useState([]);
  const [weeklyAnalyses, setWeeklyAnalyses] = useState([]);
  const [loadingAnalyses, setLoadingAnalyses] = useState(false);

  // Guest Mode
  const [showGuestModal, setShowGuestModal] = useState(false);

  useEffect(() => {
    loadChatHistory();
  }, []);

  // Aktualisiere Chat-Liste wenn Screen fokussiert wird (z.B. nach Rückkehr vom Chat)
  useFocusEffect(
    React.useCallback(() => {
      loadChatHistory();
    }, [])
  );

  const loadChatHistory = async () => {
    try {
      if (isGuestMode || !auth.currentUser) {
        setLoading(false);
        setChats([]);
        return;
      }

      const chatsQuery = query(
        collection(db, "chats"),
        where("userId", "==", auth.currentUser.uid)
      );

      const chatsSnap = await getDocs(chatsQuery);
      const chatsList = chatsSnap.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
        }))
        // Sortiere auf Client-Seite statt in der Query (vermeidet Index-Anforderung)
        .sort((a, b) => {
          const timeA = a.lastMessageAt?.toMillis() || 0;
          const timeB = b.lastMessageAt?.toMillis() || 0;
          return timeB - timeA; // Neueste zuerst
        });

      setChats(chatsList);
    } catch (err) {
      console.error("Fehler beim Laden der Chat-Historie:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalysesForModal = async () => {
    setLoadingAnalyses(true);
    try {
      if (!auth.currentUser) return;

      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      // 🔒 DATENSCHUTZ: Lade Tagesanalysen aus lokalem Storage
      const localEntries = await getLocalEntries(auth.currentUser.uid);

      console.log('🔍 DEBUG ChatHistory - Total entries:', localEntries?.length || 0);

      const daily = (localEntries || [])
        .filter(entry => {
          // Nur Einträge mit Analyse
          if (!entry.analysis) {
            console.log('❌ Gefiltert: Keine Analyse -', entry.localId?.substring(0, 10));
            return false;
          }

          // Verwende analysisDate wenn vorhanden, sonst createdAt
          const dateToCheck = entry.analysisDate || entry.createdAt;
          if (!dateToCheck) {
            console.log('❌ Gefiltert: Kein Datum -', entry.localId?.substring(0, 10));
            return false;
          }

          const analysisDate = new Date(dateToCheck);
          const isRecent = analysisDate >= fourteenDaysAgo;

          if (!isRecent) {
            console.log('❌ Gefiltert: Zu alt -', entry.localId?.substring(0, 10));
          } else {
            console.log('✅ Akzeptiert:', entry.localId?.substring(0, 10), 'Analyse:', entry.analysis?.substring(0, 50));
          }

          return isRecent;
        })
        .map(entry => ({
          id: entry.localId,
          ...entry,
          analysisDate: new Date(entry.analysisDate || entry.createdAt),
          createdAt: new Date(entry.createdAt)
        }))
        .sort((a, b) => b.analysisDate.getTime() - a.analysisDate.getTime());

      console.log('✅ Tagesanalysen für Modal:', daily.length);
      setDailyAnalyses(daily);

      // 🔒 DATENSCHUTZ: Lade Wochenanalysen aus lokalem Storage
      const localWeeklyAnalyses = await getLocalWeeklyAnalyses(auth.currentUser.uid);

      const weekly = (localWeeklyAnalyses || [])
        .filter(analysis => {
          if (!analysis.createdAt) return false;
          const analysisDate = new Date(analysis.createdAt);
          return analysisDate >= fourteenDaysAgo;
        })
        .map(analysis => ({
          id: analysis.localId,
          ...analysis,
          analysisDate: new Date(analysis.createdAt)
        }))
        .sort((a, b) => b.analysisDate.getTime() - a.analysisDate.getTime());

      setWeeklyAnalyses(weekly);
    } catch (err) {
      console.error("Fehler beim Laden der Analysen:", err);
    } finally {
      setLoadingAnalyses(false);
    }
  };

  const openNewChatModal = () => {
    if (isGuestMode) {
      setShowGuestModal(true);
      return;
    }
    setShowNewChatModal(true);
    loadAnalysesForModal();
  };

  const createNewChat = async (type, context, date, analysisId) => {
    try {
      if (!auth.currentUser) return;

      // Prüfe ob Chat-Historie gespeichert werden soll
      const chatHistoryEnabled = await AsyncStorage.getItem(`chatHistoryEnabled_${auth.currentUser.uid}`);

      if (chatHistoryEnabled === 'false') {
        Alert.alert(
          "Chat-Historie deaktiviert",
          "Du hast die Chat-Speicherung in den Einstellungen deaktiviert. Möchtest du trotzdem einen temporären Chat starten? Dieser wird nicht gespeichert.",
          [
            { text: "Abbrechen", style: "cancel" },
            {
              text: "Zu Einstellungen",
              onPress: () => {
                setShowNewChatModal(false);
                navigation.navigate("Settings");
              }
            },
            {
              text: "Temporär starten",
              onPress: () => {
                setShowNewChatModal(false);
                // Starte Chat ohne chatId (wird nicht gespeichert)
                navigation.navigate("Chat", { chatId: null, type, context, date });
              }
            }
          ]
        );
        return;
      }

      const chatDoc = await addDoc(collection(db, "chats"), {
        userId: auth.currentUser.uid,
        type, // "daily", "weekly", "all"
        context,
        date,
        analysisId,
        createdAt: Timestamp.now(),
        lastMessageAt: Timestamp.now(),
      });

      setShowNewChatModal(false);
      navigation.navigate("Chat", { chatId: chatDoc.id, type, context, date });
    } catch (err) {
      console.error("Fehler beim Erstellen des Chats:", err);
    }
  };

  const openChat = (chat) => {
    navigation.navigate("Chat", {
      chatId: chat.id,
      type: chat.type,
      context: chat.context,
      date: chat.date,
    });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unbekannt";
    const date = timestamp.toDate();
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <LinearGradient colors={["#EAF4FF", "#FFFFFF"]} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Ionicons name="chatbubbles" size={32} color="#007AFF" />
          <Text style={styles.headerTitle}>KI-Chat</Text>
          <Text style={styles.headerSubtitle}>Deine gespeicherten Gespräche</Text>
        </View>

        {/* Neuen Chat starten Button */}
        <TouchableOpacity
          style={styles.newChatButton}
          onPress={openNewChatModal}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.newChatButtonText}>Neuen Chat starten</Text>
        </TouchableOpacity>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Lade Chats...</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.container}>
            {chats.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={64} color="#C7C7CC" />
                <Text style={styles.emptyTitle}>Noch keine Chats</Text>
                <Text style={styles.emptySubtitle}>
                  Starte deinen ersten Chat mit dem Stimmungshelfer
                </Text>
              </View>
            ) : (
              chats.map((chat) => (
                <TouchableOpacity
                  key={chat.id}
                  style={styles.chatCard}
                  onPress={() => openChat(chat)}
                  activeOpacity={0.8}
                >
                  <View style={styles.chatIcon}>
                    <Ionicons
                      name={
                        chat.type === "all"
                          ? "calendar"
                          : chat.type === "weekly"
                          ? "bar-chart"
                          : "analytics"
                      }
                      size={24}
                      color="#007AFF"
                    />
                  </View>
                  <View style={styles.chatContent}>
                    <Text style={styles.chatTitle}>
                      {chat.type === "all"
                        ? "Alle letzten 14 Tage"
                        : chat.type === "weekly"
                        ? `Wochenanalyse`
                        : `Tagesanalyse`}
                    </Text>
                    <Text style={styles.chatDate}>{chat.date || formatDate(chat.createdAt)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#8E8E93" />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        )}

        {/* Modal: Neuen Chat erstellen */}
        <Modal
          visible={showNewChatModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowNewChatModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Neuen Chat starten</Text>
                <TouchableOpacity onPress={() => setShowNewChatModal(false)}>
                  <Ionicons name="close-circle" size={32} color="#8E8E93" />
                </TouchableOpacity>
              </View>

              {loadingAnalyses ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="large" color="#007AFF" />
                  <Text style={styles.loadingText}>Lade Analysen...</Text>
                </View>
              ) : (
                <ScrollView style={styles.modalScroll}>
                  {/* Option: Alle 14 Tage */}
                  <TouchableOpacity
                    style={styles.modalOption}
                    onPress={() => createNewChat("all", null, "Letzte 14 Tage", null)}
                  >
                    <Ionicons name="calendar" size={28} color="#007AFF" />
                    <View style={styles.modalOptionContent}>
                      <Text style={styles.modalOptionTitle}>Alle letzten 14 Tage</Text>
                      <Text style={styles.modalOptionSubtitle}>Gesamtüberblick aller Einträge</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="#8E8E93" />
                  </TouchableOpacity>

                  {/* Wochenanalysen */}
                  {weeklyAnalyses.length > 0 && (
                    <>
                      <Text style={styles.modalSectionTitle}>Wochenanalysen</Text>
                      {weeklyAnalyses.map((analysis) => {
                        // analysisDate ist bereits ein Date-Objekt (von mapping)
                        const date = analysis.analysisDate;
                        const dateStr = date instanceof Date
                          ? date.toLocaleDateString("de-DE", {
                              weekday: "short",
                              day: "2-digit",
                              month: "short",
                            })
                          : "Unbekannt";

                        return (
                          <TouchableOpacity
                            key={analysis.id}
                            style={styles.modalOption}
                            onPress={() =>
                              createNewChat("weekly", analysis.analysis, dateStr, analysis.id)
                            }
                          >
                            <Ionicons name="bar-chart" size={24} color="#007AFF" />
                            <View style={styles.modalOptionContent}>
                              <Text style={styles.modalOptionTitle}>Wochenanalyse</Text>
                              <Text style={styles.modalOptionSubtitle}>{dateStr}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
                          </TouchableOpacity>
                        );
                      })}
                    </>
                  )}

                  {/* Tagesanalysen */}
                  {dailyAnalyses.length > 0 && (
                    <>
                      <Text style={styles.modalSectionTitle}>Tagesanalysen</Text>
                      {dailyAnalyses.slice(0, 10).map((entry) => {
                        // analysisDate ist bereits ein Date-Objekt (von mapping)
                        const date = entry.analysisDate;
                        const dateStr = date instanceof Date
                          ? date.toLocaleDateString("de-DE", {
                              weekday: "short",
                              day: "2-digit",
                              month: "short",
                            })
                          : "Unbekannt";

                        return (
                          <TouchableOpacity
                            key={entry.id}
                            style={styles.modalOption}
                            onPress={() =>
                              createNewChat("daily", entry.analysis, dateStr, entry.id)
                            }
                          >
                            <Text style={styles.emotionIcon}>{entry.emotion}</Text>
                            <View style={styles.modalOptionContent}>
                              <Text style={styles.modalOptionTitle}>Tagesanalyse</Text>
                              <Text style={styles.modalOptionSubtitle}>
                                {dateStr} · {entry.feelScore}/99
                              </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
                          </TouchableOpacity>
                        );
                      })}
                    </>
                  )}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* Guest Mode Block Modal */}
        <GuestBlockModal
          visible={showGuestModal}
          onClose={() => setShowGuestModal(false)}
          onRegister={() => {
            setShowGuestModal(false);
            exitGuestMode();
          }}
          featureName="KI-Chat"
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  header: {
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
    backgroundColor: "#fff",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1C1C1E",
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "#8E8E93",
    marginTop: 4,
  },
  newChatButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#007AFF",
    marginHorizontal: 20,
    marginVertical: 16,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: "#007AFF",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  newChatButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: "#8E8E93",
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1C1C1E",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#8E8E93",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 40,
  },
  chatCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  chatIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  chatContent: {
    flex: 1,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 4,
  },
  chatDate: {
    fontSize: 14,
    color: "#8E8E93",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1C1C1E",
  },
  modalLoading: {
    paddingVertical: 60,
    alignItems: "center",
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1C1C1E",
    marginTop: 16,
    marginBottom: 12,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F9FC",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  modalOptionContent: {
    flex: 1,
    marginLeft: 12,
  },
  modalOptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 2,
  },
  modalOptionSubtitle: {
    fontSize: 14,
    color: "#8E8E93",
  },
  emotionIcon: {
    fontSize: 24,
  },
});
