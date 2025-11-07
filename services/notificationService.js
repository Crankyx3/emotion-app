import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Konfiguriere wie Notifications angezeigt werden
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Request Notification Permissions
 */
export async function requestNotificationPermissions() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permissions not granted');
      return false;
    }

    // Für Android: Notification Channel erstellen
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('daily-reminder', {
        name: 'Tägliche Erinnerungen',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#007AFF',
      });
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Schedule Daily Reminder Notification
 * @param {number} hour - Hour (0-23)
 * @param {number} minute - Minute (0-59)
 * @param {string} userId - User ID
 */
export async function scheduleDailyReminder(hour, minute, userId) {
  try {
    // Lösche alte Erinnerungen
    await cancelDailyReminder(userId);

    // Erstelle neue Notification
    const trigger = {
      hour,
      minute,
      repeats: true,
    };

    const messages = [
      {
        title: "Wie geht's dir heute? 💙",
        body: "Nimm dir einen Moment für deinen Tageseintrag",
      },
      {
        title: "Zeit für dich! ✨",
        body: "Wie fühlst du dich gerade?",
      },
      {
        title: "Dein Stimmungshelfer erinnert dich 🌟",
        body: "Halte deine Gefühle fest",
      },
      {
        title: "Schön, dass du da bist! 💚",
        body: "Wie war dein Tag?",
      },
      {
        title: "Zeit für Selbstreflexion 🧘",
        body: "Dein Tageseintrag wartet auf dich",
      },
    ];

    // Wähle zufällige Nachricht
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: randomMessage.title,
        body: randomMessage.body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger,
    });

    // Speichere Notification ID
    await AsyncStorage.setItem(`dailyReminder_${userId}`, notificationId);
    await AsyncStorage.setItem(`reminderTime_${userId}`, JSON.stringify({ hour, minute }));

    console.log('Daily reminder scheduled:', notificationId);
    return notificationId;
  } catch (error) {
    console.error('Error scheduling daily reminder:', error);
    return null;
  }
}

/**
 * Cancel Daily Reminder
 * @param {string} userId - User ID
 */
export async function cancelDailyReminder(userId) {
  try {
    const notificationId = await AsyncStorage.getItem(`dailyReminder_${userId}`);
    if (notificationId) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      await AsyncStorage.removeItem(`dailyReminder_${userId}`);
      console.log('Daily reminder canceled');
    }
  } catch (error) {
    console.error('Error canceling daily reminder:', error);
  }
}

/**
 * Get Reminder Settings
 * @param {string} userId - User ID
 */
export async function getReminderSettings(userId) {
  try {
    const timeStr = await AsyncStorage.getItem(`reminderTime_${userId}`);
    if (timeStr) {
      return JSON.parse(timeStr);
    }
    return { hour: 20, minute: 0 }; // Default: 20:00
  } catch (error) {
    console.error('Error getting reminder settings:', error);
    return { hour: 20, minute: 0 };
  }
}

/**
 * Check if Reminders are Enabled
 * @param {string} userId - User ID
 */
export async function areRemindersEnabled(userId) {
  try {
    const notificationId = await AsyncStorage.getItem(`dailyReminder_${userId}`);
    return notificationId !== null;
  } catch (error) {
    console.error('Error checking reminders:', error);
    return false;
  }
}

/**
 * Send Streak Celebration Notification
 * @param {number} days - Streak days
 */
export async function sendStreakNotification(days) {
  try {
    const messages = {
      3: { title: "3 Tage Streak! 🔥", body: "Du bist auf einem guten Weg!" },
      7: { title: "1 Woche Streak! 🎉", body: "Fantastisch! Mach weiter so!" },
      14: { title: "2 Wochen Streak! ⭐", body: "Unglaublich! Du rockst das!" },
      30: { title: "1 Monat Streak! 🏆", body: "Wow! Das ist beeindruckend!" },
      100: { title: "100 Tage Streak! 💎", body: "Legendär! Du bist ein Champion!" },
    };

    const message = messages[days];
    if (message) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: message.title,
          body: message.body,
          sound: true,
        },
        trigger: null, // Send immediately
      });
    }
  } catch (error) {
    console.error('Error sending streak notification:', error);
  }
}

/**
 * Send Achievement Notification
 * @param {string} title - Achievement title
 * @param {string} body - Achievement body
 */
export async function sendAchievementNotification(title, body) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🏆 ${title}`,
        body,
        sound: true,
      },
      trigger: null, // Send immediately
    });
  } catch (error) {
    console.error('Error sending achievement notification:', error);
  }
}
