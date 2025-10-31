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

WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // Google OAuth Config
  // WICHTIG: Diese Web Client ID muss aus der Firebase Console kommen!
  // Firebase Console > Authentication > Sign-in method > Google > Web SDK configuration
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: "857177005519-ildp0badmtte1hmcavqbiue95fu6jqjr.apps.googleusercontent.com", // TODO: Ersetzen!
    iosClientId: "857177005519-ildp0badmtte1hmcavqbiue95fu6jqjr.apps.googleusercontent.com", // Optional
    androidClientId: "857177005519-YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com", // Optional
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setInitializing(false);
    });
    return unsub;
  }, []);

  // Handle Google Sign-In Response
  useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential)
        .then((result) => {
          console.log("✅ Google Sign-In erfolgreich:", result.user.email);
        })
        .catch((error) => {
          console.error("❌ Google Sign-In Fehler:", error);
        });
    }
  }, [response]);

  const signIn = (email, password) => signInWithEmailAndPassword(auth, email, password);
  const signUp = (email, password) => createUserWithEmailAndPassword(auth, email, password);
  const handleSignOut = () => signOut(auth);
  const signInWithGoogle = () => promptAsync();

  return (
    <AuthContext.Provider value={{
      user,
      initializing,
      signIn,
      signUp,
      signOut: handleSignOut,
      signInWithGoogle,
      googleLoading: !request,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
