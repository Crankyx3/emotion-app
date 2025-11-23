import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { auth } from '../firebaseconfig';

const SecurityContext = createContext();

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within SecurityProvider');
  }
  return context;
};

export const SecurityProvider = ({ children }) => {
  const [isLocked, setIsLocked] = useState(true);
  const [securityEnabled, setSecurityEnabled] = useState(false);
  const [pin, setPin] = useState(null);

  // Load security settings when auth user is available
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        loadSecuritySettings();
      } else {
        // Kein User - deaktiviere Security
        setSecurityEnabled(false);
        setIsLocked(false);
        setPin(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Lock app when going to background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' && securityEnabled) {
        setIsLocked(true);
      }
    });

    return () => {
      subscription?.remove();
    };
  }, [securityEnabled]);

  const loadSecuritySettings = async () => {
    try {
      if (!auth.currentUser) return;

      const userId = auth.currentUser.uid;
      const enabled = await AsyncStorage.getItem(`securityEnabled_${userId}`);
      const storedPin = await AsyncStorage.getItem(`securityPin_${userId}`);

      setSecurityEnabled(enabled === 'true');
      setPin(storedPin);

      // Lock app if security is enabled
      if (enabled === 'true') {
        setIsLocked(true);
      } else {
        setIsLocked(false);
      }
    } catch (error) {
      console.error('Error loading security settings:', error);
    }
  };

  const enableSecurity = async (newPin) => {
    try {
      if (!auth.currentUser) return { success: false, error: 'Not logged in' };

      const userId = auth.currentUser.uid;
      await AsyncStorage.setItem(`securityEnabled_${userId}`, 'true');
      await AsyncStorage.setItem(`securityPin_${userId}`, newPin);

      setSecurityEnabled(true);
      setPin(newPin);
      setIsLocked(false); // Don't lock immediately after setup

      return { success: true };
    } catch (error) {
      console.error('Error enabling security:', error);
      return { success: false, error: error.message };
    }
  };

  const disableSecurity = async () => {
    try {
      if (!auth.currentUser) return { success: false, error: 'Not logged in' };

      const userId = auth.currentUser.uid;
      await AsyncStorage.removeItem(`securityEnabled_${userId}`);
      await AsyncStorage.removeItem(`securityPin_${userId}`);

      setSecurityEnabled(false);
      setPin(null);
      setIsLocked(false);

      return { success: true };
    } catch (error) {
      console.error('Error disabling security:', error);
      return { success: false, error: error.message };
    }
  };

  const authenticateWithPin = async (enteredPin) => {
    if (enteredPin === pin) {
      setIsLocked(false);
      return { success: true };
    } else {
      return { success: false, error: 'Wrong PIN' };
    }
  };

  const changePin = async (oldPin, newPin) => {
    try {
      if (!auth.currentUser) return { success: false, error: 'Not logged in' };
      if (oldPin !== pin) return { success: false, error: 'Wrong current PIN' };

      const userId = auth.currentUser.uid;
      await AsyncStorage.setItem(`securityPin_${userId}`, newPin);
      setPin(newPin);

      return { success: true };
    } catch (error) {
      console.error('Error changing PIN:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    isLocked,
    securityEnabled,
    enableSecurity,
    disableSecurity,
    authenticateWithPin,
    changePin,
    refreshSettings: loadSecuritySettings,
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
};
