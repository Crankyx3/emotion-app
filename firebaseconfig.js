// firebaseconfig.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { 
  getAuth, 
  initializeAuth,
  getReactNativePersistence 
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyD6_uq0RO7CPlTbZ-WbOM012rspn3awmxU",
  authDomain: "emotionapp-35448.firebaseapp.com",
  projectId: "emotionapp-35448",
  storageBucket: "emotionapp-35448.appspot.com",
  messagingSenderId: "857177005519",
  appId: "1:857177005519:web:20041f4e9700d7acb586ba",
};

// Initialize Firebase
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  console.log("✅ Firebase App initialisiert");
} else {
  app = getApp();
  console.log("✅ Firebase App bereits vorhanden");
}

// Initialize Firestore
export const db = getFirestore(app);
console.log("✅ Firestore initialisiert");

// Initialize Auth mit Try-Catch für besseres Debugging
let auth;
try {
  // Versuche erst, ob auth bereits existiert
  auth = getAuth(app);
  console.log("✅ Auth mit getAuth() initialisiert");
} catch (error) {
  console.log("⚠️ getAuth() fehlgeschlagen, versuche initializeAuth()...");
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
    console.log("✅ Auth mit initializeAuth() initialisiert");
  } catch (initError) {
    console.error("❌ Auth Initialisierung fehlgeschlagen:", initError);
    // Fallback: einfaches getAuth ohne Persistence
    auth = getAuth(app);
    console.log("⚠️ Fallback: Auth ohne Persistence");
  }
}

export { auth };

console.log("📊 Firebase Status:", {
  appName: app.name,
  projectId: firebaseConfig.projectId,
  authInitialized: !!auth,
});