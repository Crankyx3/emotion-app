import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { getAiResponse } from "../openaiService";
import { useNavigation } from "@react-navigation/native";
import { collection, getDocs, query, where, addDoc, Timestamp } from "firebase/firestore";
import { db, auth } from "../firebaseconfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ChatScreen({ route }) {
  const navigation = useNavigation();
  const { context, type, date } = route.params || {};
  // context = Analyse-Text
  // type = "daily", "weekly", "all"
  // date = Datum der Analyse

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

  // Erweiterte States
  const [historicalContext, setHistoricalContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatCount, setChatCount] = useState(0);
  const [canChat, setCanChat] = useState(true);
  const [chatMode, setChatMode] = useState(type || "single"); // "single" oder "all"

  // Rate Limiting: 10 Chats pro Tag
  const DAILY_CHAT_LIMIT = 10;

  const checkChatLimit = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const key = `chatCount_${auth.currentUser.uid}_${today}`;
      const stored = await AsyncStorage.getItem(key);
      const count = stored ? parseInt(stored) : 0;

      setChatCount(count);
      setCanChat(count < DAILY_CHAT_LIMIT);

      return count < DAILY_CHAT_LIMIT;
    } catch (err) {
      console.error("Fehler beim Prüfen des Chat-Limits:", err);
      return true; // Im Fehlerfall: erlauben
    }
  };

  const incrementChatCount = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const key = `chatCount_${auth.currentUser.uid}_${today}`;
      const newCount = chatCount + 1;
      await AsyncStorage.setItem(key, newCount.toString());
      setChatCount(newCount);
      setCanChat(newCount < DAILY_CHAT_LIMIT);
    } catch (err) {
      console.error("Fehler beim Speichern des Chat-Counts:", err);
    }
  };

  // Initialisiere Chat basierend auf Modus
  const initializeChat = async () => {
    try {
      if (chatMode === "all") {
        // Modus: Alle Analysen der letzten 14 Tage
        const contextData = await loadHistoricalContext();

        if (contextData && contextData.entriesCount > 0) {
          // Erstelle Zusammenfassung mit KI
          const summaryPrompt = `
Du bist ein psychologischer Therapeut. Erstelle eine prägnante Zusammenfassung der letzten 14 Tage dieser Person.

📊 VERFÜGBARE DATEN:
**${contextData.entriesCount} Tageseinträge:**
${contextData.entriesSummary}

**${contextData.analysesCount} Wochenanalysen:**
${contextData.analysesSummary}

Erstelle eine kurze Zusammenfassung (3-4 Sätze) die:
1. Die allgemeine Stimmungslage beschreibt
2. Wichtige Muster oder Trends nennt
3. Mit einer Frage endet, um das Gespräch zu öffnen

Sei empathisch und einladend.
`;

          const summary = await getAiResponse("Zusammenfassung 14 Tage", summaryPrompt);
          setMessages([{ sender: "ai", text: summary }]);
        } else {
          setMessages([{ sender: "ai", text: "Ich konnte keine Einträge der letzten 14 Tage finden. Erstelle zuerst einige Tageseinträge und Analysen." }]);
        }
      } else {
        // Modus: Einzelne Analyse
        const analysisTypeText = type === "weekly" ? "Wochenanalyse" : "Tagesanalyse";
        const introText = `Hier ist deine ${analysisTypeText} vom ${date}:\n\n${context}\n\nWas möchtest du darüber wissen oder besprechen?`;
        setMessages([{ sender: "ai", text: introText }]);

        // Keine historischen Daten laden
        setHistoricalContext(null);
      }
    } catch (err) {
      console.error("Fehler beim Initialisieren:", err);
      setMessages([{ sender: "ai", text: "Entschuldigung, es gab einen Fehler beim Laden. Wie kann ich dir helfen?" }]);
    } finally {
      setLoading(false);
    }
  };

  // Lade historischen Kontext (nur für "all" Modus)
  const loadHistoricalContext = async () => {
    if (!auth.currentUser) return null;

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // Lade Einträge der letzten 14 Tage
    const entriesQuery = query(
      collection(db, "entries"),
      where("userId", "==", auth.currentUser.uid)
    );
    const entriesSnap = await getDocs(entriesQuery);

    const recentEntries = entriesSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(entry => {
        if (!entry.createdAt) return false;
        const entryDate = entry.createdAt.toDate();
        return entryDate >= fourteenDaysAgo;
      })
      .sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());

    // Lade alle Analysen
    const analysesQuery = query(
      collection(db, "weeklyAnalyses"),
      where("userId", "==", auth.currentUser.uid)
    );
    const analysesSnap = await getDocs(analysesQuery);

    const recentAnalyses = analysesSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(analysis => {
        if (!analysis.analysisDate) return false;
        const analysisDate = analysis.analysisDate.toDate();
        return analysisDate >= fourteenDaysAgo;
      })
      .sort((a, b) => b.analysisDate.toMillis() - a.analysisDate.toMillis());

    // Erstelle kompakte Zusammenfassung (Token-Optimierung)
    const entriesSummary = recentEntries.map(e => {
      const date = e.createdAt.toDate().toLocaleDateString("de-DE");
      return `${date}: ${e.emotion} (${e.feelScore}/99)${e.theme ? ` - ${e.theme}` : ''}${e.text ? ` - "${e.text.substring(0, 100)}..."` : ''}`;
    }).join('\n');

    const analysesSummary = recentAnalyses.map(a => {
      const date = a.analysisDate.toDate().toLocaleDateString("de-DE");
      return `Wochenanalyse vom ${date}: ${a.analysis?.substring(0, 200)}...`;
    }).join('\n\n');

    const contextData = {
      entriesCount: recentEntries.length,
      analysesCount: recentAnalyses.length,
      entriesSummary,
      analysesSummary,
    };

    setHistoricalContext(contextData);
    return contextData;
  };

  useEffect(() => {
    initializeChat();
    checkChatLimit();
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;

    // Prüfe Chat-Limit
    if (!canChat) {
      Alert.alert(
        "Chat-Limit erreicht",
        `Du hast heute bereits ${chatCount} von ${DAILY_CHAT_LIMIT} möglichen Chat-Nachrichten genutzt. Das Limit wird um Mitternacht zurückgesetzt.`,
        [{ text: "OK" }]
      );
      return;
    }

    const userText = input.trim();
    const newMsg = { sender: "user", text: userText };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");

    try {
      let prompt;

      if (chatMode === "all") {
        // Modus: Alle 14 Tage
        prompt = `
Du bist ein einfühlsamer psychologischer Therapeut im Gespräch mit einem Klienten.

📋 VERFÜGBARER KONTEXT (letzte 14 Tage):

**${historicalContext?.entriesCount || 0} Tageseinträge:**
${historicalContext?.entriesSummary || "Keine Einträge verfügbar."}

**${historicalContext?.analysesCount || 0} Wochenanalysen:**
${historicalContext?.analysesSummary || "Keine früheren Analysen verfügbar."}

🎯 GESPRÄCHSFÜHRUNG:
- Beziehe dich auf Muster aus den vergangenen 14 Tagen
- Erkenne Zusammenhänge zwischen verschiedenen Einträgen
- Stelle hilfreiche Reflexionsfragen
- Gib konkrete, umsetzbare Vorschläge
- Sei empathisch und validierend
- Halte Antworten kurz (2-4 Sätze) aber tiefgehend

💬 AKTUELLE NACHRICHT DES NUTZERS:
"${userText}"

Antworte empathisch, therapeutisch fundiert und auf den gesamten Kontext bezogen.
`;
      } else {
        // Modus: Einzelne Analyse
        const analysisTypeText = type === "weekly" ? "Wochenanalyse" : "Tagesanalyse";
        prompt = `
Du bist ein einfühlsamer psychologischer Therapeut im Gespräch mit einem Klienten.

📋 KONTEXT:
Der Nutzer hat eine ${analysisTypeText} vom ${date} ausgewählt und spricht darüber.

**Die Analyse:**
${context || "Keine Analyse verfügbar."}

🎯 GESPRÄCHSFÜHRUNG:
- Beziehe dich auf diese SPEZIFISCHE Analyse
- Hilf beim Vertiefen der Erkenntnisse
- Stelle Reflexionsfragen zu den genannten Themen
- Gib konkrete Handlungsempfehlungen basierend auf der Analyse
- Sei empathisch und validierend
- Halte Antworten kurz (2-4 Sätze) aber tiefgehend

💬 AKTUELLE NACHRICHT DES NUTZERS:
"${userText}"

Antworte empathisch und beziehe dich konkret auf die Analyse.
`;
      }

      const reply = await getAiResponse("Therapeutischer Chat", prompt);
      setMessages((prev) => [...prev, { sender: "ai", text: reply }]);

      // Zähle Chat-Nachricht
      await incrementChatCount();

      // Optional: Speichere Chat-Verlauf in Firestore für spätere Analyse
      await addDoc(collection(db, "chatMessages"), {
        userId: auth.currentUser.uid,
        userMessage: userText,
        aiResponse: reply,
        timestamp: Timestamp.now(),
      });

    } catch (err) {
      console.error("Chat-Fehler:", err);
      setMessages((prev) => [...prev, { sender: "ai", text: "Entschuldigung, es gab einen Fehler. Bitte versuche es erneut." }]);
    }
  };

  useEffect(() => {
    // immer ans Ende scrollen, wenn Messages sich ändern
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  return (
    <LinearGradient colors={["#EAF4FF", "#FFFFFF"]} style={styles.gradient}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Topbar mit Zurück-Button */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text numberOfLines={1} style={styles.headerTitle}>
              Reflexions-Chat
            </Text>
            <Text numberOfLines={1} style={styles.headerSubtitle}>
              {loading ? "Lade Kontext..." : `${chatCount}/${DAILY_CHAT_LIMIT} Nachrichten heute`}
            </Text>
          </View>
        </View>

        {/* Kontext-Info Card */}
        {!loading && (
          <View style={styles.contextInfo}>
            <Ionicons name="information-circle" size={18} color="#007AFF" />
            <Text style={styles.contextText}>
              {chatMode === "all" && historicalContext
                ? `${historicalContext.entriesCount} Einträge · ${historicalContext.analysesCount} Analysen geladen`
                : `${type === "weekly" ? "Wochenanalyse" : "Tagesanalyse"} vom ${date}`
              }
            </Text>
          </View>
        )}

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Lade deine Daten der letzten 14 Tage...</Text>
          </View>
        )}

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.chatContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((msg, i) => (
              <View
                key={i}
                style={[
                  styles.msgRow,
                  msg.sender === "user" ? styles.msgRowUser : styles.msgRowAi,
                ]}
              >
                <View
                  style={[
                    styles.msgBubble,
                    msg.sender === "user" ? styles.userBubble : styles.aiBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.msgText,
                      msg.sender === "user" ? styles.userText : styles.aiText,
                    ]}
                  >
                    {msg.text}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Schreib deine Gedanken..."
              value={input}
              onChangeText={setInput}
              multiline
              returnKeyType="send"
              onSubmitEditing={sendMessage}
            />
            <TouchableOpacity
              onPress={sendMessage}
              style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
              disabled={!input.trim()}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: "#e6e6e6",
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    paddingLeft: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  contextInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#BBDEFB",
  },
  contextText: {
    fontSize: 13,
    color: "#1976D2",
    marginLeft: 8,
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: "#666",
    textAlign: "center",
  },
  chatContainer: {
    padding: 16,
    paddingBottom: 12,
  },
  msgRow: {
    flexDirection: "row",
    marginVertical: 6,
  },
  msgRowUser: {
    justifyContent: "flex-end",
  },
  msgRowAi: {
    justifyContent: "flex-start",
  },
  msgBubble: {
    maxWidth: "82%",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  userBubble: {
    backgroundColor: "#007AFF",
    borderBottomRightRadius: 6,
  },
  aiBubble: {
    backgroundColor: "#f1f1f1",
    borderBottomLeftRadius: 6,
  },
  msgText: { fontSize: 15, lineHeight: 20 },
  userText: { color: "#fff" },
  aiText: { color: "#222" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 15,
    backgroundColor: "#fafafa",
  },
  sendButton: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 50,
    marginLeft: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#9fc9ff",
  },
});
