import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSecurity } from '../components/SecurityProvider';

export default function LockScreen() {
  const {
    authenticateWithPin,
    authenticateWithBiometric,
    biometricAvailable,
    biometricEnabled,
  } = useSecurity();

  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  // Try biometric auth on mount
  useEffect(() => {
    if (biometricEnabled && biometricAvailable) {
      tryBiometric();
    }
  }, []);

  const tryBiometric = async () => {
    const result = await authenticateWithBiometric();
    if (!result.success) {
      // User can still use PIN
      console.log('Biometric failed, use PIN');
    }
  };

  const handleNumberPress = (num) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);

      // Auto-check when 4 digits entered
      if (newPin.length === 4) {
        checkPin(newPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError(false);
  };

  const checkPin = async (enteredPin) => {
    const result = await authenticateWithPin(enteredPin);

    if (!result.success) {
      // Wrong PIN
      setError(true);
      Vibration.vibrate(400);
      setTimeout(() => {
        setPin('');
        setError(false);
      }, 500);
    }
    // If success, SecurityProvider will unlock automatically
  };

  const renderDots = () => {
    return (
      <View style={styles.dotsContainer}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              pin.length > i && styles.dotFilled,
              error && styles.dotError,
            ]}
          />
        ))}
      </View>
    );
  };

  return (
    <LinearGradient colors={['#4A90E2', '#7B68EE']} style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <Ionicons name="lock-closed" size={80} color="#fff" style={styles.icon} />

        {/* Title */}
        <Text style={styles.title}>App gesperrt</Text>
        <Text style={styles.subtitle}>PIN eingeben zum Entsperren</Text>

        {/* PIN Dots */}
        {renderDots()}

        {error && <Text style={styles.errorText}>Falscher PIN!</Text>}

        {/* Number Pad */}
        <View style={styles.numPad}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <TouchableOpacity
              key={num}
              style={styles.numButton}
              onPress={() => handleNumberPress(num.toString())}
              activeOpacity={0.7}
            >
              <Text style={styles.numText}>{num}</Text>
            </TouchableOpacity>
          ))}

          {/* Biometric button */}
          {biometricEnabled && biometricAvailable ? (
            <TouchableOpacity
              style={styles.numButton}
              onPress={tryBiometric}
              activeOpacity={0.7}
            >
              <Ionicons name="finger-print" size={32} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={styles.numButton} />
          )}

          {/* 0 */}
          <TouchableOpacity
            style={styles.numButton}
            onPress={() => handleNumberPress('0')}
            activeOpacity={0.7}
          >
            <Text style={styles.numText}>0</Text>
          </TouchableOpacity>

          {/* Backspace */}
          <TouchableOpacity
            style={styles.numButton}
            onPress={handleBackspace}
            activeOpacity={0.7}
          >
            <Ionicons name="backspace-outline" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  icon: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 40,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 50,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
    marginHorizontal: 12,
  },
  dotFilled: {
    backgroundColor: '#fff',
  },
  dotError: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FF6B6B',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
    marginTop: -35,
    marginBottom: 35,
  },
  numPad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 280,
    justifyContent: 'space-between',
  },
  numButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  numText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '400',
  },
});
