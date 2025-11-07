/**
 * 🧪 Test Service - Comprehensive App Testing
 *
 * Tests all critical app functions to ensure everything works correctly.
 * Designed for pre-launch Quality Assurance.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../firebaseconfig';
import { collection, addDoc, getDocs, query, where, deleteDoc, Timestamp } from 'firebase/firestore';
import {
  saveEntryLocally,
  getLocalEntries,
  getTodaysLocalEntry,
  saveWeeklyAnalysisLocally,
  getLocalWeeklyAnalyses,
  updateLocalEntry,
  deleteAllLocalEntries,
  exportAllLocalData
} from './localStorageService';
import { getAiResponse } from '../openaiService';

/**
 * Test Results Structure
 */
const createTestResult = (name, status, message, duration = null, error = null) => ({
  name,
  status, // 'success' | 'warning' | 'error' | 'skipped'
  message,
  duration,
  error,
  timestamp: new Date().toISOString()
});

/**
 * Main Test Suite Runner
 */
export const runFullTestSuite = async (options = {}) => {
  const {
    skipExpensiveTests = true, // Skip tests that cost money (OpenAI)
    skipDestructiveTests = true, // Skip tests that delete data
    includePerformanceTests = false
  } = options;

  const results = [];
  const startTime = Date.now();

  console.log('🧪 Starting Full Test Suite...');

  // 1. Authentication Tests
  results.push(await testAuthentication());

  // 2. Local Storage Tests
  results.push(...await testLocalStorage());

  // 3. AsyncStorage Tests
  results.push(...await testAsyncStorage());

  // 4. Firestore Tests
  results.push(...await testFirestore());

  // 5. OpenAI API Tests (optional - costs money)
  if (!skipExpensiveTests) {
    results.push(await testOpenAI());
  } else {
    results.push(createTestResult(
      'OpenAI API',
      'skipped',
      'Übersprungen (Kosten vermeiden)'
    ));
  }

  // 6. Data Consistency Tests
  results.push(...await testDataConsistency());

  // 7. Performance Tests (optional)
  if (includePerformanceTests) {
    results.push(...await testPerformance());
  }

  const totalDuration = Date.now() - startTime;

  // Calculate summary
  const summary = {
    total: results.length,
    passed: results.filter(r => r.status === 'success').length,
    failed: results.filter(r => r.status === 'error').length,
    warnings: results.filter(r => r.status === 'warning').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    duration: totalDuration
  };

  console.log('✅ Test Suite Complete', summary);

  return { results, summary };
};

/**
 * Test 1: Authentication
 */
const testAuthentication = async () => {
  const testName = '🔐 Authentication';
  const start = Date.now();

  try {
    if (!auth.currentUser) {
      return createTestResult(
        testName,
        'error',
        'Kein User angemeldet',
        Date.now() - start
      );
    }

    const user = auth.currentUser;
    const hasEmail = !!user.email;
    const hasUid = !!user.uid;

    if (hasEmail && hasUid) {
      return createTestResult(
        testName,
        'success',
        `User angemeldet: ${user.email} (${user.uid.substring(0, 8)}...)`,
        Date.now() - start
      );
    } else {
      return createTestResult(
        testName,
        'warning',
        'User angemeldet, aber unvollständige Daten',
        Date.now() - start
      );
    }
  } catch (error) {
    return createTestResult(
      testName,
      'error',
      'Auth-Fehler',
      Date.now() - start,
      error.message
    );
  }
};

/**
 * Test 2: Local Storage (Privacy-critical!)
 */
const testLocalStorage = async () => {
  const results = [];
  const userId = auth.currentUser?.uid;

  if (!userId) {
    results.push(createTestResult(
      '💾 Local Storage',
      'skipped',
      'Kein User - Tests übersprungen'
    ));
    return results;
  }

  // Test 2.1: Save Entry
  try {
    const start = Date.now();
    const testEntry = {
      emotion: 'Test',
      feelScore: 50,
      text: 'Test Entry - Safe to delete',
      theme: 'Test Theme',
      analysis: 'Test Analysis',
      gratitude: 'Test Gratitude'
    };

    const saved = await saveEntryLocally(userId, testEntry);

    if (saved && saved.localId) {
      results.push(createTestResult(
        '💾 Local Storage: Save Entry',
        'success',
        `Entry gespeichert (ID: ${saved.localId})`,
        Date.now() - start
      ));
    } else {
      results.push(createTestResult(
        '💾 Local Storage: Save Entry',
        'error',
        'Entry konnte nicht gespeichert werden',
        Date.now() - start
      ));
      return results;
    }

    // Test 2.2: Read Entries
    const start2 = Date.now();
    const entries = await getLocalEntries(userId);
    results.push(createTestResult(
      '💾 Local Storage: Read Entries',
      'success',
      `${entries.length} Einträge geladen`,
      Date.now() - start2
    ));

    // Test 2.3: Update Entry
    const start3 = Date.now();
    const updated = await updateLocalEntry(userId, saved.localId, {
      analysis: 'Updated Test Analysis'
    });

    if (updated && updated.analysis === 'Updated Test Analysis') {
      results.push(createTestResult(
        '💾 Local Storage: Update Entry',
        'success',
        'Entry erfolgreich aktualisiert',
        Date.now() - start3
      ));
    } else {
      results.push(createTestResult(
        '💾 Local Storage: Update Entry',
        'error',
        'Entry konnte nicht aktualisiert werden',
        Date.now() - start3
      ));
    }

    // Test 2.4: Today's Entry
    const start4 = Date.now();
    const todayEntry = await getTodaysLocalEntry(userId);
    results.push(createTestResult(
      '💾 Local Storage: Today\'s Entry',
      todayEntry ? 'success' : 'warning',
      todayEntry ? 'Heutiger Eintrag gefunden' : 'Kein Eintrag heute',
      Date.now() - start4
    ));

    // Test 2.5: Weekly Analysis
    const start5 = Date.now();
    const testAnalysis = {
      analysis: 'Test Weekly Analysis',
      highlight: { mood: 'neutral', title: 'Test' },
      entriesCount: 1,
      avgStats: { feelScore: 50 }
    };

    const savedAnalysis = await saveWeeklyAnalysisLocally(userId, testAnalysis);

    if (savedAnalysis && savedAnalysis.localId) {
      results.push(createTestResult(
        '💾 Local Storage: Save Weekly Analysis',
        'success',
        'Wochenanalyse gespeichert',
        Date.now() - start5
      ));
    } else {
      results.push(createTestResult(
        '💾 Local Storage: Save Weekly Analysis',
        'error',
        'Wochenanalyse konnte nicht gespeichert werden',
        Date.now() - start5
      ));
    }

    // Test 2.6: Export Data
    const start6 = Date.now();
    const exportData = await exportAllLocalData(userId);

    if (exportData && exportData.entries && exportData.weeklyAnalyses) {
      results.push(createTestResult(
        '💾 Local Storage: Export Data',
        'success',
        `Export erfolgreich (${exportData.entries.length} Entries, ${exportData.weeklyAnalyses.length} Analysen)`,
        Date.now() - start6
      ));
    } else {
      results.push(createTestResult(
        '💾 Local Storage: Export Data',
        'error',
        'Export fehlgeschlagen',
        Date.now() - start6
      ));
    }

  } catch (error) {
    results.push(createTestResult(
      '💾 Local Storage',
      'error',
      'Fehler beim Local Storage Test',
      null,
      error.message
    ));
  }

  return results;
};

/**
 * Test 3: AsyncStorage
 */
const testAsyncStorage = async () => {
  const results = [];
  const testKey = 'test_key_safe_to_delete';
  const testValue = 'test_value_' + Date.now();

  // Test 3.1: Write
  try {
    const start = Date.now();
    await AsyncStorage.setItem(testKey, testValue);
    results.push(createTestResult(
      '🗄️ AsyncStorage: Write',
      'success',
      'Daten geschrieben',
      Date.now() - start
    ));
  } catch (error) {
    results.push(createTestResult(
      '🗄️ AsyncStorage: Write',
      'error',
      'Schreiben fehlgeschlagen',
      null,
      error.message
    ));
    return results;
  }

  // Test 3.2: Read
  try {
    const start = Date.now();
    const value = await AsyncStorage.getItem(testKey);

    if (value === testValue) {
      results.push(createTestResult(
        '🗄️ AsyncStorage: Read',
        'success',
        'Daten korrekt gelesen',
        Date.now() - start
      ));
    } else {
      results.push(createTestResult(
        '🗄️ AsyncStorage: Read',
        'error',
        'Daten inkorrekt: ' + value,
        Date.now() - start
      ));
    }
  } catch (error) {
    results.push(createTestResult(
      '🗄️ AsyncStorage: Read',
      'error',
      'Lesen fehlgeschlagen',
      null,
      error.message
    ));
  }

  // Test 3.3: Delete
  try {
    const start = Date.now();
    await AsyncStorage.removeItem(testKey);
    results.push(createTestResult(
      '🗄️ AsyncStorage: Delete',
      'success',
      'Testdaten gelöscht',
      Date.now() - start
    ));
  } catch (error) {
    results.push(createTestResult(
      '🗄️ AsyncStorage: Delete',
      'error',
      'Löschen fehlgeschlagen',
      null,
      error.message
    ));
  }

  return results;
};

/**
 * Test 4: Firestore
 */
const testFirestore = async () => {
  const results = [];
  const userId = auth.currentUser?.uid;

  if (!userId) {
    results.push(createTestResult(
      '☁️ Firestore',
      'skipped',
      'Kein User - Tests übersprungen'
    ));
    return results;
  }

  // Test 4.1: Connection
  try {
    const start = Date.now();
    const testDoc = await addDoc(collection(db, 'test_collection'), {
      test: true,
      timestamp: Timestamp.now(),
      userId: userId
    });

    results.push(createTestResult(
      '☁️ Firestore: Connection',
      'success',
      'Verbindung OK',
      Date.now() - start
    ));

    // Clean up test doc
    await deleteDoc(testDoc);

  } catch (error) {
    results.push(createTestResult(
      '☁️ Firestore: Connection',
      'error',
      'Verbindung fehlgeschlagen',
      null,
      error.message
    ));
    return results;
  }

  // Test 4.2: Read User Entries (Metadata)
  try {
    const start = Date.now();
    const q = query(
      collection(db, 'entries'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);

    results.push(createTestResult(
      '☁️ Firestore: Read Entries',
      'success',
      `${snapshot.size} Einträge geladen`,
      Date.now() - start
    ));
  } catch (error) {
    results.push(createTestResult(
      '☁️ Firestore: Read Entries',
      'error',
      'Lesen fehlgeschlagen',
      null,
      error.message
    ));
  }

  // Test 4.3: Privacy Check - Ensure no sensitive data in cloud
  try {
    const start = Date.now();
    const q = query(
      collection(db, 'entries'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);

    let sensitiveDataFound = false;
    let sensitiveFields = [];

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      // Check if sensitive fields exist (should only be in local storage!)
      if (data.text || data.analysis || data.gratitude) {
        sensitiveDataFound = true;
        if (data.text) sensitiveFields.push('text');
        if (data.analysis) sensitiveFields.push('analysis');
        if (data.gratitude) sensitiveFields.push('gratitude');
      }
    });

    if (sensitiveDataFound) {
      results.push(createTestResult(
        '☁️ Firestore: Privacy Check',
        'error',
        `⚠️ DATENSCHUTZ-VERSTOS! Sensible Daten in Cloud gefunden: ${sensitiveFields.join(', ')}`,
        Date.now() - start
      ));
    } else {
      results.push(createTestResult(
        '☁️ Firestore: Privacy Check',
        'success',
        '✅ Keine sensiblen Daten in Cloud (DSGVO-konform)',
        Date.now() - start
      ));
    }
  } catch (error) {
    results.push(createTestResult(
      '☁️ Firestore: Privacy Check',
      'warning',
      'Privacy Check konnte nicht durchgeführt werden',
      null,
      error.message
    ));
  }

  return results;
};

/**
 * Test 5: OpenAI API (expensive - skipped by default)
 */
const testOpenAI = async () => {
  const testName = '🤖 OpenAI API';

  try {
    const start = Date.now();
    const response = await getAiResponse('test', 'Antworte mit einem Wort: OK');

    if (response && response.length > 0) {
      return createTestResult(
        testName,
        'success',
        `API erreichbar (Antwort: ${response.substring(0, 20)}...)`,
        Date.now() - start
      );
    } else {
      return createTestResult(
        testName,
        'error',
        'Leere Antwort von API',
        Date.now() - start
      );
    }
  } catch (error) {
    return createTestResult(
      testName,
      'error',
      'API nicht erreichbar',
      null,
      error.message
    );
  }
};

/**
 * Test 6: Data Consistency
 */
const testDataConsistency = async () => {
  const results = [];
  const userId = auth.currentUser?.uid;

  if (!userId) {
    results.push(createTestResult(
      '🔍 Data Consistency',
      'skipped',
      'Kein User - Tests übersprungen'
    ));
    return results;
  }

  try {
    const start = Date.now();

    // Get local entries count
    const localEntries = await getLocalEntries(userId);

    // Get cloud metadata count
    const q = query(
      collection(db, 'entries'),
      where('userId', '==', userId)
    );
    const cloudSnapshot = await getDocs(q);

    // They don't need to match exactly (cloud might have more metadata)
    // But local should have at least as many as cloud entries with hasLocalData flag
    const cloudWithLocalData = cloudSnapshot.docs.filter(
      doc => doc.data().hasLocalData === true
    );

    if (localEntries.length >= cloudWithLocalData.size) {
      results.push(createTestResult(
        '🔍 Data Consistency: Entry Count',
        'success',
        `Konsistent: ${localEntries.length} lokal, ${cloudWithLocalData.size} Cloud (hasLocalData)`,
        Date.now() - start
      ));
    } else {
      results.push(createTestResult(
        '🔍 Data Consistency: Entry Count',
        'warning',
        `Möglicherweise inkonsistent: ${localEntries.length} lokal vs ${cloudWithLocalData.size} Cloud`,
        Date.now() - start
      ));
    }

  } catch (error) {
    results.push(createTestResult(
      '🔍 Data Consistency',
      'error',
      'Konsistenz-Check fehlgeschlagen',
      null,
      error.message
    ));
  }

  return results;
};

/**
 * Test 7: Performance Tests
 */
const testPerformance = async () => {
  const results = [];
  const userId = auth.currentUser?.uid;

  if (!userId) {
    return [createTestResult(
      '⚡ Performance',
      'skipped',
      'Kein User - Tests übersprungen'
    )];
  }

  // Test 7.1: Large Data Read
  try {
    const start = Date.now();
    const entries = await getLocalEntries(userId);
    const duration = Date.now() - start;

    if (duration < 100) {
      results.push(createTestResult(
        '⚡ Performance: Read Speed',
        'success',
        `Sehr schnell: ${duration}ms für ${entries.length} Einträge`,
        duration
      ));
    } else if (duration < 500) {
      results.push(createTestResult(
        '⚡ Performance: Read Speed',
        'warning',
        `Akzeptabel: ${duration}ms für ${entries.length} Einträge`,
        duration
      ));
    } else {
      results.push(createTestResult(
        '⚡ Performance: Read Speed',
        'error',
        `Zu langsam: ${duration}ms für ${entries.length} Einträge`,
        duration
      ));
    }
  } catch (error) {
    results.push(createTestResult(
      '⚡ Performance: Read Speed',
      'error',
      'Performance Test fehlgeschlagen',
      null,
      error.message
    ));
  }

  return results;
};

/**
 * Quick Health Check (fast version of test suite)
 */
export const runQuickHealthCheck = async () => {
  const results = [];
  const start = Date.now();

  results.push(await testAuthentication());

  // Quick local storage check
  const userId = auth.currentUser?.uid;
  if (userId) {
    try {
      const entries = await getLocalEntries(userId);
      results.push(createTestResult(
        '💾 Local Storage (Quick)',
        'success',
        `${entries.length} Einträge verfügbar`,
        Date.now() - start
      ));
    } catch (error) {
      results.push(createTestResult(
        '💾 Local Storage (Quick)',
        'error',
        'Fehler beim Laden',
        Date.now() - start,
        error.message
      ));
    }
  }

  const summary = {
    total: results.length,
    passed: results.filter(r => r.status === 'success').length,
    failed: results.filter(r => r.status === 'error').length,
    warnings: results.filter(r => r.status === 'warning').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    duration: Date.now() - start
  };

  return { results, summary };
};
