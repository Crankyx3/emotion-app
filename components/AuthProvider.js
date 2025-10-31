import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import { auth, db } from "../firebaseconfig";
import { doc, setDoc, getDoc } from "firebase/firestore";
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
  const [userName, setUserName] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // Google OAuth Konfiguration
  // Für Expo Go mit Auth Proxy verwenden wir die Web-Client-ID für alle Plattformen
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: "857177005519-ildp0badmtte1hmcavqbiue95fu6jqjr.apps.googleusercontent.com",
    iosClientId: "857177005519-ildp0badmtte1hmcavqbiue95fu6jqjr.apps.googleusercontent.com",
    androidClientId: "857177005519-ildp0badmtte1hmcavqbiue95fu6jqjr.apps.googleusercontent.com",
    redirectUri: redirectUri,
  });


  // 🧠 Firebase Auth-State Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      // Lade den Namen des Users aus Firestore
      if (u) {
        try {
          const userDoc = await getDoc(doc(db, "users", u.uid));
          if (userDoc.exists()) {
            setUserName(userDoc.data().name);
          }
        } catch (error) {
          console.error("Fehler beim Laden des Namens:", error);
        }
      } else {
        setUserName(null);
      }

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

  const signUp = async (email, password, name) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    // Speichere den Namen in Firestore
    await setDoc(doc(db, "users", userCredential.user.uid), {
      name: name,
      email: email,
      createdAt: new Date().toISOString(),
    });

    setUserName(name);
    return userCredential;
  };

  const handleSignOut = () => signOut(auth);
  const signInWithGoogle = async () => {
    console.log("🚀 Google Login Button gedrückt");
    console.log("📋 Request verfügbar:", !!request);
    try {
      const result = await promptAsync();
      console.log("📥 PromptAsync Ergebnis:", JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error("❌ PromptAsync Fehler:", error);
      throw error;
    }
  };

  // 🧩 Kontext-Provider
  return (
    <AuthContext.Provider
      value={{
        user,
        userName,
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
