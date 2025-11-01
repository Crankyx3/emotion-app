import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebaseconfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PremiumContext = createContext();

export const usePremium = () => {
  const context = useContext(PremiumContext);
  if (!context) {
    throw new Error('usePremium must be used within PremiumProvider');
  }
  return context;
};

export const PremiumProvider = ({ children }) => {
  const [isPremium, setIsPremium] = useState(false);
  const [isTrialActive, setIsTrialActive] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPremiumStatus();
  }, [auth.currentUser]);

  const checkPremiumStatus = async () => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    try {
      const userId = auth.currentUser.uid;

      // Prüfe Premium-Status (später aus Firestore oder RevenueCat)
      const premiumStatus = await AsyncStorage.getItem(`isPremium_${userId}`);

      if (premiumStatus === 'true') {
        setIsPremium(true);
        setIsTrialActive(false);
        setTrialDaysLeft(0);
        setLoading(false);
        return;
      }

      // Prüfe Trial-Status
      const trialStartDate = await AsyncStorage.getItem(`trialStartDate_${userId}`);

      if (!trialStartDate) {
        // Neuer User - starte 5-Tage Trial
        const now = new Date().toISOString();
        await AsyncStorage.setItem(`trialStartDate_${userId}`, now);
        setIsTrialActive(true);
        setTrialDaysLeft(5);
        setIsPremium(false);
        setLoading(false);
        return;
      }

      // Berechne verbleibende Trial-Tage
      const startDate = new Date(trialStartDate);
      const now = new Date();
      const diffTime = now - startDate;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const daysLeft = Math.max(0, 5 - diffDays);

      if (daysLeft > 0) {
        setIsTrialActive(true);
        setTrialDaysLeft(daysLeft);
        setIsPremium(false);
      } else {
        setIsTrialActive(false);
        setTrialDaysLeft(0);
        setIsPremium(false);
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

  const value = {
    isPremium,
    isTrialActive,
    trialDaysLeft,
    loading,
    canUseFeature,
    purchasePremium,
    restorePurchases,
    getTrialText,
    refreshStatus: checkPremiumStatus,
  };

  return (
    <PremiumContext.Provider value={value}>
      {children}
    </PremiumContext.Provider>
  );
};
