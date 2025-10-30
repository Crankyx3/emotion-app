import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../components/AuthProvider";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebaseconfig";

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login"); // 'login' | 'signup'
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  // Übersetze Firebase-Fehler ins Deutsche
  const getErrorMessage = (errorCode) => {
    switch (errorCode) {
      case "auth/invalid-email":
        return "Die E-Mail-Adresse ist ungültig.";
      case "auth/user-disabled":
        return "Dieser Account wurde deaktiviert.";
      case "auth/user-not-found":
        return "Kein Account mit dieser E-Mail gefunden.";
      case "auth/wrong-password":
        return "Falsches Passwort.";
      case "auth/email-already-in-use":
        return "Diese E-Mail wird bereits verwendet.";
      case "auth/weak-password":
        return "Das Passwort muss mindestens 6 Zeichen lang sein.";
      case "auth/too-many-requests":
        return "Zu viele Versuche. Bitte später erneut versuchen.";
      case "auth/network-request-failed":
        return "Netzwerkfehler. Bitte Internetverbindung prüfen.";
      case "auth/invalid-credential":
        return "Ungültige Anmeldedaten. Bitte E-Mail und Passwort überprüfen.";
      default:
        return "Ein Fehler ist aufgetreten. Bitte erneut versuchen.";
    }
  };

  const handlePress = async () => {
    // Reset error
    setError("");

    // Validation
    if (!email || !password) {
      setError("Bitte E-Mail und Passwort eingeben.");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Bitte gültige E-Mail-Adresse eingeben.");
      return;
    }

    // Password length check
    if (password.length < 6) {
      setError("Das Passwort muss mindestens 6 Zeichen lang sein.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password);
        Alert.alert(
          "Erfolg! 🎉",
          "Dein Account wurde erstellt. Du bist jetzt angemeldet!"
        );
      }
    } catch (err) {
      console.error("Auth error:", err);
      const errorMsg = getErrorMessage(err.code);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      Alert.alert(
        "E-Mail eingeben",
        "Bitte gib zuerst deine E-Mail-Adresse ein."
      );
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert(
        "Ungültige E-Mail",
        "Bitte gib eine gültige E-Mail-Adresse ein."
      );
      return;
    }

    Alert.alert(
      "Passwort zurücksetzen",
      `Eine E-Mail zum Zurücksetzen wird an ${email} gesendet.`,
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Senden",
          onPress: async () => {
            try {
              await sendPasswordResetEmail(auth, email.trim());
              Alert.alert(
                "E-Mail versendet! 📧",
                "Bitte überprüfe dein Postfach und folge den Anweisungen."
              );
            } catch (err) {
              const errorMsg = getErrorMessage(err.code);
              Alert.alert("Fehler", errorMsg);
            }
          },
        },
      ]
    );
  };

  return (
    <LinearGradient colors={["#EAF4FF", "#FFFFFF"]} style={styles.bg}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconCircle}>
                <Ionicons name="happy-outline" size={40} color="#007AFF" />
              </View>
              <Text style={styles.title}>KI-Stimmungshelfer</Text>
              <Text style={styles.subtitle}>
                {mode === "login"
                  ? "Willkommen zurück!"
                  : "Erstelle deinen Account"}
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Error Message */}
              {error ? (
                <View style={styles.errorContainer}>
                  <Ionicons
                    name="alert-circle"
                    size={20}
                    color="#ff3b30"
                    style={styles.errorIcon}
                  />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Email Input */}
              <Text style={styles.label}>E-Mail</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color="#8E8E93"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setError(""); // Clear error on input
                  }}
                  placeholder="deine@email.de"
                  placeholderTextColor="#C7C7CC"
                />
              </View>

              {/* Password Input */}
              <Text style={[styles.label, { marginTop: 16 }]}>Passwort</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#8E8E93"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setError(""); // Clear error on input
                  }}
                  placeholder="Mindestens 6 Zeichen"
                  placeholderTextColor="#C7C7CC"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#8E8E93"
                  />
                </TouchableOpacity>
              </View>

              {/* Forgot Password (nur im Login-Modus) */}
              {mode === "login" && (
                <TouchableOpacity
                  onPress={handlePasswordReset}
                  style={styles.forgotPassword}
                >
                  <Text style={styles.forgotPasswordText}>
                    Passwort vergessen?
                  </Text>
                </TouchableOpacity>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.button,
                  loading && styles.buttonDisabled,
                ]}
                onPress={handlePress}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>
                    {mode === "login" ? "Anmelden" : "Registrieren"}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Mode Switch */}
              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>
                  {mode === "login"
                    ? "Noch kein Account?"
                    : "Schon einen Account?"}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setMode(mode === "login" ? "signup" : "login");
                    setError("");
                  }}
                >
                  <Text style={styles.switchText}>
                    {mode === "login" ? "Registrieren" : "Anmelden"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1C1C1E",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#8E8E93",
  },
  form: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffebee",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#ff3b30",
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    color: "#ff3b30",
    fontSize: 14,
    flex: 1,
    fontWeight: "500",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E5E5EA",
    borderRadius: 12,
    backgroundColor: "#F9F9F9",
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    padding: 14,
    fontSize: 16,
    color: "#1C1C1E",
  },
  eyeIcon: {
    padding: 8,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginTop: 8,
    marginBottom: 8,
  },
  forgotPasswordText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "500",
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 24,
    shadowColor: "#007AFF",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  switchLabel: {
    color: "#8E8E93",
    fontSize: 14,
    marginRight: 4,
  },
  switchText: {
    color: "#007AFF",
    fontWeight: "600",
    fontSize: 14,
  },
});
