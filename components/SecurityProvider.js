import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
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
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  // Check biometric availability
  useEffect(() => {
    checkBiometricAvailability();
    loadSecuritySettings();
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

  const checkBiometricAvailability = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(compatible && enrolled);
    } catch (error) {
      console.error('Error checking biometric:', error);
      setBiometricAvailable(false);
    }
  };

  const loadSecuritySettings = async () => {
    try {
      if (!auth.currentUser) return;

      const userId = auth.currentUser.uid;
      const enabled = await AsyncStorage.getItem(`securityEnabled_${userId}`);
      const storedPin = await AsyncStorage.getItem(`securityPin_${userId}`);
      const bioEnabled = await AsyncStorage.getItem(`biometricEnabled_${userId}`);

      setSecurityEnabled(enabled === 'true');
      setPin(storedPin);
      setBiometricEnabled(bioEnabled === 'true');

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
      await AsyncStorage.removeItem(`biometricEnabled_${userId}`);

      setSecurityEnabled(false);
      setPin(null);
      setBiometricEnabled(false);
      setIsLocked(false);

      return { success: true };
    } catch (error) {
      console.error('Error disabling security:', error);
      return { success: false, error: error.message };
    }
  };

  const enableBiometric = async () => {
    try {
      if (!auth.currentUser) return { success: false, error: 'Not logged in' };
      if (!biometricAvailable) return { success: false, error: 'Biometric not available' };

      const userId = auth.currentUser.uid;
      await AsyncStorage.setItem(`biometricEnabled_${userId}`, 'true');
      setBiometricEnabled(true);

      return { success: true };
    } catch (error) {
      console.error('Error enabling biometric:', error);
      return { success: false, error: error.message };
    }
  };

  const disableBiometric = async () => {
    try {
      if (!auth.currentUser) return { success: false, error: 'Not logged in' };

      const userId = auth.currentUser.uid;
      await AsyncStorage.removeItem(`biometricEnabled_${userId}`);
      setBiometricEnabled(false);

      return { success: true };
    } catch (error) {
      console.error('Error disabling biometric:', error);
      return { success: false, error: error.message };
    }
  };

  const authenticateWithBiometric = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'App entsperren',
        fallbackLabel: 'PIN verwenden',
        cancelLabel: 'Abbrechen',
      });

      if (result.success) {
        setIsLocked(false);
        return { success: true };
      } else {
        return { success: false, error: 'Authentication failed' };
      }
    } catch (error) {
      console.error('Biometric auth error:', error);
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
    biometricAvailable,
    biometricEnabled,
    enableSecurity,
    disableSecurity,
    enableBiometric,
    disableBiometric,
    authenticateWithBiometric,
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
