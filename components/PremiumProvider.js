import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebaseconfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

const PremiumContext = createContext();

export const usePremium = () => {
  const context = useContext(PremiumContext);
  if (!context) {
    throw new Error('usePremium must be used within PremiumProvider');
  }
  return context;
};

// Hole eindeutige Device ID
const getDeviceId = async () => {
  try {
    if (Platform.OS === 'ios') {
      // iOS: IDFV (Identifier for Vendor)
      const idfv = await Application.getIosIdForVendorAsync();
      return idfv || 'unknown-ios-device';
    } else if (Platform.OS === 'android') {
      // Android: Android ID
      const androidId = Application.androidId;
      return androidId || 'unknown-android-device';
    } else {
      // Web/andere Plattformen: Fallback
      return 'unknown-device';
    }
  } catch (error) {
    console.error('Error getting device ID:', error);
    return 'fallback-device-id';
  }
};

export const PremiumProvider = ({ children }) => {
  const [isPremium, setIsPremium] = useState(false);
  const [isTrialActive, setIsTrialActive] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check trial beim App-Start (auch ohne Login)
    checkTrialStatus();

    // Warte auf Firebase Auth State für Premium-Status
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        checkPremiumStatus();
      } else {
        setLoading(false);
        setIsPremium(false);
        // Trial bleibt aktiv auch ohne Login
      }
    });

    return () => unsubscribe();
  }, []);

  // Prüfe Trial-Status (Device-gebunden)
  const checkTrialStatus = async () => {
    try {
      const deviceId = await getDeviceId();
      console.log('📱 Device ID:', deviceId);

      // Prüfe Trial-Status für dieses GERÄT
      const trialStartDate = await AsyncStorage.getItem(`trialStartDate_${deviceId}`);

      if (!trialStartDate) {
        // Neues Gerät - starte 5-Tage Trial SOFORT
        const now = new Date().toISOString();
        await AsyncStorage.setItem(`trialStartDate_${deviceId}`, now);
        console.log('🎉 Trial gestartet für neues Gerät! 5 Tage verfügbar');

        setIsTrialActive(true);
        setTrialDaysLeft(5);
        return;
      }

      // Berechne verbleibende Trial-Tage
      const startDate = new Date(trialStartDate);
      const now = new Date();
      const diffTime = now - startDate;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const daysLeft = Math.max(0, 5 - diffDays);

      console.log(`⏰ Trial Status (Device): ${diffDays} Tage vergangen, ${daysLeft} Tage übrig`);

      if (daysLeft > 0) {
        setIsTrialActive(true);
        setTrialDaysLeft(daysLeft);
      } else {
        console.log('❌ Trial abgelaufen (Device)');
        setIsTrialActive(false);
        setTrialDaysLeft(0);
      }
    } catch (error) {
      console.error('Error checking trial status:', error);
    }
  };

  const checkPremiumStatus = async () => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    try {
      const userId = auth.currentUser.uid;
      console.log('🔍 Checking premium status for user:', userId);

      // Prüfe Premium-Status (Account-gebunden)
      const premiumStatus = await AsyncStorage.getItem(`isPremium_${userId}`);

      if (premiumStatus === 'true') {
        console.log('✅ User has Premium');
        setIsPremium(true);
        setIsTrialActive(false);
        setTrialDaysLeft(0);
        setLoading(false);
        return;
      }
    } catch (error) {
      console.error('Error checking premium status:', error);
    } finally {
      setLoading(false);
    }
  };

  // Simuliere Premium-Kauf (später durch echte Zahlungs-API ersetzen)
  const purchasePremium = async (plan) => {
    try {
      const userId = auth.currentUser.uid;

      // TODO: Später echte Zahlung über RevenueCat/Stripe
      console.log(`User would purchase: ${plan}`);

      // Für jetzt: Setze Premium-Status
      await AsyncStorage.setItem(`isPremium_${userId}`, 'true');
      await AsyncStorage.setItem(`premiumPlan_${userId}`, plan);
      await AsyncStorage.setItem(`premiumStartDate_${userId}`, new Date().toISOString());

      setIsPremium(true);
      setIsTrialActive(false);

      return { success: true };
    } catch (error) {
      console.error('Error purchasing premium:', error);
      return { success: false, error };
    }
  };

  // Restore Purchases
  const restorePurchases = async () => {
    try {
      // TODO: Später mit RevenueCat implementieren
      await checkPremiumStatus();
      return { success: true };
    } catch (error) {
      console.error('Error restoring purchases:', error);
      return { success: false, error };
    }
  };

  // Prüfe ob Feature verfügbar ist
  const canUseFeature = (featureName) => {
    // Während Trial: Alle Features verfügbar
    if (isTrialActive) return true;

    // Mit Premium: Alle Features verfügbar
    if (isPremium) return true;

    // Ohne Premium: Nur Basic-Features
    return false;
  };

  // Hole verbleibende Trial-Info als Text
  const getTrialText = () => {
    if (isPremium) return null;
    if (isTrialActive) {
      return `Noch ${trialDaysLeft} Tag${trialDaysLeft !== 1 ? 'e' : ''} kostenlos`;
    }
    return 'Trial abgelaufen';
  };

  // Berechne verbleibende Zeit mit Stunden/Minuten (Device-gebunden)
  const getTrialTimeRemaining = async () => {
    if (isPremium) return null;

    try {
      const deviceId = await getDeviceId();
      const trialStartDate = await AsyncStorage.getItem(`trialStartDate_${deviceId}`);

      if (!trialStartDate) return null;

      const startDate = new Date(trialStartDate);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 5); // 5 Tage Trial

      const now = new Date();
      const timeRemaining = endDate - now;

      if (timeRemaining <= 0) {
        return { expired: true };
      }

      const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

      return { expired: false, days, hours, minutes, totalMs: timeRemaining };
    } catch (error) {
      console.error('Error calculating trial time:', error);
      return null;
    }
  };

  const value = {
    isPremium,
    isTrialActive,
    trialDaysLeft,
    loading,
    canUseFeature,
    purchasePremium,
    restorePurchases,
    getTrialText,
    getTrialTimeRemaining,
    refreshStatus: checkPremiumStatus,
  };

  return (
    <PremiumContext.Provider value={value}>
      {children}
    </PremiumContext.Provider>
  );
};
