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
console.log("🔍 Redirect URI:", AuthSession.makeRedirectUri({ useProxy: true }));


const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // Google OAuth Konfiguration
  // Für Expo Go brauchen wir iOS, Android UND Expo Client IDs
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: "857177005519-ildp0badmtte1hmcavqbiue95fu6jqjr.apps.googleusercontent.com",
    iosClientId: "857177005519-ildp0badmtte1hmcavqbiue95fu6jqjr.apps.googleusercontent.com",
    androidClientId: "857177005519-ildp0badmtte1hmcavqbiue95fu6jqjr.apps.googleusercontent.com",
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
    if (response?.type === "success") {
      const { id_token } = response.params;
      if (!id_token) return console.error("⚠️ Kein id_token erhalten!");
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential)
        .then((result) => console.log("✅ Google Login erfolgreich:", result.user.email))
        .catch((error) => console.error("❌ Google Login Fehler:", error));
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
