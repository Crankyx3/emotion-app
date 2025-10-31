import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import { auth } from "../firebaseconfig";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";


WebBrowser.maybeCompleteAuthSession();

// Explizite Expo Auth Proxy URI für Development mit Expo Go
// Format: https://auth.expo.io/@username/slug
const redirectUri = "https://auth.expo.io/@Crankyx/ki-stimmungshelfer";
console.log("🔍 Redirect URI:", redirectUri);


const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // Google OAuth Konfiguration
  // Für Expo Go mit Auth Proxy verwenden wir nur den expoClientId (Web-Client)
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: "857177005519-ildp0badmtte1hmcavqbiue95fu6jqjr.apps.googleusercontent.com",
    redirectUri: redirectUri,
  });


  // 🧠 Firebase Auth-State Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setInitializing(false);
    });
    return unsub;
  }, []);

  // 🔐 Google Sign-In Erfolgshandler
  useEffect(() => {
    console.log("🔍 Google Response:", JSON.stringify(response, null, 2));

    if (response?.type === "success") {
      console.log("✅ Google Response erfolgreich!");
      const { id_token } = response.params;
      if (!id_token) {
        console.error("⚠️ Kein id_token erhalten!");
        console.log("Response params:", response.params);
        return;
      }
      console.log("🎫 ID Token erhalten, erstelle Credential...");
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential)
        .then((result) => console.log("✅ Google Login erfolgreich:", result.user.email))
        .catch((error) => {
          console.error("❌ Google Login Fehler:", error);
          console.error("Error code:", error.code);
          console.error("Error message:", error.message);
        });
    } else if (response?.type === "error") {
      console.error("❌ Google Auth Fehler:", response.error);
      console.error("Error params:", response.params);
    } else if (response?.type === "cancel") {
      console.log("⚠️ Google Login abgebrochen");
    }
  }, [response]);

  // 📦 Auth-Funktionen
  const signIn = (email, password) => signInWithEmailAndPassword(auth, email, password);
  const signUp = (email, password) => createUserWithEmailAndPassword(auth, email, password);
  const handleSignOut = () => signOut(auth);
  const signInWithGoogle = () => promptAsync();

  // 🧩 Kontext-Provider
  return (
    <AuthContext.Provider
      value={{
        user,
        initializing,
        signIn,
        signUp,
        signOut: handleSignOut,
        signInWithGoogle,
        googleLoading: !request,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
