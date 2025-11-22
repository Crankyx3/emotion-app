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
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs, query, where, addDoc, Timestamp, deleteDoc, doc, updateDoc } from "firebase/firestore";
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

  // Chat-Aktionen (Löschen, Umbenennen)
  const [selectedChat, setSelectedChat] = useState(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newChatName, setNewChatName] = useState("");

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

      const daily = (localEntries || [])
        .filter(entry => {
          // Nur Einträge mit Analyse
          if (!entry.analysis) return false;

          // Verwende analysisDate wenn vorhanden, sonst createdAt
          const dateToCheck = entry.analysisDate || entry.createdAt;
          if (!dateToCheck) return false;

          const analysisDate = new Date(dateToCheck);
          return analysisDate >= fourteenDaysAgo;
        })
        .map(entry => ({
          id: entry.localId,
          ...entry,
          analysisDate: new Date(entry.analysisDate || entry.createdAt),
          createdAt: new Date(entry.createdAt)
        }))
        .sort((a, b) => b.analysisDate.getTime() - a.analysisDate.getTime());

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

  const openChatOptions = (chat, e) => {
    e.stopPropagation();
    setSelectedChat(chat);
    setShowOptionsModal(true);
  };

  const deleteChat = async () => {
    try {
      if (!selectedChat) return;

      Alert.alert(
        "Chat löschen?",
        "Dieser Chat wird unwiderruflich gelöscht.",
        [
          { text: "Abbrechen", style: "cancel" },
          {
            text: "Löschen",
            style: "destructive",
            onPress: async () => {
              await deleteDoc(doc(db, "chats", selectedChat.id));
              setShowOptionsModal(false);
              setSelectedChat(null);
              loadChatHistory();
            }
          }
        ]
      );
    } catch (err) {
      console.error("Fehler beim Löschen:", err);
      Alert.alert("Fehler", "Der Chat konnte nicht gelöscht werden.");
    }
  };

  const openRenameModal = () => {
    setShowOptionsModal(false);
    setNewChatName(selectedChat?.customName || "");
    setShowRenameModal(true);
  };

  const renameChat = async () => {
    try {
      if (!selectedChat || !newChatName.trim()) return;

      await updateDoc(doc(db, "chats", selectedChat.id), {
        customName: newChatName.trim()
      });

      setShowRenameModal(false);
      setSelectedChat(null);
      setNewChatName("");
      loadChatHistory();
    } catch (err) {
      console.error("Fehler beim Umbenennen:", err);
      Alert.alert("Fehler", "Der Chat konnte nicht umbenannt werden.");
    }
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
                      {chat.customName || (
                        chat.type === "all"
                          ? "Alle letzten 14 Tage"
                          : chat.type === "weekly"
                          ? `Wochenanalyse`
                          : `Tagesanalyse`
                      )}
                    </Text>
                    <Text style={styles.chatDate}>{chat.date || formatDate(chat.createdAt)}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={(e) => openChatOptions(chat, e)}
                    style={styles.chatOptionsButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="ellipsis-vertical" size={20} color="#8E8E93" />
                  </TouchableOpacity>
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

        {/* Chat-Optionen Modal */}
        <Modal
          visible={showOptionsModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowOptionsModal(false)}
        >
          <TouchableOpacity
            style={styles.optionsModalOverlay}
            activeOpacity={1}
            onPress={() => setShowOptionsModal(false)}
          >
            <View style={styles.optionsModalContent}>
              <Text style={styles.optionsModalTitle}>Chat-Aktionen</Text>

              <TouchableOpacity
                style={styles.optionButton}
                onPress={openRenameModal}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={24} color="#007AFF" />
                <Text style={styles.optionButtonText}>Umbenennen</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionButton, styles.deleteButton]}
                onPress={deleteChat}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={24} color="#E03131" />
                <Text style={[styles.optionButtonText, styles.deleteButtonText]}>Löschen</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowOptionsModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Abbrechen</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Umbenennen Modal */}
        <Modal
          visible={showRenameModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowRenameModal(false)}
        >
          <TouchableOpacity
            style={styles.optionsModalOverlay}
            activeOpacity={1}
            onPress={() => setShowRenameModal(false)}
          >
            <TouchableOpacity
              style={styles.renameModalContent}
              activeOpacity={1}
            >
              <Text style={styles.renameModalTitle}>Chat umbenennen</Text>

              <TextInput
                style={styles.renameInput}
                placeholder="Neuer Name..."
                placeholderTextColor="#8E8E93"
                value={newChatName}
                onChangeText={setNewChatName}
                autoFocus={true}
              />

              <View style={styles.renameModalButtons}>
                <TouchableOpacity
                  style={[styles.renameButton, styles.renameButtonCancel]}
                  onPress={() => {
                    setShowRenameModal(false);
                    setNewChatName("");
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.renameButtonCancelText}>Abbrechen</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.renameButton, styles.renameButtonSave]}
                  onPress={renameChat}
                  activeOpacity={0.7}
                >
                  <Text style={styles.renameButtonSaveText}>Speichern</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
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
  chatOptionsButton: {
    padding: 8,
    marginLeft: 8,
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
  // Chat-Optionen Modal
  optionsModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  optionsModalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 340,
  },
  optionsModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 16,
    textAlign: "center",
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F9FC",
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  deleteButton: {
    backgroundColor: "#FFEBEE",
  },
  optionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
    marginLeft: 12,
  },
  deleteButtonText: {
    color: "#E03131",
  },
  cancelButton: {
    backgroundColor: "#F7F9FC",
    padding: 16,
    borderRadius: 12,
    marginTop: 6,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#8E8E93",
  },
  // Umbenennen Modal
  renameModalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 340,
  },
  renameModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 16,
    textAlign: "center",
  },
  renameInput: {
    backgroundColor: "#F7F9FC",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#1C1C1E",
    borderWidth: 1.5,
    borderColor: "#E5E5EA",
    marginBottom: 20,
  },
  renameModalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  renameButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  renameButtonCancel: {
    backgroundColor: "#F7F9FC",
  },
  renameButtonCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#8E8E93",
  },
  renameButtonSave: {
    backgroundColor: "#007AFF",
  },
  renameButtonSaveText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
