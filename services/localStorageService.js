/**
 * LocalStorage Service - Datenschutz-konforme lokale Datenspeicherung
 *
 * Alle sensiblen Daten (Texte, KI-Antworten) werden NUR lokal gespeichert.
 * Firestore erhält nur Metadaten (Emotion, Score, Datum) für Charts.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  ENTRIES: (userId) => `entries_${userId}`,
  WEEKLY_ANALYSES: (userId) => `weeklyAnalyses_${userId}`,
  CHAT_MESSAGES: (userId) => `chatMessages_${userId}`,
};

// ==================== ENTRIES ====================

/**
 * Speichert einen Tageseintrag lokal
 */
export const saveEntryLocally = async (userId, entry) => {
  try {
    const key = KEYS.ENTRIES(userId);
    const existing = await AsyncStorage.getItem(key);
    const entries = existing ? JSON.parse(existing) : [];

    const newEntry = {
      ...entry,
      localId: entry.localId || Date.now().toString(),
      createdAt: entry.createdAt || new Date().toISOString(),
    };

    entries.push(newEntry);
    await AsyncStorage.setItem(key, JSON.stringify(entries));

    return newEntry;
  } catch (error) {
    console.error('Error saving entry locally:', error);
    throw error;
  }
};

/**
 * Holt alle lokalen Einträge
 */
export const getLocalEntries = async (userId) => {
  try {
    const key = KEYS.ENTRIES(userId);
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting local entries:', error);
    return [];
  }
};

/**
 * Holt einen einzelnen Eintrag
 */
export const getLocalEntryById = async (userId, localId) => {
  try {
    const entries = await getLocalEntries(userId);
    return entries.find(e => e.localId === localId);
  } catch (error) {
    console.error('Error getting local entry by id:', error);
    return null;
  }
};

/**
 * Holt Einträge für einen bestimmten Zeitraum
 */
export const getLocalEntriesByDateRange = async (userId, startDate, endDate) => {
  try {
    const entries = await getLocalEntries(userId);
    return entries.filter(entry => {
      const entryDate = new Date(entry.createdAt);
      return entryDate >= startDate && entryDate <= endDate;
    });
  } catch (error) {
    console.error('Error getting entries by date range:', error);
    return [];
  }
};

/**
 * Holt den neuesten Eintrag von heute
 */
export const getTodaysLocalEntry = async (userId) => {
  try {
    const entries = await getLocalEntries(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysEntries = entries.filter(entry => {
      const entryDate = new Date(entry.createdAt);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === today.getTime();
    });

    return todaysEntries.length > 0 ? todaysEntries[todaysEntries.length - 1] : null;
  } catch (error) {
    console.error('Error getting today\'s entry:', error);
    return null;
  }
};

/**
 * Löscht einen Eintrag
 */
export const deleteLocalEntry = async (userId, localId) => {
  try {
    const entries = await getLocalEntries(userId);
    const filtered = entries.filter(e => e.localId !== localId);
    await AsyncStorage.setItem(KEYS.ENTRIES(userId), JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting local entry:', error);
    return false;
  }
};

/**
 * Löscht ALLE Einträge
 */
export const deleteAllLocalEntries = async (userId) => {
  try {
    await AsyncStorage.removeItem(KEYS.ENTRIES(userId));
    return true;
  } catch (error) {
    console.error('Error deleting all local entries:', error);
    return false;
  }
};

// ==================== WEEKLY ANALYSES ====================

/**
 * Speichert eine Wochenanalyse lokal
 */
export const saveWeeklyAnalysisLocally = async (userId, analysis) => {
  try {
    const key = KEYS.WEEKLY_ANALYSES(userId);
    const existing = await AsyncStorage.getItem(key);
    const analyses = existing ? JSON.parse(existing) : [];

    const newAnalysis = {
      ...analysis,
      localId: analysis.localId || Date.now().toString(),
      createdAt: analysis.createdAt || new Date().toISOString(),
    };

    analyses.push(newAnalysis);
    await AsyncStorage.setItem(key, JSON.stringify(analyses));

    return newAnalysis;
  } catch (error) {
    console.error('Error saving weekly analysis locally:', error);
    throw error;
  }
};

/**
 * Holt alle Wochenanalysen
 */
export const getLocalWeeklyAnalyses = async (userId) => {
  try {
    const key = KEYS.WEEKLY_ANALYSES(userId);
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting local weekly analyses:', error);
    return [];
  }
};

/**
 * Löscht ALLE Wochenanalysen
 */
export const deleteAllLocalWeeklyAnalyses = async (userId) => {
  try {
    await AsyncStorage.removeItem(KEYS.WEEKLY_ANALYSES(userId));
    return true;
  } catch (error) {
    console.error('Error deleting all weekly analyses:', error);
    return false;
  }
};

// ==================== EXPORT ====================

/**
 * Exportiert alle lokalen Daten für Backup
 */
export const exportAllLocalData = async (userId) => {
  try {
    const entries = await getLocalEntries(userId);
    const weeklyAnalyses = await getLocalWeeklyAnalyses(userId);

    return {
      entries,
      weeklyAnalyses,
      exportDate: new Date().toISOString(),
      version: '1.0',
    };
  } catch (error) {
    console.error('Error exporting local data:', error);
    throw error;
  }
};

/**
 * Importiert Backup-Daten
 */
export const importLocalData = async (userId, data) => {
  try {
    if (data.entries) {
      await AsyncStorage.setItem(KEYS.ENTRIES(userId), JSON.stringify(data.entries));
    }
    if (data.weeklyAnalyses) {
      await AsyncStorage.setItem(KEYS.WEEKLY_ANALYSES(userId), JSON.stringify(data.weeklyAnalyses));
    }
    return true;
  } catch (error) {
    console.error('Error importing local data:', error);
    return false;
  }
};

// ==================== STATISTICS ====================

/**
 * Berechnet Statistiken aus lokalen Daten
 */
export const getLocalStatistics = async (userId) => {
  try {
    const entries = await getLocalEntries(userId);

    if (entries.length === 0) {
      return {
        totalEntries: 0,
        averageScore: 0,
        mostCommonEmotion: null,
        streak: 0,
      };
    }

    // Durchschnittlicher Score
    const avgScore = entries.reduce((sum, e) => sum + (e.feelScore || 0), 0) / entries.length;

    // Häufigste Emotion
    const emotionCounts = {};
    entries.forEach(e => {
      emotionCounts[e.emotion] = (emotionCounts[e.emotion] || 0) + 1;
    });
    const mostCommon = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0];

    // Streak berechnen
    const sortedEntries = [...entries].sort((a, b) =>
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const entry of sortedEntries) {
      const entryDate = new Date(entry.createdAt);
      entryDate.setHours(0, 0, 0, 0);

      if (entryDate.getTime() === currentDate.getTime()) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return {
      totalEntries: entries.length,
      averageScore: Math.round(avgScore * 10) / 10,
      mostCommonEmotion: mostCommon ? mostCommon[0] : null,
      streak,
    };
  } catch (error) {
    console.error('Error calculating statistics:', error);
    return {
      totalEntries: 0,
      averageScore: 0,
      mostCommonEmotion: null,
      streak: 0,
    };
  }
};
