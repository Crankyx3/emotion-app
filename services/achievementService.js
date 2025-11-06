import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendAchievementNotification } from './notificationService';

/**
 * Achievement Definitions
 */
const ACHIEVEMENTS = {
  // Streak Achievements
  STREAK_3: {
    id: 'streak_3',
    title: 'Erste Schritte',
    description: '3 Tage in Folge Einträge erstellt',
    icon: '🔥',
    requirement: 3,
  },
  STREAK_7: {
    id: 'streak_7',
    title: '1 Woche Konstanz',
    description: '7 Tage Streak erreicht',
    icon: '⭐',
    requirement: 7,
  },
  STREAK_14: {
    id: 'streak_14',
    title: 'Zwei Wochen Power',
    description: '14 Tage Streak erreicht',
    icon: '🌟',
    requirement: 14,
  },
  STREAK_30: {
    id: 'streak_30',
    title: '1 Monat Disziplin',
    description: '30 Tage Streak erreicht',
    icon: '🏆',
    requirement: 30,
  },
  STREAK_100: {
    id: 'streak_100',
    title: 'Legendär',
    description: '100 Tage Streak erreicht',
    icon: '💎',
    requirement: 100,
  },

  // Entry Count Achievements
  ENTRIES_10: {
    id: 'entries_10',
    title: 'Erste 10',
    description: '10 Einträge erstellt',
    icon: '📝',
    requirement: 10,
  },
  ENTRIES_50: {
    id: 'entries_50',
    title: 'Fleißig',
    description: '50 Einträge erstellt',
    icon: '📚',
    requirement: 50,
  },
  ENTRIES_100: {
    id: 'entries_100',
    title: 'Tagebuch-Meister',
    description: '100 Einträge erstellt',
    icon: '📖',
    requirement: 100,
  },

  // Analysis Achievements
  ANALYSIS_5: {
    id: 'analysis_5',
    title: 'KI-Neuling',
    description: '5 Tagesanalysen erstellt',
    icon: '🤖',
    requirement: 5,
  },
  ANALYSIS_25: {
    id: 'analysis_25',
    title: 'Selbstreflexion-Profi',
    description: '25 Tagesanalysen erstellt',
    icon: '💭',
    requirement: 25,
  },

  // Score Achievements
  SCORE_HIGH: {
    id: 'score_high',
    title: 'Hoch hinaus',
    description: '5 Tage mit Score > 80',
    icon: '🚀',
    requirement: 5,
  },
  SCORE_IMPROVING: {
    id: 'score_improving',
    title: 'Aufwärtstrend',
    description: 'Score um 20+ in einer Woche verbessert',
    icon: '📈',
  },

  // Weekly Analysis
  WEEKLY_3: {
    id: 'weekly_3',
    title: 'Wochenreflexion',
    description: '3 Wochenanalysen erstellt',
    icon: '📊',
    requirement: 3,
  },
};

/**
 * Check and Award Achievements
 * @param {string} userId - User ID
 * @param {Object} stats - User stats { totalEntries, streak, dailyAnalyses, weeklyAnalyses, etc. }
 */
export async function checkAndAwardAchievements(userId, stats) {
  try {
    const unlockedAchievements = await getUnlockedAchievements(userId);
    const newAchievements = [];

    // Check Streak Achievements
    if (stats.currentStreak >= 3 && !unlockedAchievements.includes('streak_3')) {
      newAchievements.push(ACHIEVEMENTS.STREAK_3);
    }
    if (stats.currentStreak >= 7 && !unlockedAchievements.includes('streak_7')) {
      newAchievements.push(ACHIEVEMENTS.STREAK_7);
    }
    if (stats.currentStreak >= 14 && !unlockedAchievements.includes('streak_14')) {
      newAchievements.push(ACHIEVEMENTS.STREAK_14);
    }
    if (stats.currentStreak >= 30 && !unlockedAchievements.includes('streak_30')) {
      newAchievements.push(ACHIEVEMENTS.STREAK_30);
    }
    if (stats.currentStreak >= 100 && !unlockedAchievements.includes('streak_100')) {
      newAchievements.push(ACHIEVEMENTS.STREAK_100);
    }

    // Check Entry Count Achievements
    if (stats.totalEntries >= 10 && !unlockedAchievements.includes('entries_10')) {
      newAchievements.push(ACHIEVEMENTS.ENTRIES_10);
    }
    if (stats.totalEntries >= 50 && !unlockedAchievements.includes('entries_50')) {
      newAchievements.push(ACHIEVEMENTS.ENTRIES_50);
    }
    if (stats.totalEntries >= 100 && !unlockedAchievements.includes('entries_100')) {
      newAchievements.push(ACHIEVEMENTS.ENTRIES_100);
    }

    // Check Analysis Achievements
    if (stats.dailyAnalyses >= 5 && !unlockedAchievements.includes('analysis_5')) {
      newAchievements.push(ACHIEVEMENTS.ANALYSIS_5);
    }
    if (stats.dailyAnalyses >= 25 && !unlockedAchievements.includes('analysis_25')) {
      newAchievements.push(ACHIEVEMENTS.ANALYSIS_25);
    }

    // Check Weekly Analysis Achievements
    if (stats.weeklyAnalyses >= 3 && !unlockedAchievements.includes('weekly_3')) {
      newAchievements.push(ACHIEVEMENTS.WEEKLY_3);
    }

    // Unlock new achievements
    for (const achievement of newAchievements) {
      await unlockAchievement(userId, achievement);
      await sendAchievementNotification(achievement.title, achievement.description);
    }

    return newAchievements;
  } catch (error) {
    console.error('Error checking achievements:', error);
    return [];
  }
}

/**
 * Unlock Achievement
 * @param {string} userId - User ID
 * @param {Object} achievement - Achievement object
 */
async function unlockAchievement(userId, achievement) {
  try {
    const unlockedAchievements = await getUnlockedAchievements(userId);
    unlockedAchievements.push(achievement.id);

    await AsyncStorage.setItem(
      `achievements_${userId}`,
      JSON.stringify(unlockedAchievements)
    );

    // Save unlock timestamp
    await AsyncStorage.setItem(
      `achievement_${achievement.id}_${userId}`,
      new Date().toISOString()
    );

    console.log('Achievement unlocked:', achievement.id);
  } catch (error) {
    console.error('Error unlocking achievement:', error);
  }
}

/**
 * Get Unlocked Achievements
 * @param {string} userId - User ID
 */
export async function getUnlockedAchievements(userId) {
  try {
    const stored = await AsyncStorage.getItem(`achievements_${userId}`);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting unlocked achievements:', error);
    return [];
  }
}

/**
 * Get All Achievements with Unlock Status
 * @param {string} userId - User ID
 */
export async function getAllAchievementsWithStatus(userId) {
  try {
    const unlockedIds = await getUnlockedAchievements(userId);

    const achievementsArray = Object.values(ACHIEVEMENTS).map((achievement) => ({
      ...achievement,
      unlocked: unlockedIds.includes(achievement.id),
    }));

    return achievementsArray;
  } catch (error) {
    console.error('Error getting achievements with status:', error);
    return [];
  }
}

/**
 * Get Achievement Progress
 * @param {string} userId - User ID
 * @param {Object} stats - User stats
 */
export function getAchievementProgress(stats) {
  const progress = [];

  // Streak progress
  const streakMilestones = [3, 7, 14, 30, 100];
  const nextStreakMilestone = streakMilestones.find(m => m > stats.currentStreak);
  if (nextStreakMilestone) {
    progress.push({
      type: 'streak',
      current: stats.currentStreak,
      target: nextStreakMilestone,
      percentage: (stats.currentStreak / nextStreakMilestone) * 100,
      title: `${nextStreakMilestone} Tage Streak`,
    });
  }

  // Entry count progress
  const entryMilestones = [10, 50, 100];
  const nextEntryMilestone = entryMilestones.find(m => m > stats.totalEntries);
  if (nextEntryMilestone) {
    progress.push({
      type: 'entries',
      current: stats.totalEntries,
      target: nextEntryMilestone,
      percentage: (stats.totalEntries / nextEntryMilestone) * 100,
      title: `${nextEntryMilestone} Einträge`,
    });
  }

  return progress;
}
