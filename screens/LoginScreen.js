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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import ScreenHeader from "../components/ScreenHeader";
import { useAuth } from "../components/AuthProvider";

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login"); // 'login' | 'signup'

  const handlePress = async () => {
    if (!email || !password) {
      Alert.alert("Fehler", "Bitte E‑Mail und Passwort eingeben.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password);
      }
    } catch (err) {
      Alert.alert("Fehler", err.message || "Authentifizierung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#F6FBFF", "#FFFFFF"]} style={styles.bg}>
      <SafeAreaView style={styles.container}>
        <ScreenHeader
          title={mode === "login" ? "Anmelden" : "Registrieren"}
          subtitle="Mit E‑Mail und Passwort"
        />

        <View style={styles.form}>
          <Text style={styles.label}>E‑Mail</Text>
          <TextInput style={styles.input} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />

          <Text style={[styles.label, { marginTop: 12 }]}>Passwort</Text>
          <TextInput style={styles.input} secureTextEntry value={password} onChangeText={setPassword} />

          <TouchableOpacity style={styles.button} onPress={handlePress} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{mode === "login" ? "Anmelden" : "Registrieren"}</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setMode(mode === "login" ? "signup" : "login")} style={styles.switch}>
            <Text style={styles.switchText}>
              {mode === "login" ? "Noch keinen Account? Registrieren" : "Schon einen Account? Anmelden"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  container: { flex: 1, padding: 20 },
  form: { marginTop: 20, backgroundColor: "#fff", borderRadius: 12, padding: 16, elevation: 2 },
  label: { fontSize: 13, color: "#666", marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#eef3fb", borderRadius: 10, padding: 10, backgroundColor: "#fafcff" },
  button: { marginTop: 18, backgroundColor: "#007aff", padding: 14, borderRadius: 12, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700" },
  switch: { marginTop: 12, alignItems: "center" },
  switchText: { color: "#007aff" },
});