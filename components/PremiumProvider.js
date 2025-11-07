import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebaseconfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { Platform, Alert } from 'react-native';
import Purchases from 'react-native-purchases';
import REVENUECAT_CONFIG from '../revenuecat.config';

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
  const [isRevenueCatConfigured, setIsRevenueCatConfigured] = useState(false);

  // RevenueCat initialisieren
  useEffect(() => {
    initializeRevenueCat();
  }, []);

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

  const initializeRevenueCat = async () => {
    try {
      // Prüfe ob API Keys konfiguriert sind
      const apiKey = Platform.OS === 'ios'
        ? REVENUECAT_CONFIG.iosApiKey
        : REVENUECAT_CONFIG.androidApiKey;

      if (!apiKey || apiKey.includes('YOUR_')) {
        console.warn('⚠️ RevenueCat API Key nicht konfiguriert. Siehe revenuecat.config.js');
        setIsRevenueCatConfigured(false);
        return;
      }

      // RevenueCat konfigurieren
      Purchases.configure({ apiKey });

      console.log('✅ RevenueCat initialisiert');
      setIsRevenueCatConfigured(true);

      // Listener für Käufe
      Purchases.addCustomerInfoUpdateListener((customerInfo) => {
        updatePremiumStatusFromRevenueCat(customerInfo);
      });

    } catch (error) {
      console.error('❌ RevenueCat Initialisierung fehlgeschlagen:', error);
      setIsRevenueCatConfigured(false);
    }
  };

  const updatePremiumStatusFromRevenueCat = (customerInfo) => {
    try {
      // Prüfe ob User aktives Entitlement hat
      const hasActiveEntitlement =
        typeof customerInfo.entitlements.active['premium'] !== 'undefined';

      if (hasActiveEntitlement) {
        console.log('✅ Premium Entitlement aktiv');
        setIsPremium(true);
        setIsTrialActive(false);
      } else {
        console.log('❌ Kein aktives Premium Entitlement');
        setIsPremium(false);
      }
    } catch (error) {
      console.error('Fehler beim Prüfen der Entitlements:', error);
    }
  };

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

      // Falls RevenueCat konfiguriert ist, prüfe dort
      if (isRevenueCatConfigured) {
        try {
          // User ID mit RevenueCat verknüpfen
          await Purchases.logIn(userId);

          // Customer Info abrufen
          const customerInfo = await Purchases.getCustomerInfo();
          updatePremiumStatusFromRevenueCat(customerInfo);

          setLoading(false);
          return;
        } catch (error) {
          console.error('RevenueCat Fehler:', error);
          // Fallback zu AsyncStorage
        }
      }

      // Fallback: Prüfe AsyncStorage (für Entwicklung ohne RevenueCat)
      const premiumStatus = await AsyncStorage.getItem(`isPremium_${userId}`);

      if (premiumStatus === 'true') {
        console.log('✅ User has Premium (AsyncStorage)');
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

  // Premium kaufen mit RevenueCat
  const purchasePremium = async (plan) => {
    try {
      if (!auth.currentUser) {
        return { success: false, error: 'Bitte zuerst einloggen' };
      }

      const userId = auth.currentUser.uid;

      // Falls RevenueCat konfiguriert ist, nutze echten Purchase Flow
      if (isRevenueCatConfigured) {
        try {
          // Hole verfügbare Offerings
          const offerings = await Purchases.getOfferings();

          if (offerings.current === null || offerings.current.availablePackages.length === 0) {
            throw new Error('Keine Packages verfügbar');
          }

          // Finde das richtige Package (monthly oder yearly)
          const selectedPackage = offerings.current.availablePackages.find(
            (pkg) => {
              if (plan === 'monthly') {
                return pkg.identifier === '$rc_monthly' || pkg.product.identifier === REVENUECAT_CONFIG.products.monthly;
              } else {
                return pkg.identifier === '$rc_annual' || pkg.product.identifier === REVENUECAT_CONFIG.products.yearly;
              }
            }
          );

          if (!selectedPackage) {
            throw new Error(`Package für Plan "${plan}" nicht gefunden`);
          }

          console.log(`🛒 Kaufe Package: ${selectedPackage.identifier}`);

          // Führe Purchase durch
          const purchaseResult = await Purchases.purchasePackage(selectedPackage);

          // Prüfe ob erfolgreich
          const hasActiveEntitlement =
            typeof purchaseResult.customerInfo.entitlements.active['premium'] !== 'undefined';

          if (hasActiveEntitlement) {
            console.log('✅ Kauf erfolgreich!');
            setIsPremium(true);
            setIsTrialActive(false);

            // Speichere auch in AsyncStorage als Backup
            await AsyncStorage.setItem(`isPremium_${userId}`, 'true');
            await AsyncStorage.setItem(`premiumPlan_${userId}`, plan);
            await AsyncStorage.setItem(`premiumStartDate_${userId}`, new Date().toISOString());

            return { success: true };
          } else {
            throw new Error('Entitlement nicht aktiv nach Kauf');
          }

        } catch (error) {
          // User hat abgebrochen?
          if (error.userCancelled) {
            console.log('❌ Kauf abgebrochen');
            return { success: false, cancelled: true };
          }

          console.error('RevenueCat Purchase Fehler:', error);
          throw error;
        }
      }

      // Fallback: Simulierter Kauf (für Entwicklung ohne RevenueCat)
      console.log(`⚠️ Simuliere Kauf: ${plan} (RevenueCat nicht konfiguriert)`);

      await AsyncStorage.setItem(`isPremium_${userId}`, 'true');
      await AsyncStorage.setItem(`premiumPlan_${userId}`, plan);
      await AsyncStorage.setItem(`premiumStartDate_${userId}`, new Date().toISOString());

      setIsPremium(true);
      setIsTrialActive(false);

      return { success: true, simulated: true };

    } catch (error) {
      console.error('Error purchasing premium:', error);
      return { success: false, error: error.message || 'Unbekannter Fehler' };
    }
  };

  // Restore Purchases
  const restorePurchases = async () => {
    try {
      if (!auth.currentUser) {
        return { success: false, error: 'Bitte zuerst einloggen' };
      }

      // Falls RevenueCat konfiguriert ist, nutze Restore-Funktion
      if (isRevenueCatConfigured) {
        try {
          console.log('🔄 Stelle Käufe wieder her...');

          // RevenueCat Restore
          const customerInfo = await Purchases.restorePurchases();

          // Prüfe ob Premium aktiv ist
          updatePremiumStatusFromRevenueCat(customerInfo);

          const hasActiveEntitlement =
            typeof customerInfo.entitlements.active['premium'] !== 'undefined';

          if (hasActiveEntitlement) {
            console.log('✅ Käufe wiederhergestellt!');

            // Speichere auch in AsyncStorage
            const userId = auth.currentUser.uid;
            await AsyncStorage.setItem(`isPremium_${userId}`, 'true');

            return { success: true, restored: true };
          } else {
            console.log('ℹ️ Keine Premium-Käufe gefunden');
            return { success: true, restored: false, message: 'Keine Premium-Käufe gefunden' };
          }

        } catch (error) {
          console.error('RevenueCat Restore Fehler:', error);
          throw error;
        }
      }

      // Fallback: Prüfe nur den Status
      await checkPremiumStatus();
      return { success: true, message: 'RevenueCat nicht konfiguriert' };

    } catch (error) {
      console.error('Error restoring purchases:', error);
      return { success: false, error: error.message || 'Unbekannter Fehler' };
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
