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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { getAiResponse } from "../openaiService";
import { useNavigation } from "@react-navigation/native";

export default function ChatScreen({ route }) {
  const navigation = useNavigation();
  const { context } = route.params || {}; // Analyse-Text als Kontext

  const [messages, setMessages] = useState(
    context ? [{ sender: "ai", text: "Hier ist deine Analyse:\n\n" + context }] : []
  );
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userText = input.trim();
    const newMsg = { sender: "user", text: userText };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");

    try {
      const prompt = `
Der Nutzer führt ein psychologisches Reflexionsgespräch basierend auf der Analyse:

${context || "Keine Analyse verfügbar."}

Sei empathisch, kurz und unterstützend. Antworte auf diese Nachricht:
"${userText}"
`;
      const reply = await getAiResponse("Reflexionschat", prompt);
      setMessages((prev) => [...prev, { sender: "ai", text: reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { sender: "ai", text: "Fehler bei der Antwort 😕" }]);
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
              Kurz, empathisch, unterstützend
            </Text>
          </View>
        </View>

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
